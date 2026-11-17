// What the Home shows while it waits: the shapes of the real columns with grey bars where text will be, at the
// sizes of the design (Figma page 05). They never show a made-up session, time, result or point. The pulse stops
// under reduced motion. The series list on the left needs no skeleton: it does not wait for any data.

function Bar({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-surface-track motion-safe:animate-pulse ${className}`} />;
}

const TICKET_ROWS = [
  ['w-16', 'w-44', 'w-24'],
  ['w-16', 'w-36', 'w-28'],
  ['w-16', 'w-48', 'w-20'],
];

function TicketSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="relative overflow-hidden rounded-surface border border-border-default bg-surface-card">
      <div className="absolute inset-y-0 left-0 w-14 bg-brand-indigo-light" />
      <ul className="ml-14">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className={`flex h-10 items-center gap-3 px-5 ${index === 0 ? '' : 'border-t border-border-separator'}`}
          >
            {TICKET_ROWS[index % TICKET_ROWS.length].map((width, bar) => (
              <Bar key={bar} className={`h-4 rounded-micro ${width}`} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The middle column while the schedule loads: the time selector (140px), a section header (30px) and two day
// schedules. The page is as tall as the series list in any case, so what arrives does not move the footer.
export function ScheduleSkeleton() {
  return (
    <section aria-label="Schedule" aria-busy="true" className="flex w-(--layout-col-main) shrink-0 flex-col gap-4">
      <p role="status" className="sr-only">
        Loading the schedule
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3 py-1">
        <div className="flex items-center gap-3">
          <Bar className="size-8.5 rounded-(--radius-full)" />
          <div className="flex min-h-10.75 flex-1 flex-col items-center justify-center gap-1">
            <Bar className="h-5.5 w-36 rounded-micro" />
            <Bar className="h-3.5 w-44 rounded-micro" />
          </div>
          <Bar className="size-8.5 rounded-(--radius-full)" />
        </div>
        <div className="flex gap-0.5 rounded-container bg-surface-track p-1">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-17.25 flex-1 rounded-control bg-surface-card/40" />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="flex items-center gap-2 pt-2 pr-3 pl-2">
        <Bar className="h-5.5 w-28 rounded-micro" />
        <div className="flex-1" />
        <Bar className="h-3.5 w-32 rounded-micro" />
      </div>
      <TicketSkeleton rows={3} />
      <TicketSkeleton rows={2} />
    </section>
  );
}

// The right column while the standings load. The title is real (the series is known before any request);
// `slow` adds a line once it has taken a while, so a long wait is not mistaken for a frozen page.
export function StandingsSkeleton({ title, slow = false }: { title: string; slow?: boolean }) {
  return (
    <aside
      aria-label="Standings"
      aria-busy="true"
      className="w-72 shrink-0 overflow-hidden rounded-surface border border-border-default bg-surface-card"
    >
      <h2 className="text-series-title px-4 pt-4 pb-3">{title}</h2>
      <p role="status" className="sr-only">
        Loading the standings
      </p>
      {slow ? (
        <p className="text-caption px-4 pb-2 text-text-secondary">Still loading the standings…</p>
      ) : null}
      <div aria-hidden="true" className="flex flex-col gap-2 px-4 pb-3.5">
        <Bar className="h-6 w-28 rounded-micro" />
        <Bar className="h-5 w-full rounded-micro" />
      </div>
      <div aria-hidden="true" className="px-4 pb-2.5">
        <Bar className="h-7.5 w-30 rounded-track" />
      </div>
      <div aria-hidden="true" className="border-t border-border-separator px-4 pt-2 pb-1.5">
        <Bar className="h-3.5 w-full rounded-micro" />
      </div>
      <ul aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <li key={index} className="flex h-8.5 items-center gap-3 px-4">
            <Bar className="size-5.5 rounded-(--radius-full)" />
            <Bar className="h-3.5 flex-1 rounded-micro" />
            <Bar className="h-3.5 w-8 rounded-micro" />
          </li>
        ))}
      </ul>
    </aside>
  );
}
