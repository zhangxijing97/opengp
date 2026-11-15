// Response types of the OpenGP backend `/api/v1` (F1: schedules, sessions, results, standings).
// Hand-copied from backend/src/api-v1/dto/api-v1.dto.ts, backend/src/canonical/canonical.types.ts and
// backend/src/canonical/results.types.ts (backend Phase B, 2026-11-15; checked against real responses
// on 2026-11-15). There is no shared package yet, so keep both sides in sync.

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

export type ResultPreviewKind = 'practice_leader' | 'pole' | 'winner' | 'top_three';

export interface ResultPreviewEntry {
  position: number | null;
  name: string;
  /** Three-letter driver code. */
  code: string | null;
  /** Null for practice and sprint qualifying (the provider has no team there). */
  teamName: string | null;
}

/** Result teaser of a finished session. Use `entries`; `names` is the same as text. */
export interface ResultPreviewDto {
  kind: ResultPreviewKind;
  names: string[];
  /** Best lap or pole time, for example "1:11.717". Not an invented score. */
  metricLabel: string | null;
  entries: ResultPreviewEntry[];
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
  /** Start date in the requested `tz`. */
  localDate: string | null;
  /** Start date at the venue; groups the event weekend. */
  trackLocalDate: string | null;
  /** IANA zone of the venue, null if not reviewed. */
  trackTimeZone: string | null;
  /** localDate - trackLocalDate in days. */
  dayOffset: number | null;
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
  /** IANA zone of the venue, null if not reviewed. */
  trackTimeZone: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: RoundStatus;
  statusBasis: LifecycleBasis;
  sessions: SessionSummary[];
}

export type DateBasis = 'viewer' | 'track';

export interface RoundsListData {
  interval: { from: string; to: string; tz: string; dateBasis: DateBasis; startsAt: string; endsAt: string };
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

// ---- Results (GET /api/v1/sessions/:sessionId/results)

export type ClassificationStatus = 'classified' | 'not_classified' | 'dsq' | 'dns' | 'dnq' | 'unknown';
export type FinishStatus = 'finished' | 'dnf' | 'dns' | 'dsq' | 'unknown';

export interface ResultGap {
  kind: 'time_ms' | 'laps' | 'text';
  value: number | string;
}

export interface QualifyingPhase {
  phase: 'Q1' | 'Q2' | 'Q3';
  timeMs: number | null;
}

export interface ClassificationRow {
  id: string;
  driver: { id: string; displayName: string; number: string | null; code: string | null } | null;
  team: { id: string; name: string } | null;
  /** Published rank; null for a disqualified or retired entry. Never derived from the order. */
  position: number | null;
  positionText: string | null;
  classificationStatus: ClassificationStatus;
  finishStatus: FinishStatus;
  laps: number | null;
  /** Exact decimal text. */
  points: string | null;
  bestLapMs: number | null;
  elapsedMs: number | null;
  gap: ResultGap | null;
  qualifyingPhases?: QualifyingPhase[];
}

export interface ResultSet {
  id: string;
  kind: SessionType;
  publicationStatus: 'unknown' | 'provisional' | 'final';
  classification: ClassificationRow[];
}

export interface SessionResultsData {
  sessionId: string;
  resultSet: ResultSet | null;
}

// ---- Standings (GET /api/v1/standings)

export type StandingsSubjectType = 'driver' | 'team';

export interface StandingRow {
  rank: number | null;
  positionText: string | null;
  subject: { id: string; name: string; type: StandingsSubjectType; code: string | null };
  /** A driver's team or teams in the season; empty for team standings. */
  teams: Array<{ id: string; name: string }>;
  /** Exact decimal text. */
  points: string;
  wins: number | null;
  /** Calculated by the backend; null when it could not be worked out. */
  canStillWin: boolean | null;
}

export interface StandingsData {
  seasonId: string;
  subjectType: StandingsSubjectType;
  asOfRoundId: string | null;
  publicationStatus: 'unknown' | 'provisional' | 'final';
  rows: StandingRow[];
  progress: { completedRounds: number | null; totalRounds: number | null };
  contention: {
    basis: 'calculated';
    remainingRaces: number;
    remainingSprints: number;
    maxRemainingPoints: number;
    leaderPoints: string;
  } | null;
}

export interface StandingsResponseData {
  standings: StandingsData;
}
