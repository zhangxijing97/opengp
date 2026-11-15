// Runtime validation for OpenF1 top-level JSON arrays.

import {
  ShapeError,
  expectArray,
  expectIntegerLike,
  expectRecord,
  expectString,
  optionalBoolean,
  optionalIntegerLike,
  optionalString,
} from '../../common/upstream/json-guards';
import type {
  OpenF1ApiDriver,
  OpenF1ApiMeeting,
  OpenF1ApiSession,
  OpenF1ApiSessionResult,
} from './openf1-api.types';

function nullableString(value: unknown, path: string): string | null {
  return optionalString(value, path) ?? null;
}

export function parseOpenF1Session(
  value: unknown,
  path: string,
): OpenF1ApiSession {
  const record = expectRecord(value, path);
  return {
    session_key: expectIntegerLike(record.session_key, `${path}.session_key`),
    meeting_key: expectIntegerLike(record.meeting_key, `${path}.meeting_key`),
    year: expectIntegerLike(record.year, `${path}.year`),
    session_name: expectString(record.session_name, `${path}.session_name`),
    session_type: expectString(record.session_type, `${path}.session_type`),
    date_start: nullableString(record.date_start, `${path}.date_start`),
    date_end: nullableString(record.date_end, `${path}.date_end`),
    is_cancelled: optionalBoolean(record.is_cancelled, `${path}.is_cancelled`),
    circuit_key: optionalIntegerLike(record.circuit_key, `${path}.circuit_key`),
    circuit_short_name: nullableString(
      record.circuit_short_name,
      `${path}.circuit_short_name`,
    ),
    country_name: nullableString(record.country_name, `${path}.country_name`),
    location: nullableString(record.location, `${path}.location`),
  };
}

export function parseOpenF1Meeting(
  value: unknown,
  path: string,
): OpenF1ApiMeeting {
  const record = expectRecord(value, path);
  return {
    meeting_key: expectIntegerLike(record.meeting_key, `${path}.meeting_key`),
    year: expectIntegerLike(record.year, `${path}.year`),
    meeting_name: nullableString(record.meeting_name, `${path}.meeting_name`),
    date_start: nullableString(record.date_start, `${path}.date_start`),
    circuit_key: optionalIntegerLike(record.circuit_key, `${path}.circuit_key`),
    circuit_short_name: nullableString(
      record.circuit_short_name,
      `${path}.circuit_short_name`,
    ),
    country_name: nullableString(record.country_name, `${path}.country_name`),
    location: nullableString(record.location, `${path}.location`),
  };
}

export function parseOpenF1Array<T>(
  body: unknown,
  parseItem: (value: unknown, path: string) => T,
): T[] {
  return expectArray(body, '$').map((item, index) =>
    parseItem(item, `$[${index}]`),
  );
}

function numberOrNull(value: unknown, path: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new ShapeError(path, 'expected a number');
}

function phaseArray<T>(
  value: unknown[],
  path: string,
  item: (v: unknown, p: string) => T,
): T[] {
  return value.map((entry, index) => item(entry, `${path}[${index}]`));
}

function numberOrText(value: unknown, path: string): number | string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  throw new ShapeError(path, 'expected a number or string');
}

export function parseOpenF1SessionResult(
  value: unknown,
  path: string,
): OpenF1ApiSessionResult {
  const record = expectRecord(value, path);
  const duration = record.duration;
  const gap = record.gap_to_leader;
  return {
    session_key: expectIntegerLike(record.session_key, `${path}.session_key`),
    driver_number: expectIntegerLike(
      record.driver_number,
      `${path}.driver_number`,
    ),
    position: optionalIntegerLike(record.position, `${path}.position`),
    number_of_laps: optionalIntegerLike(
      record.number_of_laps,
      `${path}.number_of_laps`,
    ),
    dnf: optionalBoolean(record.dnf, `${path}.dnf`),
    dns: optionalBoolean(record.dns, `${path}.dns`),
    dsq: optionalBoolean(record.dsq, `${path}.dsq`),
    duration: Array.isArray(duration)
      ? phaseArray(duration as unknown[], `${path}.duration`, numberOrNull)
      : numberOrNull(duration, `${path}.duration`),
    gap_to_leader: Array.isArray(gap)
      ? phaseArray(gap as unknown[], `${path}.gap_to_leader`, numberOrText)
      : numberOrText(gap, `${path}.gap_to_leader`),
    points: numberOrNull(record.points, `${path}.points`),
  };
}

export function parseOpenF1Driver(
  value: unknown,
  path: string,
): OpenF1ApiDriver {
  const record = expectRecord(value, path);
  return {
    session_key: expectIntegerLike(record.session_key, `${path}.session_key`),
    driver_number: expectIntegerLike(
      record.driver_number,
      `${path}.driver_number`,
    ),
    full_name: optionalString(record.full_name, `${path}.full_name`) ?? null,
    name_acronym:
      optionalString(record.name_acronym, `${path}.name_acronym`) ?? null,
    last_name: optionalString(record.last_name, `${path}.last_name`) ?? null,
    team_name: optionalString(record.team_name, `${path}.team_name`) ?? null,
  };
}
