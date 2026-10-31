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

export interface ResultPreviewDto {
  kind: 'practice_leader' | 'pole' | 'winner' | 'top_three';
  names: string[];
  metricLabel: string | null;
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
  lifecycle: SessionLifecycleDto;
  resultAvailability: Availability;
  resultPreview: ResultPreviewDto | null;
}

export interface RoundSummary {
  id: string;
  seasonId: string;
  series: { id: string; name: string };
  name: string;
  roundNumber: number | null;
  circuit: { id: string; name: string } | null;
  locationLabel: string | null;
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

export interface SessionDetailData {
  session: SessionSummary;
  round: { id: string; name: string; series: { id: string; name: string } };
  /** Legacy identifiers that resolve to this Session (e.g. openf1-session-9988). */
  aliases: string[];
}
