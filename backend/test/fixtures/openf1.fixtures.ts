// OpenF1 fixtures. China 2025 meeting/session keys are W02-verified
// (docs/f1-data-providers.md section 5.1). Keys >= 900000 are SYNTHETIC.
// Planned end times are illustrative. See test/fixtures/README.md.

export interface OpenF1SessionFixture {
  session_key: number;
  meeting_key: number;
  year: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  is_cancelled: boolean;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  location: string;
  gmt_offset: string;
}

function session(
  meeting: {
    key: number;
    year: number;
    circuitKey: number;
    short: string;
    country: string;
    location: string;
    offset: string;
  },
  sessionKey: number,
  name: string,
  type: string,
  start: string,
  end: string,
  cancelled = false,
): OpenF1SessionFixture {
  return {
    session_key: sessionKey,
    meeting_key: meeting.key,
    year: meeting.year,
    session_name: name,
    session_type: type,
    date_start: start,
    date_end: end,
    is_cancelled: cancelled,
    circuit_key: meeting.circuitKey,
    circuit_short_name: meeting.short,
    country_name: meeting.country,
    location: meeting.location,
    gmt_offset: meeting.offset,
  };
}

const CHINA_2025 = {
  key: 1255,
  year: 2025,
  circuitKey: 49,
  short: 'Shanghai',
  country: 'China',
  location: 'Shanghai',
  offset: '08:00:00',
};
const AUSTRALIA_2025 = {
  key: 900001,
  year: 2025,
  circuitKey: 900002,
  short: 'Melbourne',
  country: 'Australia',
  location: 'Melbourne',
  offset: '11:00:00',
};
const TESTING_2025 = {
  key: 900090,
  year: 2025,
  circuitKey: 900091,
  short: 'Sakhir',
  country: 'Bahrain',
  location: 'Sakhir',
  offset: '03:00:00',
};
const BAKU_2023 = {
  key: 900201,
  year: 2023,
  circuitKey: 900202,
  short: 'Baku',
  country: 'Azerbaijan',
  location: 'Baku',
  offset: '04:00:00',
};
const IMOLA_2023 = {
  key: 900301,
  year: 2023,
  circuitKey: 900302,
  short: 'Imola',
  country: 'Italy',
  location: 'Imola',
  offset: '02:00:00',
};

export const OPENF1_2025_SESSIONS: OpenF1SessionFixture[] = [
  session(
    TESTING_2025,
    900092,
    'Day 1',
    'Practice',
    '2025-02-26T07:00:00+00:00',
    '2025-02-26T16:00:00+00:00',
  ),
  session(
    AUSTRALIA_2025,
    900011,
    'Practice 1',
    'Practice',
    '2025-03-14T01:30:00+00:00',
    '2025-03-14T02:30:00+00:00',
  ),
  session(
    AUSTRALIA_2025,
    900012,
    'Practice 2',
    'Practice',
    '2025-03-14T05:00:00+00:00',
    '2025-03-14T06:00:00+00:00',
  ),
  session(
    AUSTRALIA_2025,
    900013,
    'Practice 3',
    'Practice',
    '2025-03-15T01:30:00+00:00',
    '2025-03-15T02:30:00+00:00',
  ),
  session(
    AUSTRALIA_2025,
    900014,
    'Qualifying',
    'Qualifying',
    '2025-03-15T05:00:00+00:00',
    '2025-03-15T06:00:00+00:00',
  ),
  session(
    AUSTRALIA_2025,
    900015,
    'Race',
    'Race',
    '2025-03-16T04:00:00+00:00',
    '2025-03-16T06:00:00+00:00',
  ),
  session(
    CHINA_2025,
    9988,
    'Practice 1',
    'Practice',
    '2025-03-21T03:30:00+00:00',
    '2025-03-21T04:30:00+00:00',
  ),
  session(
    CHINA_2025,
    9989,
    'Sprint Qualifying',
    'Qualifying',
    '2025-03-21T07:30:00+00:00',
    '2025-03-21T08:14:00+00:00',
  ),
  session(
    CHINA_2025,
    9993,
    'Sprint',
    'Race',
    '2025-03-22T03:00:00+00:00',
    '2025-03-22T04:00:00+00:00',
  ),
  session(
    CHINA_2025,
    9994,
    'Qualifying',
    'Qualifying',
    '2025-03-22T07:00:00+00:00',
    '2025-03-22T08:00:00+00:00',
  ),
  session(
    CHINA_2025,
    9998,
    'Race',
    'Race',
    '2025-03-23T07:00:00+00:00',
    '2025-03-23T09:00:00+00:00',
  ),
];

