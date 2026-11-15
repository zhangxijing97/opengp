import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDayKey, formatInstant, timeZoneLabel, timeZoneOptions } from './format';

test('instants are shown in the given zone, unknown ones as TBC', () => {
  assert.equal(formatInstant('2026-10-30T18:30:00Z', 'America/Los_Angeles', 'time'), '11:30 AM');
  assert.equal(formatInstant('2026-10-30T18:30:00Z', 'Asia/Tokyo', 'time'), '3:30 AM');
  assert.equal(formatInstant('2026-10-30T18:30:00Z', 'UTC', 'datetime'), 'Fri, Oct 30, 6:30 PM');
  assert.equal(formatInstant('2026-10-30T18:30:00Z', 'Asia/Tokyo', 'date'), 'Sat, Oct 31');
  assert.equal(formatInstant(null, 'UTC', 'time'), 'TBC');
  assert.equal(formatInstant('not a date', 'UTC', 'time'), 'TBC');
});

test('day keys and zone labels', () => {
  assert.equal(formatDayKey('2026-10-30'), 'Fri, Oct 30');
  assert.equal(timeZoneLabel('America/Los_Angeles', new Date('2026-10-30T18:30:00Z')), 'PT');
  assert.equal(timeZoneLabel('UTC'), 'UTC');
  const at = new Date('2026-10-31T12:00:00Z');
  assert.equal(timeZoneLabel('America/New_York', at), 'ET');
  assert.equal(timeZoneLabel('Asia/Tokyo', at), 'GMT+9');
  assert.equal(timeZoneLabel('Europe/Berlin', at), 'GMT+1');
  assert.equal(timeZoneLabel('Asia/Kolkata', at), 'GMT+5:30');
  assert.equal(timeZoneLabel('Not/AZone', at), 'Not/AZone');
});

test('time zone options include UTC and Los Angeles, sorted', () => {
  const zones = timeZoneOptions();
  assert.ok(zones.includes('UTC'));
  assert.ok(zones.includes('America/Los_Angeles'));
  assert.deepEqual(zones, [...zones].sort((a, b) => a.localeCompare(b)));
});
