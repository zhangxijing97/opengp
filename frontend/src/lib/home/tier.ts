import type { SessionType } from '../api-v1/types';
import type { RowException, RowState, Tier } from './types';
import type { Lifecycle } from '../api-v1/types';

// Tier lookup (HANDOFF.md section 2): T1 main race, T2 main qualifying and sprint,
// T3 support sessions, T4 practice, T5 sub-sessions.
// The backend does not provide a tier, so the adapter owns this table.
const TIER_BY_TYPE: Record<SessionType, Tier> = {
  race: 'T1',
  qualifying: 'T2',
  sprint: 'T2',
  sprint_qualifying: 'T3',
  heat: 'T3',
  practice: 'T4',
  warmup: 'T4',
  test: 'T4',
  stage: 'T5',
  // Unknown kinds fall back to the plainest design: one row, P1 only.
  other: 'T3',
};

export function tierOf(type: SessionType): Tier {
  return TIER_BY_TYPE[type] ?? 'T3';
}

export interface RowStatus {
  state: RowState;
  exception: RowException | null;
}

// Row state from the API lifecycle. `cancelled`, `postponed` and `unknown` have no design
// (HANDOFF.md section 5): they keep the idle layout and carry an exception, TODO(design).
export function rowStatusOf(lifecycle: Lifecycle): RowStatus {
  switch (lifecycle) {
    case 'scheduled':
      return { state: 'idle', exception: null };
    case 'in_progress':
      return { state: 'live', exception: null };
    case 'completed':
      return { state: 'done', exception: null };
    case 'cancelled':
      return { state: 'idle', exception: 'cancelled' };
    case 'postponed':
      return { state: 'idle', exception: 'postponed' };
    default:
      return { state: 'idle', exception: 'unknown' };
  }
}
