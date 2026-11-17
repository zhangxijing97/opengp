import { Suspense } from 'react';
import { ScheduleSkeleton } from '../../components/home/HomeSkeletons';
import { ScheduleLoader } from '../../components/home/ScheduleLoader';
import { SeriesSidebar } from '../../components/home/SeriesSidebar';
import { StandingsPanel } from '../../components/home/StandingsPanel';
import { parseWeekParam } from '../../lib/home/home-data';
import { standingsTarget } from '../../lib/home/standings-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: { absolute: 'OpenGP' } };

// The Home: the schedule of the week. Real data for Formula 1; every other series is asked in the same
// way and answers with no rounds until the backend serves it (src/lib/home/series-sources.ts).
// ?week=YYYY-MM-DD picks a week; without it the server picks the current one.
//
// The page itself waits for nothing: it answers at once with the three columns. The series list needs no data, the
// schedule streams in behind its skeleton when the backend has answered (ScheduleLoader), and the standings panel
// asks for its own data in the browser. A slow standings request can therefore never hold the schedule back, and
// neither can fail the other.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const requested = Array.isArray(week) ? week[0] : week;
  const weekParam = parseWeekParam(requested);
  return (
    <>
      <h1 className="sr-only">OpenGP schedule</h1>
      <div className="mx-auto flex w-(--layout-page-width) items-start gap-6 px-(--space-page) pt-6 pb-12">
        <SeriesSidebar />
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleLoader weekParam={weekParam} />
        </Suspense>
        <StandingsPanel target={standingsTarget(weekParam)} />
      </div>
    </>
  );
}
