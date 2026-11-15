import type { RoundSummary } from '../api-v1/types';
import { requestSeriesRounds } from './series-sources';
import type { DateRange } from './series-sources';
import { SERIES_THEMES } from './series-theme';
import type { SeriesTheme } from './series-theme';
import { addDays, isDayKey, mondayOf } from './week';

// Server side: the rounds the Home needs, for every series.
//
// The server does not know the visitor's time zone, so it asks in UTC for three weeks around the
// anchor week (the week before, the week itself, the week after, plus a day). That covers every
// week a visitor could mean at any time zone, and the previous week for the Monday rule. The
// browser then groups the sessions into days in the visitor's own zone.

export interface HomeFailure {
  seriesId: string;
  code: string;
  message: string;
}

export interface HomeData {
  /** The Monday the three weeks are built around. */
  anchorMonday: string;
  /** The week asked for in the address bar (?week=), or null for "the default week". */
  weekParam: string | null;
  rounds: RoundSummary[];
  /** Requests that failed. An empty list of rounds is never the answer to a failure. */
  failures: HomeFailure[];
  /** When the server built this, in ms. The browser starts from it so the first render matches. */
  renderedAtMs: number;
}

export function homeRange(anchorMonday: string): DateRange {
  return { from: addDays(anchorMonday, -7), to: addDays(anchorMonday, 15) };
}

/** The Monday of the week in ?week=, or null if the value is missing or not a date. */
export function parseWeekParam(value: string | undefined): string | null {
  return isDayKey(value) ? mondayOf(value) : null;
}

export async function loadHomeData(
  weekParam: string | null,
  nowMs: number = Date.now(),
  themes: readonly SeriesTheme[] = SERIES_THEMES,
): Promise<HomeData> {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const anchorMonday = weekParam ?? mondayOf(today);
  const range = homeRange(anchorMonday);

  const answers = await Promise.all(
    themes.map(async (theme) => ({ theme, result: await requestSeriesRounds(theme, range) })),
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
  return { anchorMonday, weekParam, rounds: [...rounds.values()], failures, renderedAtMs: nowMs };
}
