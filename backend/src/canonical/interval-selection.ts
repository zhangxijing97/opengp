// Series-agnostic selection of a Round's sessions for a local-date interval.
// Shared by every SeriesCalendarSource and by the v1 projection.

import { localDateOf } from '../common/time/time-zone';
import { intervalContainsDate } from '../common/time/local-date-interval';
import type {
  DateBasis,
  LocalDateInterval,
} from '../common/time/local-date-interval';
import type { CanonicalRound, CanonicalSession } from './canonical.types';

/** Start date in the viewer's zone for instants; source date otherwise. */
export function viewerLocalDate(
  session: CanonicalSession,
  timeZone: string,
): string | null {
  if (session.schedulePrecision === 'instant' && session.scheduledStartAt) {
    return localDateOf(Date.parse(session.scheduledStartAt), timeZone);
  }
  return session.scheduledDate;
}

/**
 * Calendar day used for grouping. `track` uses the venue date (event-weekend
 * grouping) and falls back to the viewer date when the venue zone is unknown.
 */
export function sessionDayKey(
  session: CanonicalSession,
  timeZone: string,
  basis: DateBasis = 'viewer',
): string {
  const day =
    basis === 'track'
      ? (session.trackLocalDate ?? viewerLocalDate(session, timeZone))
      : viewerLocalDate(session, timeZone);
  return day ?? '9999-12-31';
}

export function hasKnownDate(session: CanonicalSession): boolean {
  return (
    (session.schedulePrecision === 'instant' &&
      session.scheduledStartAt !== null) ||
    session.scheduledDate !== null
  );
}

export function sessionInInterval(
  session: CanonicalSession,
  interval: LocalDateInterval,
): boolean {
  if (!hasKnownDate(session)) return false;
  return intervalContainsDate(
    interval,
    sessionDayKey(session, interval.timeZone, interval.dateBasis),
  );
}

/**
 * Sessions of `round` to show for the interval ([] = Round not included).
 * Known dates must fall inside the interval; sessions without any date are
 * added only when the Round's known dates overlap the interval.
 */
export function selectSessionsForInterval(
  round: CanonicalRound,
  interval: LocalDateInterval,
): CanonicalSession[] {
  const inside = round.sessions.filter((session) =>
    sessionInInterval(session, interval),
  );
  const undated = round.sessions.filter((session) => !hasKnownDate(session));
  if (undated.length === 0) return inside;

  const days = round.sessions
    .filter(hasKnownDate)
    .map((session) =>
      sessionDayKey(session, interval.timeZone, interval.dateBasis),
    )
    .sort();
  const overlaps =
    days.length > 0 &&
    days[0] < interval.to &&
    days[days.length - 1] >= interval.from;
  return inside.length > 0 || overlaps ? [...inside, ...undated] : inside;
}
