import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LocalTime } from '../../../../components/home/LocalTime';
import { SessionTime } from '../../../../components/home/SessionTime';
import { Facts, PageColumn, PageHeader, Panel, linkClass } from '../../../../components/home/page-parts';
import { ResultsTable } from '../../../../components/home/ResultsTable';
import { ErrorState } from '../../../../components/home/states';
import { getSession, getSessionResults } from '../../../../lib/api-v1/client';
import { buildResultTable } from '../../../../lib/home/results-model';
import { decodeParam, routes } from '../../../../lib/home/routes';
import { themeByApiId } from '../../../../lib/home/series-theme';
import { basisNote, lifecycleLabel, resultNote } from '../../../../lib/home/status-text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Session' };

// One session: GET /api/v1/sessions/:sessionId and its results, GET /api/v1/sessions/:sessionId/results.
// The table shows the classification as the data provider published it; when there is none, the page says
// why (not published yet, unsupported, provider unavailable) and never shows an empty table as "no results".
// Undrawn page: plain, built from tokens. TODO(design)
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const id = decodeParam(sessionId);
  const [result, results] = await Promise.all([getSession(id), getSessionResults(id)]);

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
  const resultSet = results.ok ? (results.data.resultSet ?? null) : null;
  // What the results call says is the better reason; if it says "available" without a result set, fall back to the session's.
  const resultAvailability =
    results.ok && results.meta.availability !== 'available' ? results.meta.availability : session.resultAvailability;

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
          {resultSet && resultSet.classification.length > 0 ? (
            <>
              <ResultsTable table={buildResultTable(resultSet)} />
              <p className="text-caption mt-3 text-text-secondary">
                As published by the data provider. It is not certified as the final classification.
              </p>
            </>
          ) : !results.ok ? (
            <p className="text-footer-body">The results could not be loaded ({results.error.code}).</p>
          ) : (
            <p className="text-footer-body">{resultNote(resultAvailability)}</p>
          )}
        </Panel>
      </div>
    </PageColumn>
  );
}
