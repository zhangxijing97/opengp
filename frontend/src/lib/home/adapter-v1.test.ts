import assert from 'node:assert/strict';
import test from 'node:test';
import type { Lifecycle, RoundSummary, RoundsListData, SessionSummary, SessionType } from '../api-v1/types';
import { buildHomeVM, countsOf, weekQueryRange } from './adapter-v1';
import type { AdaptContext } from './adapter-v1';

function session(
  id: string,
  type: SessionType,
  startsAt: string | null,
  status: Lifecycle = 'scheduled',
  extra: Partial<SessionSummary> = {},
): SessionSummary {
  return {
    id,
    roundId: 'f1:2026:mexico-city',
    name: id,
    type,
    sequence: null,
    scheduledStartAt: startsAt,
    scheduledDate: null,
    schedulePrecision: startsAt ? 'instant' : 'unknown',
    scheduledEndAt: null,
    lifecycle: { status, basis: 'time_inferred' },
    resultAvailability: 'unknown',
    resultPreview: null,
    ...extra,
  };
}

function round(id: string, name: string, startsAt: string, sessions: SessionSummary[]): RoundSummary {
  return {
    id,
    seasonId: 'f1:2026',
    series: { id: 'f1', name: 'Formula 1' },
    name,
    roundNumber: 20,
    circuit: null,
    locationLabel: null,
    startsAt,
    endsAt: null,
    status: 'ongoing',
    statusBasis: 'time_inferred',
    sessions,
  };
}

function data(rounds: RoundSummary[]): RoundsListData {
  return {
    interval: { from: '2026-10-26', to: '2026-11-03', tz: 'UTC', startsAt: '', endsAt: '' },
    rounds,
  };
}

const mexico = round('f1:2026:mexico-city', 'Mexico City Grand Prix', '2026-10-30T18:30:00Z', [
  session('fp1', 'practice', '2026-10-30T18:30:00Z', 'completed'),
  session('fp2', 'practice', '2026-10-30T22:00:00Z', 'completed'),
  session('fp3', 'practice', '2026-10-31T17:30:00Z', 'in_progress'),
  session('quali', 'qualifying', '2026-10-31T21:00:00Z'),
  session('race', 'race', '2026-11-01T20:00:00Z'),
]);

const ctxLa: AdaptContext = {
  userTimeZone: 'America/Los_Angeles',
  nowMs: Date.parse('2026-10-31T23:00:00Z'),
  followedSeriesIds: new Set(),
};

test('the query for a week reaches the Monday after, for the weekend spill-over', () => {
  assert.deepEqual(weekQueryRange('2026-10-26'), { from: '2026-10-26', to: '2026-11-03' });
});

test('sessions are grouped by the user day, sorted by start, tiers and states mapped', () => {
  const vm = buildHomeVM(data([mexico]), ctxLa, '2026-10-26');
  assert.equal(vm.weekEnd, '2026-11-01');
  assert.deepEqual(vm.following, []);
  assert.deepEqual(vm.allSeries.map((day) => day.dayKey), ['2026-10-30', '2026-10-31', '2026-11-01']);
  const [fri, sat, sun] = vm.allSeries;
  assert.deepEqual(fri.rows.map((row) => row.id), ['fp1', 'fp2']);
  assert.deepEqual(sat.rows.map((row) => [row.id, row.tier, row.state]), [
    ['fp3', 'T4', 'live'],
    ['quali', 'T2', 'idle'],
  ]);
  assert.deepEqual(sun.rows.map((row) => [row.id, row.tier]), [['race', 'T1']]);
  assert.equal(fri.weekday, 'FRI');
  assert.equal(sat.isToday, true);
  assert.equal(fri.isToday, false);
  assert.equal(sat.sessionCount, 2);
  assert.equal(vm.allSeries[0].rows[0].seriesId, 'formula-1');
  assert.deepEqual(countsOf(sat), { total: 2, done: 0, live: 1 });
  assert.deepEqual(countsOf(fri), { total: 2, done: 2, live: 0 });
});

test('rounds of another week are left out, followed series go to Following', () => {
  const next = round('f1:2026:brazil', 'Brazil Grand Prix', '2026-11-06T17:30:00Z', [
    session('b-fp1', 'practice', '2026-11-06T17:30:00Z'),
  ]);
  const ctx = { ...ctxLa, followedSeriesIds: new Set(['formula-1']) };
  const vm = buildHomeVM(data([mexico, next]), ctx, '2026-10-26');
  assert.equal(vm.allSeries.length, 0);
  assert.equal(vm.following.flatMap((day) => day.rows).length, 5);
  assert.ok(vm.following.every((day) => day.rows.every((row) => row.starred)));
  const nextWeek = buildHomeVM(data([mexico, next]), ctx, '2026-11-02');
  assert.deepEqual(nextWeek.following.flatMap((day) => day.rows.map((row) => row.id)), ['b-fp1']);
});

