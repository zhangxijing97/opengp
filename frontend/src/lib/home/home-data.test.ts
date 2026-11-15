import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { homeRange, loadHomeData, parseWeekParam } from './home-data';
import { SERIES_THEMES } from './series-theme';

const realFetch = globalThis.fetch;
const urls: string[] = [];

const mexico = {
  id: 'f1:2026:mexico-city', seasonId: 'f1:2026', series: { id: 'f1', name: 'Formula 1' }, name: 'Mexico City Grand Prix',
  roundNumber: 20, circuit: null, locationLabel: null, startsAt: '2026-10-30T18:30:00Z', endsAt: null,
  status: 'ongoing', statusBasis: 'time_inferred', sessions: [],
};

function mockFetch(status: number, rounds: unknown[] = [mexico]) {
  urls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    const body = status === 200
      ? { data: { interval: {}, rounds }, meta: { availability: 'available' } }
      : { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'provider down' } };
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

const SATURDAY = Date.parse('2026-10-31T12:00:00Z');

test('three weeks and a day around the anchor Monday', () => {
  assert.deepEqual(homeRange('2026-10-26'), { from: '2026-10-19', to: '2026-11-10' });
});

test('the week in the address bar is a Monday, or nothing', () => {
  assert.equal(parseWeekParam('2026-11-04'), '2026-11-02');
  assert.equal(parseWeekParam('2026-11-02'), '2026-11-02');
  assert.equal(parseWeekParam('garbage'), null);
  assert.equal(parseWeekParam('2026-02-30'), null);
  assert.equal(parseWeekParam(undefined), null);
});

test('the Home asks every series, but only Formula 1 goes to the backend', async () => {
  mockFetch(200);
  const data = await loadHomeData(null, SATURDAY);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /seriesId=f1/);
  assert.equal(SERIES_THEMES.filter((theme) => theme.apiId === null).length, 27);
  assert.equal(data.rounds.length, 1);
  assert.deepEqual(data.failures, []);
  assert.equal(data.renderedAtMs, SATURDAY);
});

test('without ?week= the anchor is the Monday of today in UTC, with it the anchor is that week', async () => {
  mockFetch(200);
  assert.equal((await loadHomeData(null, SATURDAY)).anchorMonday, '2026-10-26');
  assert.match(urls[0], /from=2026-10-19&to=2026-11-10/);
  const next = await loadHomeData('2026-11-02', SATURDAY);
  assert.equal(next.anchorMonday, '2026-11-02');
  assert.equal(next.weekParam, '2026-11-02');
  assert.match(urls[1], /from=2026-10-26&to=2026-11-17/);
});

test('a failing backend is reported with its code and the rounds stay empty', async () => {
  mockFetch(502);
  const data = await loadHomeData(null, SATURDAY);
  assert.deepEqual(data.rounds, []);
  assert.equal(data.failures.length, 1);
  assert.equal(data.failures[0].seriesId, 'formula-1');
  assert.equal(data.failures[0].code, 'UPSTREAM_UNAVAILABLE');
});

test('a network error is reported too', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connect ECONNREFUSED');
  }) as typeof fetch;
  const data = await loadHomeData(null, SATURDAY);
  assert.equal(data.failures[0].code, 'NETWORK');
});
