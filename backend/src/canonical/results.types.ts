// Canonical result and standings projections for /api/v1 (contract section 4).
// Additive fields beyond the contract are marked "additive".

import type {
  Availability,
  PublicationStatus,
  SessionType,
  SourceRef,
} from './canonical.types';

export type ClassificationStatus =
  | 'classified'
  | 'not_classified'
  | 'dsq'
  | 'dns'
  | 'dnq'
  | 'unknown';

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
  roundEntryId: string;
  sessionEntryId: string | null;
  /** `code` (three-letter abbreviation) is additive. */
  driver: {
    id: string;
    displayName: string;
    number: string | null;
    code: string | null;
  } | null;
  team: { id: string; name: string } | null;
  /** Published classified rank; never derived from array order. */
  position: number | null;
  positionText: string | null;
  classificationStatus: ClassificationStatus;
  finishStatus: FinishStatus;
  laps: number | null;
  /** Exact decimal text; null is not "0". */
  points: string | null;
  bestLapMs: number | null;
  elapsedMs: number | null;
  gap: ResultGap | null;
  qualifyingPhases?: QualifyingPhase[];
}

export interface ResultSet {
  id: string;
  kind: SessionType;
  publicationStatus: PublicationStatus;
  classification: ClassificationRow[];
}

export type ResultPreviewKind =
  | 'practice_leader'
  | 'pole'
  | 'winner'
  | 'top_three';

export interface ResultPreviewEntry {
  position: number | null;
  name: string;
  code: string | null;
  teamName: string | null;
}

export interface ResultPreview {
  kind: ResultPreviewKind;
  names: string[];
  /** e.g. "1:31.504"; never an invented score. */
  metricLabel: string | null;
  /** Additive: structured version of `names`. */
  entries: ResultPreviewEntry[];
}

export interface PreviewOutcome {
  availability: Availability;
  preview: ResultPreview | null;
}

export interface SessionResultsOutcome {
  sessionId: string;
  resultSet: ResultSet | null;
  availability: Availability;
  retrievedAt: string | null;
  sources: SourceRef[];
  warnings: string[];
}

export type StandingsSubjectType = 'driver' | 'team';

export interface StandingRow {
  rank: number | null;
  /** Additive: provider rank text, e.g. "-" for an excluded entry. */
  positionText: string | null;
  subject: {
    id: string;
    name: string;
    type: StandingsSubjectType;
    /** Additive: driver abbreviation. */
    code: string | null;
  };
  /** Additive: a driver's team(s) in the season. */
  teams: Array<{ id: string; name: string }>;
  points: string;
  wins: number | null;
  /** Additive, calculated: can this subject still mathematically win? */
  canStillWin: boolean | null;
}

export interface ChampionshipContention {
  basis: 'calculated';
  remainingRaces: number;
  remainingSprints: number;
  maxRemainingPoints: number;
  leaderPoints: string;
}

export interface StandingsData {
  seasonId: string;
  subjectType: StandingsSubjectType;
  asOfRoundId: string | null;
  publicationStatus: PublicationStatus;
  rows: StandingRow[];
  /** Additive: rounds counted in these standings vs rounds in the calendar. */
  progress: { completedRounds: number | null; totalRounds: number | null };
  /** Additive: inputs of the calculated `canStillWin` flags. */
  contention: ChampionshipContention | null;
}

export interface StandingsOutcome {
  data: StandingsData;
  availability: Availability;
  retrievedAt: string;
  sources: SourceRef[];
  warnings: string[];
}
