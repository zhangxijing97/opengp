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
import {
  sessionDayKey,
  viewerLocalDate,
} from '../../canonical/interval-selection';
import type { PreviewOutcome } from '../../canonical/results.types';
import { inferSessionLifecycle } from '../../canonical/session-lifecycle';
import { daysBetween } from '../../common/time/calendar-date';
import type { DateBasis } from '../../common/time/local-date-interval';
import type {
  RoundSummary,
  SessionLifecycleDto,
  SessionSummary,
} from '../dto/api-v1.dto';

export {
  UNKNOWN_END_COMPLETION_GRACE_MS,
  inferSessionLifecycle,
} from '../../canonical/session-lifecycle';

export interface ProjectionContext {
  timeZone: string;
  dateBasis: DateBasis;
  /** Result teasers by session ID; absent sessions use the inferred value. */
  previews?: Map<string, PreviewOutcome>;
}

const DEFAULT_CONTEXT: ProjectionContext = {
  timeZone: 'UTC',
  dateBasis: 'viewer',
};

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
  context: ProjectionContext = DEFAULT_CONTEXT,
): SessionSummary {
  const lifecycle = inferSessionLifecycle(session, nowMs);
  const localDate = viewerLocalDate(session, context.timeZone);
  const dayOffset =
    session.schedulePrecision === 'instant' &&
    localDate &&
    session.trackLocalDate
      ? daysBetween(session.trackLocalDate, localDate)
      : null;
  const outcome = context.previews?.get(session.id);
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
    localDate,
    trackLocalDate: session.trackLocalDate,
    trackTimeZone: session.trackTimeZone,
    dayOffset,
    lifecycle,
    resultAvailability:
      outcome?.availability ??
      inferListResultAvailability(session, season, lifecycle),
    resultPreview: outcome?.preview ?? null,
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
  dateBasis: DateBasis = 'viewer',
): (a: CanonicalSession, b: CanonicalSession) => number {
  return (a, b) => {
    const dayA = sessionDayKey(a, timeZone, dateBasis);
    const dayB = sessionDayKey(b, timeZone, dateBasis);
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
  context: ProjectionContext = DEFAULT_CONTEXT,
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
    trackTimeZone: round.trackTimeZone,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
    status: status.status,
    statusBasis: status.basis,
    sessions: [...sessions]
      .sort(compareSessionsInZone(context.timeZone, context.dateBasis))
      .map((session) => projectSession(session, round.season, nowMs, context)),
  };
}
