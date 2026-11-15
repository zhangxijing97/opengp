// Calendar helpers for the Home week. Pure functions, no Date.now(): callers pass the time.
// A "day key" is a calendar date, YYYY-MM-DD. All day arithmetic happens on day keys in UTC,
// so it is immune to daylight saving. Instants are only converted to day keys through an
// explicit IANA time zone.

const DAY_MS = 86_400_000;

/** True for a real calendar date written YYYY-MM-DD (the format of ?week= in the address bar). */
export function isDayKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(key: string, days: number): string {
  return toKey(new Date(fromKey(key).getTime() + days * DAY_MS));
}

export function daysBetween(fromKeyValue: string, toKeyValue: string): number {
  return Math.round((fromKey(toKeyValue).getTime() - fromKey(fromKeyValue).getTime()) / DAY_MS);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key: string): number {
  return (fromKey(key).getUTCDay() + 6) % 7;
}

export function mondayOf(key: string): string {
  return addDays(key, -weekdayIndex(key));
}

/** The calendar day of an instant in a time zone. */
export function localDate(instant: string | number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export interface DayParts {
  weekday: string;
  day: number;
  month: string;
}

/** SAT / 30 / OCT for the ticket stub. Language is fixed (no language switching yet). */
export function dayParts(key: string): DayParts {
  const date = fromKey(key);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date).toUpperCase();
  return {
    weekday: format({ weekday: 'short' }),
    day: date.getUTCDate(),
    month: format({ month: 'short' }),
  };
}

/** The week of a round: the Monday of the day its first session starts (event weekend rule). */
export function weekOfRound(
  round: { startsAt: string | null; endsAt: string | null },
  trackTimeZone: string | null,
): string | null {
  const anchor = round.startsAt ?? round.endsAt;
  if (!anchor || Number.isNaN(Date.parse(anchor))) return null;
  return mondayOf(localDate(anchor, trackTimeZone ?? 'UTC'));
}

// How long a session without a planned end counts as unfinished.
const DEFAULT_SESSION_MS = 3 * 3_600_000;

export interface SpillSession {
  startsAt: string | null;
  endsAt: string | null;
}

/**
 * Default week (HANDOFF.md section 3, rule 1): the current week, except on Monday (user's
 * calendar) while a session of the previous week is still unfinished and starts on a day
 * that is Monday or later in the user's time zone. `previousWeekSessions` are the sessions of
 * the rounds that belong to the previous week.
 */
export function pickDefaultWeek(args: {
  nowMs: number;
  userTimeZone: string;
  previousWeekSessions: readonly SpillSession[];
}): string {
  const today = localDate(args.nowMs, args.userTimeZone);
  const thisWeek = mondayOf(today);
  if (weekdayIndex(today) !== 0) return thisWeek;

  const spilling = args.previousWeekSessions.some((session) => {
    if (!session.startsAt) return false;
    if (localDate(session.startsAt, args.userTimeZone) < today) return false;
    const end = session.endsAt
      ? Date.parse(session.endsAt)
      : Date.parse(session.startsAt) + DEFAULT_SESSION_MS;
    return end > args.nowMs;
  });
  return spilling ? addDays(thisWeek, -7) : thisWeek;
}