test('with a track time zone a late session stays on the weekend day and gets a day offset', () => {
  // Sunday 14:00 in Mexico City is Monday 05:00 in Tokyo.
  const ctx: AdaptContext = {
    userTimeZone: 'Asia/Tokyo',
    nowMs: Date.parse('2026-10-30T00:00:00Z'),
    followedSeriesIds: new Set(),
    trackTimeZone: () => 'America/Mexico_City',
  };
  const vm = buildHomeVM(data([mexico]), ctx, '2026-10-26');
  const sunday = vm.allSeries.find((day) => day.dayKey === '2026-11-01');
  assert.ok(sunday);
  assert.equal(sunday.rows[0].id, 'race');
  assert.equal(sunday.rows[0].dayOffset, 1);
  assert.equal(sunday.afterMidnightCount, 1);
});

test('a user west of the track gets a negative offset', () => {
  // Sunday 14:00 in Tokyo is Saturday 22:00 in Los Angeles (daylight saving still on).
  const suzuka = round('f1:2026:japan', 'Japanese Grand Prix', '2026-10-30T02:30:00Z', [
    session('j-fp1', 'practice', '2026-10-30T02:30:00Z'),
    session('j-race', 'race', '2026-11-01T05:00:00Z'),
  ]);
  const ctx: AdaptContext = { ...ctxLa, trackTimeZone: () => 'Asia/Tokyo' };
  const vm = buildHomeVM(data([suzuka]), ctx, '2026-10-26');
  const sunday = vm.allSeries.find((day) => day.dayKey === '2026-11-01');
  assert.ok(sunday);
  assert.equal(sunday.rows[0].dayOffset, -1);
  assert.equal(sunday.afterMidnightCount, 0);
});

test('without a track time zone a session pushed past Sunday stays at the end of Sunday', () => {
  const ctx: AdaptContext = { ...ctxLa, userTimeZone: 'Asia/Tokyo' };
  const vm = buildHomeVM(data([mexico]), ctx, '2026-10-26');
  const last = vm.allSeries[vm.allSeries.length - 1];
  assert.equal(last.dayKey, '2026-11-01');
  const race = last.rows.find((row) => row.id === 'race');
  assert.ok(race);
  assert.equal(race.dayOffset, 1);
});

test('unknown starts are TBC, last in the day, never midnight; undated sessions are reported', () => {
  const tbc = round('f1:2026:test', 'Test Round', '2026-10-30T10:00:00Z', [
    session('late', 'race', '2026-10-30T20:00:00Z'),
    session('date-only', 'practice', null, 'scheduled', { schedulePrecision: 'date', scheduledDate: '2026-10-30' }),
    session('early', 'practice', '2026-10-30T10:00:00Z'),
  ]);
  const vm = buildHomeVM(data([tbc]), ctxLa, '2026-10-26');
  const day = vm.allSeries.find((item) => item.dayKey === '2026-10-30');
  assert.ok(day);
  assert.deepEqual(day.rows.map((row) => row.id), ['early', 'late', 'date-only']);
  assert.equal(day.rows[2].startsAt, null);
  assert.equal(day.rows[2].dayOffset, 0);

  const nothing = round('f1:2026:none', 'No Dates', '2026-10-30T10:00:00Z', []);
  nothing.startsAt = null;
  const orphan = round('f1:2026:orphan', 'Orphan', '2026-10-30T10:00:00Z', [
    session('x', 'race', null),
  ]);
  orphan.startsAt = '2026-10-30T10:00:00Z';
  const skipped = buildHomeVM(data([orphan]), ctxLa, '2026-10-26');
  // No session date at all: it is placed on the day of the round start, not dropped.
  assert.deepEqual(skipped.skippedSessionIds, []);
  assert.equal(skipped.allSeries[0].rows[0].startsAt, null);
});

test('a session that cannot be placed anywhere is listed as skipped', () => {
  const r = round('f1:2026:nodates', 'No Dates', '2026-10-30T10:00:00Z', [session('x', 'race', null)]);
  // The round week comes from endsAt, but the session has no date and the round has no start.
  r.startsAt = null;
  r.endsAt = '2026-10-31T10:00:00Z';
  const vm = buildHomeVM(data([r]), ctxLa, '2026-10-26');
  assert.deepEqual(vm.skippedSessionIds, ['x']);
  assert.equal(vm.allSeries.length, 0);
});

