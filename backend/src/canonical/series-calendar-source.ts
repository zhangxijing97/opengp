// Seam between the generic v1 calendar API and series-specific data. Adding a
// series (e.g. F2) means implementing this interface and registering it under
// SERIES_CALENDAR_SOURCES; the HTTP layer does not change.

import type { CoverageEntry } from '../common/http/api-envelope';
import type { LocalDateInterval } from '../common/time/local-date-interval';
import type {
  Availability,
  CanonicalRound,
  CanonicalSession,
  SeasonCalendar,
  SourceRef,
} from './canonical.types';
import type {
  PreviewOutcome,
  SessionResultsOutcome,
  StandingsOutcome,
  StandingsSubjectType,
} from './results.types';

export const SERIES_CALENDAR_SOURCES = Symbol('OPENGP_SERIES_CALENDAR_SOURCES');
export const SERIES_RESULTS_SOURCES = Symbol('OPENGP_SERIES_RESULTS_SOURCES');
export const SERIES_STANDINGS_SOURCES = Symbol(
  'OPENGP_SERIES_STANDINGS_SOURCES',
);

export interface IntervalCollection {
  rounds: Array<{ round: CanonicalRound; sessions: CanonicalSession[] }>;
  coverage: CoverageEntry;
  sources: SourceRef[];
  warnings: string[];
  retrievedAt: string[];
}

export interface ResolvedRound {
  round: CanonicalRound;
  retrievedAt: string;
  availability: Availability;
  sources: SourceRef[];
  warnings: string[];
}

export interface ResolvedSession extends ResolvedRound {
  session: CanonicalSession;
}

export interface SeriesCalendarSource {
  readonly seriesId: string;
  /** Rounds with sessions inside the interval. Throws when nothing can be served. */
  collectInterval(interval: LocalDateInterval): Promise<IntervalCollection>;
  /** null when the ID does not belong to this series or does not exist. */
  resolveRound(id: string): Promise<ResolvedRound | null>;
  resolveSession(id: string): Promise<ResolvedSession | null>;
}

export interface SeriesResultsSource {
  readonly seriesId: string;
  /** null when the ID does not belong to this series or does not exist. */
  getSessionResults(
    sessionId: string,
    nowMs: number,
  ): Promise<SessionResultsOutcome | null>;
  /**
   * Result teasers for list views. Never throws for provider failures: each
   * session gets an availability instead (keyed by session ID).
   */
  previewResults(
    round: CanonicalRound,
    sessions: CanonicalSession[],
    nowMs: number,
  ): Promise<Map<string, PreviewOutcome>>;
}

export interface StandingsQuery {
  seasonId: string;
  subjectType: StandingsSubjectType;
  asOfRoundId: string | null;
}

export interface SeriesStandingsSource {
  readonly seriesId: string;
  /** null when the season does not belong to this series or does not exist. */
  getStandings(
    query: StandingsQuery,
    nowMs: number,
  ): Promise<StandingsOutcome | null>;
}

/** 'available' only when enrichment and every input are fresh; else 'partial'. */
export function calendarAvailability(calendar: SeasonCalendar): Availability {
  const enrichment = calendar.enrichment.availability;
  const enrichmentOk =
    enrichment === 'available' || enrichment === 'not_applicable';
  const allFresh = calendar.freshness.every((item) => item.status === 'fresh');
  return enrichmentOk && allFresh ? 'available' : 'partial';
}

/** Human-readable reasons explaining a 'partial' calendar. */
export function calendarDegradationReasons(calendar: SeasonCalendar): string[] {
  const reasons: string[] = [];
  const enrichment = calendar.enrichment.availability;
  if (
    enrichment !== 'available' &&
    enrichment !== 'not_applicable' &&
    calendar.enrichment.reason
  ) {
    reasons.push(calendar.enrichment.reason);
  }
  for (const item of calendar.freshness) {
    if (item.status === 'stale') {
      reasons.push(
        `${item.provider} ${item.capability} is stale (from ${item.retrievedAt ?? 'unknown time'})`,
      );
    } else if (item.status === 'missing') {
      reasons.push(`${item.provider} ${item.capability} is unavailable`);
    }
  }
  return reasons;
}
