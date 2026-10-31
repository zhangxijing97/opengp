// Pure calendar-date (YYYY-MM-DD) arithmetic. No time zones and no Date
// parsing of date-only strings, so a date-only fact is never turned into a
// fabricated midnight instant.

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MS_PER_DAY = 86_400_000;

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export interface CalendarDateRange {
  /** Inclusive local calendar date. */
  from: string;
  /** Exclusive local calendar date. */
  to: string;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

/** Strictly parses YYYY-MM-DD (years 1000-9999). Returns null when invalid. */
export function parseCalendarDate(value: string): CalendarDateParts | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1000) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

export function isCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

function requireCalendarDate(value: string): CalendarDateParts {
  const parts = parseCalendarDate(value);
  if (!parts) {
    throw new RangeError(`Invalid calendar date "${value}"`);
  }
  return parts;
}

export function formatCalendarDate(parts: CalendarDateParts): string {
  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Days since 1970-01-01 (proleptic Gregorian). */
export function toEpochDay(value: string): number {
  const { year, month, day } = requireCalendarDate(value);
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function fromEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY);
  return formatCalendarDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function addDays(value: string, days: number): string {
  return fromEpochDay(toEpochDay(value) + days);
}

/** Number of calendar days from `from` to `to` (to - from). */
export function daysBetween(from: string, to: string): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function compareCalendarDates(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(value: string): number {
  // 1970-01-01 was a Thursday (ISO weekday 4).
  const epochDay = toEpochDay(value);
  return ((((epochDay + 3) % 7) + 7) % 7) + 1;
}

export function startOfIsoWeek(value: string): string {
  return addDays(value, 1 - isoWeekday(value));
}

/**
 * Monday-to-next-Monday range containing `value`. This is the range the
 * frontend sends as `from`/`to` for "This Week"; shift by +/-1 week for
 * "Next Week"/"Last Week".
 */
export function isoWeekRange(value: string, weekOffset = 0): CalendarDateRange {
  const from = addDays(startOfIsoWeek(value), weekOffset * 7);
  return { from, to: addDays(from, 7) };
}
