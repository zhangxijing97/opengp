// Validation and membership tests for the v1 calendar interval:
// `from` (inclusive) and `to` (exclusive) are LOCAL calendar dates in `tz`.
// Membership of an instant is decided by its local date in `tz`, so DST
// changes inside the interval cannot shift boundaries.

import {
  addDays,
  daysBetween,
  isCalendarDate,
  parseCalendarDate,
} from './calendar-date';
import {
  localDateOf,
  resolveIanaTimeZone,
  startOfLocalDayUtcMs,
  toIsoUtc,
} from './time-zone';

export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 31;
export const DEFAULT_TIME_ZONE = 'UTC';

export interface LocalDateInterval {
  from: string;
  to: string;
  timeZone: string;
  days: number;
  /** UTC instant of local midnight at `from` (informational). */
  startsAtUtc: string;
  /** UTC instant of local midnight at `to` (informational, exclusive). */
  endsAtUtc: string;
}

export type LocalDateIntervalParseResult =
  | { ok: true; interval: LocalDateInterval }
  | { ok: false; errors: string[] };

export interface LocalDateIntervalInput {
  from: unknown;
  to: unknown;
  tz: unknown;
}

function readSingleString(
  name: string,
  value: unknown,
  errors: string[],
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    errors.push(`"${name}" must be provided exactly once as a string.`);
    return undefined;
  }
  return value;
}

export function parseLocalDateInterval(
  input: LocalDateIntervalInput,
): LocalDateIntervalParseResult {
  const errors: string[] = [];

  const from = readSingleString('from', input.from, errors);
  const to = readSingleString('to', input.to, errors);
  const tzRaw = readSingleString('tz', input.tz, errors);

  if (input.from === undefined) {
    errors.push('"from" is required (YYYY-MM-DD, inclusive local date).');
  } else if (from !== undefined && !isCalendarDate(from)) {
    errors.push('"from" must be a valid calendar date in YYYY-MM-DD format.');
  }

  if (input.to === undefined) {
    errors.push('"to" is required (YYYY-MM-DD, exclusive local date).');
  } else if (to !== undefined && !isCalendarDate(to)) {
    errors.push('"to" must be a valid calendar date in YYYY-MM-DD format.');
  }

  let timeZone = DEFAULT_TIME_ZONE;
  if (tzRaw !== undefined) {
    const resolved = tzRaw.length > 0 ? resolveIanaTimeZone(tzRaw) : null;
    if (!resolved) {
      errors.push(
        '"tz" must be a valid IANA time zone such as "Europe/London".',
      );
    } else {
      timeZone = resolved;
    }
  }

  if (errors.length > 0 || from === undefined || to === undefined) {
    return { ok: false, errors };
  }

  const days = daysBetween(from, to);
  if (days < MIN_INTERVAL_DAYS) {
    errors.push('"from" must be earlier than "to".');
  } else if (days > MAX_INTERVAL_DAYS) {
    errors.push(`The interval may span at most ${MAX_INTERVAL_DAYS} days.`);
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    interval: {
      from,
      to,
      timeZone,
      days,
      startsAtUtc: toIsoUtc(startOfLocalDayUtcMs(from, timeZone)),
      endsAtUtc: toIsoUtc(startOfLocalDayUtcMs(to, timeZone)),
    },
  };
}

export function intervalContainsDate(
  interval: LocalDateInterval,
  date: string,
): boolean {
  return date >= interval.from && date < interval.to;
}

export function intervalContainsInstant(
  interval: LocalDateInterval,
  instantMs: number,
): boolean {
  return intervalContainsDate(
    interval,
    localDateOf(instantMs, interval.timeZone),
  );
}

/**
 * Season years whose calendars can contain sessions inside the interval.
 * One day of padding on each side covers any +/-14h zone offset, so a session
 * on Dec 31 at a venue can still appear on Jan 1 for the viewer.
 */
export function candidateYearsForInterval(
  interval: LocalDateInterval,
): number[] {
  const firstYear = parseCalendarDate(addDays(interval.from, -1))?.year;
  const lastYear = parseCalendarDate(interval.to)?.year;
  if (firstYear === undefined || lastYear === undefined) return [];

  const years: number[] = [];
  for (let year = firstYear; year <= lastYear; year++) years.push(year);
  return years;
}

/** Years that contain at least one local date of the interval itself (no padding). */
export function coreYearsForInterval(interval: LocalDateInterval): number[] {
  const firstYear = parseCalendarDate(interval.from)?.year;
  const lastYear = parseCalendarDate(addDays(interval.to, -1))?.year;
  if (firstYear === undefined || lastYear === undefined) return [];

  const years: number[] = [];
  for (let year = firstYear; year <= lastYear; year++) years.push(year);
  return years;
}
