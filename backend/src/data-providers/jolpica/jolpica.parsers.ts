// Runtime validation for Jolpica's MRData envelope and calendar objects.

import { isCalendarDate } from '../../common/time/calendar-date';
import {
  ShapeError,
  expectArray,
  expectIntegerLike,
  expectRecord,
  expectString,
  optionalString,
} from '../../common/upstream/json-guards';
import { JOLPICA_SCHEDULE_FIELD_NAMES } from './jolpica.types';
import type {
  JolpicaCircuit,
  JolpicaConstructor,
  JolpicaDriver,
  JolpicaPage,
  JolpicaQualifyingRow,
  JolpicaRace,
  JolpicaResultRow,
  JolpicaScheduleSlot,
  JolpicaSeason,
  JolpicaStandingRow,
} from './jolpica.types';

export function parseJolpicaPage(
  body: unknown,
  tableKey: string,
  listKey: string,
): JolpicaPage {
  const root = expectRecord(body, '$');
  const mrData = expectRecord(root.MRData, '$.MRData');
  const total = expectIntegerLike(mrData.total, '$.MRData.total');
  const limit = expectIntegerLike(mrData.limit, '$.MRData.limit');
  const offset = expectIntegerLike(mrData.offset, '$.MRData.offset');
  if (total < 0 || limit < 0 || offset < 0) {
    throw new ShapeError('$.MRData', 'negative pagination values');
  }
  const table = expectRecord(mrData[tableKey], `$.MRData.${tableKey}`);
  const list = table[listKey];
  const items =
    list === undefined
      ? []
      : expectArray(list, `$.MRData.${tableKey}.${listKey}`);
  return { total, limit, offset, items };
}

function expectCalendarDateString(value: unknown, path: string): string {
  const text = expectString(value, path);
  if (!isCalendarDate(text)) throw new ShapeError(path, 'expected YYYY-MM-DD');
  return text;
}

function parseScheduleSlot(
  value: unknown,
  path: string,
): JolpicaScheduleSlot | undefined {
  if (value === undefined || value === null) return undefined;
  const slot = expectRecord(value, path);
  const date = expectCalendarDateString(slot.date, `${path}.date`);
  const time = optionalString(slot.time, `${path}.time`);
  return time === undefined ? { date } : { date, time };
}

function parseCircuit(value: unknown, path: string): JolpicaCircuit {
  const circuit = expectRecord(value, path);
  const result: JolpicaCircuit = {
    circuitId: expectString(circuit.circuitId, `${path}.circuitId`),
    circuitName: expectString(circuit.circuitName, `${path}.circuitName`),
  };
  const url = optionalString(circuit.url, `${path}.url`);
  if (url !== undefined) result.url = url;
  if (circuit.Location !== undefined && circuit.Location !== null) {
    const location = expectRecord(circuit.Location, `${path}.Location`);
    result.Location = {
      locality: optionalString(location.locality, `${path}.Location.locality`),
      country: optionalString(location.country, `${path}.Location.country`),
      lat: optionalString(location.lat, `${path}.Location.lat`),
      long: optionalString(location.long, `${path}.Location.long`),
    };
  }
  return result;
}

export function parseJolpicaRace(value: unknown, path: string): JolpicaRace {
  const race = expectRecord(value, path);
  const parsed: JolpicaRace = {
    season: expectString(race.season, `${path}.season`),
    round: expectString(race.round, `${path}.round`),
    raceName: expectString(race.raceName, `${path}.raceName`),
    Circuit: parseCircuit(race.Circuit, `${path}.Circuit`),
    date: expectCalendarDateString(race.date, `${path}.date`),
  };
  expectIntegerLike(parsed.season, `${path}.season`);
  expectIntegerLike(parsed.round, `${path}.round`);

  const url = optionalString(race.url, `${path}.url`);
  if (url !== undefined) parsed.url = url;
  const time = optionalString(race.time, `${path}.time`);
  if (time !== undefined) parsed.time = time;

  for (const field of JOLPICA_SCHEDULE_FIELD_NAMES) {
    const slot = parseScheduleSlot(race[field], `${path}.${field}`);
    if (slot) parsed[field] = slot;
  }
  return parsed;
}

export function parseJolpicaSeason(
  value: unknown,
  path: string,
): JolpicaSeason {
  const season = expectRecord(value, path);
  const parsed: JolpicaSeason = {
    season: expectString(season.season, `${path}.season`),
  };
  expectIntegerLike(parsed.season, `${path}.season`);
  const url = optionalString(season.url, `${path}.url`);
  if (url !== undefined) parsed.url = url;
  return parsed;
}

function parseDriver(value: unknown, path: string): JolpicaDriver {
  const driver = expectRecord(value, path);
  const parsed: JolpicaDriver = {
    driverId: expectString(driver.driverId, `${path}.driverId`),
    givenName: expectString(driver.givenName, `${path}.givenName`),
    familyName: expectString(driver.familyName, `${path}.familyName`),
  };
  const number = optionalString(
    driver.permanentNumber,
    `${path}.permanentNumber`,
  );
  if (number !== undefined) parsed.permanentNumber = number;
  const code = optionalString(driver.code, `${path}.code`);
  if (code !== undefined) parsed.code = code;
  return parsed;
}

