import { countsOf } from './adapter-v1';
import type { DayCounts } from './labels';
import type { DayScheduleVM, HomeVM } from './types';
import { WEEK_CELL_ID } from './week-strip';

// Small decisions of the Home that are not about drawing.

/**
 * The days that count for the week track. The design counts the sessions of the series the visitor
 * follows; a visitor who follows nothing has an empty Following section, so the track counts all
 * sessions for them instead of showing zeros everywhere.
 */
export function primaryDays(vm: HomeVM, followsAnything: boolean): readonly DayScheduleVM[] {
  return followsAnything ? vm.following : vm.allSeries;
}

export function countsByDay(days: readonly DayScheduleVM[]): Record<string, DayCounts> {
  return Object.fromEntries(days.map((day) => [day.dayKey, countsOf(day)]));
}

/** WEEK shows every day, a day key shows that day. */
export function visibleDays(days: readonly DayScheduleVM[], selected: string): readonly DayScheduleVM[] {
  return selected === WEEK_CELL_ID ? days : days.filter((day) => day.dayKey === selected);
}

/** The number in a section header: the sessions of the whole week, whatever day is selected. */
export function sectionCount(days: readonly DayScheduleVM[]): number {
  return days.reduce((sum, day) => sum + day.sessionCount, 0);
}
