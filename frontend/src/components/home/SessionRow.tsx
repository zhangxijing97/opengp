import Link from 'next/link';
import { routes } from '../../lib/home/routes';
import { rowKindOf } from '../../lib/home/row-layout';
import { themeById } from '../../lib/home/series-theme';
import type { SeriesTheme } from '../../lib/home/series-theme';
import type { SessionRowVM } from '../../lib/home/types';
import { RowChevronIcon } from './home-icons';
import { LocalTime } from './LocalTime';
import { RowTime } from './RowTime';
import { SeriesPlate } from './SeriesPlate';
import { StatusTag } from './StatusTag';

// A session row of the day schedule (Figma component SessionRow), as far as the data allows.
//   single (tiers T3, T4): one line: plate, event, session, then the time on the right.
//   multi  (tiers T1, T2): two lines (three while live), the start time and its end on the right.
// What the API has: the schedule and a status worked out from the clock. What it does not have
// yet: results, progress, flags. So:
//   idle:  the start time (RowTime).
//   live:  the LIVE label; no progress bar and no time left (HANDOFF.md section 4: hide what is missing).
//   done:  the time moves into the session line; the pill "Results pending" only when the API says the
//          results are not published; no result block (the designed podium and tower need results).
// The whole row is a link to the session page. TODO(design) for everything the design does not draw.

function fallbackTheme(seriesId: string): SeriesTheme {
  return { id: seriesId, apiId: null, name: seriesId, color: 'var(--color-dot-inactive)', aliases: [] };
}

export function SessionRow({ row, first }: { row: SessionRowVM; first: boolean }) {
  const kind = rowKindOf(row.tier);
  if (kind === null) return null;
  const theme = themeById(row.seriesId) ?? fallbackTheme(row.seriesId);
  const separator = first ? '' : 'border-t border-border-separator';
  const done = row.state === 'done';
  const live = row.state === 'live';
  const pending = done && row.result?.availability === 'not_published';
  const doneTime = done ? (
    <span className="text-row-time text-text-tertiary">
      &nbsp;·&nbsp;<LocalTime iso={row.startsAt} mode="time" />
    </span>
  ) : null;

  if (kind === 'single') {
    return (
      <Link href={routes.session(row.id)} className={`flex items-center gap-3 px-5 py-2.5 ${separator}`}>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <SeriesPlate theme={theme} />
          <span className="text-row-title-sm truncate">{row.eventName}</span>
          <span className="text-row-session flex shrink-0 items-center whitespace-nowrap">
            <span className="text-row-time text-text-tertiary">·&nbsp;</span>
            {row.sessionName}
            {doneTime}
          </span>
          {live ? <span className="text-row-live shrink-0 text-status-live">LIVE</span> : null}
        </span>
        {row.state === 'idle' ? <RowTime row={row} size="sm" /> : null}
        {pending ? <StatusTag /> : null}
        <RowChevronIcon className="shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      href={routes.session(row.id)}
      className={`flex items-center gap-4 px-5 pb-3.5 ${first ? 'pt-3.5' : `${separator} pt-3.25`}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-(--space-off-3)">
        <span className="flex items-center gap-2">
          <SeriesPlate theme={theme} />
          <span className="text-row-title truncate">{row.eventName}</span>
        </span>
        <span className="text-row-session flex items-center whitespace-nowrap">
          {row.sessionName}
          {doneTime}
        </span>
        {live ? <span className="text-row-live h-3.75 text-status-live">LIVE</span> : null}
      </span>
      {row.state === 'idle' ? <RowTime row={row} size="md" showEnd /> : null}
      {pending ? <StatusTag /> : null}
      <RowChevronIcon className="shrink-0" />
    </Link>
  );
}
