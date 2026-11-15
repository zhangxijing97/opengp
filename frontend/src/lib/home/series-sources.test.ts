import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { requestNotCovered, requestSeriesRounds } from './series-sources';
import { themeById } from './series-theme';

const realFetch = globalThis.fetch;
const urls: string[] = [];
const range = { from: '2026-10-19', to: '2026-11-10' };

function mockFetch(status = 200) {
  urls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({ data: { interval: {}, rounds: [] }, meta: { availability: 'available' } }),
      { status },
    );
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('Formula 1 asks the backend, for its own series, in UTC', async () => {
  mockFetch();
  const theme = themeById('formula-1');
  assert.ok(theme);
  const result = await requestSeriesRounds(theme, range);
  assert.equal(result.ok, true);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /\/api\/v1\/rounds\?from=2026-10-19&to=2026-11-10&tz=UTC&seriesId=f1&dateBasis=track/);
});

test('a series the backend does not serve gets a stand-in that answers with no rounds, without a request', async () => {
  mockFetch();
  const theme = themeById('wec');
  assert.ok(theme);
  const result = await requestSeriesRounds(theme, range);
  assert.equal(urls.length, 0);
  assert.ok(result.ok);
  assert.deepEqual(result.data.rounds, []);
  assert.equal(result.meta.availability, 'unsupported');
  assert.equal(result.data.interval.from, '2026-10-19');
});

test('the stand-in has the same shape as the real answer', async () => {
  const fake = await requestNotCovered(range);
  mockFetch();
  const theme = themeById('formula-1');
  assert.ok(theme);
  const real = await requestSeriesRounds(theme, range);
  assert.ok(fake.ok && real.ok);
  assert.deepEqual(Object.keys(fake.data).sort(), Object.keys(real.data).sort());
});

test('a failing real request is an error, not an empty answer', async () => {
  mockFetch(502);
  const theme = themeById('formula-1');
  assert.ok(theme);
  const result = await requestSeriesRounds(theme, range);
  assert.equal(result.ok, false);
});
