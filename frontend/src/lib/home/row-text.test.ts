import assert from 'node:assert/strict';
import test from 'node:test';
import { exceptionText, happens } from './row-text';

test('cancelled and postponed replace the time with a word', () => {
  assert.deepEqual(exceptionText('cancelled'), { word: 'Cancelled', note: null });
  assert.deepEqual(exceptionText('postponed'), { word: 'Postponed', note: null });
});

test('an unknown status keeps the time and adds a note', () => {
  assert.deepEqual(exceptionText('unknown'), { word: null, note: 'Status unknown' });
});

test('a normal row has no extra text', () => {
  assert.deepEqual(exceptionText(null), { word: null, note: null });
});

test('only cancelled and postponed sessions are not going to happen', () => {
  assert.equal(happens({ exception: null }), true);
  assert.equal(happens({ exception: 'unknown' }), true);
  assert.equal(happens({ exception: 'cancelled' }), false);
  assert.equal(happens({ exception: 'postponed' }), false);
});
