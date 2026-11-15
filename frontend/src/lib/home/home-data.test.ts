import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { loadHomeData, parseWeekParam } from './home-data';
import { SERIES_THEMES } from './series-theme';

const realFetch = globalThis.fetch;
const urls: string[] = [];

function round(id: string, start: string, end: string | null, status: 'scheduled' | 'in_progress' | 'completed') {
  return {
    id, seasonId: 'f1:2026', series: { id: 'f1', name: 'Formula 1' }, name: id, roundNumber: 20, circuit: null,
    locationLabel: null, trackTimeZone: 'America/Mexico_City', startsAt: start, endsAt: end, status, statusBasis: 'time_inferred',
    sessions: [{
      id: `${id}:race`, roundId: id, name: 'Race', type: 'race', sequence: null, scheduledStartAt: start, scheduledDate: null,
      schedulePrecision: 'instant', scheduledEndAt: end, localDate: null, trackLocalDate: null, trackTimeZone: null, dayOffset: null,
      lifecycle: { status, basis: 'time_inferred' }, resultAvailability: 'unknown', resultPreview: null,
    }],
  };
}

interface Plan {
  /** rounds by the `from` of the request */
  byFrom?: Record<string, unknown[]>;
  roundsStatus?: number;
  standingsStatus?: number;
}

