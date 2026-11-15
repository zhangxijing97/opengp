import assert from 'node:assert/strict';
import test from 'node:test';
import { MIN_CARD_HEIGHT, MIN_STUB_FOOTER_HEIGHT, cardHeight, hasPodium, rowHeight, rowKindOf, ticketHeight } from './row-layout';

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

test('a finished main race with a top three has a podium and is 114px high', () => {
  const withRows = { rows: [{ name: 'A' }] };
  assert.equal(hasPodium({ tier: 'T1', state: 'done', result: withRows }), true);
  assert.equal(hasPodium({ tier: 'T1', state: 'done', result: { rows: [] } }), false);
  assert.equal(hasPodium({ tier: 'T1', state: 'done' }), false);
  assert.equal(hasPodium({ tier: 'T1', state: 'idle', result: withRows }), false);
  assert.equal(hasPodium({ tier: 'T2', state: 'done', result: withRows }), false);
  assert.equal(rowHeight('multi', 'done', true, true), 114);
  assert.equal(rowHeight('multi', 'done', false, true), 114);
  assert.equal(rowHeight('multi', 'done', false), 69);
  assert.equal(rowHeight('single', 'done', false, true), 41);
});

test('a card with a podium row and a qualifying row adds up', () => {
  assert.equal(cardHeight([{ kind: 'multi', state: 'done', podium: true }, { kind: 'multi', state: 'done' }]), 114 + 69);
});
