import assert from 'node:assert/strict';
import test from 'node:test';
import { MIN_CARD_HEIGHT, MIN_STUB_FOOTER_HEIGHT, cardHeight, rowHeight, rowKindOf, ticketHeight } from './row-layout';

test('tiers map to the two row layouts, sub-sessions have none', () => {
  assert.equal(rowKindOf('T1'), 'multi');
  assert.equal(rowKindOf('T2'), 'multi');
  assert.equal(rowKindOf('T3'), 'single');
  assert.equal(rowKindOf('T4'), 'single');
  assert.equal(rowKindOf('T5'), null);
});

test('row heights of the design', () => {
  assert.equal(rowHeight('single', 'idle', true), 40);
  assert.equal(rowHeight('single', 'idle', false), 41);
  assert.equal(rowHeight('single', 'live', false), 41);
  assert.equal(rowHeight('multi', 'idle', false), 69);
  assert.equal(rowHeight('multi', 'done', true), 69);
  assert.equal(rowHeight('multi', 'live', false), 87);
});

test('the Friday card of the design: six single rows are 245px', () => {
  const rows = Array.from({ length: 6 }, () => ({ kind: 'single' as const, state: 'idle' as const }));
  assert.equal(cardHeight(rows), 40 + 5 * 41);
  assert.equal(cardHeight(rows), 245);
});

test('an empty card has no height, a lone row is 40px', () => {
  assert.equal(cardHeight([]), 0);
  assert.equal(cardHeight([{ kind: 'single', state: 'idle' }]), 40);
  assert.ok(MIN_STUB_FOOTER_HEIGHT > 79 + 45 - 20);
});

test('a ticket is never shorter than its stub needs, and never shorter than its rows', () => {
  assert.equal(ticketHeight([{ kind: 'single', state: 'idle' }]), MIN_CARD_HEIGHT);
  assert.equal(ticketHeight([{ kind: 'multi', state: 'idle' }]), MIN_CARD_HEIGHT);
  assert.equal(ticketHeight([{ kind: 'multi', state: 'live' }]), MIN_CARD_HEIGHT);
  const tall = Array.from({ length: 6 }, () => ({ kind: 'single' as const, state: 'idle' as const }));
  assert.equal(ticketHeight(tall), 245);
  // the stub text ends at y 79 and the month needs room below it
  assert.ok(MIN_CARD_HEIGHT >= 79 + 14);
});
