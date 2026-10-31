import { parseJolpicaRace } from '../data-providers/jolpica/jolpica.parsers';
import {
  parseOpenF1Meeting,
  parseOpenF1Session,
} from '../data-providers/openf1/openf1-api.parsers';
import {
  JOLPICA_1950_BRITAIN,
  JOLPICA_2023_AZERBAIJAN,
  JOLPICA_2023_MIAMI,
  JOLPICA_2023_MONACO,
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
} from '../../test/fixtures/jolpica.fixtures';
import {
  OPENF1_2023_MEETINGS,
  OPENF1_2023_SESSIONS,
  OPENF1_2025_MEETINGS,
  OPENF1_2025_SESSIONS,
} from '../../test/fixtures/openf1.fixtures';
import { buildF1SeasonCalendar } from './f1-calendar.builder';
import type { F1CalendarBuildInput } from './f1-calendar.builder';

const races = (...items: unknown[]) =>
  items.map((item, index) => parseJolpicaRace(item, `$[${index}]`));
const sessions = (items: unknown[]) =>
  items.map((item, index) => parseOpenF1Session(item, `$[${index}]`));
const meetings = (items: unknown[]) =>
  items.map((item, index) => parseOpenF1Meeting(item, `$[${index}]`));
const RETRIEVED = '2026-10-31T12:00:00Z';

function build2025(overrides: Partial<F1CalendarBuildInput> = {}) {
  return buildF1SeasonCalendar({
    season: 2025,
    jolpicaRaces: races(JOLPICA_2025_AUSTRALIA, JOLPICA_2025_CHINA),
    jolpicaRetrievedAt: RETRIEVED,
    openf1: {
      status: 'ok',
      sessions: sessions(OPENF1_2025_SESSIONS),
      meetings: meetings(OPENF1_2025_MEETINGS),
      retrievedAt: RETRIEVED,
    },
    ...overrides,
  });
}

