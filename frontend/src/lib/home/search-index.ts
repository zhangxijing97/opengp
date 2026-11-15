import { getRounds } from '../api-v1/client';
import type { RoundSummary } from '../api-v1/types';
import { BASE_PATH } from './routes';
import { roundEntries, seriesEntries } from './search';
import type { SearchEntry } from './search';
import { addDays } from './week';

// Server side: the entries that search looks through. Series come from the design list; events
// come from the API for a window around today (the API answers up to 31 days per request).
// A failed request is reported in `warning`, never hidden.
//
// The data service has no cache of its own yet and its providers have rate limits, so a complete
// index is kept in memory for five minutes. An index with a warning is never kept: the next
// request tries again.

export interface SearchIndex {
  entries: SearchEntry[];
  warning: string | null;
}

const WINDOW_DAYS = 31;
const DAYS_BEFORE = 14;
const CACHE_MS = 5 * 60 * 1000;

let cached: { at: number; index: SearchIndex } | null = null;

export function clearSearchIndexCache(): void {
  cached = null;
}

export async function loadSearchIndex(nowMs: number = Date.now()): Promise<SearchIndex> {
  if (cached && nowMs - cached.at >= 0 && nowMs - cached.at < CACHE_MS) return cached.index;

  const today = new Date(nowMs).toISOString().slice(0, 10);
  const firstFrom = addDays(today, -DAYS_BEFORE);
  const secondFrom = addDays(firstFrom, WINDOW_DAYS);
  const windows = [
    { from: firstFrom, to: secondFrom },
    { from: secondFrom, to: addDays(secondFrom, WINDOW_DAYS) },
  ];

  const results = await Promise.all(
    windows.map((window) => getRounds({ ...window, tz: 'UTC' })),
  );

  const rounds = new Map<string, RoundSummary>();
  let warning: string | null = null;
  for (const result of results) {
    if (result.ok) {
      for (const round of result.data.rounds) rounds.set(round.id, round);
    } else if (!warning) {
      warning = `Events could not be loaded (${result.error.code}). Series search still works.`;
    }
  }

  const index: SearchIndex = {
    entries: [...seriesEntries(BASE_PATH), ...roundEntries([...rounds.values()], BASE_PATH)],
    warning,
  };
  if (warning === null) cached = { at: nowMs, index };
  return index;
}
