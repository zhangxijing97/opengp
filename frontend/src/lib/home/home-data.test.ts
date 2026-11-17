import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { SCHEDULE_TIMEOUT_MS, loadScheduleData, parseWeekParam } from './home-data';
import { SERIES_THEMES } from './series-theme';

const realFetch = globalThis.fetch;
const urls: string[] = [];
/** The most round requests that were running at the same moment. */
let maxInFlight = 0;

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
  /** answer only after this many ms (and honour the abort signal) */
  roundsDelayMs?: number;
}

function mockFetch(plan: Plan = {}) {
  urls.length = 0;
  maxInFlight = 0;
  let inFlight = 0;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    urls.push(`${url.pathname}${url.search}`);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const reply = () => {
      inFlight -= 1;
      if ((plan.roundsStatus ?? 200) !== 200) {
        return new Response(JSON.stringify({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } }), { status: plan.roundsStatus });
      }
      const rounds = plan.byFrom?.[url.searchParams.get('from') ?? ''] ?? [];
      return new Response(JSON.stringify({ data: { interval: {}, rounds }, meta: { availability: 'available' } }), { status: 200 });
    };
    if (!plan.roundsDelayMs) return Promise.resolve(reply());
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(reply()), plan.roundsDelayMs);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        inFlight -= 1;
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

const SATURDAY = Date.parse('2026-10-31T12:00:00Z');
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

test('one week by track date: one real request for Formula 1, none for the series without data, no standings', async () => {
  mockFetch({ byFrom: { '2026-10-26': [round('f1:2026:mexico-city', '2026-10-30T18:30:00Z', '2026-11-01T22:00:00Z', 'in_progress')] } });
  const data = await loadScheduleData(null, SATURDAY);
  assert.equal(urls.length, 1);
  assert.match(roundCalls()[0], /from=2026-10-26&to=2026-11-02&tz=UTC&seriesId=f1&dateBasis=track/);
  assert.equal(SERIES_THEMES.filter((theme) => theme.apiId === null).length, 27);
  assert.equal(data.week, '2026-10-26');
  assert.equal(data.rounds.length, 1);
  assert.deepEqual(data.failures, []);
  assert.equal(data.renderedAtMs, SATURDAY);
  assert.equal('standings' in data, false);
});

test('with ?week= only that week is loaded', async () => {
  mockFetch();
  const data = await loadScheduleData('2026-11-02', MONDAY_EARLY);
  assert.equal(data.week, '2026-11-02');
  assert.equal(roundCalls().length, 1);
  assert.match(roundCalls()[0], /from=2026-11-02&to=2026-11-09/);
});

test('on a Monday both weeks are asked for at the same time, and the weekend before stays while it is not finished', async () => {
  // Sunday 19:00 in Mexico City is Monday 01:00 UTC: the race is on its track-date Sunday, in the weekend before.
  mockFetch({ byFrom: { '2026-10-26': [round('f1:2026:mexico-city', '2026-11-02T00:30:00Z', '2026-11-02T03:00:00Z', 'in_progress')] }, roundsDelayMs: 40 });
  const data = await loadScheduleData(null, MONDAY_EARLY);
  assert.equal(data.week, '2026-10-26');
  assert.equal(roundCalls().length, 2);
  // Counted, not timed: both requests were running at the same moment, whatever the speed of the machine.
  assert.equal(maxInFlight, 2, 'the two weeks were asked for one after the other');
});

test('on a Monday with the weekend before finished, this week is shown', async () => {
  mockFetch({ byFrom: { '2026-10-26': [round('f1:2026:mexico-city', '2026-11-02T00:30:00Z', '2026-11-02T03:00:00Z', 'completed')] } });
  const data = await loadScheduleData(null, MONDAY_NIGHT);
  assert.equal(data.week, '2026-11-02');
  assert.equal(roundCalls().length, 2);
  assert.deepEqual(data.rounds, []);
});

test('on any other day the week before is not loaded', async () => {
  mockFetch();
  await loadScheduleData(null, SATURDAY);
  assert.equal(roundCalls().length, 1);
});

test('a failing backend is reported with its code and the rounds stay empty', async () => {
  mockFetch({ roundsStatus: 502 });
  const data = await loadScheduleData(null, SATURDAY);
  assert.deepEqual(data.rounds, []);
  assert.equal(data.failures.length, 1);
  assert.equal(data.failures[0].seriesId, 'formula-1');
  assert.equal(data.failures[0].code, 'UPSTREAM_UNAVAILABLE');
});

test('a network error is reported too', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connect ECONNREFUSED');
  }) as typeof fetch;
  const data = await loadScheduleData(null, SATURDAY);
  assert.equal(data.failures[0].code, 'NETWORK');
});

test('a backend that never answers ends as TIMEOUT instead of hanging the page', { timeout: 20_000 }, async () => {
  // Same wait as the real limit would be too slow for a test: check the limit, then use a short one through the client.
  assert.equal(SCHEDULE_TIMEOUT_MS, 8_000);
  mockFetch({ roundsDelayMs: 60_000 });
  const { apiGet } = await import('../api-v1/client');
  const result = await apiGet('/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=UTC', { timeoutMs: 50 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'TIMEOUT');
});
