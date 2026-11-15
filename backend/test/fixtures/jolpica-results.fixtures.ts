// Jolpica result / standings fixtures. Outcomes marked W02-V follow OpenGP
// W02 research (2025 Chinese GP: Piastri won; Leclerc, Hamilton and Gasly
// disqualified; Alonso retired; Hamilton won the Sprint). Times, gaps and
// remaining rows are SYNTHETIC. See README.md in this folder.

const driver = (
  driverId: string,
  permanentNumber: string,
  code: string,
  givenName: string,
  familyName: string,
) => ({
  driverId,
  permanentNumber,
  code,
  givenName,
  familyName,
});
const team = (constructorId: string, name: string) => ({ constructorId, name });

export const DRIVERS_2025 = {
  piastri: driver('piastri', '81', 'PIA', 'Oscar', 'Piastri'),
  norris: driver('norris', '4', 'NOR', 'Lando', 'Norris'),
  russell: driver('russell', '63', 'RUS', 'George', 'Russell'),
  hamilton: driver('hamilton', '44', 'HAM', 'Lewis', 'Hamilton'),
  leclerc: driver('leclerc', '16', 'LEC', 'Charles', 'Leclerc'),
  alonso: driver('alonso', '14', 'ALO', 'Fernando', 'Alonso'),
  verstappen: driver('max_verstappen', '33', 'VER', 'Max', 'Verstappen'),
  hadjar: driver('hadjar', '6', 'HAD', 'Isack', 'Hadjar'),
  stroll: driver('stroll', '18', 'STR', 'Lance', 'Stroll'),
};

const TEAMS = {
  mclaren: team('mclaren', 'McLaren'),
  mercedes: team('mercedes', 'Mercedes'),
  ferrari: team('ferrari', 'Ferrari'),
  aston: team('aston_martin', 'Aston Martin'),
  redbull: team('red_bull', 'Red Bull'),
};

export function raceTablePage(
  season: string,
  round: string,
  listKey: string,
  rows: unknown[],
): unknown {
  return {
    MRData: {
      series: 'f1',
      limit: '100',
      offset: '0',
      total: String(rows.length),
      RaceTable: {
        season,
        round,
        Races: rows.length
          ? [{ season, round, raceName: 'Fixture GP', [listKey]: rows }]
          : [],
      },
    },
  };
}

/** 2025 Chinese GP race (W02-V outcomes; SYNTHETIC times). */
export const CHINA_2025_RACE_ROWS = [
  {
    number: '81',
    position: '1',
    positionText: '1',
    points: '25',
    Driver: DRIVERS_2025.piastri,
    Constructor: TEAMS.mclaren,
    grid: '1',
    laps: '56',
    status: 'Finished',
    Time: { millis: '5455026', time: '1:30:55.026' },
    FastestLap: { Time: { time: '1:35.520' } },
  },
  {
    number: '4',
    position: '2',
    positionText: '2',
    points: '18',
    Driver: DRIVERS_2025.norris,
    Constructor: TEAMS.mclaren,
    grid: '3',
    laps: '56',
    status: 'Finished',
    Time: { millis: '5464774', time: '+9.748' },
  },
  {
    number: '63',
    position: '3',
    positionText: '3',
    points: '15',
    Driver: DRIVERS_2025.russell,
    Constructor: TEAMS.mercedes,
    grid: '2',
    laps: '56',
    status: 'Finished',
    Time: { millis: '5466123', time: '+11.097' },
  },
  {
    number: '14',
    position: '17',
    positionText: 'R',
    points: '0',
    Driver: DRIVERS_2025.alonso,
    Constructor: TEAMS.aston,
    grid: '13',
    laps: '4',
    status: 'Retired',
  },
  {
    number: '16',
    position: '18',
    positionText: 'D',
    points: '0',
    Driver: DRIVERS_2025.leclerc,
    Constructor: TEAMS.ferrari,
    grid: '6',
    laps: '0',
    status: 'Disqualified',
  },
  {
    number: '44',
    position: '19',
    positionText: 'D',
    points: '0',
    Driver: DRIVERS_2025.hamilton,
    Constructor: TEAMS.ferrari,
    grid: '5',
    laps: '0',
    status: 'Disqualified',
  },
];

/** 2025 Chinese GP sprint: Hamilton P1, 19 laps, 8 points (W02-V); others SYNTHETIC. */
export const CHINA_2025_SPRINT_ROWS = [
  {
    number: '44',
    position: '1',
    positionText: '1',
    points: '8',
    Driver: DRIVERS_2025.hamilton,
    Constructor: TEAMS.ferrari,
    laps: '19',
    status: 'Finished',
    Time: { millis: '1876418', time: '30:39.965' },
  },
  {
    number: '81',
    position: '2',
    positionText: '2',
    points: '7',
    Driver: DRIVERS_2025.piastri,
    Constructor: TEAMS.mclaren,
    laps: '19',
    status: 'Finished',
    Time: { time: '+6.889' },
  },
  {
    number: '33',
    position: '3',
    positionText: '3',
    points: '6',
    Driver: DRIVERS_2025.verstappen,
    Constructor: TEAMS.redbull,
    laps: '19',
    status: 'Finished',
    Time: { time: '+9.804' },
  },
];

