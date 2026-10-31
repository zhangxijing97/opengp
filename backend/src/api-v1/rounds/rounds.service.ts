// Series-agnostic /api/v1 calendar use cases. Validation, aggregation across
// series, projection and HTTP error semantics live here; series-specific data
// and identifiers live in SeriesCalendarSource implementations.

import { Inject, Injectable } from '@nestjs/common';
import type { Availability } from '../../canonical/canonical.types';
import { legacyOpenF1SessionAlias } from '../../canonical/canonical-id';
import { sessionDayKey } from '../../canonical/interval-selection';
import { SERIES_CALENDAR_SOURCES } from '../../canonical/series-calendar-source';
import type {
  IntervalCollection,
  SeriesCalendarSource,
} from '../../canonical/series-calendar-source';
import { classifySeriesId } from '../../canonical/series-capabilities';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { buildMeta, earliestIso } from '../../common/http/api-envelope';
import type { ApiResponse } from '../../common/http/api-envelope';
import {
  OpenGpApiError,
  fromUpstreamError,
  invalidQuery,
  notFound,
  unsupportedCapability,
} from '../../common/http/api-errors';
import { parseLocalDateInterval } from '../../common/time/local-date-interval';
import type { LocalDateInterval } from '../../common/time/local-date-interval';
import { toIsoUtc } from '../../common/time/time-zone';
import { isUpstreamError } from '../../common/upstream/upstream-error';
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

function toApiError(error: unknown, capability: string): Error {
  if (error instanceof OpenGpApiError) return error;
  if (isUpstreamError(error)) return fromUpstreamError(error, capability);
  return error instanceof Error ? error : new Error(String(error));
}

@Injectable()
export class RoundsService {
  private readonly sourcesBySeries: Map<string, SeriesCalendarSource>;

  constructor(
    @Inject(SERIES_CALENDAR_SOURCES)
    private readonly sources: SeriesCalendarSource[],
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.sourcesBySeries = new Map(
      sources.map((source) => [source.seriesId, source]),
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
    if (collections.length === 0) throw toApiError(failures[0], 'calendar');

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
          startsAt: interval.startsAtUtc,
          endsAt: interval.endsAtUtc,
        },
        rounds: this.projectAndSort(collections, interval, nowMs),
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

  async getRound(roundId: string): Promise<ApiResponse<RoundDetailData>> {
    for (const source of this.sources) {
      const resolved = await this.call(() => source.resolveRound(roundId));
      if (!resolved) continue;
      return {
        data: {
          round: projectRound(
            resolved.round,
            resolved.round.sessions,
            this.clock(),
          ),
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

  async getSession(sessionId: string): Promise<ApiResponse<SessionDetailData>> {
    for (const source of this.sources) {
      const resolved = await this.call(() => source.resolveSession(sessionId));
      if (!resolved) continue;
      const { round, session } = resolved;
      const key = session.external.openf1SessionKey;
      return {
        data: {
          session: projectSession(session, round.season, this.clock()),
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

  private projectAndSort(
    collections: IntervalCollection[],
    interval: LocalDateInterval,
    nowMs: number,
  ): RoundSummary[] {
    const compare = compareSessionsInZone(interval.timeZone);
    return collections
      .flatMap((collection) => collection.rounds)
      .map(({ round, sessions }) => {
        const first = [...sessions].sort(compare)[0];
        return {
          summary: projectRound(round, sessions, nowMs, interval.timeZone),
          sortKey: `${sessionDayKey(first, interval.timeZone)}|${first.scheduledStartAt ?? '~'}`,
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
      throw toApiError(error, 'calendar');
    }
  }
}
