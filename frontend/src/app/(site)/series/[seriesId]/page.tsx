import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FollowButton } from '../../../../components/home/FollowButton';
import { LocalTime } from '../../../../components/home/LocalTime';
import { PageColumn, PageHeader, Panel, linkClass } from '../../../../components/home/page-parts';
import { EmptyState, ErrorState } from '../../../../components/home/states';
import { getRounds } from '../../../../lib/api-v1/client';
import { decodeParam, routes } from '../../../../lib/home/routes';
import { themeById } from '../../../../lib/home/series-theme';
import { addDays } from '../../../../lib/home/week';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Series' };

const DAYS_AHEAD = 31;

// One series: who it is, the follow star, and its events in the next 31 days (the API answers
// at most 31 days per request). A season calendar needs a backend endpoint that does not exist.
// Undrawn page: plain, built from tokens. TODO(design)
export default async function SeriesPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  const theme = themeById(decodeParam(seriesId));
  if (!theme) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const result = theme.apiId
    ? await getRounds({ from: today, to: addDays(today, DAYS_AHEAD), tz: 'UTC', seriesId: theme.apiId })
    : null;

  return (
    <PageColumn>
      <PageHeader title={theme.name} back={{ href: routes.allSeries, label: 'all series' }} />
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-(--radius-full)"
          style={{ backgroundColor: theme.color }}
        />
        <span className="text-footer-body flex-1 text-text-secondary">
          {theme.apiId ? 'Schedules available' : 'Coming soon'}
        </span>
        <FollowButton seriesId={theme.id} name={theme.name} />
      </div>

      {result === null ? (
        <EmptyState title="Schedules are not available yet">
          <p>{theme.name} is on the list, but OpenGP does not have its schedule yet.</p>
        </EmptyState>
      ) : !result.ok ? (
        <ErrorState code={result.error.code}>
          <p>{result.error.message}</p>
        </ErrorState>
      ) : result.data.rounds.length === 0 ? (
        <EmptyState title={`No events in the next ${DAYS_AHEAD} days`}>
          <p>There is a break in the calendar.</p>
        </EmptyState>
      ) : (
        <Panel title={`Events in the next ${DAYS_AHEAD} days`}>
          <ul className="grid divide-y divide-border-separator">
            {result.data.rounds.map((round) => (
              <li key={round.id} className="flex items-baseline gap-3 py-2">
                <Link href={routes.round(round.id)} className={`text-list-item flex-1 ${linkClass}`}>
                  {round.name}
                </Link>
                <span className="text-caption text-text-secondary">
                  <LocalTime iso={round.startsAt} mode="date" />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageColumn>
  );
}