describe('buildF1SeasonCalendar', () => {
  it('anchors the 2025 Chinese GP on Jolpica and merges the verified OpenF1 crosswalk', () => {
    const calendar = build2025();
    const china = calendar.rounds.find((round) => round.id === 'f1:2025:china');
    expect(china).toBeDefined();
    if (!china) return;

    expect(china.roundNumber).toBe(2);
    expect(china.circuit).toEqual({
      id: 'f1:circuit:shanghai',
      name: 'Shanghai International Circuit',
    });
    expect(china.locationLabel).toBe('Shanghai, China');
    expect(china.external.openf1MeetingKey).toBe(1255);
    expect(
      china.sessions.map((session) => [
        session.id,
        session.external.openf1SessionKey,
      ]),
    ).toEqual([
      ['f1:2025:china:fp1', 9988],
      ['f1:2025:china:sprint_qualifying', 9989],
      ['f1:2025:china:sprint', 9993],
      ['f1:2025:china:qualifying', 9994],
      ['f1:2025:china:race', 9998],
    ]);
    const fp1 = china.sessions[0];
    expect(fp1).toMatchObject({
      name: 'Practice 1',
      type: 'practice',
      sequence: 1,
      scheduledStartAt: '2025-03-21T03:30:00Z',
      scheduledEndAt: '2025-03-21T04:30:00Z',
      schedulePrecision: 'instant',
      cancelled: false,
    });
    expect(china.sessions[1].type).toBe('sprint_qualifying');
    expect(china.startsAt).toBe('2025-03-21T03:30:00Z');
    expect(china.endsAt).toBe('2025-03-23T09:00:00Z');
    expect(china.warnings).toEqual([]);
  });

  it('matches an unlisted meeting only by an exact schedule anchor and ignores testing', () => {
    const calendar = build2025();
    const australia = calendar.rounds.find(
      (round) => round.id === 'f1:2025:australia',
    );
    expect(australia?.external.openf1MeetingKey).toBe(900001);
    expect(calendar.rounds).toHaveLength(2);
    expect(
      calendar.warnings.some((warning) => warning.includes('900090')),
    ).toBe(false);
    expect(calendar.enrichment).toEqual({ availability: 'available' });
  });

  it('keeps Jolpica-only rounds when OpenF1 fails, and reports partial enrichment', () => {
    const calendar = build2025({
      openf1: {
        status: 'failed',
        availability: 'access_restricted',
        reason: 'OpenF1 restricted access',
      },
    });
    expect(calendar.rounds).toHaveLength(2);
    expect(
      calendar.rounds[1].sessions.every(
        (session) => session.external.openf1SessionKey === null,
      ),
    ).toBe(true);
    expect(calendar.rounds[1].sessions[0].scheduledEndAt).toBeNull();
    expect(calendar.enrichment.availability).toBe('access_restricted');
    expect(calendar.sources).toEqual([
      { provider: 'jolpica', capability: 'calendar' },
    ]);
  });

  it('does not merge a meeting whose schedule matches two rounds', () => {
    const clone = {
      ...JOLPICA_2025_AUSTRALIA,
      round: '3',
      raceName: 'Clone Grand Prix',
      Circuit: { circuitId: 'clone', circuitName: 'Clone' },
    };
    const calendar = build2025({
      jolpicaRaces: races(JOLPICA_2025_AUSTRALIA, clone, JOLPICA_2025_CHINA),
    });
    const merged = calendar.rounds.filter(
      (round) => round.external.openf1MeetingKey === 900001,
    );
    expect(merged).toHaveLength(0);
    expect(
      calendar.warnings.some((warning) =>
        warning.startsWith('identity_ambiguous'),
      ),
    ).toBe(true);
  });

  it('flags start-time disagreements instead of silently overwriting Jolpica', () => {
    const shifted = {
      ...JOLPICA_2025_CHINA,
      Qualifying: { date: '2025-03-22', time: '08:00:00Z' },
    };
    const calendar = build2025({
      jolpicaRaces: races(JOLPICA_2025_AUSTRALIA, shifted),
    });
    const china = calendar.rounds.find((round) => round.slug === 'china');
    const qualifying = china?.sessions.find(
      (session) => session.kind === 'qualifying',
    );
    expect(qualifying?.scheduledStartAt).toBe('2025-03-22T08:00:00Z');
    expect(
      china?.warnings.some((warning) =>
        warning.startsWith('schedule_disagreement'),
      ),
    ).toBe(true);
  });

  it('keeps date-only historical schedules without inventing a clock time', () => {
    const calendar = buildF1SeasonCalendar({
      season: 1950,
      jolpicaRaces: races(JOLPICA_1950_BRITAIN),
      jolpicaRetrievedAt: RETRIEVED,
      openf1: {
        status: 'not_applicable',
        reason: 'OpenF1 public coverage starts in 2023',
      },
    });
    const [round] = calendar.rounds;
    expect(round.id).toBe('f1:1950:great-britain');
    expect(round.sessions).toHaveLength(1);
    expect(round.sessions[0]).toMatchObject({
      kind: 'race',
      scheduledStartAt: null,
      scheduledDate: '1950-05-13',
      schedulePrecision: 'date',
    });
    expect(round.startsAt).toBeNull();
    expect(calendar.enrichment.availability).toBe('not_applicable');
  });

  it('shows a fully cancelled OpenF1-only meeting (2023 Imola) as a cancelled round when enabled', () => {
    const input: F1CalendarBuildInput = {
      season: 2023,
      jolpicaRaces: races(
        JOLPICA_2023_AZERBAIJAN,
        JOLPICA_2023_MIAMI,
        JOLPICA_2023_MONACO,
      ),
      jolpicaRetrievedAt: RETRIEVED,
      openf1: {
        status: 'ok',
        sessions: sessions(OPENF1_2023_SESSIONS),
        meetings: meetings(OPENF1_2023_MEETINGS),
        retrievedAt: RETRIEVED,
      },
    };
    const calendar = buildF1SeasonCalendar(input);
    const imola = calendar.rounds.find(
      (round) => round.id === 'f1:2023:emilia-romagna',
    );
    expect(imola).toBeDefined();
    expect(imola?.roundNumber).toBeNull();
    expect(imola?.sessions).toHaveLength(5);
    expect(imola?.sessions.every((session) => session.cancelled === true)).toBe(
      true,
    );
    expect(imola?.warnings[0]).toContain('round_from_openf1_cancelled_meeting');

    const strict = buildF1SeasonCalendar({
      ...input,
      manifest: { includeOpenF1OnlyCancelledRounds: false },
    });
    expect(strict.rounds.some((round) => round.slug === 'emilia-romagna')).toBe(
      false,
    );
    expect(strict.warnings.some((warning) => warning.includes('900301'))).toBe(
      true,
    );
  });

  it('resolves a same-slot kind conflict in favour of OpenF1 naming, with a warning', () => {
    const calendar = buildF1SeasonCalendar({
      season: 2023,
      jolpicaRaces: races(JOLPICA_2023_AZERBAIJAN),
      jolpicaRetrievedAt: RETRIEVED,
      openf1: {
        status: 'ok',
        sessions: sessions(OPENF1_2023_SESSIONS),
        meetings: meetings(OPENF1_2023_MEETINGS),
        retrievedAt: RETRIEVED,
      },
    });
    const baku = calendar.rounds.find((round) => round.slug === 'azerbaijan');
    expect(baku?.sessions.map((session) => session.kind)).toEqual([
      'fp1',
      'qualifying',
      'sprint_qualifying',
      'sprint',
      'race',
    ]);
    const shootout = baku?.sessions.find(
      (session) => session.kind === 'sprint_qualifying',
    );
    expect(shootout?.name).toBe('Sprint Shootout');
    expect(shootout?.id).toBe('f1:2023:azerbaijan:sprint_qualifying');
    expect(
      baku?.warnings.some((warning) =>
        warning.startsWith('session_kind_conflict'),
      ),
    ).toBe(true);
  });

  it('handles races with no practice or sprint schedule objects', () => {
    const calendar = buildF1SeasonCalendar({
      season: 2023,
      jolpicaRaces: races(JOLPICA_2023_MIAMI),
      jolpicaRetrievedAt: RETRIEVED,
      openf1: {
        status: 'ok',
        sessions: [],
        meetings: [],
        retrievedAt: RETRIEVED,
      },
    });
    expect(calendar.rounds[0].sessions.map((session) => session.id)).toEqual([
      'f1:2023:miami:race',
    ]);
  });
});
