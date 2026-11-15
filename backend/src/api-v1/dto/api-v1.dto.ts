// Response DTOs for /api/v1, following OpenGP_HTTP_API_Contract_v1_Proposed.md.
// Optional additions (statusBasis, interval, aliases, coverage) are additive.

import type {
  Availability,
  Lifecycle,
  LifecycleBasis,
  RoundStatus,
  SchedulePrecision,
  SessionType,
} from '../../canonical/canonical.types';
import type {
  ResultPreview,
  ResultSet,
  StandingsData,
} from '../../canonical/results.types';
import type { DateBasis } from '../../common/time/local-date-interval';

export type {
  ClassificationRow,
  ResultPreview,
  ResultSet,
  StandingRow,
  StandingsData,
} from '../../canonical/results.types';

export interface SeriesDto {
  id: string;
  name: string;
  category: string | null;
}

export interface SeasonCoverageDto {
  capability: string;
  provider: string;
  /** Provider-declared coverage; "unknown" means not verified per season. */
  availability: Availability;
}

export interface SeasonDto {
  id: string;
  seriesId: string;
  seasonKey: string;
  name: string;
  year: number | null;
  coverage: SeasonCoverageDto[];
}

export interface SessionLifecycleDto {
  status: Lifecycle;
  basis: LifecycleBasis;
}

export interface SessionSummary {
  id: string;
  roundId: string;
  name: string;
  type: SessionType;
  sequence: number | null;
  scheduledStartAt: string | null;
  scheduledDate: string | null;
  schedulePrecision: SchedulePrecision;
  scheduledEndAt: string | null;
  /** Additive: start date in the requested `tz` (viewer). */
  localDate: string | null;
  /** Additive: start date at the venue; groups the event weekend. */
  trackLocalDate: string | null;
  /** Additive: IANA zone of the venue, null if not reviewed. */
  trackTimeZone: string | null;
  /** Additive: localDate - trackLocalDate in days (e.g. +1 = next day for the viewer). */
  dayOffset: number | null;
  lifecycle: SessionLifecycleDto;
  resultAvailability: Availability;
  resultPreview: ResultPreview | null;
}

export interface RoundSummary {
  id: string;
  seasonId: string;
  series: { id: string; name: string };
  name: string;
  roundNumber: number | null;
  circuit: { id: string; name: string } | null;
  locationLabel: string | null;
  /** Additive: IANA zone of the venue, null if not reviewed. */
  trackTimeZone: string | null;
  startsAt: string | null;
  /** Latest planned session end (not an actual finish time). */
  endsAt: string | null;
  status: RoundStatus;
  statusBasis: LifecycleBasis;
  sessions: SessionSummary[];
}

export interface IntervalDto {
  from: string;
  to: string;
  tz: string;
  dateBasis: DateBasis;
  startsAt: string;
  endsAt: string;
}

export interface SeriesListData {
  series: SeriesDto[];
}

export interface SeasonsListData {
  seasons: SeasonDto[];
}

export interface RoundsListData {
  interval: IntervalDto;
  rounds: RoundSummary[];
}

export interface RoundDetailData {
  round: RoundSummary;
}

export interface SessionResultsData {
  sessionId: string;
  resultSet: ResultSet | null;
}

export interface StandingsResponseData {
  standings: StandingsData;
}

export interface SessionDetailData {
  session: SessionSummary;
  round: { id: string; name: string; series: { id: string; name: string } };
  /** Legacy identifiers that resolve to this Session (e.g. openf1-session-9988). */
  aliases: string[];
}
