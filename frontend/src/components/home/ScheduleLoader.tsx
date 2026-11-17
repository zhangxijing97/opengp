import { loadScheduleData } from '../../lib/home/home-data';
import { ScheduleColumn } from './ScheduleColumn';

// Loads the schedule of one week on the server and hands it to the column. Used inside a Suspense boundary in
// the Home page: the page shows the series list, the standings panel and the schedule skeleton at once, and this
// is what replaces the skeleton when the backend has answered. Nothing else waits for it.
export async function ScheduleLoader({ weekParam }: { weekParam: string | null }) {
  const data = await loadScheduleData(weekParam);
  return <ScheduleColumn data={data} />;
}