function parseConstructor(value: unknown, path: string): JolpicaConstructor {
  const team = expectRecord(value, path);
  return {
    constructorId: expectString(team.constructorId, `${path}.constructorId`),
    name: expectString(team.name, `${path}.name`),
  };
}

function optionalConstructor(
  value: unknown,
  path: string,
): JolpicaConstructor | undefined {
  return value === undefined || value === null
    ? undefined
    : parseConstructor(value, path);
}

export function parseJolpicaDriverItem(
  value: unknown,
  path: string,
): JolpicaDriver[] {
  return [parseDriver(value, path)];
}

function parseResultRow(value: unknown, path: string): JolpicaResultRow {
  const row = expectRecord(value, path);
  const parsed: JolpicaResultRow = {
    positionText: expectString(row.positionText, `${path}.positionText`),
    Driver: parseDriver(row.Driver, `${path}.Driver`),
  };
  for (const key of [
    'number',
    'position',
    'points',
    'grid',
    'laps',
    'status',
  ] as const) {
    const text = optionalString(row[key], `${path}.${key}`);
    if (text !== undefined) parsed[key] = text;
  }
  const team = optionalConstructor(row.Constructor, `${path}.Constructor`);
  if (team) parsed.Constructor = team;
  if (row.Time !== undefined && row.Time !== null) {
    const time = expectRecord(row.Time, `${path}.Time`);
    parsed.Time = {
      millis: optionalString(time.millis, `${path}.Time.millis`),
      time: optionalString(time.time, `${path}.Time.time`),
    };
  }
  if (row.FastestLap !== undefined && row.FastestLap !== null) {
    const fastest = expectRecord(row.FastestLap, `${path}.FastestLap`);
    const lapTime =
      fastest.Time === undefined || fastest.Time === null
        ? undefined
        : optionalString(
            expectRecord(fastest.Time, `${path}.FastestLap.Time`).time,
            `${path}.FastestLap.Time.time`,
          );
    parsed.FastestLap = { Time: { time: lapTime } };
  }
  return parsed;
}

function parseQualifyingRow(
  value: unknown,
  path: string,
): JolpicaQualifyingRow {
  const row = expectRecord(value, path);
  const parsed: JolpicaQualifyingRow = {
    Driver: parseDriver(row.Driver, `${path}.Driver`),
  };
  for (const key of ['number', 'position', 'Q1', 'Q2', 'Q3'] as const) {
    const text = optionalString(row[key], `${path}.${key}`);
    if (text !== undefined) parsed[key] = text;
  }
  const team = optionalConstructor(row.Constructor, `${path}.Constructor`);
  if (team) parsed.Constructor = team;
  return parsed;
}

function rowsOfRace<T>(
  value: unknown,
  path: string,
  listKey: string,
  parseRow: (row: unknown, rowPath: string) => T,
): T[] {
  const race = expectRecord(value, path);
  const list = race[listKey];
  if (list === undefined || list === null) return [];
  return expectArray(list, `${path}.${listKey}`).map((row, index) =>
    parseRow(row, `${path}.${listKey}[${index}]`),
  );
}

/** Race/Sprint results: one Races[] item yields its result rows. */
export function resultRowsOfRace(listKey: 'Results' | 'SprintResults') {
  return (value: unknown, path: string): JolpicaResultRow[] =>
    rowsOfRace(value, path, listKey, parseResultRow);
}

export function qualifyingRowsOfRace(
  value: unknown,
  path: string,
): JolpicaQualifyingRow[] {
  return rowsOfRace(value, path, 'QualifyingResults', parseQualifyingRow);
}

function parseStandingRow(value: unknown, path: string): JolpicaStandingRow {
  const row = expectRecord(value, path);
  const parsed: JolpicaStandingRow = {
    points: expectString(row.points, `${path}.points`),
  };
  for (const key of ['position', 'positionText', 'wins'] as const) {
    const text = optionalString(row[key], `${path}.${key}`);
    if (text !== undefined) parsed[key] = text;
  }
  if (row.Driver !== undefined && row.Driver !== null) {
    parsed.Driver = parseDriver(row.Driver, `${path}.Driver`);
  }
  const team = optionalConstructor(row.Constructor, `${path}.Constructor`);
  if (team) parsed.Constructor = team;
  if (row.Constructors !== undefined && row.Constructors !== null) {
    parsed.Constructors = expectArray(
      row.Constructors,
      `${path}.Constructors`,
    ).map((item, index) =>
      parseConstructor(item, `${path}.Constructors[${index}]`),
    );
  }
  return parsed;
}

/** One StandingsLists[] item yields its rows; `round` is reported via the callback. */
export function standingRowsOfList(
  listKey: 'DriverStandings' | 'ConstructorStandings',
  onRound: (round: number) => void,
) {
  return (value: unknown, path: string): JolpicaStandingRow[] => {
    const list = expectRecord(value, path);
    onRound(expectIntegerLike(list.round, `${path}.round`));
    return rowsOfRace(value, path, listKey, parseStandingRow);
  };
}
