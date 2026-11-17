import assert from 'node:assert/strict';
import test from 'node:test';
import { createStandingsStore } from './standings-store';
import type { HomeStandings } from './standings-data';

const standings = (seasonId: string): HomeStandings => ({
  seriesId: 'formula-1', seriesName: 'Formula 1', seasonId, driver: null, team: null, failures: [],
});

interface Call { url: string; resolve: (response: Response) => void; reject: (error: unknown) => void }

function setup(options: { timeoutMs?: number; freshMs?: number } = {}) {
  const calls: Call[] = [];
  let clock = 1_000;
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      calls.push({ url: String(input), resolve, reject });
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as typeof fetch;
  const store = createStandingsStore({ path: '/home-standings', fetchImpl, now: () => clock, ...options });
  return { store, calls, advance: (ms: number) => { clock += ms; } };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test('components that ask at the same time share one request', async () => {
  const { store, calls } = setup();
  const first = store.ensure('f1:2026');
  const second = store.ensure('f1:2026');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^\/home-standings\?seasonId=f1%3A2026$/);
  calls[0].resolve(json(standings('f1:2026')));
  await Promise.all([first, second]);
  assert.equal(store.get('f1:2026')?.status, 'ready');
  assert.equal(store.isLoading('f1:2026'), false);
});

test('a fresh answer is reused when the visitor moves to another week of the same season', async () => {
  const { store, calls, advance } = setup({ freshMs: 60_000 });
  const first = store.ensure('f1:2026');
  calls[0].resolve(json(standings('f1:2026')));
  await first;
  advance(30_000);
  await store.ensure('f1:2026');
  assert.equal(calls.length, 1);
});

test('an old answer is asked for again, and stays on screen until the new one arrives', async () => {
  const { store, calls, advance } = setup({ freshMs: 60_000 });
  const first = store.ensure('f1:2026');
  calls[0].resolve(json(standings('f1:2026')));
  await first;
  const before = store.get('f1:2026');
  advance(61_000);
  const again = store.ensure('f1:2026');
  assert.equal(calls.length, 2);
  assert.equal(store.get('f1:2026'), before);
  assert.equal(store.isLoading('f1:2026'), true);
  calls[1].resolve(json(standings('f1:2026')));
  await again;
  assert.notEqual(store.get('f1:2026'), before);
});

test('a season has its own entry: another season is not blocked or overwritten', async () => {
  const { store, calls } = setup();
  const a = store.ensure('f1:2026');
  const b = store.ensure('f1:2027');
  assert.equal(calls.length, 2);
  calls[1].resolve(json(standings('f1:2027')));
  calls[0].resolve(json(standings('f1:2026')));
  await Promise.all([a, b]);
  const two = store.get('f1:2026');
  const seven = store.get('f1:2027');
  assert.ok(two?.status === 'ready' && two.data.seasonId === 'f1:2026');
  assert.ok(seven?.status === 'ready' && seven.data.seasonId === 'f1:2027');
});

test('a failure is an error entry, and Retry asks again', async () => {
  const { store, calls } = setup();
  const first = store.ensure('f1:2026');
  calls[0].resolve(json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } }, 502));
  await first;
  const entry = store.get('f1:2026');
  assert.ok(entry?.status === 'error' && entry.code === 'UPSTREAM_UNAVAILABLE');
  const retried = store.retry('f1:2026');
  assert.equal(store.get('f1:2026'), undefined);
  assert.equal(calls.length, 2);
  calls[1].resolve(json(standings('f1:2026')));
  await retried;
  assert.equal(store.get('f1:2026')?.status, 'ready');
});

test('a failure does not replace standings that are already there', async () => {
  const { store, calls, advance } = setup({ freshMs: 1_000 });
  const first = store.ensure('f1:2026');
  calls[0].resolve(json(standings('f1:2026')));
  await first;
  const good = store.get('f1:2026');
  advance(5_000);
  const again = store.ensure('f1:2026');
  calls[1].reject(new Error('connect ECONNREFUSED'));
  await again;
  assert.equal(store.get('f1:2026'), good);
});

test('a request that takes too long ends as TIMEOUT', async () => {
  const { store } = setup({ timeoutMs: 30 });
  await store.ensure('f1:2026');
  const entry = store.get('f1:2026');
  assert.ok(entry?.status === 'error' && entry.code === 'TIMEOUT');
});

test('a network error, a page that is not JSON and an unexpected shape are errors, not empty tables', async () => {
  const net = setup();
  const a = net.store.ensure('f1:2026');
  net.calls[0].reject(new Error('Failed to fetch'));
  await a;
  assert.ok(net.store.get('f1:2026')?.status === 'error');
  const html = setup();
  const b = html.store.ensure('f1:2026');
  html.calls[0].resolve(new Response('<html>', { status: 200 }));
  await b;
  const entry = html.store.get('f1:2026');
  assert.ok(entry?.status === 'error' && entry.code === 'INVALID_RESPONSE');
  const odd = setup();
  const c = odd.store.ensure('f1:2026');
  odd.calls[0].resolve(json({ hello: 'world' }));
  await c;
  const oddEntry = odd.store.get('f1:2026');
  assert.ok(oddEntry?.status === 'error' && oddEntry.code === 'INVALID_RESPONSE');
});

test('subscribers hear about the start and the end of a request, and can stop listening', async () => {
  const { store, calls } = setup();
  let heard = 0;
  const stop = store.subscribe(() => { heard += 1; });
  const task = store.ensure('f1:2026');
  assert.equal(heard, 1);
  calls[0].resolve(json(standings('f1:2026')));
  await task;
  assert.equal(heard, 2);
  stop();
  await store.retry('f1:2026').catch(() => undefined);
  calls[1]?.resolve(json(standings('f1:2026')));
  assert.equal(heard, 2);
});
