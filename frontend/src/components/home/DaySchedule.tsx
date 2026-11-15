'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MIN_CARD_HEIGHT, MIN_STUB_FOOTER_HEIGHT, hasPodium, rowKindOf, ticketHeight } from '../../lib/home/row-layout';
import { STUB, buildTicketShape } from '../../lib/home/ticket-shape';
import type { DayScheduleVM } from '../../lib/home/types';
import { SessionRow } from './SessionRow';

// One day of the schedule: a ticket with a stub on the left (TODAY stamp or weekday, day, month, and
// the session count) and the session rows on the right.
//
// The card is as tall as its rows, so the ticket shapes are generated for that height (the SVG path
// of the HANDOFF.md appendix; chosen over a CSS mask because it is the exact geometry of the design
// and works in every browser). The height is computed from the row heights for the first render, so
// the server can draw the ticket, and then follows the measured height of the rows. The rows are
// transparent: the holes and notches show the page behind the card. A card is at least as tall as its stub
// needs (MIN_CARD_HEIGHT); a day with a single row gets that height and the row sits in the middle.

export function DaySchedule({ day }: { day: DayScheduleVM }) {
  const rows = useMemo(() => day.rows.filter((row) => rowKindOf(row.tier) !== null), [day.rows]);
  const computed = ticketHeight(
    rows.flatMap((row) => {
      const kind = rowKindOf(row.tier);
      return kind ? [{ kind, state: row.state, podium: hasPodium(row) }] : [];
    }),
  );
  const [measured, setMeasured] = useState<number | null>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = rowsRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setMeasured(Math.round(element.getBoundingClientRect().height)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = measured ?? computed;
  const shape = useMemo(() => buildTicketShape(height), [height]);
  const showFooter = height >= MIN_STUB_FOOTER_HEIGHT;

  return (
    <section
      aria-label={`${day.weekday} ${day.day} ${day.month}`}
      className="relative"
      style={{ width: STUB.cardWidth }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={STUB.cardWidth}
        height={height}
        viewBox={`0 0 ${STUB.cardWidth} ${height}`}
        fill="none"
      >
        <path d={shape.cardBase} fillRule="evenodd" className="fill-surface-card" />
        <path d={shape.stubBase} className={day.isToday ? 'fill-brand-amber' : 'fill-brand-indigo-light'} />
        <path d={shape.cardOutline} fillRule="evenodd" className="stroke-border-default" strokeWidth="1" />
      </svg>

      <div className="absolute inset-y-0 left-0 w-14 text-center text-brand-ink">
        {day.isToday ? (
          <span className="text-stamp absolute top-4 left-2 flex h-4 w-10 items-center justify-center rounded-micro bg-brand-ink text-text-on-brand">
            TODAY
          </span>
        ) : (
          <span className="text-stub-dow absolute inset-x-0 top-4">{day.weekday}</span>
        )}
        <span className="text-stub-day absolute inset-x-0 top-8.5">{day.day}</span>
        <span className="text-stub-month absolute inset-x-0 top-17.25">{day.month}</span>
        {showFooter ? (
          <>
            <span className="text-stub-count absolute inset-x-0 bottom-6.25">{day.sessionCount}</span>
            <span className="text-stub-caption absolute inset-x-0 bottom-3.5 text-text-secondary">SESSIONS</span>
          </>
        ) : null}
      </div>

      <div
        ref={rowsRef}
        className="relative ml-14 flex flex-col justify-center"
        style={{ minHeight: MIN_CARD_HEIGHT }}
      >
        {rows.map((row, index) => (
          <SessionRow key={row.id} row={row} first={index === 0} />
        ))}
      </div>
    </section>
  );
}
