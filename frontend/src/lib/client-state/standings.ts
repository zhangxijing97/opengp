'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { routes } from '../home/routes';
import { createStandingsStore } from '../home/standings-store';
import type { StandingsEntry } from '../home/standings-store';

// The standings store of this browser tab. The server render and the first browser render see no entry
// (the panel shows its skeleton), so they match; the request starts right after hydration.
export const standingsStore = createStandingsStore({ path: routes.homeStandings });

export interface StandingsState {
  /** Undefined until the first answer: loading. */
  entry: StandingsEntry | undefined;
  /** True while a request is running, also when older data is on screen. */
  loading: boolean;
  retry: () => void;
}

/**
 * `refreshKey` changes when the visitor moves to another week: that is when old standings are asked for again (a
 * fresh answer is reused, so moving between weeks of one season makes no request).
 */
export function useStandings(seasonId: string | null, refreshKey?: string): StandingsState {
  const entry = useSyncExternalStore(
    standingsStore.subscribe,
    () => (seasonId ? standingsStore.get(seasonId) : undefined),
    () => undefined,
  );
  const loading = useSyncExternalStore(
    standingsStore.subscribe,
    () => (seasonId ? standingsStore.isLoading(seasonId) : false),
    () => false,
  );
  useEffect(() => {
    if (seasonId) void standingsStore.ensure(seasonId);
  }, [seasonId, refreshKey]);
  const retry = useCallback(() => {
    if (seasonId) void standingsStore.retry(seasonId);
  }, [seasonId]);
  return { entry, loading, retry };
}
