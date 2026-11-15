import assert from 'node:assert/strict';
import test from 'node:test';
import type { Lifecycle, SessionType } from '../api-v1/types';
import { rowStatusOf, tierOf } from './tier';

test('every API session type has a tier', () => {
  const expected: Record<SessionType, string> = {
    race: 'T1',
    qualifying: 'T2',
    sprint: 'T2',
    sprint_qualifying: 'T3',
    heat: 'T3',
    practice: 'T4',
    warmup: 'T4',
    test: 'T4',
    stage: 'T5',
    other: 'T3',
  };
  for (const [type, tier] of Object.entries(expected)) {
    assert.equal(tierOf(type as SessionType), tier, type);
  }
});

test('lifecycle maps to the three designed row states, the rest are plain exceptions', () => {
  const cases: [Lifecycle, string, string | null][] = [
    ['scheduled', 'idle', null],
    ['in_progress', 'live', null],
    ['completed', 'done', null],
    ['cancelled', 'idle', 'cancelled'],
    ['postponed', 'idle', 'postponed'],
    ['unknown', 'idle', 'unknown'],
  ];
  for (const [lifecycle, state, exception] of cases) {
    assert.deepEqual(rowStatusOf(lifecycle), { state, exception }, lifecycle);
  }
});
