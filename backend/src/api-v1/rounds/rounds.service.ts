// Series-agnostic /api/v1 calendar use cases. Validation, aggregation across
// series, result teasers, projection and HTTP error semantics live here;
// series-specific data and identifiers live in the series sources.

import { Inject, Injectable } from '@nestjs/common';
import type {
  Availability,
  CanonicalRound,
  CanonicalSession,
} from '../../canonical/canonical.types';
import { legacyOpenF1SessionAlias } from '../../canonical/canonical-id';
import { sessionDayKey } from '../../canonical/interval-selection';
import type { PreviewOutcome } from '../../canonical/results.types';
import {
  SERIES_CALENDAR_SOURCES,
  SERIES_RESULTS_SOURCES,
} from '../../canonical/series-calendar-source';
import type {
  IntervalCollection,
  SeriesCalendarSource,
  SeriesResultsSource,
} from '../../canonical/series-calendar-source';
import { classifySeriesId } from '../../canonical/series-capabilities';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { buildMeta, earliestIso } from '../../common/http/api-envelope';
import type { ApiResponse } from '../../common/http/api-envelope';
import {
  asApiError,
  invalidQuery,
  notFound,
  unsupportedCapability,
} from '../../common/http/api-errors';
import { parseLocalDateInterval } from '../../common/time/local-date-interval';
import type { LocalDateInterval } from '../../common/time/local-date-interval';
import { resolveIanaTimeZone, toIsoUtc } from '../../common/time/time-zone';
import type {
  RoundDetailData,
  RoundSummary,
  RoundsListData,
  SessionDetailData,
} from '../dto/api-v1.dto';
import {
  compareSessionsInZone,
  projectRound,
  projectSession,
} from '../projection/round-projection';

export interface RoundsQueryInput {
  from: unknown;
  to: unknown;
  tz: unknown;
  seriesId: unknown;
  dateBasis?: unknown;
}

const MAX_ECHOED_ID_LENGTH = 80;

function displayId(id: string): string {
  return id.length > MAX_ECHOED_ID_LENGTH
    ? `${id.slice(0, MAX_ECHOED_ID_LENGTH - 3)}...`
    : id;
}

function combineAvailability(values: Availability[]): Availability {
  if (values.length === 0) return 'unknown';
  if (values.every((value) => value === values[0])) return values[0];
  return 'partial';
}

/** Optional `tz` on detail endpoints; invalid values are a 400. */
function parseDetailTimeZone(tz: unknown): string {
  if (tz === undefined) return 'UTC';
  const resolved =
    typeof tz === 'string' && tz.length > 0 ? resolveIanaTimeZone(tz) : null;
  if (!resolved) {
    throw invalidQuery([
      '"tz" must be a valid IANA time zone such as "Europe/London".',
    ]);
  }
  return resolved;
}

@Injectable()
export class RoundsService {
  private readonly sourcesBySeries: Map<string, SeriesCalendarSource>;
  private readonly resultsBySeries: Map<string, SeriesResultsSource>;

  constructor(
    @Inject(SERIES_CALENDAR_SOURCES)
    private readonly sources: SeriesCalendarSource[],
    @Inject(SERIES_RESULTS_SOURCES) resultsSources: SeriesResultsSource[],
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.sourcesBySeries = new Map(
      sources.map((source) => [source.seriesId, source]),
    );
    this.resultsBySeries = new Map(
      resultsSources.map((source) => [source.seriesId, source]),
    );
  }

  async listRounds(
    query: RoundsQueryInput,
  ): Promise<ApiResponse<RoundsListData>> {
    const errors: string[] = [];
    const parsed = parseLocalDateInterval(query);
    if (!parsed.ok) errors.push(...parsed.errors);

    let selected = this.sources;
    let unsupportedSeries: string | null = null;
    if (query.seriesId !== undefined) {
      if (typeof query.seriesId !== 'string' || query.seriesId.length === 0) {
        errors.push('"seriesId" must be provided once, e.g. "f1".');
      } else {
        const source = this.sourcesBySeries.get(query.seriesId);
        if (source) {
          selected = [source];
        } else if (classifySeriesId(query.seriesId) === 'unknown') {
          errors.push(
            `"seriesId" "${displayId(query.seriesId)}" is not a known series.`,
          );
        } else {
          unsupportedSeries = query.seriesId;
        }
      }
    }

    if (!parsed.ok || errors.length > 0) throw invalidQuery(errors);
    if (unsupportedSeries) {
      throw unsupportedCapability(
        `Series "${unsupportedSeries}" is not available in /api/v1 yet; it is only served by the legacy /events routes.`,
      );
    }

    const interval = parsed.interval;
    const nowMs = this.clock();
    const settled = await Promise.allSettled(
      selected.map((source) => source.collectInterval(interval)),
    );

    const collections: IntervalCollection[] = [];
    const failures: unknown[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') collections.push(result.value);
      else failures.push(result.reason);
    }
    if (collections.length === 0) throw asApiError(failures[0], 'calendar');

    const coverage = collections.map((collection) => collection.coverage);
    const warnings = collections.flatMap((collection) => collection.warnings);
    if (failures.length > 0)
      warnings.push(`${failures.length} series could not be loaded`);

    return {
      data: {
        interval: {
          from: interval.from,
          to: interval.to,
          tz: interval.timeZone,
          dateBasis: interval.dateBasis,
          startsAt: interval.startsAtUtc,
          endsAt: interval.endsAtUtc,
        },
        rounds: this.projectAndSort(
          collections,
          interval,
          nowMs,
          await this.previewsFor(
            collections.flatMap((collection) => collection.rounds),
            nowMs,
          ),
        ),
      },
      meta: buildMeta({
        availability:
          failures.length > 0
            ? 'partial'
            : combineAvailability(coverage.map((entry) => entry.availability)),
        retrievedAt: earliestIso(
          collections.flatMap((collection) => collection.retrievedAt),
          toIsoUtc(nowMs),
        ),
        sources: collections.flatMap((collection) => collection.sources),
        coverage,
        warnings,
      }),
    };
  }

