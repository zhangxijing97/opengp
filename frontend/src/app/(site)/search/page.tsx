import Link from 'next/link';
import { Button } from '../../../components/home/Button';
import { PageColumn, PageHeader, Panel, linkClass } from '../../../components/home/page-parts';
import { EmptyState, ErrorState } from '../../../components/home/states';
import { routes } from '../../../lib/home/routes';
import { groupHits, searchEntries } from '../../../lib/home/search';
import type { SearchHit } from '../../../lib/home/search';
import { loadSearchIndex } from '../../../lib/home/search-index';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search' };

const MAX_QUERY_LENGTH = 100;

function HitList({ title, hits }: { title: string; hits: SearchHit[] }) {
  if (hits.length === 0) return null;
  return (
    <Panel title={title}>
      <ul className="grid gap-3">
        {hits.map((hit) => (
          <li key={`${hit.entry.kind}-${hit.entry.id}`}>
            <Link href={hit.entry.href} className={`text-list-item ${linkClass}`}>
              {hit.entry.title}
            </Link>
            {hit.entry.subtitle ? (
              <p className="text-caption text-text-secondary">{hit.entry.subtitle}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// Search works without JavaScript: the field in the nav and the field below both submit here.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const raw = Array.isArray(q) ? q[0] : q;
  const query = (raw ?? '').slice(0, MAX_QUERY_LENGTH).trim();

  const index = await loadSearchIndex();
  const hits = query ? searchEntries(index.entries, query, 30) : [];
  const groups = groupHits(hits);

  return (
    <PageColumn>
      <PageHeader title="Search">Series and events.</PageHeader>

      <form role="search" action={routes.search} method="get" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search series and events"
          placeholder="Formula 1, Monaco, WEC"
          maxLength={MAX_QUERY_LENGTH}
          className="text-footer-body h-9 min-w-0 flex-1 rounded-control border border-border-default bg-surface-card px-3"
        />
        <Button type="submit">SEARCH</Button>
      </form>

      <div className="grid gap-4">
        {index.warning ? (
          <ErrorState title="Some events could not be loaded">
            <p>{index.warning}</p>
          </ErrorState>
        ) : null}

        {!query ? (
          <EmptyState title="Search OpenGP">
            <p>Type a series, a Grand Prix or a place.</p>
          </EmptyState>
        ) : hits.length === 0 && !index.warning ? (
          <EmptyState title={`No results for “${query}”`}>
            <p>
              Check the spelling, or look through{' '}
              <Link href={routes.allSeries} className={linkClass}>all series</Link>.
            </p>
          </EmptyState>
        ) : (
          <>
            <HitList title="Series" hits={groups.series} />
            <HitList title="Events" hits={groups.round} />
          </>
        )}
      </div>
    </PageColumn>
  );
}