function mockFetch(plan: Plan = {}) {
  urls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    urls.push(`${url.pathname}${url.search}`);
    if (url.pathname === '/api/v1/rounds') {
      if ((plan.roundsStatus ?? 200) !== 200) {
        return new Response(JSON.stringify({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } }), { status: plan.roundsStatus });
      }
      const rounds = plan.byFrom?.[url.searchParams.get('from') ?? ''] ?? [];
      return new Response(JSON.stringify({ data: { interval: {}, rounds }, meta: { availability: 'available' } }), { status: 200 });
    }
    if (url.pathname === '/api/v1/standings') {
      if ((plan.standingsStatus ?? 200) !== 200) {
        return new Response(JSON.stringify({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } }), { status: plan.standingsStatus });
      }
      const type = url.searchParams.get('subjectType');
      const standings = { seasonId: url.searchParams.get('seasonId'), subjectType: type, asOfRoundId: null, publicationStatus: 'unknown', rows: [], progress: { completedRounds: 20, totalRounds: 24 }, contention: null };
      return new Response(JSON.stringify({ data: { standings }, meta: { availability: 'available' } }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

const SATURDAY = Date.parse('2026-10-31T12:00:00Z');
const MONDAY_MORNING = Date.parse('2026-11-02T08:00:00Z');
const MONDAY_EARLY = Date.parse('2026-11-02T02:00:00Z');
const MONDAY_NIGHT = Date.parse('2026-11-02T23:00:00Z');
const roundCalls = () => urls.filter((url) => url.startsWith('/api/v1/rounds'));

test('the week in the address bar is a Monday, or nothing', () => {
  assert.equal(parseWeekParam('2026-11-04'), '2026-11-02');
  assert.equal(parseWeekParam('2026-11-02'), '2026-11-02');
  assert.equal(parseWeekParam('garbage'), null);
  assert.equal(parseWeekParam('2026-02-30'), null);
  assert.equal(parseWeekParam(undefined), null);
});

test('one week by track date: one real request for Formula 1, none for the series without data', async () => {
  mockFetch({ byFrom: { '2026-10-26': [round('f1:2026:mexico-city', '2026-10-30T18:30:00Z', '2026-11-01T22:00:00Z', 'in_progress')] } });
  const data = await loadHomeData(null, SATURDAY);
  assert.equal(roundCalls().length, 1);
  assert.match(roundCalls()[0], /from=2026-10-26&to=2026-11-02&tz=UTC&seriesId=f1&dateBasis=track/);
  assert.equal(SERIES_THEMES.filter((theme) => theme.apiId === null).length, 27);
  assert.equal(data.week, '2026-10-26');
  assert.equal(data.rounds.length, 1);
  assert.deepEqual(data.failures, []);
  assert.equal(data.renderedAtMs, SATURDAY);
});

test('Formula 1 standings are loaded for drivers and teams, for the season of the week', async () => {
  mockFetch();
  const data = await loadHomeData(null, SATURDAY);
  const standingsCalls = urls.filter((url) => url.startsWith('/api/v1/standings'));
  assert.equal(standingsCalls.length, 2);
  assert.ok(standingsCalls.some((url) => /seasonId=f1%3A2026&subjectType=driver/.test(url)));
  assert.ok(standingsCalls.some((url) => /seasonId=f1%3A2026&subjectType=team/.test(url)));
  assert.equal(data.standings?.seriesId, 'formula-1');
  assert.equal(data.standings?.driver?.progress.totalRounds, 24);
  assert.deepEqual(data.standings?.failures, []);
});

test('a week across New Year belongs to the season of its Thursday', async () => {
  mockFetch();
  // Monday 29 Dec 2025: its Thursday is 1 Jan 2026. Monday 28 Dec 2026: its Thursday is 31 Dec 2026.
  assert.equal((await loadHomeData('2025-12-29', SATURDAY)).standings?.seasonId, 'f1:2026');
  assert.equal((await loadHomeData('2026-12-28', SATURDAY)).standings?.seasonId, 'f1:2026');
  assert.equal((await loadHomeData('2027-01-04', SATURDAY)).standings?.seasonId, 'f1:2027');
});

test('with ?week= only that week is loaded', async () => {
  mockFetch();
  const data = await loadHomeData('2026-11-02', MONDAY_MORNING);
  assert.equal(data.week, '2026-11-02');
  assert.equal(roundCalls().length, 1);
  assert.match(roundCalls()[0], /from=2026-11-02&to=2026-11-09/);
});

test('on a Monday the weekend before stays while a session that started on Monday (UTC) is not finished', async () => {
  // Sunday 19:00 in Mexico City is Monday 01:00 UTC: the race is on its track-date Sunday, in the weekend before.
  mockFetch({ byFrom: { '2026-10-26': [round('f1:2026:mexico-city', '2026-11-02T00:30:00Z', '2026-11-02T03:00:00Z', 'in_progress')] } });
  const data = await loadHomeData(null, MONDAY_EARLY);
  assert.equal(data.week, '2026-10-26');
  assert.equal(roundCalls().length, 1);
  assert.match(roundCalls()[0], /from=2026-10-26/);
});

test('on a Monday with the weekend before finished, this week is shown (two loads)', async () => {
  mockFetch({ byFrom: { '2026-10-26': [round('f1:2026:mexico-city', '2026-11-02T00:30:00Z', '2026-11-02T03:00:00Z', 'completed')] } });
  const data = await loadHomeData(null, MONDAY_NIGHT);
  assert.equal(data.week, '2026-11-02');
  assert.equal(roundCalls().length, 2);
  assert.deepEqual(data.rounds, []);
});

test('on any other day the week before is not loaded', async () => {
  mockFetch();
  await loadHomeData(null, SATURDAY);
  assert.equal(roundCalls().length, 1);
});

test('failing requests are reported with their code, never as an empty week or an empty table', async () => {
  mockFetch({ roundsStatus: 502, standingsStatus: 502 });
  const data = await loadHomeData(null, SATURDAY);
  assert.deepEqual(data.rounds, []);
  assert.equal(data.failures.length, 1);
  assert.equal(data.failures[0].seriesId, 'formula-1');
  assert.equal(data.failures[0].code, 'UPSTREAM_UNAVAILABLE');
  assert.equal(data.standings?.driver, null);
  assert.equal(data.standings?.team, null);
  assert.deepEqual(data.standings?.failures.map((failure) => failure.subjectType).sort(), ['driver', 'team']);
});

test('a network error is reported too', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connect ECONNREFUSED');
  }) as typeof fetch;
  const data = await loadHomeData(null, SATURDAY);
  assert.equal(data.failures[0].code, 'NETWORK');
  assert.equal(data.standings?.failures[0].code, 'NETWORK');
});
