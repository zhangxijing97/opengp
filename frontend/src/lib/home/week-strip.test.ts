import assert from 'node:assert/strict';
import test from 'node:test';
import { WEEK_CELL_ID, buildWeekStrip, rangeTitle, relativeWeekLabel } from './week-strip';

const counts = {
  '2026-10-30': { total: 6, done: 0 },
  '2026-10-31': { total: 6, done: 0 },
  '2026-11-01': { total: 3, done: 0 },
};

test('the week strip of the idle Home: Friday is today, Saturday and Sunday are ahead', () => {
  const cells = buildWeekStrip({ weekStart: '2026-10-26', todayKey: '2026-10-30', selected: WEEK_CELL_ID, counts });
  assert.equal(cells.length, 8);
  assert.deepEqual(cells.map((cell) => cell.label), ['WEEK', 'MON', 'TUE', 'WED', 'THU', 'TODAY', 'SAT', 'SUN']);
  assert.deepEqual(cells.map((cell) => cell.number), ['15', '26', '27', '28', '29', '30', '31', '1']);
  assert.deepEqual(cells.map((cell) => cell.tone), ['selected', 'past', 'past', 'past', 'past', 'today', 'future', 'future']);
  assert.deepEqual(cells[0].status, { text: 'sessions', dot: false });
  assert.equal(cells[1].status, null);
  assert.deepEqual(cells[5].status, { text: '6 to go', dot: true });
  assert.deepEqual(cells[6].status, { text: '6 sessions', dot: false });
  assert.deepEqual(cells[7].status, { text: '3 sessions', dot: false });
});

test('the today cell says left or done as the day goes on', () => {
  const at = (done: number) =>
    buildWeekStrip({ weekStart: '2026-10-26', todayKey: '2026-10-30', selected: WEEK_CELL_ID, counts: { '2026-10-30': { total: 6, done } } })[5].status?.text;
  assert.equal(at(0), '6 to go');
  assert.equal(at(2), '4 left');
  assert.equal(at(6), '6 done');
});

test('selecting a day selects that cell only', () => {
  const cells = buildWeekStrip({ weekStart: '2026-10-26', todayKey: '2026-10-30', selected: '2026-10-31', counts });
  assert.deepEqual(cells.filter((cell) => cell.tone === 'selected').map((cell) => cell.id), ['2026-10-31']);
  assert.equal(cells[5].tone, 'today');
});

test('a week without sessions, a single session, and today without sessions', () => {
  const empty = buildWeekStrip({ weekStart: '2026-10-26', todayKey: '2026-10-30', selected: WEEK_CELL_ID, counts: {} });
  assert.equal(empty[0].number, '0');
  assert.ok(empty.slice(1).every((cell) => cell.status === null));
  const one = buildWeekStrip({ weekStart: '2026-10-26', todayKey: '2026-10-27', selected: WEEK_CELL_ID, counts: { '2026-10-31': { total: 1, done: 0 } } });
  assert.equal(one[0].status?.text, 'session');
  assert.equal(one[6].status?.text, '1 session');
});

test('another week: every day is past or ahead, none is today', () => {
  const past = buildWeekStrip({ weekStart: '2026-10-19', todayKey: '2026-10-30', selected: WEEK_CELL_ID, counts: {} });
  assert.ok(past.slice(1).every((cell) => cell.tone === 'past'));
  const ahead = buildWeekStrip({ weekStart: '2026-11-02', todayKey: '2026-10-30', selected: WEEK_CELL_ID, counts: {} });
  assert.ok(ahead.slice(1).every((cell) => cell.tone === 'future'));
});

test('range title and relative week label', () => {
  assert.equal(rangeTitle('2026-10-26'), 'Oct 26 – Nov 1');
  assert.equal(rangeTitle('2026-11-02'), 'Nov 2 – 8');
  assert.equal(rangeTitle('2026-12-28'), 'Dec 28 – Jan 3');
  assert.equal(relativeWeekLabel('2026-10-26', '2026-10-26'), 'This week');
  assert.equal(relativeWeekLabel('2026-11-02', '2026-10-26'), 'Next week');
  assert.equal(relativeWeekLabel('2026-10-19', '2026-10-26'), 'Last week');
  assert.equal(relativeWeekLabel('2026-11-16', '2026-10-26'), 'Week of Nov 16');
});
