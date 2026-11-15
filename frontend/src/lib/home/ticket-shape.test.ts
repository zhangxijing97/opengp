import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTicketShape, holeCenters } from './ticket-shape';

test('the hole counts of the design: 245 gives 30, 554 gives 74', () => {
  assert.equal(holeCenters(245).length, 30);
  assert.equal(holeCenters(554).length, 74);
  assert.equal(buildTicketShape(245).holeCount, 30);
  assert.equal(buildTicketShape(554).holeCount, 74);
});

test('holes start at y 20, are 7px apart and leave 22px at the bottom', () => {
  const centers = holeCenters(245);
  assert.equal(centers[0], 20);
  assert.equal(centers[1], 27);
  assert.equal(centers[29], 223);
  assert.ok(245 - centers[29] >= 22);
  assert.equal(holeCenters(554)[73], 531);
});

test('a card shorter than 42px has no holes and valid paths', () => {
  for (const height of [40, 41]) {
    const shape = buildTicketShape(height);
    assert.equal(shape.holeCount, 0);
    assert.ok(!/NaN|undefined/.test(shape.stubBase + shape.cardBase));
  }
  assert.equal(holeCenters(42).length, 1);
});

test('the paths are well formed: one subpath for the outline and one per hole', () => {
  const shape = buildTicketShape(245);
  assert.equal((shape.cardBase.match(/M /g) ?? []).length, 31);
  assert.equal((shape.stubBase.match(/M /g) ?? []).length, 1);
  assert.ok(shape.cardBase.endsWith('Z'));
  assert.ok(shape.stubBase.startsWith('M 24 0'));
  assert.ok(!/NaN|undefined/.test(shape.cardBase + shape.stubBase + shape.cardOutline));
  assert.equal(shape.cardBase, shape.cardOutline);
});

test('the height is rounded and the width follows the argument', () => {
  assert.ok(buildTicketShape(245.4).cardBase.includes(' 245 '));
  assert.ok(buildTicketShape(245, 700).cardBase.includes(' 676 0'));
});
