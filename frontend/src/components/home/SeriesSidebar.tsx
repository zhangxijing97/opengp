'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toggleFollow, useFollowing } from '../../lib/client-state/following';
import { routes } from '../../lib/home/routes';
import { SERIES_THEMES, TOP_SERIES_IDS, themeById } from '../../lib/home/series-theme';
import type { SeriesTheme } from '../../lib/home/series-theme';
import { CollapseIcon, SeriesBadge, SeriesStar } from './home-icons';

// The left column (Figma component SidebarSeries): three lists, Followed series, Top series and All
// series. Each item has the round badge, the name (a link to the series page) and the star that
// follows the series; the arrow in a list header collapses the list.

function SeriesItem({ theme, first, followed }: { theme: SeriesTheme; first: boolean; followed: boolean }) {
  return (
    <li className={`flex items-center gap-2 py-(--space-off-9) pr-3.5 pl-4 ${first ? '' : 'border-t border-border-separator'}`}>
      <SeriesBadge color={theme.color} className="shrink-0" />
      <Link href={routes.series(theme.id)} className="text-list-item min-w-0 flex-1 truncate hover:underline">
        {theme.name}
      </Link>
      <button
        type="button"
        aria-pressed={followed}
        aria-label={followed ? `Unfollow ${theme.name}` : `Follow ${theme.name}`}
        onClick={() => toggleFollow(theme.id)}
        className="inline-flex h-6 w-6.5 shrink-0 items-center justify-center rounded-pill hover:bg-surface-inset"
      >
        <SeriesStar filled={followed} />
      </button>
    </li>
  );
}

function SeriesListCard({
  title,
  themes,
  followedIds,
  emptyText,
}: {
  title: string;
  themes: readonly SeriesTheme[];
  followedIds: ReadonlySet<string>;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-surface border border-border-default bg-surface-card">
      <div className="flex items-center gap-2 bg-surface-header py-3 pr-3.5 pl-4">
        <h2 className="text-card-title flex-1">{title}</h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${title} list`}
          className="inline-flex size-3.25 items-center justify-center"
        >
          <CollapseIcon size={13} open={open} />
        </button>
      </div>
      {open ? (
        themes.length === 0 ? (
          <p className="text-caption px-4 py-3 text-text-secondary">{emptyText}</p>
        ) : (
          <ul>
            {themes.map((theme, index) => (
              <SeriesItem key={theme.id} theme={theme} first={index === 0} followed={followedIds.has(theme.id)} />
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}

export function SeriesSidebar() {
  const followedIds = new Set(useFollowing().seriesIds);
  const followed = SERIES_THEMES.filter((theme) => followedIds.has(theme.id));
  const top = TOP_SERIES_IDS.flatMap((id) => {
    const theme = themeById(id);
    return theme ? [theme] : [];
  });
  return (
    <aside aria-label="Series" className="flex w-72 shrink-0 flex-col gap-4">
      <SeriesListCard
        title="Followed series"
        themes={followed}
        followedIds={followedIds}
        emptyText="Use the star next to a series to follow it."
      />
      <SeriesListCard title="Top series" themes={top} followedIds={followedIds} />
      <SeriesListCard title="All series" themes={SERIES_THEMES} followedIds={followedIds} />
    </aside>
  );
}
