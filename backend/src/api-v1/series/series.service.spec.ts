import { OpenGpApiError } from '../../common/http/api-errors';
import { DEFAULT_UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../../data-providers/openf1/openf1-api.client';
import { F1CalendarService } from '../../f1/f1-calendar.service';
import { jolpicaSeasonsPage } from '../../../test/fixtures/jolpica.fixtures';
import {
  FakeHttpTransport,
  instantRuntime,
  jsonResponse,
  route,
} from '../../../test/support/fake-http-transport';
import { SeriesService } from './series.service';

const NOW = Date.parse('2026-10-31T12:00:00Z');

function setup(transport: FakeHttpTransport) {
  const runtime = instantRuntime(() => NOW);
  const calendar = new F1CalendarService(
    new JolpicaClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    new OpenF1ApiClient(transport, DEFAULT_UPSTREAM_CONFIG, runtime),
    () => NOW,
  );
  return new SeriesService(calendar, () => NOW);
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

describe('SeriesService', () => {
  it('lists only series validated for v1', () => {
    const response = setup(new FakeHttpTransport()).listSeries();
    expect(response.data.series).toEqual([
      { id: 'f1', name: 'Formula 1', category: 'Single-Seater' },
    ]);
  });

  it('lists F1 seasons with provider-declared capability coverage', async () => {
    const transport = new FakeHttpTransport().on(
      route('/seasons.json'),
      jsonResponse(jolpicaSeasonsPage(['2025', '1950', '2023'])),
    );
    const response = await setup(transport).listSeasons('f1');
    expect(response.data.seasons.map((season) => season.id)).toEqual([
      'f1:1950',
      'f1:2023',
      'f1:2025',
    ]);
    const coverage1950 = response.data.seasons[0].coverage;
    expect(
      coverage1950.find((item) => item.capability === 'practice_result')
        ?.availability,
    ).toBe('unsupported');
    expect(
      coverage1950.find((item) => item.capability === 'team_standings')
        ?.availability,
    ).toBe('unsupported');
    expect(
      coverage1950.find((item) => item.capability === 'calendar')?.availability,
    ).toBe('available');
    const coverage2025 = response.data.seasons[2].coverage;
    expect(
      coverage2025.find((item) => item.capability === 'practice_result'),
    ).toEqual({
      capability: 'practice_result',
      provider: 'openf1',
      availability: 'unknown',
    });
  });

  it('answers 422 for legacy-only series, 404 for unknown series and 502 on outage', async () => {
    expect(
      await statusOf(setup(new FakeHttpTransport()).listSeasons('motogp')),
    ).toBe(422);
    expect(
      await statusOf(setup(new FakeHttpTransport()).listSeasons('xyz')),
    ).toBe(404);
    const down = new FakeHttpTransport().on(
      route('/seasons.json'),
      jsonResponse('down', 500),
    );
    expect(await statusOf(setup(down).listSeasons('f1'))).toBe(502);
  });
});
