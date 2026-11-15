import { sessionCountLabel, todayCellLabel } from './labels';
import type { DayCounts } from './labels';
import { addDays, dayParts, daysBetween } from './week';

// The week track of the time selector (Figma component TimeSelector): a WEEK cell and seven day
// cells. This module decides what each cell says; the component only draws it.

export const WEEK_CELL_ID = 'week';

/** selected: indigo cell. today, past and future: how the day number is drawn. */
export type CellTone = 'selected' | 'today' | 'past' | 'future';

export interface WeekCellVM {
  /** "week" or the day key. */
  id: string;
  kind: 'week' | 'day';
  /** WEEK, MON ... SUN, or TODAY. */
  label: string;
  /** The session count for the week cell, the day of the month for a day cell. */
  number: string;
  /** The line under the number. The dot is the amber dot of the today cell. */
  status: { text: string; dot: boolean } | null;
  tone: CellTone;
}

const NO_COUNTS: DayCounts = { total: 0, done: 0 };

export function buildWeekStrip(args: {
  weekStart: string;
  todayKey: string;
  /** WEEK_CELL_ID or a day key. */
  selected: string;
  counts: Readonly<Record<string, DayCounts>>;
}): WeekCellVM[] {
  const { weekStart, todayKey, selected, counts } = args;
  const dayKeys = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekTotal = dayKeys.reduce((sum, key) => sum + (counts[key]?.total ?? 0), 0);

  const cells: WeekCellVM[] = [
    {
      id: WEEK_CELL_ID,
      kind: 'week',
      label: 'WEEK',
      number: String(weekTotal),
      status: { text: weekTotal === 1 ? 'session' : 'sessions', dot: false },
      tone: selected === WEEK_CELL_ID ? 'selected' : 'future',
    },
  ];

  for (const key of dayKeys) {
    const dayCounts = counts[key] ?? NO_COUNTS;
    const isToday = key === todayKey;
    const isPast = key < todayKey;
    let status: WeekCellVM['status'] = null;
    if (isToday) {
      const text = todayCellLabel(dayCounts);
      status = text ? { text, dot: true } : null;
    } else if (!isPast && dayCounts.total > 0) {
      status = { text: sessionCountLabel(dayCounts.total), dot: false };
    }
    cells.push({
      id: key,
      kind: 'day',
      label: isToday ? 'TODAY' : dayParts(key).weekday,
      number: String(dayParts(key).day),
      status,
      tone: selected === key ? 'selected' : isToday ? 'today' : isPast ? 'past' : 'future',
    });
  }
  return cells;
}

function monthName(key: string): string {
  const month = dayParts(key).month;
  return month.charAt(0) + month.slice(1).toLowerCase();
}

/** "Oct 26 – Nov 1", or "Nov 2 – 8" inside one month. */
export function rangeTitle(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const first = dayParts(weekStart);
  const last = dayParts(end);
  return first.month === last.month
    ? `${monthName(weekStart)} ${first.day} – ${last.day}`
    : `${monthName(weekStart)} ${first.day} – ${monthName(end)} ${last.day}`;
}

export function relativeWeekLabel(weekStart: string, currentWeekStart: string): string {
  const days = daysBetween(currentWeekStart, weekStart);
  if (days === 0) return 'This week';
  if (days === 7) return 'Next week';
  if (days === -7) return 'Last week';
  return `Week of ${monthName(weekStart)} ${dayParts(weekStart).day}`;
}
