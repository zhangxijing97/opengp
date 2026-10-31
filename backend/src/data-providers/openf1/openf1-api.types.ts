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
