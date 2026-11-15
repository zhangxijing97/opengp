// OpenF1 /session_result and /drivers fixtures for the 2025 Chinese GP.
// W02-V: FP1 (9988) Norris P1, 23 laps, 91.504 s; SQ (9989) Hadjar P15 with
// dnf=true and duration [92.171, null, null]. Other rows are SYNTHETIC.

export const FP1_9988_RESULTS = [
  {
    session_key: 9988,
    meeting_key: 1255,
    driver_number: 4,
    position: 1,
    number_of_laps: 23,
    dnf: false,
    dns: false,
    dsq: false,
    duration: 91.504,
    gap_to_leader: 0,
  },
  {
    session_key: 9988,
    meeting_key: 1255,
    driver_number: 81,
    position: 2,
    number_of_laps: 24,
    dnf: false,
    dns: false,
    dsq: false,
    duration: 91.6,
    gap_to_leader: 0.096,
  },
  {
    session_key: 9988,
    meeting_key: 1255,
    driver_number: 1,
    position: 3,
    number_of_laps: 22,
    dnf: false,
    dns: false,
    dsq: false,
    duration: 91.8,
    gap_to_leader: 0.296,
  },
];

export const FP1_9988_DRIVERS = [
  {
    session_key: 9988,
    driver_number: 4,
    full_name: 'Lando NORRIS',
    name_acronym: 'NOR',
    last_name: 'Norris',
    team_name: 'McLaren',
  },
  {
    session_key: 9988,
    driver_number: 81,
    full_name: 'Oscar PIASTRI',
    name_acronym: 'PIA',
    last_name: 'Piastri',
    team_name: 'McLaren',
  },
  // Champion runs #1 while Jolpica lists permanent number 33: must NOT be linked.
  {
    session_key: 9988,
    driver_number: 1,
    full_name: 'Max VERSTAPPEN',
    name_acronym: 'VER',
    last_name: 'Verstappen',
    team_name: 'Red Bull Racing',
  },
];

export const SQ_9989_RESULTS = [
  {
    session_key: 9989,
    meeting_key: 1255,
    driver_number: 44,
    position: 1,
    number_of_laps: 15,
    dnf: false,
    dns: false,
    dsq: false,
    duration: [91.5, 91.1, 90.849],
    gap_to_leader: [0, 0, 0],
  },
  {
    session_key: 9989,
    meeting_key: 1255,
    driver_number: 6,
    position: 15,
    number_of_laps: 6,
    dnf: true,
    dns: false,
    dsq: false,
    duration: [92.171, null, null],
    gap_to_leader: [0.959, null, null],
  },
];

export const SQ_9989_DRIVERS = [
  {
    session_key: 9989,
    driver_number: 44,
    full_name: 'Lewis HAMILTON',
    name_acronym: 'HAM',
    last_name: 'Hamilton',
    team_name: 'Ferrari',
  },
  {
    session_key: 9989,
    driver_number: 6,
    full_name: 'Isack HADJAR',
    name_acronym: 'HAD',
    last_name: 'Hadjar',
    team_name: 'Racing Bulls',
  },
];
