// HTTP-level tests for /api/v1 against an offline fake upstream.
// Run with: npm run test:e2e

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CLOCK } from './../src/common/clock';
import { HTTP_TRANSPORT } from './../src/common/upstream/http-transport';
import {
  JOLPICA_2025_AUSTRALIA,
  JOLPICA_2025_CHINA,
  JOLPICA_2026_MEXICO_CITY,
  JOLPICA_2026_UNITED_STATES,
  jolpicaRacePage,
} from './fixtures/jolpica.fixtures';
import {
  OPENF1_2025_MEETINGS,
  OPENF1_2025_SESSIONS,
} from './fixtures/openf1.fixtures';
import {
  FakeHttpTransport,
  jsonResponse,
  route,
} from './support/fake-http-transport';

const NOW = Date.parse('2026-10-31T12:00:00Z');

interface V1Body<T> {
  data?: T;
  error?: { code: string; message: string; details?: string[] };
  meta: { availability: string; coverage?: unknown[] };
}

interface SeriesData {
  series: unknown[];
}

interface RoundsListData {
  interval: { tz: string };
  rounds: Array<{ id: string; sessions: unknown[] }>;
}

interface RoundDetailData {
  round: { id: string; sessions: unknown[] };
}

interface SessionDetailData {
  session: { id: string };
  aliases: string[];
}

function bodyOf<T = unknown>(response: { body: unknown }): V1Body<T> {
  return response.body as V1Body<T>;
}

function healthyUpstream(): FakeHttpTransport {
  return new FakeHttpTransport()
    .on(
      route('/2026.json'),
      jsonResponse(
        jolpicaRacePage('2026', [
          JOLPICA_2026_UNITED_STATES,
          JOLPICA_2026_MEXICO_CITY,
        ]),
      ),
    )
    .on(
      route('/2025.json'),
      jsonResponse(
        jolpicaRacePage('2025', [JOLPICA_2025_AUSTRALIA, JOLPICA_2025_CHINA]),
      ),
    )
    .on(route('/sessions', { year: '2026' }), jsonResponse([]))
    .on(route('/meetings', { year: '2026' }), jsonResponse([]))
    .on(
      route('/sessions', { year: '2025' }),
      jsonResponse(OPENF1_2025_SESSIONS),
    )
    .on(
      route('/meetings', { year: '2025' }),
      jsonResponse(OPENF1_2025_MEETINGS),
    )
    .on(
      route('/sessions', { session_key: '9988' }),
      jsonResponse([OPENF1_2025_SESSIONS[6]]),
    );
}

async function createApp(
  transport: FakeHttpTransport,
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HTTP_TRANSPORT)
    .useValue(transport)
    .overrideProvider(CLOCK)
    .useValue(() => NOW)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('/api/v1 (e2e, fake upstream)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp(healthyUpstream());
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/series lists only validated series in a {data, meta} envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/series');
    const body = bodyOf<SeriesData>(response);
    expect(response.status).toBe(200);
    expect(body.data?.series).toEqual([
      { id: 'f1', name: 'Formula 1', category: 'Single-Seater' },
    ]);
    expect(body.meta.availability).toBe('available');
  });

  it('GET /api/v1/rounds returns a local week with nested sessions', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=America%2FLos_Angeles&seriesId=f1',
    );
    const body = bodyOf<RoundsListData>(response);
    expect(response.status).toBe(200);
    expect(body.data?.interval.tz).toBe('America/Los_Angeles');
    expect(body.data?.rounds.map((round) => round.id)).toEqual([
      'f1:2026:mexico-city',
    ]);
    expect(body.data?.rounds[0].sessions).toHaveLength(5);
    expect(body.meta.coverage).toEqual([
      { seriesId: 'f1', availability: 'available' },
    ]);
  });

  it('GET /api/v1/rounds validates input (400) and unsupported series (422)', async () => {
    const server = app.getHttpServer();
    const badTz = await request(server).get(
      '/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=Mars%2FBase',
    );
    expect(badTz.status).toBe(400);
    expect(bodyOf(badTz).error?.code).toBe('INVALID_QUERY');
    expect(bodyOf(badTz).meta.availability).toBe('unknown');

    const repeated = await request(server).get(
      '/api/v1/rounds?from=2026-10-26&from=2026-10-27&to=2026-11-02',
    );
    expect(repeated.status).toBe(400);

    const tooLong = await request(server).get(
      '/api/v1/rounds?from=2026-10-01&to=2026-12-01',
    );
    expect(tooLong.status).toBe(400);

    const legacyOnly = await request(server).get(
      '/api/v1/rounds?from=2026-10-26&to=2026-11-02&seriesId=motogp',
    );
    expect(legacyOnly.status).toBe(422);
    expect(bodyOf(legacyOnly).error?.code).toBe('UNSUPPORTED_CAPABILITY');
  });

  it('GET /api/v1/rounds/:roundId accepts raw and percent-encoded canonical IDs', async () => {
    const server = app.getHttpServer();
    const raw = await request(server).get('/api/v1/rounds/f1:2025:china');
    expect(raw.status).toBe(200);
    expect(bodyOf<RoundDetailData>(raw).data?.round.sessions).toHaveLength(5);

    const encoded = await request(server).get(
      '/api/v1/rounds/f1%3A2025%3Achina',
    );
    expect(encoded.status).toBe(200);
    expect(bodyOf<RoundDetailData>(encoded).data?.round.id).toBe(
      'f1:2025:china',
    );
  });

  it('GET /api/v1/sessions/:sessionId resolves legacy OpenF1 aliases', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/sessions/openf1-session-9988',
    );
    const body = bodyOf<SessionDetailData>(response);
    expect(response.status).toBe(200);
    expect(body.data?.session.id).toBe('f1:2025:china:fp1');
    expect(body.data?.aliases).toEqual(['openf1-session-9988']);
  });

  it('answers 404 with the error envelope for unknown canonical IDs', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/rounds/f1:2025:atlantis',
    );
    expect(response.status).toBe(404);
    expect(bodyOf(response).error?.code).toBe('NOT_FOUND');
  });

  it('does not apply a global /api/v1 prefix to legacy routes', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/events/today',
    );
    // Unknown route: Nest default 404 shape, not the v1 {error, meta} envelope.
    const body = response.body as {
      statusCode?: number;
      error?: unknown;
      meta?: unknown;
    };
    expect(response.status).toBe(404);
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('Not Found');
    expect(body.meta).toBeUndefined();
  });
});

describe('/api/v1 (e2e, upstream outage)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp(
      new FakeHttpTransport().on(
        route('/2026.json'),
        jsonResponse('down', 503),
      ),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 502 UPSTREAM_UNAVAILABLE instead of an empty week', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/rounds?from=2026-10-26&to=2026-11-02',
    );
    const body = bodyOf(response);
    expect(response.status).toBe(502);
    expect(body.error?.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(body.meta.availability).toBe('upstream_error');
    expect(body.data).toBeUndefined();
  });
});
