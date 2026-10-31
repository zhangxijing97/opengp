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
  JolpicaPage,
  JolpicaRace,
  JolpicaScheduleSlot,
  JolpicaSeason,
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
