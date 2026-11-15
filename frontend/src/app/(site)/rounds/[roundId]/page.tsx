import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LocalTime } from '../../../../components/home/LocalTime';
import { SessionTime } from '../../../../components/home/SessionTime';
import { Facts, PageColumn, PageHeader, Panel, linkClass } from '../../../../components/home/page-parts';
import { ErrorState } from '../../../../components/home/states';
import { getRound } from '../../../../lib/api-v1/client';
import { decodeParam, routes } from '../../../../lib/home/routes';
import { themeByApiId } from '../../../../lib/home/series-theme';
import { basisNote, lifecycleLabel, roundStatusLabel } from '../../../../lib/home/status-text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Event' };

// One round (Grand Prix weekend) with all its sessions, from GET /api/v1/rounds/:roundId.
// Undrawn page: plain, built from tokens. TODO(design)
export default async function RoundPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = await getRound(decodeParam(roundId));

  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <PageColumn>
        <PageHeader title="Event" back={{ href: routes.home, label: 'schedule' }} />
        <ErrorState code={result.error.code}>
          <p>{result.error.message}</p>
        </ErrorState>
      </PageColumn>
    );
  }

  const { round } = result.data;
  const series = themeByApiId(round.series.id);
  const note = basisNote(round.statusBasis);

  return (
    <PageColumn>
      <PageHeader title={round.name} back={{ href: routes.home, label: 'schedule' }}>
        {[round.series.name, round.locationLabel].filter(Boolean).join(', ')}
      </PageHeader>
      <div className="grid gap-4">
        <Panel>
          <Facts
            items={[
              {
                label: 'Series',
                value: series ? (
                  <Link href={routes.series(series.id)} className={linkClass}>{round.series.name}</Link>
                ) : (
                  round.series.name
                ),
              },
              { label: 'Round', value: round.roundNumber !== null ? String(round.roundNumber) : 'Not numbered' },
              { label: 'Status', value: roundStatusLabel(round.status) },
              { label: 'Starts', value: <LocalTime iso={round.startsAt} mode="datetime" /> },
              { label: 'Planned end', value: <LocalTime iso={round.endsAt} mode="datetime" /> },
            ]}
          />
          {note ? <p className="text-caption mt-3 text-text-secondary">{note}</p> : null}
        </Panel>

        <Panel title="Sessions">
          {round.sessions.length === 0 ? (
            <p className="text-footer-body text-text-secondary">No sessions are listed for this event yet.</p>
          ) : (
            <ul className="grid divide-y divide-border-separator">
              {round.sessions.map((session) => (
                <li key={session.id} className="flex items-baseline gap-3 py-2">
                  <Link href={routes.session(session.id)} className={`text-list-item flex-1 ${linkClass}`}>
                    {session.name}
                  </Link>
                  <span className="text-caption text-text-secondary">
                    <SessionTime session={session} />
                  </span>
                  <span className="text-caption w-24 text-right text-text-secondary">
                    {lifecycleLabel(session.lifecycle.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageColumn>
  );
}
