import type { RoundSummary, RoundsListData, SessionSummary } from '../api-v1/types';
import { happens } from './row-text';
import { rowStatusOf, tierOf } from './tier';
import { frontendSeriesId } from './series-theme';
import type { DayScheduleVM, HomeVM, SessionRowVM } from './types';
import type { DayCounts } from './labels';
import {
  addDays,
  dayParts,
  daysBetween,
  isValidTimeZone,
  localDate,
  weekOfRound,
} from './week';

// Adapter from `/api/v1/rounds` to the Home view model. One adapter per API version
// (HANDOFF.md section 4). It never fakes data: missing times stay null, missing track time
// zones are handled by an explicit fallback, and sessions without any date are reported.

export interface AdaptContext {
  userTimeZone: string;
  nowMs: number;
  /** Frontend series ids the user follows. */
  followedSeriesIds: ReadonlySet<string>;
  /** Track time zone of a round, when known. `/api/v1` does not provide it yet. */
  trackTimeZone?: (round: RoundSummary) => string | null;
}

/** API query for a week: from Monday to the Monday after, inclusive, so the Monday spill-over of the weekend is there. */
export function weekQueryRange(weekStart: string): { from: string; to: string } {
  return { from: weekStart, to: addDays(weekStart, 8) };
}

function trackZoneOf(round: RoundSummary, ctx: AdaptContext): string | null {
  const zone = ctx.trackTimeZone ? ctx.trackTimeZone(round) : null;
  // A zone the browser does not know is treated like an unknown zone, not as a crash.
  return zone !== null && isValidTimeZone(zone) ? zone : null;
}

/** An instant the API sent that does not parse is treated as not known. */
function validInstant(value: string | null): string | null {
  return value !== null && !Number.isNaN(Date.parse(value)) ? value : null;
}

interface Placed {
  row: SessionRowVM;
  groupDay: string;
  sortKey: number;
  sequence: number;
}

function placeSession(
  round: RoundSummary,
  session: SessionSummary,
  ctx: AdaptContext,
  weekStart: string,
  weekEnd: string,
): Placed | null {
  const trackZone = trackZoneOf(round, ctx);
  const startsAt =
    session.schedulePrecision === 'instant' ? validInstant(session.scheduledStartAt) : null;

  let groupDay: string | null = null;
  let userDay: string | null = null;
  if (startsAt) {
    userDay = localDate(startsAt, ctx.userTimeZone);
    groupDay = trackZone ? localDate(startsAt, trackZone) : userDay;
  } else if (session.scheduledDate) {
    // Date-only: a source-local date. Shown as TBC, never as midnight.
    groupDay = session.scheduledDate;
  } else if (validInstant(round.startsAt)) {
    groupDay = localDate(round.startsAt as string, trackZone ?? ctx.userTimeZone);
  }
  if (!groupDay) return null;

  // A session of this weekend that the user's calendar pushes outside the week stays with the
  // weekend: it is shown at the edge of the week with a day offset.
  const clamped = groupDay > weekEnd ? weekEnd : groupDay < weekStart ? weekStart : groupDay;
  const dayOffset = userDay ? daysBetween(clamped, userDay) : 0;

  const status = rowStatusOf(session.lifecycle.status);
  const row: SessionRowVM = {
    id: session.id,
    roundId: round.id,
    seriesId: frontendSeriesId(round.series.id),
    eventName: round.name,
    sessionName: session.name,
    tier: tierOf(session.type),
    state: status.state,
    exception: status.exception,
    startsAt,
    endsAt: validInstant(session.scheduledEndAt),
    dayOffset,
    starred: ctx.followedSeriesIds.has(frontendSeriesId(round.series.id)),
    result: { availability: session.resultAvailability },
  };
  return {
    row,
    groupDay: clamped,
    sortKey: startsAt ? Date.parse(startsAt) : Number.POSITIVE_INFINITY,
    sequence: session.sequence ?? 0,
  };
}

function buildDays(placed: Placed[], todayKey: string): DayScheduleVM[] {
  const byDay = new Map<string, Placed[]>();
  for (const item of placed) {
    const list = byDay.get(item.groupDay);
    if (list) list.push(item);
    else byDay.set(item.groupDay, [item]);
  }
  return [...byDay.keys()]
    .sort()
    .map((dayKey) => {
      // By start time; live sessions are not pinned; unknown starts (TBC) go last.
      const rows = (byDay.get(dayKey) ?? [])
        .sort(
          (a, b) =>
            (a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) ||
            a.sequence - b.sequence ||
            a.row.id.localeCompare(b.row.id),
        )
        .map((item) => item.row);
      return {
        dayKey,
        ...dayParts(dayKey),
        isToday: dayKey === todayKey,
        // Cancelled and postponed sessions are listed but not counted: "6 to go" must not include them.
        sessionCount: rows.filter(happens).length,
        afterMidnightCount: rows.filter((row) => happens(row) && row.dayOffset > 0).length,
        rows,
      };
    });
}

export function buildHomeVM(
  data: RoundsListData,
  ctx: AdaptContext,
  weekStart: string,
): HomeVM {
  return buildHomeVMFromRounds(data.rounds, ctx, weekStart);
}

export function buildHomeVMFromRounds(
  rounds: readonly RoundSummary[],
  ctx: AdaptContext,
  weekStart: string,
): HomeVM {
  const weekEnd = addDays(weekStart, 6);
  const todayKey = localDate(ctx.nowMs, ctx.userTimeZone);
  const placed: Placed[] = [];
  const skippedSessionIds: string[] = [];

  for (const round of rounds) {
    // The weekend rule: a round belongs to the week of its first session.
    if (weekOfRound(round, trackZoneOf(round, ctx)) !== weekStart) continue;
    for (const session of round.sessions) {
      // Sub-sessions (Q1, stages) are not shown as rows (HANDOFF.md section 2, tier T5).
      if (tierOf(session.type) === 'T5') continue;
      const item = placeSession(round, session, ctx, weekStart, weekEnd);
      if (item) placed.push(item);
      else skippedSessionIds.push(session.id);
    }
  }

  return {
    weekStart,
    weekEnd,
    following: buildDays(placed.filter((item) => item.row.starred), todayKey),
    allSeries: buildDays(placed.filter((item) => !item.row.starred), todayKey),
    skippedSessionIds,
  };
}

/** Counts for the today cell. Cancelled and postponed sessions are not part of the total. */
export function countsOf(day: DayScheduleVM): DayCounts {
  const active = day.rows.filter(happens);
  return {
    total: active.length,
    done: active.filter((row) => row.state === 'done').length,
    live: active.filter((row) => row.state === 'live').length,
  };
}