export const OPENF1_2025_MEETINGS = [
  {
    meeting_key: 900090,
    year: 2025,
    meeting_name: 'Pre-Season Testing',
    date_start: '2025-02-26T07:00:00+00:00',
    circuit_key: 900091,
    circuit_short_name: 'Sakhir',
    country_name: 'Bahrain',
    location: 'Sakhir',
  },
  {
    meeting_key: 900001,
    year: 2025,
    meeting_name: 'Australian Grand Prix',
    date_start: '2025-03-14T01:30:00+00:00',
    circuit_key: 900002,
    circuit_short_name: 'Melbourne',
    country_name: 'Australia',
    location: 'Melbourne',
  },
  {
    meeting_key: 1255,
    year: 2025,
    meeting_name: 'Chinese Grand Prix',
    date_start: '2025-03-21T03:30:00+00:00',
    circuit_key: 49,
    circuit_short_name: 'Shanghai',
    country_name: 'China',
    location: 'Shanghai',
  },
];

export const OPENF1_2023_SESSIONS: OpenF1SessionFixture[] = [
  session(
    BAKU_2023,
    900211,
    'Practice 1',
    'Practice',
    '2023-04-28T09:30:00+00:00',
    '2023-04-28T10:30:00+00:00',
  ),
  session(
    BAKU_2023,
    900212,
    'Qualifying',
    'Qualifying',
    '2023-04-28T13:00:00+00:00',
    '2023-04-28T14:00:00+00:00',
  ),
  session(
    BAKU_2023,
    900213,
    'Sprint Shootout',
    'Qualifying',
    '2023-04-29T08:30:00+00:00',
    '2023-04-29T09:14:00+00:00',
  ),
  session(
    BAKU_2023,
    900214,
    'Sprint',
    'Race',
    '2023-04-29T12:30:00+00:00',
    '2023-04-29T13:30:00+00:00',
  ),
  session(
    BAKU_2023,
    900215,
    'Race',
    'Race',
    '2023-04-30T11:00:00+00:00',
    '2023-04-30T13:00:00+00:00',
  ),
  session(
    IMOLA_2023,
    900311,
    'Practice 1',
    'Practice',
    '2023-05-19T11:30:00+00:00',
    '2023-05-19T12:30:00+00:00',
    true,
  ),
  session(
    IMOLA_2023,
    900312,
    'Practice 2',
    'Practice',
    '2023-05-19T15:00:00+00:00',
    '2023-05-19T16:00:00+00:00',
    true,
  ),
  session(
    IMOLA_2023,
    900313,
    'Practice 3',
    'Practice',
    '2023-05-20T10:30:00+00:00',
    '2023-05-20T11:30:00+00:00',
    true,
  ),
  session(
    IMOLA_2023,
    900314,
    'Qualifying',
    'Qualifying',
    '2023-05-20T14:00:00+00:00',
    '2023-05-20T15:00:00+00:00',
    true,
  ),
  session(
    IMOLA_2023,
    900315,
    'Race',
    'Race',
    '2023-05-21T13:00:00+00:00',
    '2023-05-21T15:00:00+00:00',
    true,
  ),
];

export const OPENF1_2023_MEETINGS = [
  {
    meeting_key: 900201,
    year: 2023,
    meeting_name: 'Azerbaijan Grand Prix',
    date_start: '2023-04-28T09:30:00+00:00',
    circuit_key: 900202,
    circuit_short_name: 'Baku',
    country_name: 'Azerbaijan',
    location: 'Baku',
  },
  {
    meeting_key: 900301,
    year: 2023,
    meeting_name: 'Emilia Romagna Grand Prix',
    date_start: '2023-05-19T11:30:00+00:00',
    circuit_key: 900302,
    circuit_short_name: 'Imola',
    country_name: 'Italy',
    location: 'Imola',
  },
];
