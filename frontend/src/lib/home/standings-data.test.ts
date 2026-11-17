import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { isHomeSeasonId, loadStandings, standingsTarget } from './standings-data';

const realFetch = globalThis.fetch;
const urls: string[] = [];

function mockFetch(status = 200) {
  urls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    urls.push(`${url.pathname}${url.search}`);
    if (status !== 200) return new Response(JSON.stringify({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } }), { status });
    const standings = { seasonId: url.searchParams.get('seasonId'), subjectType: url.searchParams.get('subjectType'), asOfRoundId: null, publicationStatus: 'unknown', rows: [], progress: { completedRounds: 20, totalRounds: 24 }, contention: null };
    return new Response(JSON.stringify({ data: { standings }, meta: { availability: 'available' } }), { status: 200 });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

const SATURDAY = Date.parse('2026-10-31T12:00:00Z');

test('the target is the first series the backend serves, in the season of the week\'s Thursday', () => {
  assert.deepEqual(standingsTarget('2026-11-02', SATURDAY), { seriesId: 'formula-1', seriesName: 'Formula 1', seasonId: 'f1:2026', week: '2026-11-02' });
  // Monday 29 Dec 2025: its Thursday is 1 Jan 2026. Monday 28 Dec 2026: its Thursday is 31 Dec 2026.
  assert.equal(standingsTarget('2025-12-29', SATURDAY)?.seasonId, 'f1:2026');
  assert.equal(standingsTarget('2026-12-28', SATURDAY)?.seasonId, 'f1:2026');
  assert.equal(standingsTarget('2027-01-04', SATURDAY)?.seasonId, 'f1:2027');
});

test('without ?week= the target follows the current week in UTC, and makes no request', () => {
  mockFetch();
  assert.equal(standingsTarget(null, Date.parse('2026-12-31T23:00:00Z'))?.seasonId, 'f1:2026');
  assert.equal(standingsTarget(null, Date.parse('2027-01-07T12:00:00Z'))?.seasonId, 'f1:2027');
  assert.equal(standingsTarget(null, Date.parse('2026-11-04T12:00:00Z'))?.week, '2026-11-02');
  assert.equal(urls.length, 0);
});

test('only seasons of a series the Home has standings for are accepted', () => {
  assert.equal(isHomeSeasonId('f1:2026'), true);
  assert.equal(isHomeSeasonId('f1:26'), false);
  assert.equal(isHomeSeasonId('wec:2026'), false);
  assert.equal(isHomeSeasonId('f1:2026; DROP'), false);
  assert.equal(isHomeSeasonId(null), false);
});

test('drivers and teams are loaded together for the season', async () => {
  mockFetch();
  const standings = await loadStandings('f1:2026');
  assert.equal(urls.length, 2);
  assert.ok(urls.some((url) => /seasonId=f1%3A2026&subjectType=driver/.test(url)));
  assert.ok(urls.some((url) => /seasonId=f1%3A2026&subjectType=team/.test(url)));
  assert.equal(standings?.seriesName, 'Formula 1');
  assert.equal(standings?.driver?.progress.totalRounds, 24);
  assert.deepEqual(standings?.failures, []);
});

test('a season of another series is not loaded at all', async () => {
  mockFetch();
  assert.equal(await loadStandings('wec:2026'), null);
  assert.equal(urls.length, 0);
});

test('a failing backend is reported per tab, never as an empty table', async () => {
  mockFetch(502);
  const standings = await loadStandings('f1:2026');
  assert.equal(standings?.driver, null);
  assert.equal(standings?.team, null);
  assert.deepEqual(standings?.failures.map((failure) => failure.subjectType).sort(), ['driver', 'team']);
  assert.equal(standings?.failures[0].code, 'UPSTREAM_UNAVAILABLE');
});

test('a network error is reported too', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connect ECONNREFUSED');
  }) as typeof fetch;
  const standings = await loadStandings('f1:2026');
  assert.equal(standings?.failures[0].code, 'NETWORK');
});
