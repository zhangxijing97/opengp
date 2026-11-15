import Link from 'next/link';
import { routes } from '../../lib/home/routes';
import type { SeriesTheme } from '../../lib/home/series-theme';
import { FollowButton } from './FollowButton';
import { Panel } from './page-parts';

// A plain list of series: colour dot, name, whether schedules exist, and the follow star.
// The designed sidebar lists (SeriesList in Figma) come with milestone M3. TODO(design)
export function SeriesList({ title, themes }: { title: string; themes: readonly SeriesTheme[] }) {
  return (
    <Panel title={title}>
      <ul className="grid divide-y divide-border-separator">
        {themes.map((theme) => (
          <li key={theme.id} className="flex items-center gap-3 py-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-(--radius-full)"
              style={{ backgroundColor: theme.color }}
            />
            <Link href={routes.series(theme.id)} className="text-list-item flex-1 hover:underline">
              {theme.name}
            </Link>
            <span className="text-caption text-text-secondary">
              {theme.apiId ? 'Schedules available' : 'Coming soon'}
            </span>
            <FollowButton seriesId={theme.id} name={theme.name} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
