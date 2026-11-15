import { UpstreamError } from '../../common/upstream/upstream-error';
import { DEFAULT_UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../../data-providers/openf1/openf1-api.client';
import {
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
  JOLPICA_2026_MEXICO_CITY,
  jolpicaRacePage,
} from '../../../test/fixtures/jolpica.fixtures';
import {
  CHINA_2025_RACE_ROWS,
  DRIVERS_2025,
  raceTablePage,
  seasonDriversPage,
} from '../../../test/fixtures/jolpica-results.fixtures';
import {
  OPENF1_2025_MEETINGS,
  OPENF1_2025_SESSIONS,
} from '../../../test/fixtures/openf1.fixtures';
import {
  FP1_9988_DRIVERS,
  FP1_9988_RESULTS,
} from '../../../test/fixtures/openf1-results.fixtures';
import {
  FakeHttpTransport,
  instantRuntime,
  jsonResponse,
  route,
} from '../../../test/support/fake-http-transport';
import { F1CalendarService } from '../f1-calendar.service';
import { F1CalendarSource } from '../f1-calendar.source';
import { F1ResultsService } from './f1-results.service';

const NOW = Date.parse('2026-10-31T12:00:00Z');

function setup(configure: (transport: FakeHttpTransport) => void) {
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
    )
    .on(
      route('/2026.json'),
      jsonResponse(jolpicaRacePage('2026', [JOLPICA_2026_MEXICO_CITY])),
    )
    .on(route('/sessions', { year: '2026' }), jsonResponse([]))
    .on(route('/meetings', { year: '2026' }), jsonResponse([]))
    .on(
      route('/2025/drivers.json'),
      jsonResponse(seasonDriversPage(Object.values(DRIVERS_2025))),
    );
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
  const source = new F1CalendarSource(
    new F1CalendarService(jolpica, openf1, () => NOW),
  );
  return {
    service: new F1ResultsService(source, jolpica, openf1, () => NOW),
    transport,
  };
}

const count = (transport: FakeHttpTransport, fragment: string) =>
  transport.urls().filter((url) => url.includes(fragment)).length;

describe('F1ResultsService', () => {
  it('returns the published Jolpica race classification with its source', async () => {
    const { service } = setup((t) =>
      t.on(
        route('/2025/2/results.json'),
        jsonResponse(
          raceTablePage('2025', '2', 'Results', CHINA_2025_RACE_ROWS),
        ),
      ),
    );
    const outcome = await service.getSessionResults('f1:2025:china:race', NOW);
    expect(outcome?.availability).toBe('available');
    expect(outcome?.resultSet).toMatchObject({
      id: 'f1:2025:china:race:classification',
      kind: 'race',
      publicationStatus: 'unknown',
    });
    expect(outcome?.resultSet?.classification).toHaveLength(6);
    expect(outcome?.sources).toEqual([
      { provider: 'jolpica', capability: 'race_result' },
    ]);
  });

  it('uses OpenF1 for practice and caches it (one call per endpoint)', async () => {
    const { service, transport } = setup((t) =>
      t
        .on(
          route('/session_result', { session_key: '9988' }),
          jsonResponse(FP1_9988_RESULTS),
        )
        .on(
          route('/drivers', { session_key: '9988' }),
          jsonResponse(FP1_9988_DRIVERS),
        ),
    );
    const first = await service.getSessionResults('f1:2025:china:fp1', NOW);
    await service.getSessionResults('openf1-session-9988', NOW);
    expect(first?.sources).toEqual([
      { provider: 'openf1', capability: 'practice_result' },
    ]);
    expect(first?.resultSet?.classification[0]).toMatchObject({
      position: 1,
      bestLapMs: 91504,
    });
    expect(first?.warnings[0]).toContain('could not be linked');
    expect(count(transport, '/session_result')).toBe(1);
    expect(count(transport, '/drivers?')).toBe(1);
  });

  it('reports not_published for a future session without calling a results endpoint', async () => {
    const { service, transport } = setup(() => undefined);
    const outcome = await service.getSessionResults(
      'f1:2026:mexico-city:race',
      NOW,
    );
    expect(outcome).toMatchObject({
      resultSet: null,
      availability: 'not_published',
    });
    expect(count(transport, 'results.json')).toBe(0);
  });

  it('reports not_published when a just-finished session has no rows yet, unknown when older', async () => {
    const { service } = setup((t) =>
      t.on(
        route('/2025/2/results.json'),
        jsonResponse(raceTablePage('2025', '2', 'Results', [])),
      ),
    );
    expect(
      (await service.getSessionResults('f1:2025:china:race', NOW))
        ?.availability,
    ).toBe('unknown');
    const justAfter = Date.parse('2025-03-23T12:00:00Z');
    const fresh = setup((t) =>
      t.on(
        route('/2025/2/results.json'),
        jsonResponse(raceTablePage('2025', '2', 'Results', [])),
      ),
    );
    expect(
      (await fresh.service.getSessionResults('f1:2025:china:race', justAfter))
        ?.availability,
    ).toBe('not_published');
  });

  it('treats an OpenF1 access restriction as availability, not as an outage', async () => {
    const { service } = setup((t) =>
      t
        .on(route('/session_result'), jsonResponse({ detail: 'live' }, 401))
        .on(route('/drivers?'), jsonResponse([])),
    );
    const outcome = await service.getSessionResults('f1:2025:china:fp1', NOW);
    expect(outcome).toMatchObject({
      resultSet: null,
      availability: 'access_restricted',
    });
  });

  it('surfaces a Jolpica outage as an error from the results endpoint', async () => {
    const { service } = setup((t) =>
      t.on(route('/2025/2/results.json'), jsonResponse('down', 503)),
    );
    let caught: unknown;
    try {
      await service.getSessionResults('f1:2025:china:race', NOW);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UpstreamError);
  });

  it('marks pre-2023 practice as unsupported and cancelled sessions as not applicable', async () => {
    const { service } = setup(() => undefined);
    const session = {
      id: 'f1:2019:china:fp1',
      roundId: 'f1:2019:china',
      kind: 'fp1',
      type: 'practice' as const,
      name: 'Practice 1',
      sequence: 1,
      order: 1,
      scheduledStartAt: '2019-04-12T02:00:00Z',
      scheduledDate: null,
      schedulePrecision: 'instant' as const,
      scheduledEndAt: null,
      trackTimeZone: 'Asia/Shanghai',
      trackLocalDate: '2019-04-12',
      cancelled: null,
      resultCoverageFromSeason: 2023,
      external: { openf1SessionKey: null },
      sources: [],
    };
    const round = {
      id: 'f1:2019:china',
      seasonId: 'f1:2019',
      seriesId: 'f1',
      seriesName: 'Formula 1',
      season: 2019,
      slug: 'china',
      name: 'Chinese Grand Prix',
      roundNumber: 3,
      circuit: null,
      locationLabel: null,
      trackTimeZone: 'Asia/Shanghai',
      startsAt: null,
      endsAt: null,
      sessions: [session],
      aliasSlugs: [],
      external: {
        jolpica: { season: 2019, round: 3, circuitId: 'shanghai' },
        openf1MeetingKey: null,
      },
      sources: [],
      warnings: [],
    };
    const outcomes = await service.previewResults(
      round,
      [session, { ...session, id: 'x', cancelled: true }],
      NOW,
    );
    expect(outcomes.get('f1:2019:china:fp1')).toEqual({
      availability: 'unsupported',
      preview: null,
    });
    expect(outcomes.get('x')).toEqual({
      availability: 'not_applicable',
      preview: null,
    });
  });
});
