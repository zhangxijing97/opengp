import { OpenGpApiError } from '../../common/http/api-errors';
import { DEFAULT_UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../../data-providers/openf1/openf1-api.client';
import { F1CalendarService } from '../../f1/f1-calendar.service';
import { F1CalendarSource } from '../../f1/f1-calendar.source';
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
  const calendar = new F1CalendarService(
    new JolpicaClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    new OpenF1ApiClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    () => NOW,
  );
  return {
    service: new RoundsService([new F1CalendarSource(calendar)], () => NOW),
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
