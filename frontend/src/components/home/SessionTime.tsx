import { formatDayKey } from '../../lib/home/format';
import type { SessionSummary } from '../../lib/api-v1/types';
import { LocalTime } from './LocalTime';

// A session's time: an instant in the user's zone, or for a date-only session the date and
// "time TBC". Never midnight (HANDOFF.md section 3, rule 1).
export function SessionTime({ session }: { session: Pick<SessionSummary, 'scheduledStartAt' | 'scheduledDate'> }) {
  if (session.scheduledStartAt) return <LocalTime iso={session.scheduledStartAt} mode="datetime" />;
  if (session.scheduledDate) return <span>{formatDayKey(session.scheduledDate)}, time TBC</span>;
  return <span>TBC</span>;
}