/** 2025 Chinese GP qualifying (SYNTHETIC times; last row out in Q1). */
export const CHINA_2025_QUALIFYING_ROWS = [
  {
    number: '81',
    position: '1',
    Driver: DRIVERS_2025.piastri,
    Constructor: TEAMS.mclaren,
    Q1: '1:31.591',
    Q2: '1:31.200',
    Q3: '1:30.641',
  },
  {
    number: '63',
    position: '2',
    Driver: DRIVERS_2025.russell,
    Constructor: TEAMS.mercedes,
    Q1: '1:31.295',
    Q2: '1:31.307',
    Q3: '1:30.723',
  },
  {
    number: '4',
    position: '3',
    Driver: DRIVERS_2025.norris,
    Constructor: TEAMS.mclaren,
    Q1: '1:31.393',
    Q2: '1:31.119',
    Q3: '1:30.793',
  },
  {
    number: '18',
    position: '17',
    Driver: DRIVERS_2025.stroll,
    Constructor: TEAMS.aston,
    Q1: '1:32.418',
  },
];

/** 2021 Belgian GP: half points, e.g. "12.5" for the winner. */
export const BELGIUM_2021_RACE_ROW = {
  number: '33',
  position: '1',
  positionText: '1',
  points: '12.5',
  Driver: DRIVERS_2025.verstappen,
  Constructor: TEAMS.redbull,
  laps: '1',
  status: 'Finished',
};

/** 2024 Brazilian GP non-starter: positionText "W" (withdrawn). */
export const BRAZIL_2024_DNS_ROW = {
  number: '23',
  position: '19',
  positionText: 'W',
  points: '0',
  Driver: driver('albon', '23', 'ALB', 'Alexander', 'Albon'),
  Constructor: team('williams', 'Williams'),
  laps: '0',
  status: 'Did not start',
};

export function seasonDriversPage(drivers: unknown[]): unknown {
  return {
    MRData: {
      series: 'f1',
      limit: '100',
      offset: '0',
      total: String(drivers.length),
      DriverTable: { season: '2025', Drivers: drivers },
    },
  };
}

export function standingsPage(
  season: string,
  round: string | null,
  listKey: 'DriverStandings' | 'ConstructorStandings',
  rows: unknown[],
): unknown {
  return {
    MRData: {
      series: 'f1',
      limit: '100',
      offset: '0',
      total: String(rows.length),
      StandingsTable: {
        season,
        StandingsLists:
          round === null ? [] : [{ season, round, [listKey]: rows }],
      },
    },
  };
}

/** SYNTHETIC driver standings after round 1 (chosen to exercise contention). */
export const DRIVER_STANDINGS_AFTER_R1 = [
  {
    position: '1',
    positionText: '1',
    points: '40',
    wins: '1',
    Driver: DRIVERS_2025.norris,
    Constructors: [TEAMS.mclaren],
  },
  {
    position: '2',
    positionText: '2',
    points: '18',
    wins: '0',
    Driver: DRIVERS_2025.verstappen,
    Constructors: [TEAMS.redbull],
  },
  {
    position: '3',
    positionText: '3',
    points: '5',
    wins: '0',
    Driver: DRIVERS_2025.stroll,
    Constructors: [TEAMS.aston],
  },
];

/** SYNTHETIC driver standings after round 2 (the last fixture round). */
export const DRIVER_STANDINGS_AFTER_R2 = [
  {
    position: '1',
    positionText: '1',
    points: '44',
    wins: '1',
    Driver: DRIVERS_2025.norris,
    Constructors: [TEAMS.mclaren],
  },
  {
    position: '2',
    positionText: '2',
    points: '36',
    wins: '0',
    Driver: DRIVERS_2025.verstappen,
    Constructors: [TEAMS.redbull],
  },
  {
    position: '3',
    positionText: '3',
    points: '34',
    wins: '1',
    Driver: DRIVERS_2025.piastri,
    Constructors: [TEAMS.mclaren],
  },
];

/** SYNTHETIC constructor standings after round 2. */
export const TEAM_STANDINGS_AFTER_R2 = [
  {
    position: '1',
    positionText: '1',
    points: '78',
    wins: '2',
    Constructor: TEAMS.mclaren,
  },
  {
    position: '2',
    positionText: '2',
    points: '57',
    wins: '0',
    Constructor: TEAMS.mercedes,
  },
];
