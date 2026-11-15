import { OpenGpApiError } from '../../common/http/api-errors';
import { DEFAULT_UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../../data-providers/openf1/openf1-api.client';
import { F1CalendarService } from '../../f1/f1-calendar.service';
import { F1CalendarSource } from '../../f1/f1-calendar.source';
import { F1ResultsService } from '../../f1/results/f1-results.service';
import {
  CHINA_2025_QUALIFYING_ROWS,
  CHINA_2025_RACE_ROWS,
  CHINA_2025_SPRINT_ROWS,
  DRIVERS_2025,
  raceTablePage,
  seasonDriversPage,
} from '../../../test/fixtures/jolpica-results.fixtures';
import {
  FP1_9988_DRIVERS,
  FP1_9988_RESULTS,
  SQ_9989_DRIVERS,
  SQ_9989_RESULTS,
} from '../../../test/fixtures/openf1-results.fixtures';
import {
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
  JOLPICA_2026_MEXICO_CITY,
  JOLPICA_2026_UNITED_STATES,
  jolpicaRacePage,
} from '../../../test/fixtures/jolpica.fixtures';
import {
  OPENF1_2025_MEETINGS,
  OPENF1_2025_SESSIONS,
} from '../../../test/fixtures/openf1.fixtures';
import {
  FakeHttpTransport,
  instantRuntime,
  jsonResponse,
  route,
} from '../../../test/support/fake-http-transport';
import { RoundsService } from './rounds.service';

const NOW = Date.parse('2026-10-31T12:00:00Z');

function setup(configure: (transport: FakeHttpTransport) => void) {
  const transport = new FakeHttpTransport();
  configure(transport);
  const runtime = instantRuntime(() => NOW);
  const jolpica = new JolpicaClient(
    transport,
    DEFAULT_UPSTREAM_CONFIG,
    runtime,
  );
  const openf1 = new OpenF1ApiClient(
    transport,
    DEFAULT_UPSTREAM_CONFIG,
    runtime,
  );
  const calendar = new F1CalendarService(jolpica, openf1, () => NOW);
  const source = new F1CalendarSource(calendar);
  const results = new F1ResultsService(source, jolpica, openf1, () => NOW);
  return {
    service: new RoundsService([source], [results], () => NOW),
    transport,
  };
}

function season2026(transport: FakeHttpTransport) {
  transport
    .on(
      route('/2026.json'),
      jsonResponse(
        jolpicaRacePage('2026', [
          JOLPICA_2026_UNITED_STATES,
          JOLPICA_2026_MEXICO_CITY,
        ]),
      ),
    )
    .on(route('/sessions', { year: '2026' }), jsonResponse([]))
    .on(route('/meetings', { year: '2026' }), jsonResponse([]));
}

function season2025(transport: FakeHttpTransport) {
  transport
    .on(
      route('/2025.json'),
      jsonResponse(
        jolpicaRacePage('2025', [JOLPICA_2025_AUSTRALIA, JOLPICA_2025_CHINA]),
      ),
    )
    .on(
      route('/sessions', { year: '2025' }),
      jsonResponse(OPENF1_2025_SESSIONS),
    )
    .on(
      route('/meetings', { year: '2025' }),
      jsonResponse(OPENF1_2025_MEETINGS),
    );
}

function china2025Results(transport: FakeHttpTransport) {
  transport
    .on(
      route('/2025/2/results.json'),
      jsonResponse(raceTablePage('2025', '2', 'Results', CHINA_2025_RACE_ROWS)),
    )
    .on(
      route('/2025/2/sprint.json'),
      jsonResponse(
        raceTablePage('2025', '2', 'SprintResults', CHINA_2025_SPRINT_ROWS),
      ),
    )
    .on(
      route('/2025/2/qualifying.json'),
      jsonResponse(
        raceTablePage(
          '2025',
          '2',
          'QualifyingResults',
          CHINA_2025_QUALIFYING_ROWS,
        ),
      ),
    )
    .on(
      route('/2025/drivers.json'),
      jsonResponse(seasonDriversPage(Object.values(DRIVERS_2025))),
    )
    .on(
      route('/session_result', { session_key: '9988' }),
      jsonResponse(FP1_9988_RESULTS),
    )
    .on(
      route('/drivers', { session_key: '9988' }),
      jsonResponse(FP1_9988_DRIVERS),
    )
    .on(
      route('/session_result', { session_key: '9989' }),
      jsonResponse(SQ_9989_RESULTS),
    )
    .on(
      route('/drivers', { session_key: '9989' }),
      jsonResponse(SQ_9989_DRIVERS),
    );
}

async function captureApiError(
  promise: Promise<unknown>,
): Promise<OpenGpApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof OpenGpApiError) return error;
    throw error;
  }
  throw new Error('expected an OpenGpApiError');
}

