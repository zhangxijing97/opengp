// Validated OpenF1 record shapes used by the v1 pipeline. Fields are
// optional/nullable where OpenF1 does not guarantee them. The legacy
// openf1.types.ts is left untouched for the legacy /events/* adapter.

export interface OpenF1ApiSession {
  session_key: number;
  meeting_key: number;
  year: number;
  session_name: string;
  session_type: string;
  /** Planned start (RFC 3339 with offset) or null. */
  date_start: string | null;
  /** Planned end; never an actual chequered-flag time. */
  date_end: string | null;
  is_cancelled: boolean | null;
  circuit_key: number | null;
  circuit_short_name: string | null;
  country_name: string | null;
  location: string | null;
}

export interface OpenF1ApiMeeting {
  meeting_key: number;
  year: number;
  meeting_name: string | null;
  date_start: string | null;
  circuit_key: number | null;
  circuit_short_name: string | null;
  country_name: string | null;
  location: string | null;
}

export interface OpenF1FetchResult<T> {
  items: T[];
  retrievedAt: string;
}

/** Published post-session classification row (/session_result). */
export interface OpenF1ApiSessionResult {
  session_key: number;
  driver_number: number;
  position: number | null;
  number_of_laps: number | null;
  dnf: boolean | null;
  dns: boolean | null;
  dsq: boolean | null;
  /** Practice: best lap seconds; qualifying-type: [Q1, Q2, Q3] seconds. */
  duration: number | Array<number | null> | null;
  /** Number, text such as "+1 LAP", a per-phase array, or null. */
  gap_to_leader: number | string | Array<number | string | null> | null;
  points: number | null;
}

/** Driver entered in one session (/drivers). */
export interface OpenF1ApiDriver {
  session_key: number;
  driver_number: number;
  full_name: string | null;
  name_acronym: string | null;
  last_name: string | null;
  team_name: string | null;
}
