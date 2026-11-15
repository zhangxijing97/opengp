// F1 session results and list teasers. Data is fetched only for sessions the
// schedule says are over, cached per session as a snapshot (served at once
// and refreshed in the background), and never turned into fake rankings.
// Provider failures: results endpoint -> error (502/503) except OpenF1
// access restriction (200, availability access_restricted); list teasers ->
// per-session availability, the list itself never fails.

import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  Availability,
  CanonicalRound,
  CanonicalSession,
  SourceRef,
} from '../../canonical/canonical.types';
import type {
  ClassificationRow,
  PreviewOutcome,
  SessionResultsOutcome,
} from '../../canonical/results.types';
import type { SeriesResultsSource } from '../../canonical/series-calendar-source';
import {
  F1_CAPABILITY_ROUTES,
  F1_SERIES,
} from '../../canonical/series-capabilities';
import { inferSessionLifecycle } from '../../canonical/session-lifecycle';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { SnapshotStore } from '../../common/upstream/snapshot-store';
import type { SnapshotPolicy } from '../../common/upstream/snapshot-store';
import { isUpstreamError } from '../../common/upstream/upstream-error';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import type { JolpicaDriver } from '../../data-providers/jolpica/jolpica.types';
import { OpenF1ApiClient } from '../../data-providers/openf1/openf1-api.client';
import type {
  OpenF1ApiDriver,
  OpenF1ApiSessionResult,
} from '../../data-providers/openf1/openf1-api.types';
import { F1CalendarSource } from '../f1-calendar.source';
import { cooldownFor, describeFailure } from '../f1-calendar.service';
import { F1_SESSION_KIND_INFO, isF1SessionKind } from '../f1-session-kind';
import type { F1SessionKind } from '../f1-session-kind';
import {
  buildResultPreview,
  mapJolpicaQualifyingRows,
  mapJolpicaResultRows,
  mapOpenF1ResultRows,
} from './f1-results.mapper';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** Results can still be amended (penalties) for a few days after a session. */
export const RECENT_SESSION_MS = 3 * DAY_MS;

interface LoadedRows {
  rows: ClassificationRow[];
  retrievedAt: string;
  warnings: string[];
}

interface OpenF1SessionData {
  results: OpenF1ApiSessionResult[];
  drivers: OpenF1ApiDriver[];
}

function openF1Kind(kind: F1SessionKind): boolean {
  return (
    kind === 'fp1' ||
    kind === 'fp2' ||
    kind === 'fp3' ||
    kind === 'sprint_qualifying'
  );
}

@Injectable()
export class F1ResultsService implements SeriesResultsSource {
  readonly seriesId = F1_SERIES.id;
  private readonly logger = new Logger(F1ResultsService.name);
  private readonly jolpicaRows: SnapshotStore<ClassificationRow[]>;
  private readonly openf1Rows: SnapshotStore<OpenF1SessionData>;
  private readonly seasonDrivers: SnapshotStore<JolpicaDriver[]>;

  constructor(
    private readonly calendarSource: F1CalendarSource,
    private readonly jolpica: JolpicaClient,
    private readonly openf1: OpenF1ApiClient,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.jolpicaRows = new SnapshotStore(300, clock);
    this.openf1Rows = new SnapshotStore(300, clock);
    this.seasonDrivers = new SnapshotStore(10, clock);
  }

  async getSessionResults(
    sessionId: string,
    nowMs: number,
  ): Promise<SessionResultsOutcome | null> {
    const resolved = await this.calendarSource.resolveSession(sessionId);
    if (!resolved) return null;
    const { round, session } = resolved;
    const source = this.sourceOf(session);
    const gate = this.precheck(round, session, nowMs);
    if (gate) {
      return {
        sessionId: session.id,
        resultSet: null,
        availability: gate,
        retrievedAt: null,
        sources: [],
        warnings: resolved.warnings,
      };
    }

    try {
      const loaded = await this.loadRows(round, session, nowMs);
      const hasRows = loaded.rows.length > 0;
      return {
        sessionId: session.id,
        resultSet: hasRows
          ? {
              id: `${session.id}:classification`,
              kind: session.type,
              publicationStatus: 'unknown',
              classification: loaded.rows,
            }
          : null,
        availability: hasRows
          ? 'available'
          : this.emptyAvailability(session, nowMs),
        retrievedAt: loaded.retrievedAt,
        sources: source ? [source] : [],
        warnings: [...resolved.warnings, ...loaded.warnings],
      };
    } catch (error) {
      if (isUpstreamError(error) && error.kind === 'access_restricted') {
        return {
          sessionId: session.id,
          resultSet: null,
          availability: 'access_restricted',
          retrievedAt: null,
          sources: source ? [source] : [],
          warnings: [
            ...resolved.warnings,
            `${error.provider} is restricting access right now`,
          ],
        };
      }
      throw error;
    }
  }

