// Projects canonical Rounds/Sessions into v1 DTOs. Lifecycle is derived from
// the schedule and the clock and is labelled time_inferred; only an explicit
// provider cancellation is labelled provider. Result availability in list
// views is inferred without network calls and never claims results exist.

import type {
  Availability,
  CanonicalRound,
  CanonicalSession,
  LifecycleBasis,
  RoundStatus,
} from '../../canonical/canonical.types';
import { sessionDayKey } from '../../canonical/interval-selection';
import { addDays } from '../../common/time/calendar-date';
import { toIsoUtc } from '../../common/time/time-zone';
import type {
  RoundSummary,
  SessionLifecycleDto,
  SessionSummary,
} from '../dto/api-v1.dto';

/** Without a planned end, a session is presumed over this long after start. */
export const UNKNOWN_END_COMPLETION_GRACE_MS = 6 * 3_600_000;

export function inferSessionLifecycle(
  session: CanonicalSession,
  nowMs: number,
): SessionLifecycleDto {
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

export function inferListResultAvailability(
  session: CanonicalSession,
  season: number,
  lifecycle: SessionLifecycleDto,
): Availability {
  if (lifecycle.status === 'cancelled') return 'not_applicable';
  if (
    session.resultCoverageFromSeason !== null &&
    season < session.resultCoverageFromSeason
  ) {
    return 'unsupported';
  }
  if (lifecycle.status === 'scheduled' || lifecycle.status === 'in_progress') {
    return 'not_published';
  }
  // Completed by the clock does not mean results are published or fetched.
  return 'unknown';
}

export function deriveRoundStatus(lifecycles: SessionLifecycleDto[]): {
  status: RoundStatus;
  basis: LifecycleBasis;
} {
  if (lifecycles.length === 0) return { status: 'unknown', basis: 'unknown' };
  const active = lifecycles.filter((item) => item.status !== 'cancelled');
  if (active.length === 0) return { status: 'cancelled', basis: 'provider' };
  if (active.some((item) => item.status === 'in_progress')) {
    return { status: 'ongoing', basis: 'time_inferred' };
  }
  const completed = active.filter((item) => item.status === 'completed').length;
  const scheduled = active.filter((item) => item.status === 'scheduled').length;
  if (completed === active.length) {
    return { status: 'completed', basis: 'time_inferred' };
  }
  if (scheduled === active.length) {
    return { status: 'scheduled', basis: 'time_inferred' };
  }
  if (completed > 0) return { status: 'ongoing', basis: 'time_inferred' };
  return { status: 'unknown', basis: 'unknown' };
}

export function projectSession(
  session: CanonicalSession,
  season: number,
  nowMs: number,
): SessionSummary {
  const lifecycle = inferSessionLifecycle(session, nowMs);
  return {
    id: session.id,
    roundId: session.roundId,
    name: session.name,
    type: session.type,
    sequence: session.sequence,
    scheduledStartAt: session.scheduledStartAt,
    scheduledDate: session.scheduledDate,
    schedulePrecision: session.schedulePrecision,
    scheduledEndAt: session.scheduledEndAt,
    lifecycle,
    resultAvailability: inferListResultAvailability(session, season, lifecycle),
    resultPreview: null,
  };
}

function precisionRank(session: CanonicalSession): number {
  if (session.schedulePrecision === 'instant' && session.scheduledStartAt)
    return 0;
  if (session.scheduledDate) return 1;
  return 2;
}

/** Known starts ascending; date-only after timed sessions of that day; unknown last. */
export function compareSessionsInZone(
  timeZone: string,
): (a: CanonicalSession, b: CanonicalSession) => number {
  return (a, b) => {
    const dayA = sessionDayKey(a, timeZone);
    const dayB = sessionDayKey(b, timeZone);
    if (dayA !== dayB) return dayA < dayB ? -1 : 1;
    const rank = precisionRank(a) - precisionRank(b);
    if (rank !== 0) return rank;
    if (
      a.scheduledStartAt &&
      b.scheduledStartAt &&
      a.scheduledStartAt !== b.scheduledStartAt
    ) {
      return a.scheduledStartAt < b.scheduledStartAt ? -1 : 1;
    }
    return a.order - b.order || a.id.localeCompare(b.id);
  };
}

/**
 * Projects a Round. `sessions` is the subset to emit (interval-clipped for
 * list views); Round status always uses ALL sessions of the Round.
 */
export function projectRound(
  round: CanonicalRound,
  sessions: CanonicalSession[],
  nowMs: number,
  timeZone = 'UTC',
): RoundSummary {
  const allLifecycles = round.sessions.map((session) =>
    inferSessionLifecycle(session, nowMs),
  );
  const status = deriveRoundStatus(allLifecycles);
  return {
    id: round.id,
    seasonId: round.seasonId,
    series: { id: round.seriesId, name: round.seriesName },
    name: round.name,
    roundNumber: round.roundNumber,
    circuit: round.circuit,
    locationLabel: round.locationLabel,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
    status: status.status,
    statusBasis: status.basis,
    sessions: [...sessions]
      .sort(compareSessionsInZone(timeZone))
      .map((session) => projectSession(session, round.season, nowMs)),
  };
}
