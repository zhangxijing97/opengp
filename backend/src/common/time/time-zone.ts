// IANA time-zone helpers built on the platform Intl API (Node ships full ICU).
// No fixed-offset arithmetic: every conversion asks ICU for the wall clock at a
// concrete instant, which keeps DST transitions correct.

import { parseCalendarDate } from './calendar-date';

// Accepts names such as "UTC", "America/Los_Angeles", "Etc/GMT+8".
// Rejects raw offsets such as "+08:00", which Intl would otherwise accept.
const IANA_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/;
const MAX_FORMATTER_CACHE = 64;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Returns the canonical IANA name, or null when the zone is not valid. */
export function resolveIanaTimeZone(input: string): string | null {
  if (!IANA_NAME_PATTERN.test(input)) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: input });
    return formatter.resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  if (formatterCache.size >= MAX_FORMATTER_CACHE) {
    const [oldest] = formatterCache.keys();
    if (oldest !== undefined) formatterCache.delete(oldest);
  }
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function localPartsOf(
  instantMs: number,
  timeZone: string,
): LocalDateTimeParts {
  const values: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(instantMs)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
  };
}

/** Local calendar date (YYYY-MM-DD) of an instant in the given zone. */
export function localDateOf(instantMs: number, timeZone: string): string {
  const parts = localPartsOf(instantMs, timeZone);
  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * First UTC instant (ms, second precision) whose local date in `timeZone` is
 * `date` or later. Handles DST gaps at midnight by returning the first instant
 * that exists on that local date.
 */
export function startOfLocalDayUtcMs(date: string, timeZone: string): number {
  const parts = parseCalendarDate(date);
  if (!parts) throw new RangeError(`Invalid calendar date "${date}"`);

  const guess = Date.UTC(parts.year, parts.month - 1, parts.day);
  // Real-world UTC offsets lie within +/-15h; search that window by seconds.
  let low = Math.floor((guess - 15 * 3_600_000) / 1000);
  let high = Math.floor((guess + 15 * 3_600_000) / 1000);

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localDateOf(mid * 1000, timeZone) >= date) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low * 1000;
}

/** ISO 8601 UTC without a zero millisecond suffix, e.g. 2025-03-21T03:30:00Z. */
export function toIsoUtc(instantMs: number): string {
  const iso = new Date(instantMs).toISOString();
  return iso.endsWith('.000Z') ? `${iso.slice(0, -5)}Z` : iso;
}

const RFC3339_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Parses an RFC 3339 instant that carries an explicit offset or Z.
 * Date-only strings and zone-less timestamps return null on purpose.
 */
export function parseIsoInstant(value: string): number | null {
  if (!RFC3339_INSTANT_PATTERN.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
