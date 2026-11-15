import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoundSummary, SessionSummary } from '../api-v1/types';
import { buildHomeVMFromRounds } from './adapter-v1';
import { countsByDay, defaultWeek, primaryDays, sectionCount, visibleDays } from './home-model';

function session(id: string, start: string, end: string | null, status: SessionSummary['lifecycle']['status'] = 'scheduled'): SessionSummary {
  return {
    id, roundId: 'f1:2026:mexico-city', name: id, type: 'practice', sequence: null, scheduledStartAt: start, scheduledDate: null,
    schedulePrecision: 'instant', scheduledEndAt: end, lifecycle: { status, basis: 'time_inferred' }, resultAvailability: 'unknown', resultPreview: null,
  };
}
const mexico: RoundSummary = {
  id: 'f1:2026:mexico-city', seasonId: 'f1:2026', series: { id: 'f1', name: 'Formula 1' }, name: 'Mexico City Grand Prix',
  roundNumber: 20, circuit: null, locationLabel: null, startsAt: '2026-10-30T18:30:00Z', endsAt: null, status: 'ongoing', statusBasis: 'time_inferred',
  sessions: [
    session('fp1', '2026-10-30T18:30:00Z', null, 'completed'),
    session('fp2', '2026-10-30T22:00:00Z', null),
    session('race', '2026-11-02T14:00:00Z', '2026-11-02T20:00:00Z'),
  ],
};
const zone = 'America/Los_Angeles';

test('on Monday morning the weekend that is still running is the default week', () => {
  assert.equal(defaultWeek([mexico], Date.parse('2026-11-02T18:00:00Z'), zone), '2026-10-26');
});

test('once it is over, or on any other day, the default week is this week', () => {
  assert.equal(defaultWeek([mexico], Date.parse('2026-11-02T21:00:00Z'), zone), '2026-11-02');
  assert.equal(defaultWeek([mexico], Date.parse('2026-10-31T18:00:00Z'), zone), '2026-10-26');
  assert.equal(defaultWeek([], Date.parse('2026-11-02T18:00:00Z'), zone), '2026-11-02');
});

const ctx = (followed: string[]) => ({
  userTimeZone: zone,
  nowMs: Date.parse('2026-10-31T18:00:00Z'),
  followedSeriesIds: new Set(followed),
});

test('the week track counts all sessions for a visitor who follows nothing, and followed ones otherwise', () => {
  const none = buildHomeVMFromRounds([mexico], ctx([]), '2026-10-26');
  assert.equal(primaryDays(none, false), none.allSeries);
  // The race starts on Monday morning in Los Angeles, but it belongs to the weekend: it stays at the end of Sunday.
  assert.deepEqual(countsByDay(primaryDays(none, false)), { '2026-10-30': { total: 2, done: 1, live: 0 }, '2026-11-01': { total: 1, done: 0, live: 0 } });
  assert.equal(none.allSeries[1].rows[0].dayOffset, 1);
  const follows = buildHomeVMFromRounds([mexico], ctx(['formula-1']), '2026-10-26');
  assert.equal(primaryDays(follows, true), follows.following);
  assert.equal(sectionCount(follows.following), 3);
  assert.equal(sectionCount(follows.allSeries), 0);
});

test('a selected day shows only that day, the week shows all', () => {
  const vm = buildHomeVMFromRounds([mexico], ctx([]), '2026-10-26');
  assert.equal(visibleDays(vm.allSeries, 'week').length, 2);
  assert.deepEqual(visibleDays(vm.allSeries, '2026-10-30').map((day) => day.dayKey), ['2026-10-30']);
  assert.deepEqual(visibleDays(vm.allSeries, '2026-10-29'), []);
});
