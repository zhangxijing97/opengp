import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LocalTime } from '../../../../components/home/LocalTime';
import { SessionTime } from '../../../../components/home/SessionTime';
import { Facts, PageColumn, PageHeader, Panel, linkClass } from '../../../../components/home/page-parts';
import { ErrorState } from '../../../../components/home/states';
import { getSession } from '../../../../lib/api-v1/client';
import { decodeParam, routes } from '../../../../lib/home/routes';
import { themeByApiId } from '../../../../lib/home/series-theme';
import { basisNote, lifecycleLabel, resultNote } from '../../../../lib/home/status-text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Session' };

// One session, from GET /api/v1/sessions/:sessionId. Results do not exist in the API yet, so the
// page says what is known about them and never shows anything that looks like a classification.
// Undrawn page: plain, built from tokens. TODO(design)
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const result = await getSession(decodeParam(sessionId));

  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <PageColumn>
        <PageHeader title="Session" back={{ href: routes.home, label: 'schedule' }} />
        <ErrorState code={result.error.code}>
          <p>{result.error.message}</p>
        </ErrorState>
      </PageColumn>
    );
  }

  const { session, round } = result.data;
  const series = themeByApiId(round.series.id);
  const note = basisNote(session.lifecycle.basis);

  return (
    <PageColumn>
      <PageHeader title={session.name} back={{ href: routes.round(round.id), label: round.name }}>
        {round.series.name}
      </PageHeader>
      <div className="grid gap-4">
        <Panel>
          <Facts
            items={[
              { label: 'Event', value: <Link href={routes.round(round.id)} className={linkClass}>{round.name}</Link> },
              {
                label: 'Series',
                value: series ? (
                  <Link href={routes.series(series.id)} className={linkClass}>{round.series.name}</Link>
                ) : (
                  round.series.name
                ),
              },
              { label: 'Starts', value: <SessionTime session={session} /> },
              { label: 'Planned end', value: <LocalTime iso={session.scheduledEndAt} mode="datetime" /> },
              { label: 'Status', value: lifecycleLabel(session.lifecycle.status) },
            ]}
          />
          {note ? <p className="text-caption mt-3 text-text-secondary">{note}</p> : null}
        </Panel>
        <Panel title="Results">
          <p className="text-footer-body">{resultNote(session.resultAvailability)}</p>
        </Panel>
      </div>
    </PageColumn>
  );
}