  async getRound(
    roundId: string,
    tz?: unknown,
  ): Promise<ApiResponse<RoundDetailData>> {
    const timeZone = parseDetailTimeZone(tz);
    const nowMs = this.clock();
    for (const source of this.sources) {
      const resolved = await this.call(() => source.resolveRound(roundId));
      if (!resolved) continue;
      const { round } = resolved;
      const previews = await this.previewsFor(
        [{ round, sessions: round.sessions }],
        nowMs,
      );
      return {
        data: {
          round: projectRound(round, round.sessions, nowMs, {
            timeZone,
            dateBasis: 'viewer',
            previews,
          }),
        },
        meta: buildMeta({
          availability: resolved.availability,
          retrievedAt: resolved.retrievedAt,
          sources: resolved.sources,
          warnings: resolved.warnings,
        }),
      };
    }
    throw notFound(`Round "${displayId(roundId)}" was not found.`);
  }

  async getSession(
    sessionId: string,
    tz?: unknown,
  ): Promise<ApiResponse<SessionDetailData>> {
    const timeZone = parseDetailTimeZone(tz);
    const nowMs = this.clock();
    for (const source of this.sources) {
      const resolved = await this.call(() => source.resolveSession(sessionId));
      if (!resolved) continue;
      const { round, session } = resolved;
      const key = session.external.openf1SessionKey;
      const previews = await this.previewsFor(
        [{ round, sessions: [session] }],
        nowMs,
      );
      return {
        data: {
          session: projectSession(session, round.season, nowMs, {
            timeZone,
            dateBasis: 'viewer',
            previews,
          }),
          round: {
            id: round.id,
            name: round.name,
            series: { id: round.seriesId, name: round.seriesName },
          },
          aliases: key !== null ? [legacyOpenF1SessionAlias(key)] : [],
        },
        meta: buildMeta({
          availability: resolved.availability,
          retrievedAt: resolved.retrievedAt,
          sources: resolved.sources,
          warnings: resolved.warnings,
        }),
      };
    }
    throw notFound(`Session "${displayId(sessionId)}" was not found.`);
  }

  /**
   * Result teasers for the given sessions. A teaser problem never fails the
   * calendar: affected sessions simply keep their inferred availability.
   */
  private async previewsFor(
    items: Array<{ round: CanonicalRound; sessions: CanonicalSession[] }>,
    nowMs: number,
  ): Promise<Map<string, PreviewOutcome>> {
    const merged = new Map<string, PreviewOutcome>();
    const settled = await Promise.allSettled(
      items.map(({ round, sessions }) => {
        const source = this.resultsBySeries.get(round.seriesId);
        return source
          ? source.previewResults(round, sessions, nowMs)
          : Promise.resolve(new Map<string, PreviewOutcome>());
      }),
    );
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        for (const [id, outcome] of result.value) merged.set(id, outcome);
      }
    }
    return merged;
  }

  private projectAndSort(
    collections: IntervalCollection[],
    interval: LocalDateInterval,
    nowMs: number,
    previews: Map<string, PreviewOutcome>,
  ): RoundSummary[] {
    const compare = compareSessionsInZone(
      interval.timeZone,
      interval.dateBasis,
    );
    const context = {
      timeZone: interval.timeZone,
      dateBasis: interval.dateBasis,
      previews,
    };
    return collections
      .flatMap((collection) => collection.rounds)
      .map(({ round, sessions }) => {
        const first = [...sessions].sort(compare)[0];
        return {
          summary: projectRound(round, sessions, nowMs, context),
          sortKey: `${sessionDayKey(first, interval.timeZone, interval.dateBasis)}|${
            first.scheduledStartAt ?? '~'
          }`,
        };
      })
      .sort(
        (a, b) =>
          a.sortKey.localeCompare(b.sortKey) ||
          a.summary.series.id.localeCompare(b.summary.series.id) ||
          (a.summary.roundNumber ?? Number.MAX_SAFE_INTEGER) -
            (b.summary.roundNumber ?? Number.MAX_SAFE_INTEGER) ||
          a.summary.id.localeCompare(b.summary.id),
      )
      .map((item) => item.summary);
  }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw asApiError(error, 'calendar');
    }
  }
}