const week = (from: string, to: string, tz?: string, seriesId?: unknown) => ({
  from,
  to,
  tz,
  seriesId,
});

describe('RoundsService.listRounds', () => {
  it('returns this week (Mon-Mon, America/Los_Angeles) with nested sessions and honest status', async () => {
    const { service } = setup(season2026);
    const response = await service.listRounds(
      week('2026-10-26', '2026-11-02', 'America/Los_Angeles', 'f1'),
    );

    expect(response.data.interval).toEqual({
      from: '2026-10-26',
      to: '2026-11-02',
      tz: 'America/Los_Angeles',
      dateBasis: 'viewer',
      startsAt: '2026-10-26T07:00:00Z',
      endsAt: '2026-11-02T08:00:00Z',
    });
    expect(response.data.rounds.map((round) => round.id)).toEqual([
      'f1:2026:mexico-city',
    ]);
    const [mexico] = response.data.rounds;
    expect(mexico.sessions.map((session) => session.id)).toEqual([
      'f1:2026:mexico-city:fp1',
      'f1:2026:mexico-city:fp2',
      'f1:2026:mexico-city:fp3',
      'f1:2026:mexico-city:qualifying',
      'f1:2026:mexico-city:race',
    ]);
    expect(mexico.status).toBe('ongoing');
    expect(mexico.statusBasis).toBe('time_inferred');
    expect(mexico.sessions[0].lifecycle).toEqual({
      status: 'completed',
      basis: 'time_inferred',
    });
    expect(mexico.sessions[0].resultAvailability).toBe('unknown');
    expect(mexico.sessions[4].lifecycle).toEqual({
      status: 'scheduled',
      basis: 'time_inferred',
    });
    expect(mexico.sessions[4].resultAvailability).toBe('not_published');
    expect(response.meta.availability).toBe('available');
    expect(response.meta.coverage).toEqual([
      { seriesId: 'f1', availability: 'available' },
    ]);
    expect(response.meta.sources).toEqual([
      { provider: 'jolpica', capability: 'calendar' },
      { provider: 'openf1', capability: 'session_schedule' },
    ]);
  });

  it('puts the previous weekend in Last Week and nothing from it in This Week', async () => {
    const { service } = setup(season2026);
    const lastWeek = await service.listRounds(
      week('2026-10-19', '2026-10-26', 'America/Los_Angeles'),
    );
    expect(lastWeek.data.rounds.map((round) => round.id)).toEqual([
      'f1:2026:united-states',
    ]);
    const thisWeek = await service.listRounds(
      week('2026-10-26', '2026-11-02', 'America/Los_Angeles'),
    );
    expect(
      thisWeek.data.rounds.some(
        (round) => round.id === 'f1:2026:united-states',
      ),
    ).toBe(false);
  });

  it('splits one Round across two weeks by local start date without duplicating sessions', async () => {
    const { service } = setup(season2026);
    const thisWeek = await service.listRounds(
      week('2026-10-26', '2026-11-02', 'Pacific/Kiritimati'),
    );
    const nextWeek = await service.listRounds(
      week('2026-11-02', '2026-11-09', 'Pacific/Kiritimati'),
    );
    const a = thisWeek.data.rounds.find(
      (round) => round.id === 'f1:2026:mexico-city',
    );
    const b = nextWeek.data.rounds.find(
      (round) => round.id === 'f1:2026:mexico-city',
    );
    expect(a?.sessions.map((session) => session.id)).toEqual([
      'f1:2026:mexico-city:fp1',
      'f1:2026:mexico-city:fp2',
      'f1:2026:mexico-city:fp3',
      'f1:2026:mexico-city:qualifying',
    ]);
    expect(b?.sessions.map((session) => session.id)).toEqual([
      'f1:2026:mexico-city:race',
    ]);
    expect(b?.startsAt).toBe(a?.startsAt);
  });

  it('queries both seasons across a year change and reports an unpublished season as partial', async () => {
    const { service, transport } = setup((t) => {
      season2026(t);
      t.on(route('/2027.json'), jsonResponse(jolpicaRacePage('2027', [])))
        .on(
          route('/sessions', { year: '2027' }),
          jsonResponse({ detail: 'No results found.' }, 404),
        )
        .on(
          route('/meetings', { year: '2027' }),
          jsonResponse({ detail: 'No results found.' }, 404),
        );
    });
    const response = await service.listRounds(week('2026-12-28', '2027-01-04'));
    expect(response.data.rounds).toEqual([]);
    expect(response.meta.availability).toBe('partial');
    expect(response.meta.coverage?.[0].reason).toContain('2027');
    expect(transport.urls().some((url) => url.includes('/2026.json'))).toBe(
      true,
    );
    expect(transport.urls().some((url) => url.includes('/2027.json'))).toBe(
      true,
    );
  });

  it('turns a Jolpica outage into 502, never into an empty week', async () => {
    const { service } = setup((t) =>
      t.on(route('/2026.json'), jsonResponse('down', 503)),
    );
    const error = await captureApiError(
      service.listRounds(week('2026-10-26', '2026-11-02')),
    );
    expect(error.getStatus()).toBe(502);
    expect(error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(error.toBody('x').meta.availability).toBe('upstream_error');
  });

  it('degrades to partial when OpenF1 restricts access (e.g. during a live window)', async () => {
    const { service } = setup((t) => {
      t.on(
        route('/2026.json'),
        jsonResponse(jolpicaRacePage('2026', [JOLPICA_2026_MEXICO_CITY])),
      ).on(route('/sessions'), jsonResponse({ detail: 'Unauthorized' }, 401));
    });
    const response = await service.listRounds(week('2026-10-26', '2026-11-02'));
    expect(response.data.rounds).toHaveLength(1);
    expect(response.meta.availability).toBe('partial');
    expect(response.meta.coverage?.[0].reason).toContain('restricted');
    expect(response.meta.sources).toEqual([
      { provider: 'jolpica', capability: 'calendar' },
    ]);
    expect(response.data.rounds[0].sessions[0].scheduledEndAt).toBeNull();
  });

  it('rejects invalid queries with 400 and unsupported series with 422 before calling upstream', async () => {
    const { service, transport } = setup(season2026);
    const invalid = await captureApiError(
      service.listRounds(week('2026-10-26', '2026-12-26')),
    );
    expect(invalid.getStatus()).toBe(400);
    expect(invalid.code).toBe('INVALID_QUERY');
    const bad = await captureApiError(
      service.listRounds(week('2026-10-32', '2026-11-02', 'Nowhere/City')),
    );
    expect(bad.toBody('x').error.details).toHaveLength(2);
    expect(
      (
        await captureApiError(
          service.listRounds(week('2026-10-26', '2026-11-02', 'UTC', 'xyz')),
        )
      ).getStatus(),
    ).toBe(400);
    expect(
      (
        await captureApiError(
          service.listRounds(week('2026-10-26', '2026-11-02', 'UTC', 'motogp')),
        )
      ).getStatus(),
    ).toBe(422);
    expect(transport.requests).toHaveLength(0);
  });
});

describe('RoundsService event-weekend grouping and teasers', () => {
  it('keeps an Americas Sunday race in its weekend for an Asian viewer (dateBasis=track, +1 day)', async () => {
    const { service } = setup(season2026);
    const viewerWeek = await service.listRounds({
      ...week('2026-10-26', '2026-11-02', 'Asia/Tokyo'),
    });
    const viewerMexico = viewerWeek.data.rounds.find(
      (round) => round.id === 'f1:2026:mexico-city',
    );
    expect(
      viewerMexico?.sessions.some((session) => session.id.endsWith(':race')),
    ).toBe(false);

    const trackWeek = await service.listRounds({
      ...week('2026-10-26', '2026-11-02', 'Asia/Tokyo'),
      dateBasis: 'track',
    });
    expect(trackWeek.data.interval.dateBasis).toBe('track');
    const mexico = trackWeek.data.rounds.find(
      (round) => round.id === 'f1:2026:mexico-city',
    );
    expect(mexico?.trackTimeZone).toBe('America/Mexico_City');
    const race = mexico?.sessions.find((session) =>
      session.id.endsWith(':race'),
    );
    expect(race).toMatchObject({
      trackLocalDate: '2026-11-01',
      localDate: '2026-11-02',
      dayOffset: 1,
    });
    const nextTrackWeek = await service.listRounds({
      ...week('2026-11-02', '2026-11-09', 'Asia/Tokyo'),
      dateBasis: 'track',
    });
    expect(
      nextTrackWeek.data.rounds.some(
        (round) => round.id === 'f1:2026:mexico-city',
      ),
    ).toBe(false);
  });

  it('marks a session that is the previous evening for the viewer with -1 day', async () => {
    const { service } = setup(season2025);
    const response = await service.listRounds({
      ...week('2025-03-10', '2025-03-17', 'America/Los_Angeles'),
      dateBasis: 'track',
    });
    const race = response.data.rounds
      .find((round) => round.id === 'f1:2025:australia')
      ?.sessions.find((session) => session.id.endsWith(':race'));
    expect(race).toMatchObject({
      trackLocalDate: '2025-03-16',
      localDate: '2025-03-15',
      dayOffset: -1,
    });
  });

  it('rejects an unknown dateBasis and an invalid detail tz with 400', async () => {
    const { service } = setup(season2026);
    expect(
      (
        await captureApiError(
          service.listRounds({
            ...week('2026-10-26', '2026-11-02'),
            dateBasis: 'venue',
          }),
        )
      ).getStatus(),
    ).toBe(400);
    expect(
      (
        await captureApiError(service.getRound('f1:2025:china', 'Mars/Base'))
      ).getStatus(),
    ).toBe(400);
  });

  it('adds tiered result teasers for finished sessions (L1 top three, L2 pole, L3 leader)', async () => {
    const { service } = setup((t) => {
      season2025(t);
      china2025Results(t);
    });
    const response = await service.listRounds(
      week('2025-03-17', '2025-03-24', 'Asia/Shanghai'),
    );
    const china = response.data.rounds.find(
      (round) => round.id === 'f1:2025:china',
    );
    const byKind = (kind: string) =>
      china?.sessions.find((session) => session.id.endsWith(`:${kind}`));
    expect(byKind('fp1')?.resultAvailability).toBe('available');
    expect(byKind('fp1')?.resultPreview).toMatchObject({
      kind: 'practice_leader',
      names: ['Lando Norris'],
      metricLabel: '1:31.504',
    });
    expect(byKind('sprint_qualifying')?.resultPreview).toMatchObject({
      kind: 'pole',
      names: ['Lewis Hamilton'],
      metricLabel: '1:30.849',
    });
    expect(byKind('sprint')?.resultPreview?.names).toEqual([
      'Lewis Hamilton',
      'Oscar Piastri',
      'Max Verstappen',
    ]);
    expect(byKind('qualifying')?.resultPreview?.kind).toBe('top_three');
    expect(
      byKind('race')?.resultPreview?.entries.map((entry) => entry.code),
    ).toEqual(['PIA', 'NOR', 'RUS']);
  });

  it('keeps the calendar working when results fail (teasers degrade per session)', async () => {
    const { service } = setup(season2025);
    const response = await service.listRounds(week('2025-03-17', '2025-03-24'));
    const china = response.data.rounds.find(
      (round) => round.id === 'f1:2025:china',
    );
    expect(china?.sessions).toHaveLength(5);
    expect(
      china?.sessions.every((session) => session.resultPreview === null),
    ).toBe(true);
    expect(china?.sessions[0].resultAvailability).toBe('upstream_error');
    expect(response.meta.availability).toBe('available');
  });
});

describe('RoundsService detail endpoints', () => {
  it('returns the full Round schedule (not clipped to a week)', async () => {
    const { service } = setup(season2025);
    const response = await service.getRound('f1:2025:china');
    expect(response.data.round.sessions).toHaveLength(5);
    expect(response.data.round.status).toBe('completed');
    expect(
      response.data.round.sessions.every(
        (session) => session.lifecycle.basis === 'time_inferred',
      ),
    ).toBe(true);
    expect(response.meta.availability).toBe('available');
  });

  it('returns a Session with its Round context and legacy alias', async () => {
    const { service } = setup(season2025);
    const response = await service.getSession('f1:2025:china:fp1');
    expect(response.data.session.id).toBe('f1:2025:china:fp1');
    expect(response.data.round).toEqual({
      id: 'f1:2025:china',
      name: 'Chinese Grand Prix',
      series: { id: 'f1', name: 'Formula 1' },
    });
    expect(response.data.aliases).toEqual(['openf1-session-9988']);
  });

  it('resolves legacy openf1-session-* and openf1-* aliases to canonical IDs', async () => {
    const { service } = setup((t) => {
      season2025(t);
      t.on(
        route('/sessions', { session_key: '9988' }),
        jsonResponse([OPENF1_2025_SESSIONS[6]]),
      ).on(
        route('/meetings', { meeting_key: '1255' }),
        jsonResponse([OPENF1_2025_MEETINGS[2]]),
      );
    });
    const session = await service.getSession('openf1-session-9988');
    expect(session.data.session.id).toBe('f1:2025:china:fp1');
    expect(session.meta.warnings[0]).toContain('openf1-session-9988');
    const round = await service.getRound('openf1-1255');
    expect(round.data.round.id).toBe('f1:2025:china');
  });

  it('answers 404 for unknown canonical IDs and out-of-range seasons', async () => {
    const { service, transport } = setup(season2025);
    expect(
      (await captureApiError(service.getRound('f1:2025:atlantis'))).getStatus(),
    ).toBe(404);
    expect(
      (
        await captureApiError(service.getSession('f1:2025:china:fp3'))
      ).getStatus(),
    ).toBe(404);
    const before = transport.requests.length;
    expect(
      (await captureApiError(service.getRound('f1:1949:britain'))).getStatus(),
    ).toBe(404);
    expect(
      (await captureApiError(service.getRound('not-an-id'))).getStatus(),
    ).toBe(404);
    expect(transport.requests.length).toBe(before);
  });

  it('reports 404 when a legacy alias does not exist upstream', async () => {
    const { service } = setup((t) =>
      t.on(
        route('/sessions', { session_key: '1' }),
        jsonResponse({ detail: 'No results found.' }, 404),
      ),
    );
    expect(
      (
        await captureApiError(service.getSession('openf1-session-1'))
      ).getStatus(),
    ).toBe(404);
  });
});
