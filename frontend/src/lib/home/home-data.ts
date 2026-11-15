import { getStandings } from '../api-v1/client';
import type { RoundSummary, StandingsData, StandingsSubjectType } from '../api-v1/types';
import { weekQueryRange } from './adapter-v1';
import { requestSeriesRounds } from './series-sources';
import { SERIES_THEMES } from './series-theme';
import type { SeriesTheme } from './series-theme';
import { addDays, isDayKey, mondayOf, pickDefaultWeek } from './week';

// Server side: what the Home needs for ONE week.
//
// The week is asked for by track date (`dateBasis=track`): a race weekend stays together whatever time zone
// the visitor is in, and the backend sends only the sessions of that week. The server does not know the
// visitor's time zone, so it asks in UTC; the browser then groups the sessions into days in the visitor's
// own zone. Standings are loaded for every series the backend serves (today Formula 1).

export interface HomeFailure {
  seriesId: string;
  code: string;
  message: string;
}

export interface HomeStandings {
  /** Frontend series id. */
  seriesId: string;
  seriesName: string;
  seasonId: string;
  driver: StandingsData | null;
  team: StandingsData | null;
  /** Requests that failed. A failed request is never shown as an empty table. */
  failures: { subjectType: StandingsSubjectType; code: string; message: string }[];
}

export interface HomeData {
  /** The Monday of the week shown. */
  week: string;
  rounds: RoundSummary[];
  /** Round requests that failed. An empty list of rounds is never the answer to a failure. */
  failures: HomeFailure[];
  /** The standings of the first series that has them, or null when no series has any. */
  standings: HomeStandings | null;
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
  return { rounds: [...rounds.values()], failures };
}

/**
 * The week to show when the address has no ?week=: this week, except on a Monday (UTC) while a session of the
 * weekend before is not finished (HANDOFF.md section 3). Only then is the week before loaded as well.
 */
async function loadDefaultWeek(
  nowMs: number,
  themes: readonly SeriesTheme[],
): Promise<{ week: string } & WeekRounds> {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const thisMonday = mondayOf(today);
  if (today === thisMonday) {
    const previousMonday = addDays(thisMonday, -7);
    const previous = await loadWeekRounds(previousMonday, themes);
    if (previous.failures.length === 0) {
      const previousWeekSessions = previous.rounds.flatMap((round) =>
        round.sessions
          .filter((session) => session.lifecycle.status !== 'cancelled')
          .map((session) => ({ startsAt: session.scheduledStartAt, endsAt: session.scheduledEndAt })),
      );
      const week = pickDefaultWeek({ nowMs, userTimeZone: 'UTC', previousWeekSessions });
      if (week === previousMonday) return { week, ...previous };
    }
  }
  return { week: thisMonday, ...(await loadWeekRounds(thisMonday, themes)) };
}

async function loadStandings(
  week: string,
  themes: readonly SeriesTheme[],
): Promise<HomeStandings | null> {
  const theme = themes.find((candidate) => candidate.apiId !== null);
  if (!theme || !theme.apiId) return null;
  // The season of a week is the year of its Thursday (the ISO rule), so a week across New Year is not split.
  const seasonId = `${theme.apiId}:${addDays(week, 3).slice(0, 4)}`;
  const [driver, team] = await Promise.all([
    getStandings({ seasonId, subjectType: 'driver' }),
    getStandings({ seasonId, subjectType: 'team' }),
  ]);
  const failures: HomeStandings['failures'] = [];
  const take = (result: typeof driver, subjectType: StandingsSubjectType): StandingsData | null => {
    if (result.ok) return result.data.standings;
    failures.push({ subjectType, code: result.error.code, message: result.error.message });
    return null;
  };
  return {
    seriesId: theme.id,
    seriesName: theme.name,
    seasonId,
    driver: take(driver, 'driver'),
    team: take(team, 'team'),
    failures,
  };
}

export async function loadHomeData(
  weekParam: string | null,
  nowMs: number = Date.now(),
  themes: readonly SeriesTheme[] = SERIES_THEMES,
): Promise<HomeData> {
  const loaded = weekParam
    ? { week: weekParam, ...(await loadWeekRounds(weekParam, themes)) }
    : await loadDefaultWeek(nowMs, themes);
  const standings = await loadStandings(loaded.week, themes);
  return {
    week: loaded.week,
    rounds: loaded.rounds,
    failures: loaded.failures,
    standings,
    renderedAtMs: nowMs,
  };
}