  async previewResults(
    round: CanonicalRound,
    sessions: CanonicalSession[],
    nowMs: number,
  ): Promise<Map<string, PreviewOutcome>> {
    const outcomes = new Map<string, PreviewOutcome>();
    await Promise.all(
      sessions.map(async (session) => {
        const gate = this.precheck(round, session, nowMs);
        if (gate) {
          outcomes.set(session.id, { availability: gate, preview: null });
          return;
        }
        try {
          const loaded = await this.loadRows(round, session, nowMs);
          outcomes.set(session.id, {
            availability:
              loaded.rows.length > 0
                ? 'available'
                : this.emptyAvailability(session, nowMs),
            preview: buildResultPreview(
              session.kind as F1SessionKind,
              loaded.rows,
            ),
          });
        } catch (error) {
          const restricted =
            isUpstreamError(error) && error.kind === 'access_restricted';
          if (!restricted) {
            this.logger.warn(
              `result preview failed for ${session.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          outcomes.set(session.id, {
            availability: restricted ? 'access_restricted' : 'upstream_error',
            preview: null,
          });
        }
      }),
    );
    return outcomes;
  }

  /** Availability decided without calling a provider, or null to fetch. */
  private precheck(
    round: CanonicalRound,
    session: CanonicalSession,
    nowMs: number,
  ): Availability | null {
    if (session.cancelled === true) return 'not_applicable';
    if (!isF1SessionKind(session.kind)) return 'unsupported';
    if (
      session.resultCoverageFromSeason !== null &&
      round.season < session.resultCoverageFromSeason
    ) {
      return 'unsupported';
    }
    if (inferSessionLifecycle(session, nowMs).status !== 'completed')
      return 'not_published';
    if (openF1Kind(session.kind)) {
      return session.external.openf1SessionKey === null ? 'unknown' : null;
    }
    return round.external.jolpica === null ? 'unknown' : null;
  }

  private emptyAvailability(
    session: CanonicalSession,
    nowMs: number,
  ): Availability {
    const start = session.scheduledStartAt
      ? Date.parse(session.scheduledStartAt)
      : null;
    return start !== null && nowMs - start < RECENT_SESSION_MS
      ? 'not_published'
      : 'unknown';
  }

  private sourceOf(session: CanonicalSession): SourceRef | null {
    if (!isF1SessionKind(session.kind)) return null;
    const capability = F1_SESSION_KIND_INFO[session.kind].resultCapability;
    return { provider: F1_CAPABILITY_ROUTES[capability].primary, capability };
  }

  private policyFor(session: CanonicalSession, nowMs: number): SnapshotPolicy {
    const start = session.scheduledStartAt
      ? Date.parse(session.scheduledStartAt)
      : null;
    const recent = start === null || nowMs - start < RECENT_SESSION_MS;
    return {
      freshMs: recent ? 10 * MINUTE_MS : 7 * DAY_MS,
      maxStaleMs: recent ? DAY_MS : 30 * DAY_MS,
      failureCooldownMs: cooldownFor,
      describeFailure,
      refreshInBackground: true,
    };
  }

  private async loadRows(
    round: CanonicalRound,
    session: CanonicalSession,
    nowMs: number,
  ): Promise<LoadedRows> {
    const kind = session.kind as F1SessionKind;
    const ctx = { sessionId: session.id, roundId: round.id };
    const policy = this.policyFor(session, nowMs);

    if (openF1Kind(kind)) {
      const sessionKey = session.external.openf1SessionKey as number;
      const read = await this.openf1Rows.read(
        String(sessionKey),
        async () => {
          const [results, drivers] = await Promise.all([
            this.openf1.fetchSessionResults(sessionKey),
            this.openf1.fetchSessionDrivers(sessionKey),
          ]);
          return {
            value: { results: results.items, drivers: drivers.items },
            retrievedAt:
              results.retrievedAt < drivers.retrievedAt
                ? results.retrievedAt
                : drivers.retrievedAt,
          };
        },
        policy,
      );
      const seasonDrivers = await this.loadSeasonDrivers(round.season);
      const mapped = mapOpenF1ResultRows(
        kind,
        read.value.results,
        read.value.drivers,
        seasonDrivers,
        ctx,
      );
      const warnings =
        mapped.unmatchedDrivers > 0
          ? [
              `${mapped.unmatchedDrivers} driver(s) could not be linked to a Jolpica driver; their IDs are name-based`,
            ]
          : [];
      return { rows: mapped.rows, retrievedAt: read.retrievedAt, warnings };
    }

    const jolpicaRound = (round.external.jolpica as { round: number }).round;
    const read = await this.jolpicaRows.read(
      `${round.season}:${jolpicaRound}:${kind}`,
      async () => {
        if (kind === 'qualifying') {
          const result = await this.jolpica.fetchQualifyingResults(
            round.season,
            jolpicaRound,
          );
          return {
            value: mapJolpicaQualifyingRows(result.items, ctx),
            retrievedAt: result.retrievedAt,
          };
        }
        const result =
          kind === 'sprint'
            ? await this.jolpica.fetchSprintResults(round.season, jolpicaRound)
            : await this.jolpica.fetchRaceResults(round.season, jolpicaRound);
        return {
          value: mapJolpicaResultRows(result.items, ctx),
          retrievedAt: result.retrievedAt,
        };
      },
      policy,
    );
    return { rows: read.value, retrievedAt: read.retrievedAt, warnings: [] };
  }

  /** Season driver list for linking OpenF1 drivers; optional (failure = no links). */
  private async loadSeasonDrivers(season: number): Promise<JolpicaDriver[]> {
    try {
      const read = await this.seasonDrivers.read(
        String(season),
        async () => {
          const result = await this.jolpica.fetchSeasonDrivers(season);
          return { value: result.items, retrievedAt: result.retrievedAt };
        },
        {
          freshMs: DAY_MS,
          maxStaleMs: 30 * DAY_MS,
          failureCooldownMs: cooldownFor,
          describeFailure,
          refreshInBackground: true,
        },
      );
      return read.value;
    } catch {
      return [];
    }
  }
}
