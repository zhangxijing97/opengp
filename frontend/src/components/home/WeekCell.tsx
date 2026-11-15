'use client';

import type { WeekCellVM } from '../../lib/home/week-strip';

// One cell of the week track (Figma component WeekCell). The week-strip model decides the text; this
// draws it: selected is the indigo cell, today has the amber dot, past days are grey.
export function WeekCell({ cell, onSelect }: { cell: WeekCellVM; onSelect: (id: string) => void }) {
  const selected = cell.tone === 'selected';
  const labelColour = selected ? 'text-text-brand' : cell.tone === 'today' ? 'text-text-primary' : 'text-text-tertiary';
  const numberStyle = selected
    ? 'text-week-date-strong text-text-brand'
    : cell.kind === 'week' || cell.tone === 'today'
      ? 'text-week-date-strong text-text-primary'
      : cell.tone === 'past'
        ? 'text-week-date text-text-disabled'
        : 'text-week-date text-text-primary';
  const statusStyle = selected
    ? 'text-week-sub text-text-brand'
    : cell.tone === 'today'
      ? 'text-week-status text-text-amber'
      : 'text-week-sub text-text-tertiary';

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${cell.label} ${cell.number}${cell.status ? `, ${cell.status.text}` : ''}`}
      onClick={() => onSelect(cell.id)}
      className={`flex flex-1 flex-col items-center gap-px rounded-control py-(--space-off-9) ${selected ? 'bg-brand-indigo-light' : 'hover:bg-text-on-brand/50'}`}
    >
      <span className={`text-week-label ${labelColour}`}>{cell.label}</span>
      <span className={numberStyle}>{cell.number}</span>
      <span className="flex h-3.5 items-center gap-1">
        {cell.status ? (
          <>
            {cell.status.dot ? <span aria-hidden="true" className="size-1.5 rounded-(--radius-full) bg-brand-amber" /> : null}
            <span className={statusStyle}>{cell.status.text}</span>
          </>
        ) : null}
      </span>
    </button>
  );
}
