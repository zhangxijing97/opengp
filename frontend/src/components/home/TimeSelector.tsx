'use client';

import type { MouseEvent } from 'react';
import { useDelayedFlag } from '../../lib/client-state/delayed';
import { routes } from '../../lib/home/routes';
import { addDays } from '../../lib/home/week';
import { rangeTitle, relativeWeekLabel } from '../../lib/home/week-strip';
import type { WeekCellVM } from '../../lib/home/week-strip';
import { IconButtonLink } from './IconButton';
import { ArrowIcon } from './icons';
import { Spinner } from './Spinner';
import { WeekCell } from './WeekCell';

// The time selector (Figma component TimeSelector): the arrows to the week before and after, the range
// of the week with the time zone, and the week track. The arrows are links (?week=), so they also work in a new
// tab. A plain click is taken over by the schedule (`onNavigate`), which asks for the week with a transition:
// the page you see stays until the new one is ready, and meanwhile the clicked arrow shows a spinner and the
// line under the title names the week being loaded. The title always names the week that is on screen, so it
// never disagrees with the schedule below it. The caret next to the title in the design would open a week
// picker; it is not drawn because the picker is not designed. TODO(design)

const SLOW_AFTER_MS = 4_000;

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function TimeSelector({
  weekStart,
  currentWeekStart,
  cells,
  zoneLabel,
  pendingWeek,
  onSelect,
  onNavigate,
}: {
  /** The week on screen. */
  weekStart: string;
  currentWeekStart: string;
  cells: readonly WeekCellVM[];
  zoneLabel: string;
  /** The week being loaded, or null. */
  pendingWeek: string | null;
  onSelect: (id: string) => void;
  onNavigate: (week: string) => void;
}) {
  // Quick clicks add up: each one goes a week on from the week that is already being loaded.
  const from = pendingWeek ?? weekStart;
  const previous = addDays(from, -7);
  const next = addDays(from, 7);
  const direction = pendingWeek === null ? null : pendingWeek < weekStart ? 'previous' : 'next';
  const slow = useDelayedFlag(pendingWeek !== null, SLOW_AFTER_MS);
  const take = (week: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onNavigate(week);
  };

  return (
    <div className="flex flex-col gap-3 py-1">
      <div className="flex items-center gap-3">
        <IconButtonLink
          href={`${routes.home}?week=${previous}`}
          label="Previous week"
          surface="page"
          busy={direction === 'previous'}
          onClick={take(previous)}
        >
          {direction === 'previous' ? <Spinner /> : <ArrowIcon direction="left" />}
        </IconButtonLink>
        <div className="flex min-h-10.75 flex-1 flex-col items-center justify-center gap-0.5">
          <h2 className="text-range-title">{rangeTitle(weekStart)}</h2>
          <p className={`text-caption ${pendingWeek ? 'text-text-brand' : 'text-text-tertiary'}`}>
            {pendingWeek
              ? `${slow ? 'Still loading' : 'Loading'} ${rangeTitle(pendingWeek)}…`
              : `${relativeWeekLabel(weekStart, currentWeekStart)} · times in ${zoneLabel}`}
          </p>
          <span role="status" className="sr-only">
            {pendingWeek ? `Loading the week of ${rangeTitle(pendingWeek)}` : ''}
          </span>
        </div>
        <IconButtonLink
          href={`${routes.home}?week=${next}`}
          label="Next week"
          surface="page"
          busy={direction === 'next'}
          onClick={take(next)}
        >
          {direction === 'next' ? <Spinner /> : <ArrowIcon direction="right" />}
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
