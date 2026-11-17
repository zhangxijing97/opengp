import { getStandings } from '../api-v1/client';
import type { StandingsData, StandingsSubjectType } from '../api-v1/types';
import { SERIES_THEMES } from './series-theme';
import type { SeriesTheme } from './series-theme';
import { addDays, mondayOf } from './week';

// The standings of the Home, loaded on their own so that a slow or failing standings request never holds back the
// schedule. The page does not wait for them: the browser asks the route `/home-standings` after it has shown
// the schedule (src/lib/client-state/standings.ts), and the route calls loadStandings below.

/** Longest wait for one backend answer. A hung backend then becomes an error with a Retry, not an endless wait. */
export const STANDINGS_TIMEOUT_MS = 8_000;

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

/** What the standings panel shows before any request is made: the series and the season. */
export interface StandingsTarget {
  seriesId: string;
  seriesName: string;
  seasonId: string;
  /** The week the page is on. A new week is the moment to check whether the standings are old (see standings-store.ts). */
  week: string;
}

function coveredTheme(themes: readonly SeriesTheme[]): (SeriesTheme & { apiId: string }) | null {
  const theme = themes.find((candidate) => candidate.apiId !== null);
  return theme && theme.apiId ? { ...theme, apiId: theme.apiId } : null;
}

/**
 * The series and season of the standings panel for a week: the first series the backend serves, in the season of
 * the Thursday of the week (the ISO rule, so a week across New Year is not split). Without ?week= it is the
 * current week in UTC. That differs from the week the schedule picks only on a Monday at the turn of a year.
 * No request is made here.
 */
export function standingsTarget(
  weekParam: string | null,
  nowMs: number = Date.now(),
  themes: readonly SeriesTheme[] = SERIES_THEMES,
): StandingsTarget | null {
  const theme = coveredTheme(themes);
  if (!theme) return null;
  const week = weekParam ?? mondayOf(new Date(nowMs).toISOString().slice(0, 10));
  return { seriesId: theme.id, seriesName: theme.name, seasonId: `${theme.apiId}:${addDays(week, 3).slice(0, 4)}`, week };
}

/** True for a season of a series the Home has standings for, for example `f1:2026`. Guards the route. */
export function isHomeSeasonId(value: string | null, themes: readonly SeriesTheme[] = SERIES_THEMES): value is string {
  const theme = coveredTheme(themes);
  return theme !== null && value !== null && new RegExp(`^${theme.apiId}:\\d{4}$`).test(value);
}

/** Drivers and teams for a season. Never throws: a failed request is reported in `failures`. */
export async function loadStandings(
  seasonId: string,
  themes: readonly SeriesTheme[] = SERIES_THEMES,
): Promise<HomeStandings | null> {
  const theme = coveredTheme(themes);
  if (!theme || !isHomeSeasonId(seasonId, themes)) return null;
  const options = { timeoutMs: STANDINGS_TIMEOUT_MS };
  const [driver, team] = await Promise.all([
    getStandings({ seasonId, subjectType: 'driver' }, options),
    getStandings({ seasonId, subjectType: 'team' }, options),
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
