// Jolpica (Ergast-compatible) fixtures. See test/fixtures/README.md for
// provenance. Shapes follow the documented MRData envelope; values marked
// SYNTHETIC are illustrative and must not be read as captured provider data.

export interface PageOptions {
  total?: number;
  limit?: number;
  offset?: number;
}

export function jolpicaRacePage(
  season: string,
  races: unknown[],
  options: PageOptions = {},
): unknown {
  return {
    MRData: {
      xmlns: '',
      series: 'f1',
      url: `https://api.jolpi.ca/ergast/f1/${season}.json`,
      limit: String(options.limit ?? 100),
      offset: String(options.offset ?? 0),
      total: String(options.total ?? races.length),
      RaceTable: { season, Races: races },
    },
  };
}

export function jolpicaSeasonsPage(
  seasons: string[],
  options: PageOptions = {},
): unknown {
  return {
    MRData: {
      xmlns: '',
      series: 'f1',
      url: 'https://api.jolpi.ca/ergast/f1/seasons.json',
      limit: String(options.limit ?? 100),
      offset: String(options.offset ?? 0),
      total: String(options.total ?? seasons.length),
      SeasonTable: { Seasons: seasons.map((season) => ({ season })) },
    },
  };
}

function circuit(
  circuitId: string,
  circuitName: string,
  locality: string,
  country: string,
) {
  return { circuitId, circuitName, Location: { locality, country } };
}

/** 2025 Chinese GP. Round/circuit identity per W02 crosswalk; times believed accurate, re-verify before marking Verified. */
export const JOLPICA_2025_CHINA = {
  season: '2025',
  round: '2',
  raceName: 'Chinese Grand Prix',
  Circuit: circuit(
    'shanghai',
    'Shanghai International Circuit',
    'Shanghai',
    'China',
  ),
  date: '2025-03-23',
  time: '07:00:00Z',
  FirstPractice: { date: '2025-03-21', time: '03:30:00Z' },
  SprintQualifying: { date: '2025-03-21', time: '07:30:00Z' },
  Sprint: { date: '2025-03-22', time: '03:00:00Z' },
  Qualifying: { date: '2025-03-22', time: '07:00:00Z' },
};

/** 2025 Australian GP; ordinary (non-sprint) weekend. Times believed accurate. */
export const JOLPICA_2025_AUSTRALIA = {
  season: '2025',
  round: '1',
  raceName: 'Australian Grand Prix',
  Circuit: circuit(
    'albert_park',
    'Albert Park Grand Prix Circuit',
    'Melbourne',
    'Australia',
  ),
  date: '2025-03-16',
  time: '04:00:00Z',
  FirstPractice: { date: '2025-03-14', time: '01:30:00Z' },
  SecondPractice: { date: '2025-03-14', time: '05:00:00Z' },
  ThirdPractice: { date: '2025-03-15', time: '01:30:00Z' },
  Qualifying: { date: '2025-03-15', time: '05:00:00Z' },
};

/** 1950 British GP: historical race with a date and no time (date precision). */
export const JOLPICA_1950_BRITAIN = {
  season: '1950',
  round: '1',
  raceName: 'British Grand Prix',
  Circuit: circuit('silverstone', 'Silverstone Circuit', 'Silverstone', 'UK'),
  date: '1950-05-13',
};

/** SYNTHETIC 2023 Azerbaijan weekend modelling a shootout slot published as SecondPractice. */
export const JOLPICA_2023_AZERBAIJAN = {
  season: '2023',
  round: '4',
  raceName: 'Azerbaijan Grand Prix',
  Circuit: circuit('baku', 'Baku City Circuit', 'Baku', 'Azerbaijan'),
  date: '2023-04-30',
  time: '11:00:00Z',
  FirstPractice: { date: '2023-04-28', time: '09:30:00Z' },
  Qualifying: { date: '2023-04-28', time: '13:00:00Z' },
  SecondPractice: { date: '2023-04-29', time: '08:30:00Z' },
  Sprint: { date: '2023-04-29', time: '12:30:00Z' },
};

/** SYNTHETIC 2023 Miami entry without any practice/sprint schedule objects. */
export const JOLPICA_2023_MIAMI = {
  season: '2023',
  round: '5',
  raceName: 'Miami Grand Prix',
  Circuit: circuit('miami', 'Miami International Autodrome', 'Miami', 'USA'),
  date: '2023-05-07',
  time: '19:30:00Z',
};

/** SYNTHETIC 2023 Monaco entry (round number after the cancelled Imola event). */
export const JOLPICA_2023_MONACO = {
  season: '2023',
  round: '6',
  raceName: 'Monaco Grand Prix',
  Circuit: circuit('monaco', 'Circuit de Monaco', 'Monte-Carlo', 'Monaco'),
  date: '2023-05-28',
  time: '13:00:00Z',
};

/** SYNTHETIC 2026 weekend before the reference week (times illustrative). */
export const JOLPICA_2026_UNITED_STATES = {
  season: '2026',
  round: '19',
  raceName: 'United States Grand Prix',
  Circuit: circuit('americas', 'Circuit of the Americas', 'Austin', 'USA'),
  date: '2026-10-25',
  time: '19:00:00Z',
  FirstPractice: { date: '2026-10-23', time: '17:30:00Z' },
  Qualifying: { date: '2026-10-24', time: '21:00:00Z' },
};

/** SYNTHETIC ordinary 2026 weekend inside 2026-10-26..2026-11-02 (times illustrative, not the published schedule). */
export const JOLPICA_2026_MEXICO_CITY = {
  season: '2026',
  round: '20',
  raceName: 'Mexico City Grand Prix',
  Circuit: circuit(
    'rodriguez',
    'Autódromo Hermanos Rodríguez',
    'Mexico City',
    'Mexico',
  ),
  date: '2026-11-01',
  time: '20:00:00Z',
  FirstPractice: { date: '2026-10-30', time: '18:30:00Z' },
  SecondPractice: { date: '2026-10-30', time: '22:00:00Z' },
  ThirdPractice: { date: '2026-10-31', time: '17:30:00Z' },
  Qualifying: { date: '2026-10-31', time: '21:00:00Z' },
};
