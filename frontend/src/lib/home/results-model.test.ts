import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClassificationRow, ResultSet } from '../api-v1/types';
import { buildResultTable, formatGap, formatLapMs, positionText } from './results-model';

function row(over: Partial<ClassificationRow>): ClassificationRow {
  return {
    id: 'r', driver: { id: 'd', displayName: 'Max Verstappen', number: '3', code: 'VER' }, team: null, position: 1, positionText: '1',
    classificationStatus: 'classified', finishStatus: 'unknown', laps: 19, points: null, bestLapMs: 71622, elapsedMs: null, gap: null, ...over,
  };
}
const set = (kind: ResultSet['kind'], classification: ClassificationRow[]): ResultSet => ({ id: 's', kind, publicationStatus: 'unknown', classification });

test('lap times: minutes, hours, plain seconds, and nothing', () => {
  assert.equal(formatLapMs(71622), '1:11.622');
  assert.equal(formatLapMs(5455026), '1:30:55.026');
  assert.equal(formatLapMs(31504), '31.504');
  assert.equal(formatLapMs(null), '–');
  assert.equal(formatLapMs(-5), '–');
});

test('gaps: time, laps and text', () => {
  assert.equal(formatGap({ kind: 'time_ms', value: 25 }), '+0.025s');
  assert.equal(formatGap({ kind: 'time_ms', value: 9748 }), '+9.748s');
  assert.equal(formatGap({ kind: 'laps', value: 1 }), '+1 lap');
  assert.equal(formatGap({ kind: 'laps', value: 2 }), '+2 laps');
  assert.equal(formatGap({ kind: 'text', value: '+1 LAP' }), '+1 LAP');
  assert.equal(formatGap(null), '–');
});

test('the real practice answer of 2026-11-15 (Brazil FP3): best lap, gap, laps', () => {
  const table = buildResultTable(set('practice', [
    row({}),
    row({ id: 'a', driver: { id: 'a', displayName: 'Andrea Kimi Antonelli', number: '12', code: 'ANT' }, position: 2, positionText: '2', laps: 21, bestLapMs: 71647, gap: { kind: 'time_ms', value: 25 } }),
  ]));
  assert.equal(table.kind, 'practice');
  assert.deepEqual(table.headers, ['Best lap', 'Gap', 'Laps']);
  assert.deepEqual(table.rows.map((r) => [r.position, r.driver, r.team, ...r.cells]), [
    ['1', 'Max Verstappen', '–', '1:11.622', '–', '19'],
    ['2', 'Andrea Kimi Antonelli', '–', '1:11.647', '+0.025s', '21'],
  ]);
});

test('a race: the winner shows the race time, DSQ and retired entries show what happened, not a rank', () => {
  const table = buildResultTable(set('race', [
    row({ position: 1, elapsedMs: 5455026, laps: 56, points: '25', team: { id: 't', name: 'McLaren' } }),
    row({ id: 'b', position: 2, positionText: '2', gap: { kind: 'time_ms', value: 9748 }, laps: 56, points: '18' }),
    row({ id: 'c', position: null, positionText: 'D', classificationStatus: 'dsq', finishStatus: 'dsq', laps: 0, points: '0', gap: null }),
    row({ id: 'd', position: null, positionText: 'R', classificationStatus: 'not_classified', finishStatus: 'dnf', laps: 4, points: '0' }),
    row({ id: 'e', position: null, positionText: 'W', classificationStatus: 'dns', finishStatus: 'dns', laps: 0, points: '0' }),
  ]));
  assert.deepEqual(table.headers, ['Time / gap', 'Laps', 'Pts']);
  assert.deepEqual(table.rows.map((r) => [r.position, ...r.cells]), [
    ['1', '1:30:55.026', '56', '25'],
    ['2', '+9.748s', '56', '18'],
    ['DSQ', '–', '0', '0'],
    ['DNF', '–', '4', '0'],
    ['DNS', '–', '0', '0'],
  ]);
  assert.equal(table.rows[0].team, 'McLaren');
});

test('qualifying keeps the phases and shows a dash for a phase not reached', () => {
  const table = buildResultTable(set('qualifying', [
    row({ qualifyingPhases: [{ phase: 'Q1', timeMs: 91591 }, { phase: 'Q2', timeMs: 91200 }, { phase: 'Q3', timeMs: 90641 }] }),
    row({ id: 'q', position: 17, positionText: '17', qualifyingPhases: [{ phase: 'Q1', timeMs: 92418 }, { phase: 'Q2', timeMs: null }, { phase: 'Q3', timeMs: null }] }),
  ]));
  assert.deepEqual(table.headers, ['Q1', 'Q2', 'Q3']);
  assert.deepEqual(table.rows.map((r) => r.cells), [['1:31.591', '1:31.200', '1:30.641'], ['1:32.418', '–', '–']]);
});

test('the sprint uses the race layout and sprint qualifying the qualifying layout', () => {
  assert.equal(buildResultTable(set('sprint', [row({})])).kind, 'race');
  assert.equal(buildResultTable(set('sprint_qualifying', [row({})])).kind, 'qualifying');
});

test('an unclassified entry with an unknown reason keeps the provider text', () => {
  assert.equal(positionText(row({ position: null, positionText: 'N', classificationStatus: 'not_classified', finishStatus: 'unknown' })), 'NC');
  assert.equal(positionText(row({ position: null, positionText: 'X', classificationStatus: 'unknown' })), 'X');
  assert.equal(positionText(row({ position: null, positionText: null, classificationStatus: 'unknown' })), '–');
});