test('cancelled and unknown sessions keep the idle layout and carry an exception', () => {
  const odd = round('f1:2026:odd', 'Odd Round', '2026-10-30T10:00:00Z', [
    session('c', 'practice', '2026-10-30T10:00:00Z', 'cancelled'),
    session('p', 'practice', '2026-10-30T11:00:00Z', 'postponed'),
    session('u', 'practice', '2026-10-30T12:00:00Z', 'unknown'),
  ]);
  const vm = buildHomeVM(data([odd]), ctxLa, '2026-10-26');
  const rows = vm.allSeries[0].rows;
  assert.deepEqual(rows.map((row) => [row.state, row.exception]), [
    ['idle', 'cancelled'],
    ['idle', 'postponed'],
    ['idle', 'unknown'],
  ]);
  // Only the unknown one is still expected to happen.
  assert.deepEqual(countsOf(vm.allSeries[0]), { total: 1, done: 0, live: 0 });
  assert.equal(vm.allSeries[0].sessionCount, 1);
  assert.equal(vm.allSeries[0].rows.length, 3);
});

test('a cancelled session is listed but does not count as to go, or as after midnight', () => {
  const week = round('f1:2026:cancel', 'Cancel Round', '2026-10-30T18:30:00Z', [
    session('a', 'practice', '2026-10-30T18:30:00Z'),
    session('b', 'practice', '2026-10-30T19:30:00Z'),
    session('c', 'practice', '2026-10-30T20:30:00Z', 'cancelled'),
    session('r', 'race', '2026-11-01T20:00:00Z', 'cancelled'),
    session('q', 'qualifying', '2026-11-01T18:00:00Z'),
  ]);
  const ctx: AdaptContext = {
    userTimeZone: 'Asia/Tokyo',
    nowMs: Date.parse('2026-10-29T00:00:00Z'),
    followedSeriesIds: new Set(),
    trackTimeZone: () => 'America/Mexico_City',
  };
  const vm = buildHomeVM(data([week]), ctx, '2026-10-26');
  const friday = vm.allSeries.find((day) => day.dayKey === '2026-10-30');
  const sunday = vm.allSeries.find((day) => day.dayKey === '2026-11-01');
  assert.ok(friday && sunday);
  assert.equal(friday.rows.length, 3);
  assert.equal(friday.sessionCount, 2);
  assert.deepEqual(countsOf(friday), { total: 2, done: 0, live: 0 });
  // Sunday has two rows after midnight in Tokyo: the race is cancelled, only qualifying counts.
  assert.equal(sunday.rows.length, 2);
  assert.equal(sunday.rows.filter((row) => row.dayOffset > 0).length, 2);
  assert.equal(sunday.afterMidnightCount, 1);
});

test('result availability is passed on, results are never invented', () => {
  const r = round('f1:2026:res', 'Result Round', '2026-10-30T10:00:00Z', [
    session('d', 'race', '2026-10-30T10:00:00Z', 'completed', { resultAvailability: 'not_published' }),
  ]);
  const row = buildHomeVM(data([r]), ctxLa, '2026-10-26').allSeries[0].rows[0];
  assert.deepEqual(row.result, { availability: 'not_published' });
  assert.equal(row.result?.rows, undefined);
});

test('a track time zone the browser does not know is treated as unknown, not as a crash', () => {
  const ctx: AdaptContext = { ...ctxLa, trackTimeZone: () => 'Mars/Base' };
  const vm = buildHomeVM(data([mexico]), ctx, '2026-10-26');
  assert.equal(vm.allSeries.flatMap((day) => day.rows).length, 5);
  assert.ok(vm.allSeries.every((day) => day.rows.every((row) => row.dayOffset === 0)));
});

test('an unparseable time from the API is shown as TBC, not as a wrong time', () => {
  const broken = round('f1:2026:broken', 'Broken Round', '2026-10-30T10:00:00Z', [
    session('ok', 'practice', '2026-10-30T10:00:00Z'),
    session('bad', 'race', 'not a date', 'scheduled', { scheduledEndAt: 'also not a date' }),
  ]);
  const vm = buildHomeVM(data([broken]), ctxLa, '2026-10-26');
  const rows = vm.allSeries.flatMap((day) => day.rows);
  const bad = rows.find((row) => row.id === 'bad');
  assert.ok(bad);
  assert.equal(bad.startsAt, null);
  assert.equal(bad.endsAt, null);
  assert.deepEqual(vm.skippedSessionIds, []);
  assert.equal(rows.length, 2);
});

test('sub-sessions (tier T5) are not rows and are not counted as skipped', () => {
  const rally = round('wrc:2026:rally', 'Rally', '2026-10-30T10:00:00Z', [
    session('stage-1', 'stage', '2026-10-30T10:00:00Z'),
    session('shakedown', 'practice', '2026-10-30T09:00:00Z'),
  ]);
  const vm = buildHomeVM(data([rally]), ctxLa, '2026-10-26');
  assert.deepEqual(vm.allSeries.flatMap((day) => day.rows.map((row) => row.id)), ['shakedown']);
  assert.deepEqual(vm.skippedSessionIds, []);
});
