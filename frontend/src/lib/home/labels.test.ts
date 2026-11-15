import assert from 'node:assert/strict';
import test from 'node:test';
import {
  afterMidnightLabel,
  dayOffsetLabel,
  sessionCountLabel,
  todayCellLabel,
} from './labels';

test('today cell text follows the state of the day', () => {
  assert.equal(todayCellLabel({ total: 6, done: 0 }), '6 to go');
  assert.equal(todayCellLabel({ total: 6, done: 2 }), '4 left');
  assert.equal(todayCellLabel({ total: 6, done: 5 }), '1 left');
  assert.equal(todayCellLabel({ total: 6, done: 6 }), '6 done');
  assert.equal(todayCellLabel({ total: 0, done: 0 }), '');
  // A session in progress means the day has started, even if nothing is finished yet.
  assert.equal(todayCellLabel({ total: 6, done: 0, live: 1 }), '6 left');
  assert.equal(todayCellLabel({ total: 6, done: 0, live: 0 }), '6 to go');
});

test('count and offset labels', () => {
  assert.equal(sessionCountLabel(1), '1 session');
  assert.equal(sessionCountLabel(6), '6 sessions');
  assert.equal(dayOffsetLabel(0), '');
  assert.equal(dayOffsetLabel(1), '+1 day');
  assert.equal(dayOffsetLabel(-1), '−1 day');
  assert.equal(dayOffsetLabel(2), '+2 days');
  assert.equal(afterMidnightLabel(0), '');
  assert.equal(afterMidnightLabel(1), '1 session starts after midnight');
  assert.equal(afterMidnightLabel(3), '3 sessions start after midnight');
});
