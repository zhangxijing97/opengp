import { DEFAULT_UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import { UpstreamError } from '../../common/upstream/upstream-error';
import {
  JOLPICA_1950_BRITAIN,
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
  JOLPICA_2023_MIAMI,
  jolpicaRacePage,
} from '../../../test/fixtures/jolpica.fixtures';
import {
  FakeHttpTransport,
  instantRuntime,
  jsonResponse,
  route,
} from '../../../test/support/fake-http-transport';
import { JolpicaClient } from './jolpica.client';

function makeClient(transport: FakeHttpTransport) {
  return new JolpicaClient(
    transport,
    DEFAULT_UPSTREAM_CONFIG,
    instantRuntime(),
  );
}

async function captureError(promise: Promise<unknown>): Promise<UpstreamError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof UpstreamError) return error;
    throw error;
  }
  throw new Error('expected an UpstreamError');
}

describe('JolpicaClient', () => {
  it('requests limit=100 with an identifying User-Agent and parses the MRData envelope', async () => {
    const transport = new FakeHttpTransport().on(
      route('/2025.json'),
      jsonResponse(
        jolpicaRacePage('2025', [JOLPICA_2025_AUSTRALIA, JOLPICA_2025_CHINA]),
      ),
    );
    const result = await makeClient(transport).fetchSeasonSchedule(2025);
    expect(result.items.map((race) => race.raceName)).toEqual([
      'Australian Grand Prix',
      'Chinese Grand Prix',
    ]);
    expect(result.items[1].SprintQualifying).toEqual({
      date: '2025-03-21',
      time: '07:30:00Z',
    });
    expect(transport.urls()[0]).toBe(
      'https://api.jolpi.ca/ergast/f1/2025.json?limit=100&offset=0',
    );
    expect(transport.requests[0].headers['User-Agent']).toContain('OpenGP');
  });

  it('follows offset pagination across multiple pages', async () => {
    const races = [
      JOLPICA_2025_AUSTRALIA,
      JOLPICA_2025_CHINA,
      JOLPICA_2023_MIAMI,
    ];
    const transport = new FakeHttpTransport()
      .on(
        route('/2025.json', { offset: '0' }),
        jsonResponse(
          jolpicaRacePage('2025', [races[0]], {
            total: 3,
            limit: 1,
            offset: 0,
          }),
        ),
      )
      .on(
        route('/2025.json', { offset: '1' }),
        jsonResponse(
          jolpicaRacePage('2025', [races[1]], {
            total: 3,
            limit: 1,
            offset: 1,
          }),
        ),
      )
      .on(
        route('/2025.json', { offset: '2' }),
        jsonResponse(
          jolpicaRacePage('2025', [races[2]], {
            total: 3,
            limit: 1,
            offset: 2,
          }),
        ),
      );
    const result = await makeClient(transport).fetchSeasonSchedule(2025);
    expect(result.items).toHaveLength(3);
    expect(transport.requests).toHaveLength(3);
  });

  it('accepts races without practice/sprint objects or a time', async () => {
    const transport = new FakeHttpTransport().on(
      route('/1950.json'),
      jsonResponse(jolpicaRacePage('1950', [JOLPICA_1950_BRITAIN])),
    );
    const [race] = (await makeClient(transport).fetchSeasonSchedule(1950))
      .items;
    expect(race.time).toBeUndefined();
    expect(race.FirstPractice).toBeUndefined();
    expect(race.Sprint).toBeUndefined();
  });

  it('returns an empty list for a season the provider has not published (total 0)', async () => {
    const transport = new FakeHttpTransport().on(
      route('/2027.json'),
      jsonResponse(jolpicaRacePage('2027', [])),
    );
    expect(
      (await makeClient(transport).fetchSeasonSchedule(2027)).items,
    ).toEqual([]);
  });

  it('rejects incomplete pagination and malformed envelopes as bad_response', async () => {
    const short = new FakeHttpTransport().on(
      route('/2025.json'),
      jsonResponse(
        jolpicaRacePage('2025', [JOLPICA_2025_CHINA], { total: 2, limit: 100 }),
      ),
    );
    expect(
      (await captureError(makeClient(short).fetchSeasonSchedule(2025))).kind,
    ).toBe('bad_response');

    const malformed = new FakeHttpTransport().on(
      route('/2025.json'),
      jsonResponse({ unexpected: true }),
    );
    expect(
      (await captureError(makeClient(malformed).fetchSeasonSchedule(2025)))
        .kind,
    ).toBe('bad_response');

    const badDate = new FakeHttpTransport().on(
      route('/2025.json'),
      jsonResponse(
        jolpicaRacePage('2025', [
          { ...JOLPICA_2025_CHINA, date: '23/03/2025' },
        ]),
      ),
    );
    expect(
      (await captureError(makeClient(badDate).fetchSeasonSchedule(2025))).kind,
    ).toBe('bad_response');
  });

  it('surfaces provider outages as errors, not as an empty calendar', async () => {
    const transport = new FakeHttpTransport().on(
      route('/2025.json'),
      jsonResponse('Service Unavailable', 503),
    );
    const error = await captureError(
      makeClient(transport).fetchSeasonSchedule(2025),
    );
    expect(error.kind).toBe('http_status');
    expect(transport.requests).toHaveLength(3);
  });
});
