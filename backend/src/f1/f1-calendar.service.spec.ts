import { DEFAULT_UPSTREAM_CONFIG } from '../common/upstream/upstream.config';
import { JolpicaClient } from '../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../data-providers/openf1/openf1-api.client';
import { RoundsService } from '../api-v1/rounds/rounds.service';
import {
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
  JOLPICA_2026_MEXICO_CITY,
  jolpicaRacePage,
} from '../../test/fixtures/jolpica.fixtures';
import {
  OPENF1_2025_MEETINGS,
  OPENF1_2025_SESSIONS,
} from '../../test/fixtures/openf1.fixtures';
import {
  FakeHttpTransport,
  jsonResponse,
  route,
} from '../../test/support/fake-http-transport';
import { F1_SNAPSHOT_POLICY, F1CalendarService } from './f1-calendar.service';
import { F1CalendarSource } from './f1-calendar.source';

const T0 = Date.parse('2026-10-31T12:00:00Z');

function setup(transport: FakeHttpTransport) {
  let now = T0;
  const clock = () => now;
  const runtime = { now: clock, sleep: () => Promise.resolve() };
  const service = new F1CalendarService(
    new JolpicaClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    new OpenF1ApiClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    clock,
  );
  const rounds = new RoundsService([new F1CalendarSource(service)], clock);
  return { service, rounds, advance: (ms: number) => (now += ms) };
}

const count = (transport: FakeHttpTransport, fragment: string) =>
  transport.urls().filter((url) => url.includes(fragment)).length;

describe('F1CalendarService snapshots', () => {
  it('fetches each upstream input once and reuses the built calendar while fresh', async () => {
    const transport = new FakeHttpTransport()
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
    const { service } = setup(transport);
    const first = await service.getSeasonCalendar(2025);
    const second = await service.getSeasonCalendar(2025);
    expect(second).toBe(first);
    expect(transport.requests).toHaveLength(3);
    expect(first.freshness.map((item) => item.status)).toEqual([
      'fresh',
      'fresh',
      'fresh',
    ]);
  });

  it('serves the last good Jolpica schedule as stale (partial) instead of 502 when a refresh fails', async () => {
    let healthy = true;
    const transport = new FakeHttpTransport()
      .on(route('/2026.json'), () =>
        healthy
          ? jsonResponse(jolpicaRacePage('2026', [JOLPICA_2026_MEXICO_CITY]))
          : jsonResponse('down', 503),
      )
      .on(route('/sessions', { year: '2026' }), jsonResponse([]))
      .on(route('/meetings', { year: '2026' }), jsonResponse([]));
    const { rounds, advance } = setup(transport);
    const query = {
      from: '2026-10-26',
      to: '2026-11-02',
      tz: 'UTC',
      seriesId: 'f1',
    };

    const fresh = await rounds.listRounds(query);
    expect(fresh.meta.availability).toBe('available');

    healthy = false;
    advance(F1_SNAPSHOT_POLICY.scheduleFreshCurrentMs + 1);
    const stale = await rounds.listRounds(query);
    expect(stale.data.rounds.map((round) => round.id)).toEqual([
      'f1:2026:mexico-city',
    ]);
    expect(stale.meta.availability).toBe('partial');
    expect(stale.meta.retrievedAt).toBe(fresh.meta.retrievedAt);
    expect(stale.meta.coverage?.[0].reason).toContain(
      'jolpica calendar is stale',
    );
    expect(
      stale.meta.warnings.some((warning) => warning.startsWith('stale_data')),
    ).toBe(true);

    advance(F1_SNAPSHOT_POLICY.scheduleMaxStaleCurrentMs + 1);
    await expect(rounds.listRounds(query)).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('backs off OpenF1 after access_restricted without refetching Jolpica', async () => {
    const transport = new FakeHttpTransport()
      .on(
        route('/2026.json'),
        jsonResponse(jolpicaRacePage('2026', [JOLPICA_2026_MEXICO_CITY])),
      )
      .on(
        route('/sessions', { year: '2026' }),
        jsonResponse({ detail: 'live session' }, 401),
      )
      .on(route('/meetings', { year: '2026' }), jsonResponse([]));
    const { service, advance } = setup(transport);

    const first = await service.getSeasonCalendar(2026);
    expect(first.enrichment.availability).toBe('access_restricted');
    advance(F1_SNAPSHOT_POLICY.accessRestrictedCooldownMs - 1);
    await service.getSeasonCalendar(2026);
    expect(count(transport, '/sessions')).toBe(1);
    expect(count(transport, '/2026.json')).toBe(1);

    advance(2);
    await service.getSeasonCalendar(2026);
    expect(count(transport, '/sessions')).toBe(2);
    expect(count(transport, '/2026.json')).toBe(1);
  });

  it('keeps enrichment when only OpenF1 meetings fail, and reports what is missing', async () => {
    const transport = new FakeHttpTransport()
      .on(
        route('/2025.json'),
        jsonResponse(jolpicaRacePage('2025', [JOLPICA_2025_CHINA])),
      )
      .on(
        route('/sessions', { year: '2025' }),
        jsonResponse(OPENF1_2025_SESSIONS),
      )
      .on(route('/meetings', { year: '2025' }), jsonResponse('down', 500));
    const { service } = setup(transport);
    const calendar = await service.getSeasonCalendar(2025);
    expect(calendar.rounds[0].sessions[0].external.openf1SessionKey).toBe(9988);
    expect(
      calendar.freshness.find((item) => item.capability === 'meetings')?.status,
    ).toBe('missing');
    expect(
      calendar.warnings.some((warning) => warning.startsWith('missing_data')),
    ).toBe(true);
  });

  it('resolves legacy session aliases from already-built calendars without calling OpenF1', async () => {
    const transport = new FakeHttpTransport()
      .on(
        route('/2025.json'),
        jsonResponse(jolpicaRacePage('2025', [JOLPICA_2025_CHINA])),
      )
      .on(
        route('/sessions', { year: '2025' }),
        jsonResponse(OPENF1_2025_SESSIONS),
      )
      .on(
        route('/meetings', { year: '2025' }),
        jsonResponse(OPENF1_2025_MEETINGS),
      );
    const { service } = setup(transport);
    await service.getSeasonCalendar(2025);
    const before = transport.requests.length;
    const lookup = await service.findSessionByOpenF1SessionKey(9994);
    expect(lookup.status).toBe('found');
    if (lookup.status === 'found')
      expect(lookup.session.id).toBe('f1:2025:china:qualifying');
    expect(transport.requests.length).toBe(before);
  });
});
