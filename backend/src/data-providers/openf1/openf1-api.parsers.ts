// Runtime validation for OpenF1 top-level JSON arrays.

import {
  expectArray,
  expectIntegerLike,
  expectRecord,
  expectString,
  optionalBoolean,
  optionalIntegerLike,
  optionalString,
} from '../../common/upstream/json-guards';
import type { OpenF1ApiMeeting, OpenF1ApiSession } from './openf1-api.types';

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
