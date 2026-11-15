import { OpenGpApiError } from '../../common/http/api-errors';
import { DEFAULT_UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../../data-providers/openf1/openf1-api.client';
import { F1CalendarService } from '../../f1/f1-calendar.service';
import { F1CalendarSource } from '../../f1/f1-calendar.source';
import { F1StandingsService } from '../../f1/standings/f1-standings.service';
import {
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
  jolpicaRacePage,
} from '../../../test/fixtures/jolpica.fixtures';
import {
  DRIVER_STANDINGS_AFTER_R1,
  DRIVER_STANDINGS_AFTER_R2,
  TEAM_STANDINGS_AFTER_R2,
  standingsPage,
} from '../../../test/fixtures/jolpica-results.fixtures';
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
import { StandingsService } from './standings.service';

const NOW = Date.parse('2026-10-31T12:00:00Z');

function setup(
  configure: (transport: FakeHttpTransport) => void = () => undefined,
) {
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
      route('/2025/driverStandings.json'),
      jsonResponse(
        standingsPage(
          '2025',
          '2',
          'DriverStandings',
          DRIVER_STANDINGS_AFTER_R2,
        ),
      ),
    )
    .on(
      route('/2025/1/driverStandings.json'),
      jsonResponse(
        standingsPage(
          '2025',
          '1',
          'DriverStandings',
          DRIVER_STANDINGS_AFTER_R1,
        ),
      ),
    )
    .on(
      route('/2025/constructorStandings.json'),
      jsonResponse(
        standingsPage(
          '2025',
          '2',
          'ConstructorStandings',
          TEAM_STANDINGS_AFTER_R2,
        ),
      ),
    )
    .on(route('/2027.json'), jsonResponse(jolpicaRacePage('2027', [])))
    .on(route('/sessions', { year: '2027' }), jsonResponse([]))
    .on(route('/meetings', { year: '2027' }), jsonResponse([]))
    .on(
      route('/2027/driverStandings.json'),
      jsonResponse(standingsPage('2027', null, 'DriverStandings', [])),
    );
  configure(transport);
  const runtime = instantRuntime(() => NOW);
  const jolpica = new JolpicaClient(
    transport,
    DEFAULT_UPSTREAM_CONFIG,
    runtime,
  );
  const calendars = new F1CalendarService(
    jolpica,
    new OpenF1ApiClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    () => NOW,
  );
  const f1 = new F1StandingsService(
    jolpica,
    calendars,
    new F1CalendarSource(calendars),
    () => NOW,
  );
  return { service: new StandingsService([f1], () => NOW), transport };
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof OpenGpApiError) return error.getStatus();
    throw error;
  }
  return 200;
}

describe('StandingsService', () => {
  it('returns the published driver snapshot with season progress and title contention', async () => {
    const { service } = setup();
    const response = await service.getStandings({
      seasonId: 'f1:2025',
      subjectType: 'driver',
      asOfRoundId: undefined,
    });
    const standings = response.data.standings;
    expect(standings).toMatchObject({
      seasonId: 'f1:2025',
      subjectType: 'driver',
      asOfRoundId: 'f1:2025:china',
      publicationStatus: 'unknown',
    });
    expect(standings.progress).toEqual({ completedRounds: 2, totalRounds: 2 });
    expect(standings.rows[0]).toMatchObject({
      rank: 1,
      points: '44',
      wins: 1,
      subject: {
        id: 'f1:driver:norris',
        name: 'Lando Norris',
        type: 'driver',
        code: 'NOR',
      },
      teams: [{ id: 'f1:team:mclaren', name: 'McLaren' }],
    });
    // Season over in this fixture: only the leader can still be champion.
    expect(standings.rows.map((row) => row.canStillWin)).toEqual([
      true,
      false,
      false,
    ]);
    expect(standings.contention).toMatchObject({
      basis: 'calculated',
      remainingRaces: 0,
      maxRemainingPoints: 0,
      leaderPoints: '44',
    });
    expect(response.meta.availability).toBe('available');
    expect(response.meta.sources).toEqual([
      { provider: 'jolpica', capability: 'driver_standings' },
      { provider: 'jolpica', capability: 'calendar' },
    ]);
  });

  it('computes contention as of an earlier round (one race and one sprint left)', async () => {
    const { service } = setup();
    const response = await service.getStandings({
      seasonId: 'f1:2025',
      subjectType: 'driver',
      asOfRoundId: 'f1:2025:australia',
    });
    const standings = response.data.standings;
    expect(standings.asOfRoundId).toBe('f1:2025:australia');
    expect(standings.contention).toMatchObject({
      remainingRaces: 1,
      remainingSprints: 1,
      maxRemainingPoints: 33,
    });
    expect(standings.rows.map((row) => row.canStillWin)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('maps team standings with team subjects', async () => {
    const { service } = setup();
    const response = await service.getStandings({
      seasonId: 'f1:2025',
      subjectType: 'team',
      asOfRoundId: undefined,
    });
    expect(response.data.standings.rows[0]).toMatchObject({
      subject: { id: 'f1:team:mclaren', name: 'McLaren', type: 'team' },
      points: '78',
      teams: [],
    });
  });

  it('reports not_published when a season has no standings yet', async () => {
    const { service } = setup();
    const response = await service.getStandings({
      seasonId: 'f1:2027',
      subjectType: 'driver',
      asOfRoundId: undefined,
    });
    expect(response.data.standings.rows).toEqual([]);
    expect(response.meta.availability).toBe('not_published');
  });

  it('validates the query (400), unsupported series (422) and unknown seasons (404)', async () => {
    const { service, transport } = setup();
    expect(
      await statusOf(
        service.getStandings({
          seasonId: undefined,
          subjectType: 'driver',
          asOfRoundId: undefined,
        }),
      ),
    ).toBe(400);
    expect(
      await statusOf(
        service.getStandings({
          seasonId: 'f1:2025',
          subjectType: 'drivers',
          asOfRoundId: undefined,
        }),
      ),
    ).toBe(400);
    expect(
      await statusOf(
        service.getStandings({
          seasonId: 'motogp:2025',
          subjectType: 'driver',
          asOfRoundId: undefined,
        }),
      ),
    ).toBe(422);
    expect(
      await statusOf(
        service.getStandings({
          seasonId: 'f1:1949',
          subjectType: 'driver',
          asOfRoundId: undefined,
        }),
      ),
    ).toBe(404);
    expect(transport.requests).toHaveLength(0);
    expect(
      await statusOf(
        service.getStandings({
          seasonId: 'f1:2025',
          subjectType: 'driver',
          asOfRoundId: 'f1:2026:mexico-city',
        }),
      ),
    ).toBe(400);
  });

  it('turns a Jolpica outage into 502 instead of empty standings', async () => {
    const { service } = setup((t) =>
      t.on(route('/2024/driverStandings.json'), jsonResponse('down', 503)),
    );
    expect(
      await statusOf(
        service.getStandings({
          seasonId: 'f1:2024',
          subjectType: 'driver',
          asOfRoundId: undefined,
        }),
      ),
    ).toBe(502);
  });
});
