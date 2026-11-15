import { HomeView } from '../../components/home/HomeView';
import { loadHomeData, parseWeekParam } from '../../lib/home/home-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: { absolute: 'OpenGP' } };

// The Home: the schedule of the week. Real data for Formula 1; every other series is asked in the same
// way and answers with no rounds until the backend serves it (src/lib/home/series-sources.ts).
// ?week=YYYY-MM-DD picks a week; without it the browser picks the default week in the visitor's zone.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const requested = Array.isArray(week) ? week[0] : week;
  const data = await loadHomeData(parseWeekParam(requested));
  return (
    <>
      <h1 className="sr-only">OpenGP schedule</h1>
      <HomeView data={data} />
    </>
  );
}
