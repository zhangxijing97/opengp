import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { clearSearchIndexCache, loadSearchIndex } from './search-index';

const realFetch = globalThis.fetch;
const urls: string[] = [];

function respondWith(handler: () => Response) {
  urls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return handler();
  }) as typeof fetch;
}

const monaco = {
  id: 'f1:2026:monaco', seasonId: 'f1:2026', series: { id: 'f1', name: 'Formula 1' }, name: 'Monaco Grand Prix',
  roundNumber: 8, circuit: null, locationLabel: 'Monte Carlo, Monaco', startsAt: null, endsAt: null,
  status: 'scheduled', statusBasis: 'time_inferred', sessions: [],
};
const ok = () =>
  new Response(JSON.stringify({ data: { interval: {}, rounds: [monaco] }, meta: { availability: 'available' } }), { status: 200 });

afterEach(() => {
  globalThis.fetch = realFetch;
  clearSearchIndexCache();
});

const NOW = Date.parse('2026-10-31T12:00:00Z');

test('the index asks for two 31-day windows around today', async () => {
  respondWith(ok);
  await loadSearchIndex(NOW);
  assert.equal(urls.length, 2);
  assert.match(urls[0], /from=2026-10-17&to=2026-11-17&tz=UTC/);
  assert.match(urls[1], /from=2026-11-17&to=2026-12-18&tz=UTC/);
});

test('series and events are in the index, events are not duplicated across windows', async () => {
  respondWith(ok);
  const index = await loadSearchIndex(NOW);
  assert.equal(index.warning, null);
  assert.equal(index.entries.filter((entry) => entry.kind === 'series').length, 28);
  assert.equal(index.entries.filter((entry) => entry.kind === 'round').length, 1);
});

test('a complete index is kept for five minutes, then asked for again', async () => {
  respondWith(ok);
  await loadSearchIndex(NOW);
  await loadSearchIndex(NOW + 4 * 60 * 1000);
  assert.equal(urls.length, 2);
  await loadSearchIndex(NOW + 5 * 60 * 1000 + 1);
  assert.equal(urls.length, 4);
});

test('a failed request is reported, series still work, and nothing is cached', async () => {
  respondWith(() => new Response('{}', { status: 502 }));
  const failed = await loadSearchIndex(NOW);
  assert.match(failed.warning ?? '', /Events could not be loaded/);
  assert.equal(failed.entries.length, 28);
  respondWith(ok);
  const recovered = await loadSearchIndex(NOW + 1000);
  assert.equal(recovered.warning, null);
  assert.equal(urls.length, 2);
});

test('one failing window still gives the events of the other', async () => {
  let call = 0;
  respondWith(() => (++call === 1 ? ok() : new Response('{}', { status: 500 })));
  const index = await loadSearchIndex(NOW);
  assert.ok(index.warning);
  assert.equal(index.entries.filter((entry) => entry.kind === 'round').length, 1);
});
