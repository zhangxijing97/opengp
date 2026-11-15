// Home view model (HANDOFF.md section 2, "View-model sketch"), plus the fields the
// undrawn rules need (exception, dayOffset, afterMidnightCount).
// Components read these types, never the API types.

export type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
export type RowState = 'idle' | 'live' | 'done';
/** Row states without a design (HANDOFF.md section 5, shelved). Rendered as plain text, TODO(design). */
export type RowException = 'cancelled' | 'postponed' | 'unknown';
export type Flag =
  | 'yellow'
  | 'safety_car'
  | 'vsc'
  | 'full_course_yellow'
  | 'caution'
  | 'red';

export interface ResultRowVM {
  position?: number;
  positionText?: string;
  name: string;
  /** Three-letter driver code. */
  code?: string;
  teamName?: string;
  carNumber?: string;
  teamColor?: string;
  gapOrTime?: string;
  classificationStatus?: string;
  /** Decimal string. Never parse it to a float for display. */
  points?: string;
}

export interface SessionRowVM {
  id: string;
  roundId: string;
  /** Frontend series id (see series-theme.ts), not the API id. */
  seriesId: string;
  eventName: string;
  sessionName: string;
  tier: Tier;
  state: RowState;
  exception: RowException | null;
  /** ISO 8601 UTC instant, or null when the start is not known (shown as TBC). */
  startsAt: string | null;
  endsAt: string | null;
  /**
   * User calendar day minus the day group of the row: +1 means the user's clock is a day
   * ahead of the group (shown as "+1 day"). Always 0 when the track time zone is unknown.
   */
  dayOffset: number;
  trackLocalTimeLabel?: string;
  rescheduledFrom?: string | null;
  starred: boolean;
  live?: {
    progress?: number;
    timeLeftLabel?: string;
    flag?: Flag;
    clockStopped?: boolean;
    statusText?: string;
  };
  result?: {
    availability:
      | 'available'
      | 'partial'
      | 'not_published'
      | 'unsupported'
      | 'upstream_error'
      | 'access_restricted'
      | 'not_applicable'
      | 'unknown';
    publicationStatus?: 'unknown' | 'provisional' | 'final';
    /** What the rows are: the top three, the pole sitter or the fastest of a practice. */
    previewKind?: 'practice_leader' | 'pole' | 'winner' | 'top_three';
    /** Best lap or pole time, for example "1:11.717". */
    metricLabel?: string | null;
    classHeader?: string;
    rows?: ResultRowVM[];
    classWinners?: { classCode: string; name: string }[];
  };
}

export interface DayScheduleVM {
  /** Calendar day, YYYY-MM-DD. */
  dayKey: string;
  weekday: string;
  day: number;
  month: string;
  isToday: boolean;
  /** Sessions that are going to take place: cancelled and postponed rows are listed but not counted. */
  sessionCount: number;
  /** Rows that start after midnight in the user's time zone (the divider text). */
  afterMidnightCount: number;
  rows: SessionRowVM[];
}

export interface HomeVM {
  weekStart: string;
  weekEnd: string;
  following: DayScheduleVM[];
  allSeries: DayScheduleVM[];
  /** Sessions the adapter could not place on a day (no date at all). Never dropped silently. */
  skippedSessionIds: string[];
  standings?: unknown;
  seriesLists?: unknown;
}
