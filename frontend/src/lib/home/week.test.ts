import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  isDayKey,
  dayParts,
  daysBetween,
  isValidTimeZone,
  localDate,
  mondayOf,
  pickDefaultWeek,
  weekOfRound,
  weekdayIndex,
} from './week';

test('day arithmetic crosses month and year boundaries and ignores daylight saving', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2026-11-01', -7), '2026-10-25');
  assert.equal(daysBetween('2026-11-01', '2026-10-31'), -1);
  assert.equal(daysBetween('2026-10-26', '2026-11-02'), 7);
});

test('weeks run Monday to Sunday', () => {
  assert.equal(weekdayIndex('2026-11-09'), 0);
  assert.equal(weekdayIndex('2026-11-15'), 6);
  assert.equal(mondayOf('2026-11-14'), '2026-11-09');
  assert.equal(mondayOf('2026-11-09'), '2026-11-09');
  assert.equal(mondayOf('2026-11-15'), '2026-11-09');
});

test('localDate uses the given time zone, also around the daylight saving change', () => {
  assert.equal(localDate('2026-11-02T03:00:00Z', 'America/Los_Angeles'), '2026-11-01');
  assert.equal(localDate('2026-11-02T03:00:00Z', 'Asia/Tokyo'), '2026-11-02');
  assert.equal(localDate('2026-11-01T08:59:00Z', 'America/Los_Angeles'), '2026-11-01');
  assert.equal(localDate('2026-11-01T09:00:00Z', 'America/Los_Angeles'), '2026-11-01');
  assert.equal(localDate(Date.parse('2026-12-31T23:30:00Z'), 'UTC'), '2026-12-31');
});

test('time zone validation', () => {
  assert.equal(isValidTimeZone('Europe/Paris'), true);
  assert.equal(isValidTimeZone('Mars/Base'), false);
});

test('dayParts gives the ticket stub text', () => {
  assert.deepEqual(dayParts('2026-10-30'), { weekday: 'FRI', day: 30, month: 'OCT' });
  assert.deepEqual(dayParts('2026-11-01'), { weekday: 'SUN', day: 1, month: 'NOV' });
});

test('a round belongs to the week of its first session', () => {
  const round = { startsAt: '2026-10-30T18:30:00Z', endsAt: '2026-11-01T22:00:00Z' };
  assert.equal(weekOfRound(round, null), '2026-10-26');
  // The track time zone can move the first session to another day, and so to another week.
  const sunday = { startsAt: '2026-11-01T14:00:00Z', endsAt: null };
  assert.equal(weekOfRound(sunday, null), '2026-10-26');
  assert.equal(weekOfRound(sunday, 'Pacific/Auckland'), '2026-11-02');
  assert.equal(weekOfRound({ startsAt: null, endsAt: null }, null), null);
  assert.equal(weekOfRound({ startsAt: 'garbage', endsAt: null }, null), null);
});

test('on Monday the previous week stays until its spill-over sessions finish', () => {
  const spill = [{ startsAt: '2026-11-02T14:00:00Z', endsAt: '2026-11-02T20:00:00Z' }];
  const zone = 'America/Los_Angeles';
  // Monday 10:00 in Los Angeles, the Monday-morning session is still running.
  assert.equal(
    pickDefaultWeek({ nowMs: Date.parse('2026-11-02T18:00:00Z'), userTimeZone: zone, previousWeekSessions: spill }),
    '2026-10-26',
  );
  // After it ended the current week is the default.
  assert.equal(
    pickDefaultWeek({ nowMs: Date.parse('2026-11-02T21:00:00Z'), userTimeZone: zone, previousWeekSessions: spill }),
    '2026-11-02',
  );
  // Sunday-evening sessions are Sunday for the user: they are not spill-over.
  assert.equal(
    pickDefaultWeek({
      nowMs: Date.parse('2026-11-02T18:00:00Z'),
      userTimeZone: zone,
      previousWeekSessions: [{ startsAt: '2026-11-02T03:00:00Z', endsAt: '2026-11-02T22:00:00Z' }],
    }),
    '2026-11-02',
  );
  // Not Monday: always the current week.
  assert.equal(
    pickDefaultWeek({ nowMs: Date.parse('2026-11-04T18:00:00Z'), userTimeZone: zone, previousWeekSessions: spill }),
    '2026-11-02',
  );
  // A session without a planned end counts as unfinished for three hours.
  assert.equal(
    pickDefaultWeek({
      nowMs: Date.parse('2026-11-02T16:00:00Z'),
      userTimeZone: zone,
      previousWeekSessions: [{ startsAt: '2026-11-02T14:00:00Z', endsAt: null }],
    }),
    '2026-10-26',
  );
});

test('a day key from the address bar must be a real date', () => {
  assert.equal(isDayKey('2026-11-02'), true);
  assert.equal(isDayKey('2026-02-30'), false);
  assert.equal(isDayKey('2026-13-01'), false);
  assert.equal(isDayKey('26-11-02'), false);
  assert.equal(isDayKey('2026-11-02T00:00'), false);
  assert.equal(isDayKey(''), false);
  assert.equal(isDayKey(undefined), false);
});
