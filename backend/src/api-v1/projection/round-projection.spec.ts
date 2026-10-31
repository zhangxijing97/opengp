import type { CanonicalSession } from '../../canonical/canonical.types';
import {
  compareSessionsInZone,
  deriveRoundStatus,
  inferListResultAvailability,
  inferSessionLifecycle,
  projectSession,
} from './round-projection';

function session(overrides: Partial<CanonicalSession>): CanonicalSession {
  return {
    id: 'f1:2026:test:race',
    roundId: 'f1:2026:test',
    kind: 'race',
    type: 'race',
    name: 'Race',
    sequence: null,
    order: 7,
    scheduledStartAt: '2026-11-01T20:00:00Z',
    scheduledDate: null,
    schedulePrecision: 'instant',
    scheduledEndAt: null,
    cancelled: null,
    resultCoverageFromSeason: 1950,
    external: { openf1SessionKey: null },
    sources: [],
    ...overrides,
  };
}

const at = (iso: string) => Date.parse(iso);

describe('round projection', () => {
  it('infers lifecycle from schedule and clock, labelled time_inferred', () => {
    expect(
      inferSessionLifecycle(session({}), at('2026-11-01T19:59:59Z')),
    ).toEqual({ status: 'scheduled', basis: 'time_inferred' });
    expect(
      inferSessionLifecycle(session({}), at('2026-11-01T21:00:00Z')),
    ).toEqual({ status: 'unknown', basis: 'unknown' });
    expect(
      inferSessionLifecycle(session({}), at('2026-11-02T02:00:00Z')),
    ).toEqual({ status: 'completed', basis: 'time_inferred' });
    const planned = session({ scheduledEndAt: '2026-11-01T22:00:00Z' });
    expect(inferSessionLifecycle(planned, at('2026-11-01T21:00:00Z'))).toEqual({
      status: 'in_progress',
      basis: 'time_inferred',
    });
    expect(inferSessionLifecycle(planned, at('2026-11-01T22:00:00Z'))).toEqual({
      status: 'completed',
      basis: 'time_inferred',
    });
  });

  it('only reports cancelled from an explicit provider marker', () => {
    expect(
      inferSessionLifecycle(
        session({ cancelled: true }),
        at('2026-10-01T00:00:00Z'),
      ),
    ).toEqual({ status: 'cancelled', basis: 'provider' });
    expect(
      inferSessionLifecycle(
        session({ cancelled: false }),
        at('2026-10-01T00:00:00Z'),
      ).status,
    ).toBe('scheduled');
  });

  it('handles date-only and unknown schedules without inventing times', () => {
    const dateOnly = session({
      scheduledStartAt: null,
      scheduledDate: '1950-05-13',
      schedulePrecision: 'date',
    });
    expect(inferSessionLifecycle(dateOnly, at('2026-10-31T12:00:00Z'))).toEqual(
      { status: 'completed', basis: 'time_inferred' },
    );
    expect(inferSessionLifecycle(dateOnly, at('1950-05-13T12:00:00Z'))).toEqual(
      { status: 'unknown', basis: 'unknown' },
    );
    const unknown = session({
      scheduledStartAt: null,
      schedulePrecision: 'unknown',
    });
    expect(inferSessionLifecycle(unknown, at('2026-10-31T12:00:00Z'))).toEqual({
      status: 'unknown',
      basis: 'unknown',
    });
  });

  it('never asserts that results exist in list views', () => {
    const now = at('2026-10-31T12:00:00Z');
    const future = session({});
    expect(
      inferListResultAvailability(
        future,
        2026,
        inferSessionLifecycle(future, now),
      ),
    ).toBe('not_published');
    const past = session({ scheduledStartAt: '2026-10-25T19:00:00Z' });
    expect(
      inferListResultAvailability(past, 2026, inferSessionLifecycle(past, now)),
    ).toBe('unknown');
    const oldPractice = session({
      kind: 'fp1',
      type: 'practice',
      scheduledStartAt: '2019-03-15T01:00:00Z',
      resultCoverageFromSeason: 2023,
    });
    expect(
      inferListResultAvailability(
        oldPractice,
        2019,
        inferSessionLifecycle(oldPractice, now),
      ),
    ).toBe('unsupported');
    const cancelled = session({ cancelled: true });
    expect(
      inferListResultAvailability(
        cancelled,
        2023,
        inferSessionLifecycle(cancelled, now),
      ),
    ).toBe('not_applicable');
    expect(projectSession(past, 2026, now).resultPreview).toBeNull();
  });

  it('derives Round status from all sessions', () => {
    const s = (
      status:
        | 'scheduled'
        | 'completed'
        | 'cancelled'
        | 'unknown'
        | 'in_progress',
    ) => ({ status, basis: 'time_inferred' as const });
    expect(deriveRoundStatus([s('completed'), s('scheduled')]).status).toBe(
      'ongoing',
    );
    expect(deriveRoundStatus([s('completed'), s('completed')]).status).toBe(
      'completed',
    );
    expect(deriveRoundStatus([s('scheduled'), s('scheduled')]).status).toBe(
      'scheduled',
    );
    expect(deriveRoundStatus([s('cancelled'), s('cancelled')])).toEqual({
      status: 'cancelled',
      basis: 'provider',
    });
    expect(deriveRoundStatus([s('unknown')])).toEqual({
      status: 'unknown',
      basis: 'unknown',
    });
    expect(deriveRoundStatus([])).toEqual({
      status: 'unknown',
      basis: 'unknown',
    });
  });

  it('sorts timed sessions first within a local day, date-only after, unknown last', () => {
    const timed = session({
      id: 'a',
      scheduledStartAt: '2026-11-01T20:00:00Z',
    });
    const early = session({
      id: 'b',
      kind: 'fp1',
      order: 1,
      scheduledStartAt: '2026-11-01T10:00:00Z',
    });
    const dateOnly = session({
      id: 'c',
      scheduledStartAt: null,
      scheduledDate: '2026-11-01',
      schedulePrecision: 'date',
    });
    const unknown = session({
      id: 'd',
      scheduledStartAt: null,
      schedulePrecision: 'unknown',
    });
    const sorted = [unknown, dateOnly, timed, early].sort(
      compareSessionsInZone('UTC'),
    );
    expect(sorted.map((item) => item.id)).toEqual(['b', 'a', 'c', 'd']);
  });
});
