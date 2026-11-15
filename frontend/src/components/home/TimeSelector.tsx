'use client';

import { routes } from '../../lib/home/routes';
import { relativeWeekLabel, rangeTitle } from '../../lib/home/week-strip';
import type { WeekCellVM } from '../../lib/home/week-strip';
import { addDays } from '../../lib/home/week';
import { IconButtonLink } from './IconButton';
import { ArrowIcon } from './icons';
import { WeekCell } from './WeekCell';

// The time selector (Figma component TimeSelector): the arrows to the week before and after, the range
// of the week with the time zone, and the week track. The arrows are links (?week=), so the server loads
// the weeks around the one chosen. The caret next to the title in the design would open a week picker;
// it is not drawn here because the picker is not designed. TODO(design)
export function TimeSelector({
  weekStart,
  currentWeekStart,
  cells,
  zoneLabel,
  onSelect,
}: {
  weekStart: string;
  currentWeekStart: string;
  cells: readonly WeekCellVM[];
  zoneLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-1">
      <div className="flex items-center gap-3">
        <IconButtonLink href={`${routes.home}?week=${addDays(weekStart, -7)}`} label="Previous week" surface="page">
          <ArrowIcon direction="left" />
        </IconButtonLink>
        <div className="flex flex-1 flex-col items-center gap-0.5">
          <h2 className="text-range-title">{rangeTitle(weekStart)}</h2>
          <p className="text-caption text-text-tertiary">
            {relativeWeekLabel(weekStart, currentWeekStart)} · times in {zoneLabel}
          </p>
        </div>
        <IconButtonLink href={`${routes.home}?week=${addDays(weekStart, 7)}`} label="Next week" surface="page">
          <ArrowIcon direction="right" />
        </IconButtonLink>
      </div>
      <div role="group" aria-label="Days of the week" className="flex gap-0.5 rounded-container bg-surface-track p-1">
        {cells.map((cell) => (
          <WeekCell key={cell.id} cell={cell} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
