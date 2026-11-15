// Schedule- and clock-based lifecycle inference shared by the calendar
// projection and the result services. Only an explicit provider cancellation
// is labelled `provider`; everything else is `time_inferred` or `unknown`.

import { addDays } from '../common/time/calendar-date';
import { toIsoUtc } from '../common/time/time-zone';
import type {
  CanonicalSession,
  Lifecycle,
  LifecycleBasis,
} from './canonical.types';

export interface SessionLifecycle {
  status: Lifecycle;
  basis: LifecycleBasis;
}

/** Without a planned end, a session is presumed over this long after start. */
export const UNKNOWN_END_COMPLETION_GRACE_MS = 6 * 3_600_000;

export function inferSessionLifecycle(
  session: CanonicalSession,
  nowMs: number,
): SessionLifecycle {
  if (session.cancelled === true) {
    return { status: 'cancelled', basis: 'provider' };
  }

  if (session.schedulePrecision === 'instant' && session.scheduledStartAt) {
    const start = Date.parse(session.scheduledStartAt);
    if (nowMs < start) return { status: 'scheduled', basis: 'time_inferred' };
    if (session.scheduledEndAt) {
      const end = Date.parse(session.scheduledEndAt);
      return nowMs < end
        ? { status: 'in_progress', basis: 'time_inferred' }
        : { status: 'completed', basis: 'time_inferred' };
    }
    return nowMs >= start + UNKNOWN_END_COMPLETION_GRACE_MS
      ? { status: 'completed', basis: 'time_inferred' }
      : { status: 'unknown', basis: 'unknown' };
  }

  if (session.schedulePrecision === 'date' && session.scheduledDate) {
    // A source-local date can be up to a day away from UTC "today".
    const today = toIsoUtc(nowMs).slice(0, 10);
    if (today < addDays(session.scheduledDate, -1)) {
      return { status: 'scheduled', basis: 'time_inferred' };
    }
    if (today > addDays(session.scheduledDate, 1)) {
      return { status: 'completed', basis: 'time_inferred' };
    }
  }

  return { status: 'unknown', basis: 'unknown' };
}
