import type { RoundSummary } from '../api-v1/types';
import { weekQueryRange } from './adapter-v1';
import { requestSeriesRounds } from './series-sources';
import { SERIES_THEMES } from './series-theme';
import type { SeriesTheme } from './series-theme';
import { addDays, isDayKey, mondayOf, pickDefaultWeek } from './week';

// Server side: the schedule of ONE week, and nothing else. The standings are loaded separately
// (standings-data.ts) so they can never hold the schedule back.
//
// The week is asked for by track date (`dateBasis=track`): a race weekend stays together whatever time zone the
// visitor is in, and the backend sends only the sessions of that week. The server does not know the visitor's
// time zone, so it asks in UTC; the browser then groups the sessions into days in the visitor's own zone.

/** Longest wait for the backend. After it the page shows an error with a Retry, not an endless wait. */
export const SCHEDULE_TIMEOUT_MS = 8_000;

export interface HomeFailure {
  seriesId: string;
  code: string;
  message: string;
}

export interface ScheduleData {
  /** The Monday of the week shown. */
  week: string;
  rounds: RoundSummary[];
  /** Round requests that failed. An empty list of rounds is never the answer to a failure. */
  failures: HomeFailure[];
  /** When the server built this, in ms. The browser starts from it so the first render matches. */
  renderedAtMs: number;
}

/** The Monday of the week in ?week=, or null if the value is missing or not a date. */
export function parseWeekParam(value: string | undefined): string | null {
  return isDayKey(value) ? mondayOf(value) : null;
}

interface WeekRounds {
  rounds: RoundSummary[];
  failures: HomeFailure[];
}

async function loadWeekRounds(week: string, themes: readonly SeriesTheme[]): Promise<WeekRounds> {
  const range = weekQueryRange(week);
  const answers = await Promise.all(
    themes.map(async (theme) => ({
      theme,
      result: await requestSeriesRounds(theme, range, { timeoutMs: SCHEDULE_TIMEOUT_MS }),
    })),
  );
  const rounds = new Map<string, RoundSummary>();
  const failures: HomeFailure[] = [];
  for (const { theme, result } of answers) {
    if (result.ok) {
      for (const round of result.data.rounds) rounds.set(round.id, round);
    } else {
      failures.push({ seriesId: theme.id, code: result.error.code, message: result.error.message });
    }
  }
  return { rounds: [...rounds.values()], failures };
}

/**
 * The week to show when the address has no ?week=: this week, except on a Monday (UTC) while a session of the
 * weekend before is not finished (HANDOFF.md section 3). On a Monday both weeks are asked for at the same time,
 * so the rule costs no extra waiting.
 */
async function loadDefaultWeek(
  nowMs: number,
  themes: readonly SeriesTheme[],
): Promise<{ week: string } & WeekRounds> {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const thisMonday = mondayOf(today);
  if (today !== thisMonday) return { week: thisMonday, ...(await loadWeekRounds(thisMonday, themes)) };

  const previousMonday = addDays(thisMonday, -7);
  const [previous, current] = await Promise.all([
    loadWeekRounds(previousMonday, themes),
    loadWeekRounds(thisMonday, themes),
  ]);
  if (previous.failures.length === 0) {
    const previousWeekSessions = previous.rounds.flatMap((round) =>
      round.sessions
        .filter((session) => session.lifecycle.status !== 'cancelled')
        .map((session) => ({ startsAt: session.scheduledStartAt, endsAt: session.scheduledEndAt })),
    );
    const week = pickDefaultWeek({ nowMs, userTimeZone: 'UTC', previousWeekSessions });
    if (week === previousMonday) return { week, ...previous };
  }
  return { week: thisMonday, ...current };
}

export async function loadScheduleData(
  weekParam: string | null,
  nowMs: number = Date.now(),
  themes: readonly SeriesTheme[] = SERIES_THEMES,
): Promise<ScheduleData> {
  const loaded = weekParam
    ? { week: weekParam, ...(await loadWeekRounds(weekParam, themes)) }
    : await loadDefaultWeek(nowMs, themes);
  return { week: loaded.week, rounds: loaded.rounds, failures: loaded.failures, renderedAtMs: nowMs };
}
