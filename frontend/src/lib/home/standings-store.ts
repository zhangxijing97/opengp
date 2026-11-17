import type { HomeStandings } from './standings-data';

// The browser side of the standings: one entry per season, shared by every component that asks for it.
//
//  - A season is asked for once: components that ask at the same time share the request, and a fresh answer is
//    reused when the visitor moves to another week of the same season.
//  - A failure is an entry of its own (`error`), never an empty table. A failure does not replace data that was
//    already shown: stale standings are better than none, and the next successful request replaces them.
//  - The request is stopped after `timeoutMs` and ends as the error TIMEOUT.
//
// Plain TypeScript, no React: src/lib/client-state/standings.ts connects it to components.

export type StandingsEntry =
  | { status: 'ready'; data: HomeStandings; at: number }
  | { status: 'error'; code: string; message: string; at: number };

export const STANDINGS_FRESH_MS = 60_000;
export const STANDINGS_CLIENT_TIMEOUT_MS = 12_000;

export interface StandingsStoreOptions {
  /** Address of the route, without the query. */
  path: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  freshMs?: number;
}

export interface StandingsStore {
  get: (seasonId: string) => StandingsEntry | undefined;
  subscribe: (listener: () => void) => () => void;
  /** Make sure the season is loaded or on its way. Resolves when the request it started (or joined) has ended. */
  ensure: (seasonId: string) => Promise<void>;
  /** Ask again after a failure. */
  retry: (seasonId: string) => Promise<void>;
  /** True while a request for the season is running. */
  isLoading: (seasonId: string) => boolean;
}

function isHomeStandings(value: unknown): value is HomeStandings {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.seasonId === 'string' && Array.isArray(record.failures) && 'driver' in record && 'team' in record;
}

export function createStandingsStore(options: StandingsStoreOptions): StandingsStore {
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? STANDINGS_CLIENT_TIMEOUT_MS;
  const freshMs = options.freshMs ?? STANDINGS_FRESH_MS;
  const entries = new Map<string, StandingsEntry>();
  const inFlight = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  async function request(seasonId: string): Promise<StandingsEntry> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const fail = (code: string, message: string): StandingsEntry => ({ status: 'error', code, message, at: now() });
    try {
      let response: Response;
      try {
        response = await fetchImpl(`${options.path}?seasonId=${encodeURIComponent(seasonId)}`, { signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) return fail('TIMEOUT', `The standings did not answer within ${Math.round(timeoutMs / 1000)} seconds.`);
        return fail('NETWORK', error instanceof Error ? error.message : 'The request failed.');
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (controller.signal.aborted) return fail('TIMEOUT', 'The standings took too long to arrive.');
        return fail('INVALID_RESPONSE', 'The standings were not valid JSON.');
      }
      if (!response.ok) {
        const error = typeof body === 'object' && body !== null ? (body as { error?: { code?: unknown; message?: unknown } }).error : undefined;
        return fail(
          typeof error?.code === 'string' ? error.code : 'HTTP_ERROR',
          typeof error?.message === 'string' ? error.message : `The server answered with HTTP ${response.status}.`,
        );
      }
      if (!isHomeStandings(body)) return fail('INVALID_RESPONSE', 'The standings have an unexpected shape.');
      return { status: 'ready', data: body, at: now() };
    } finally {
      clearTimeout(timer);
    }
  }

  function start(seasonId: string): Promise<void> {
    const running = inFlight.get(seasonId);
    if (running) return running;
    const task = request(seasonId)
      .then((next) => {
        // A failure does not replace standings that were already there.
        if (next.status === 'error' && entries.get(seasonId)?.status === 'ready') return;
        entries.set(seasonId, next);
      })
      .finally(() => {
        inFlight.delete(seasonId);
        notify();
      });
    inFlight.set(seasonId, task);
    notify();
    return task;
  }

  return {
    get: (seasonId) => entries.get(seasonId),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ensure(seasonId) {
      const entry = entries.get(seasonId);
      if (entry?.status === 'ready' && now() - entry.at < freshMs) return Promise.resolve();
      return start(seasonId);
    },
    retry(seasonId) {
      if (entries.get(seasonId)?.status === 'error') {
        entries.delete(seasonId);
        notify();
      }
      return start(seasonId);
    },
    isLoading: (seasonId) => inFlight.has(seasonId),
  };
}
