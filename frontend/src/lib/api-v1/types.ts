// Response types of the OpenGP backend `/api/v1` (Phase A: F1 schedules and sessions).
// Hand-copied from backend/src/api-v1/dto/api-v1.dto.ts and backend/src/canonical/canonical.types.ts
// on 2026-11-14. There is no shared package yet, so keep both sides in sync.

export type Availability =
  | 'available'
  | 'partial'
  | 'not_published'
  | 'not_applicable'
  | 'unsupported'
  | 'access_restricted'
  | 'unknown'
  | 'upstream_error';

export type Lifecycle =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'unknown';

export type LifecycleBasis = 'provider' | 'time_inferred' | 'unknown';

export type SchedulePrecision = 'instant' | 'date' | 'unknown';

export type SessionType =
  | 'practice'
  | 'qualifying'
  | 'sprint_qualifying'
  | 'sprint'
  | 'race'
  | 'warmup'
  | 'test'
  | 'stage'
  | 'heat'
  | 'other';

export type RoundStatus =
  | 'scheduled'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'unknown';

export interface SeriesDto {
  id: string;
  name: string;
  category: string | null;
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
  lifecycle: { status: Lifecycle; basis: LifecycleBasis };
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
  endsAt: string | null;
  status: RoundStatus;
  statusBasis: LifecycleBasis;
  sessions: SessionSummary[];
}

export interface RoundsListData {
  interval: { from: string; to: string; tz: string; startsAt: string; endsAt: string };
  rounds: RoundSummary[];
}

export interface RoundDetailData {
  round: RoundSummary;
}

export interface SessionDetailData {
  session: SessionSummary;
  round: { id: string; name: string; series: { id: string; name: string } };
  aliases: string[];
}

export interface ApiMeta {
  availability: Availability;
  retrievedAt?: string;
  warnings?: string[];
  coverage?: { seriesId: string; availability: Availability; reason?: string }[];
}
