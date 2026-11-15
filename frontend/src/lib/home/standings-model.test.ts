import assert from 'node:assert/strict';
import test from 'node:test';
import type { StandingRow, StandingsData } from '../api-v1/types';
import { buildStandingsVM, familyName } from './standings-model';

function driver(rank: number | null, name: string, teams: string[], points: string, wins: number | null, canStillWin: boolean | null): StandingRow {
  return {
    rank,
    positionText: rank === null ? '-' : String(rank),
    subject: { id: `f1:driver:${name.toLowerCase().replace(/\s+/g, '-')}`, name, type: 'driver', code: null },
    teams: teams.map((team) => ({ id: `f1:team:${team}`, name: team })),
    points,
    wins,
    canStillWin,
  };
}

function standings(rows: StandingRow[], completed: number | null = 20, total: number | null = 24): StandingsData {
  return {
    seasonId: 'f1:2026', subjectType: 'driver', asOfRoundId: 'f1:2026:brazil', publicationStatus: 'unknown', rows,
    progress: { completedRounds: completed, totalRounds: total }, contention: null,
  };
}

// The top of the real 2026 standings after round 20, as the backend answered on 2026-11-15.
const REAL = [
  driver(1, 'Andrea Kimi Antonelli', ['mercedes'], '390', 9, true),
  driver(2, 'Max Verstappen', ['red-bull'], '279', 3, false),
  driver(3, 'George Russell', ['mercedes'], '262', 3, false),
  driver(9, 'Liam Lawson', ['rb', 'red-bull'], '89', 0, false),
];

test('rows of the real standings: roundels for the top three, family names, team colours, the green bar', () => {
  const vm = buildStandingsVM(standings(REAL));
  assert.deepEqual(vm.rows.map((row) => [row.roundel, row.rankText, row.label, row.points, row.wins, row.canStillWin]), [
    [1, '1', 'ANTONELLI', '390', '9', true],
    [2, '2', 'VERSTAPPEN', '279', '3', false],
    [3, '3', 'RUSSELL', '262', '3', false],
    [null, '9', 'LAWSON', '89', '0', false],
  ]);
  assert.deepEqual(vm.rows.map((row) => row.teamColour), ['#00A19B', '#3671C6', '#00A19B', '#6692FF']);
  assert.equal(vm.showLegend, true);
});

test('the season ruler: 19 done, the current round, 4 to go (ROUND 20 / 24)', () => {
  const vm = buildStandingsVM(standings(REAL));
  assert.deepEqual(vm.round, { current: 20, total: 24 });
  assert.equal(vm.remainingLabel, '4 to go');
  assert.equal(vm.ruler.length, 24);
  assert.equal(vm.ruler.filter((segment) => segment === 'done').length, 19);
  assert.equal(vm.ruler[19], 'current');
  assert.equal(vm.ruler.filter((segment) => segment === 'todo').length, 4);
});

test('the ruler before the first round, at the end of the season, and without progress', () => {
  const start = buildStandingsVM(standings([], 0, 24));
  assert.ok(start.ruler.every((segment) => segment === 'todo'));
  assert.equal(start.remainingLabel, '24 to go');
  const end = buildStandingsVM(standings(REAL, 24, 24));
  assert.equal(end.ruler[23], 'current');
  assert.equal(end.remainingLabel, 'Season complete');
  const over = buildStandingsVM(standings(REAL, 30, 24));
  assert.equal(over.round?.current, 24);
  const none = buildStandingsVM(standings(REAL, null, null));
  assert.equal(none.round, null);
  assert.deepEqual(none.ruler, []);
  assert.equal(none.remainingLabel, null);
});

test('family names with a particle, missing rank, missing wins and an unknown team', () => {
  assert.equal(familyName('Nyck de Vries'), 'de Vries');
  assert.equal(familyName('Max Verstappen'), 'Verstappen');
  assert.equal(familyName('Zhou'), 'Zhou');
  const vm = buildStandingsVM(standings([driver(null, 'Nyck de Vries', ['some-new-team'], '0', null, null)]));
  assert.deepEqual(
    [vm.rows[0].label, vm.rows[0].rankText, vm.rows[0].wins, vm.rows[0].canStillWin, vm.rows[0].teamColour, vm.rows[0].roundel],
    ['DE VRIES', '-', '–', false, 'var(--color-dot-inactive)', null],
  );
  assert.equal(vm.showLegend, false);
});

test('team standings use the team name and the team colour', () => {
  const rows: StandingRow[] = [
    { rank: 1, positionText: '1', subject: { id: 'f1:team:mercedes', name: 'Mercedes', type: 'team', code: null }, teams: [], points: '652', wins: 12, canStillWin: true },
  ];
  const vm = buildStandingsVM({ ...standings(rows), subjectType: 'team' });
  assert.equal(vm.rows[0].label, 'MERCEDES');
  assert.equal(vm.rows[0].teamColour, '#00A19B');
});
