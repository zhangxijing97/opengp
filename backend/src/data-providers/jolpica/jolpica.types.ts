// Validated subset of the Jolpica (Ergast-compatible) JSON schema used by
// OpenGP. Numeric values arrive as strings upstream and are kept as strings
// here; mapping to canonical numbers happens in OpenGP code.

/** Optional per-session schedule objects on a Jolpica Race (race itself is top level). */
export const JOLPICA_SCHEDULE_FIELD_NAMES = [
  'FirstPractice',
  'SecondPractice',
  'ThirdPractice',
  'SprintQualifying',
  'SprintShootout',
  'Sprint',
  'Qualifying',
] as const;

export type JolpicaScheduleField =
  (typeof JOLPICA_SCHEDULE_FIELD_NAMES)[number];

export interface JolpicaScheduleSlot {
  date: string;
  time?: string;
}

export interface JolpicaLocation {
  locality?: string;
  country?: string;
  lat?: string;
  long?: string;
}

export interface JolpicaCircuit {
  circuitId: string;
  circuitName: string;
  url?: string;
  Location?: JolpicaLocation;
}

export interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  url?: string;
  Circuit: JolpicaCircuit;
  date: string;
  time?: string;
  FirstPractice?: JolpicaScheduleSlot;
  SecondPractice?: JolpicaScheduleSlot;
  ThirdPractice?: JolpicaScheduleSlot;
  SprintQualifying?: JolpicaScheduleSlot;
  SprintShootout?: JolpicaScheduleSlot;
  Sprint?: JolpicaScheduleSlot;
  Qualifying?: JolpicaScheduleSlot;
}

export interface JolpicaSeason {
  season: string;
  url?: string;
}

export interface JolpicaPage {
  total: number;
  limit: number;
  offset: number;
  items: unknown[];
}

export interface JolpicaFetchResult<T> {
  items: T[];
  retrievedAt: string;
}

export interface JolpicaDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  name: string;
}

/** One row of Race or Sprint results. */
export interface JolpicaResultRow {
  number?: string;
  position?: string;
  positionText: string;
  points?: string;
  Driver: JolpicaDriver;
  Constructor?: JolpicaConstructor;
  grid?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time?: string };
  FastestLap?: { Time?: { time?: string } };
}

export interface JolpicaQualifyingRow {
  number?: string;
  position?: string;
  Driver: JolpicaDriver;
  Constructor?: JolpicaConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface JolpicaStandingRow {
  position?: string;
  positionText?: string;
  points: string;
  wins?: string;
  Driver?: JolpicaDriver;
  Constructor?: JolpicaConstructor;
  Constructors?: JolpicaConstructor[];
}

export interface JolpicaStandingsResult {
  /** Round the standings are "as of"; null when no standings exist yet. */
  round: number | null;
  rows: JolpicaStandingRow[];
  retrievedAt: string;
}
