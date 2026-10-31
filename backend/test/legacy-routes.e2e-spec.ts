// Regression tests for the six legacy routes: same paths, same unwrapped
// top-level JSON shapes, default Nest errors. Providers are replaced by
// in-memory fakes so no network is used.

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { NascarProvider } from './../src/data-providers/nascar/nascar.provider';
import { OpenF1Provider } from './../src/data-providers/openf1/openf1.provider';
import type { RacingDataProvider } from './../src/data-providers/racing-data-provider.interface';
import { SportradarProvider } from './../src/data-providers/sportradar/sportradar.provider';
import type { Event, SessionDetail } from './../src/events/types';

const F1_EVENT: Event = {
  id: 'openf1-1255',
  series: { id: 'f1', name: 'Formula 1', category: 'Single-Seater' },
  season: {
    id: 'f1-2025',
    year: 2025,
    name: '2025 Formula 1 World Championship',
  },
  eventName: 'Chinese Grand Prix',
  country: 'China',
  location: 'Shanghai',
  venueName: 'Shanghai',
  dateStart: '2025-03-21T03:30:00+00:00',
  dateEnd: '2025-03-23T09:00:00+00:00',
  sessions: [
    {
      id: 'openf1-session-9988',
      eventId: 'openf1-1255',
      name: 'Practice 1',
      category: 'practice',
      startTime: '2025-03-21T03:30:00+00:00',
      endTime: '2025-03-21T04:30:00+00:00',
      status: 'finished',
    },
  ],
};

const F1_DETAIL: SessionDetail = {
  event: {
    id: F1_EVENT.id,
    eventName: F1_EVENT.eventName,
    seriesName: 'Formula 1',
    seasonName: F1_EVENT.season.name,
    country: F1_EVENT.country,
    location: F1_EVENT.location,
    venueName: F1_EVENT.venueName,
    dateStart: F1_EVENT.dateStart,
    dateEnd: F1_EVENT.dateEnd,
  },
  session: F1_EVENT.sessions[0],
  classification: [],
};

function fakeProvider(
  seriesIds: string[],
  events: Event[],
): RacingDataProvider {
  return {
    supportedSeriesIds: seriesIds,
    getEventsByDate: () => Promise.resolve(events),
    getUpcomingEvents: () => Promise.resolve(events),
    getLiveEvents: () => Promise.resolve([]),
    getPastEvents: () => Promise.resolve(events),
    getEventById: () => Promise.resolve(events[0] ?? F1_EVENT),
    getSessionDetailById: () =>
      Promise.resolve(seriesIds.includes('f1') ? F1_DETAIL : null),
  };
}

const bodyOf = <T>(response: { body: unknown }) => response.body as T;

describe('Legacy routes (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OpenF1Provider)
      .useValue(fakeProvider(['f1'], [F1_EVENT]))
      .overrideProvider(SportradarProvider)
      .useValue(
        fakeProvider(
          ['formula-e', 'indycar', 'indy-nxt', 'motogp', 'rally'],
          [],
        ),
      )
      .overrideProvider(NascarProvider)
      .useValue(
        fakeProvider(['nascar-cup', 'nascar-xfinity', 'nascar-truck'], []),
      )
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /events/today|upcoming|live|past keep their plain-array responses', async () => {
    const server = app.getHttpServer();
    for (const path of [
      '/events/today?series=f1',
      '/events/upcoming',
      '/events/live?date=2025-03-21',
      '/events/past?series=f1',
    ]) {
      const response = await request(server).get(path);
      expect(response.status).toBe(200);
      expect(Array.isArray(bodyOf<unknown>(response))).toBe(true);
    }
    const today = await request(server).get('/events/today?series=f1');
    const events = bodyOf<Event[]>(today);
    expect(events[0].id).toBe('openf1-1255');
    expect(events[0].sessions[0].id).toBe('openf1-session-9988');
  });

  it('GET /events/:id and /sessions/:id/detail keep legacy IDs and object shapes', async () => {
    const server = app.getHttpServer();
    const event = await request(server).get('/events/openf1-1255?series=f1');
    expect(event.status).toBe(200);
    const body = bodyOf<Record<string, unknown>>(event);
    expect(body.id).toBe('openf1-1255');
    expect(body.data).toBeUndefined();

    const detail = await request(server).get(
      '/sessions/openf1-session-9988/detail',
    );
    expect(detail.status).toBe(200);
    expect(Object.keys(bodyOf<object>(detail)).sort()).toEqual([
      'classification',
      'event',
      'session',
    ]);
  });

  it('keeps default Nest errors (not the v1 envelope) on legacy routes', async () => {
    const response = await request(app.getHttpServer()).get(
      '/events/today?series=unknown-series',
    );
    expect(response.status).toBe(404);
    // Nest default shape: { statusCode, message, error: 'Not Found' } - no v1 meta.
    const body = bodyOf<{
      statusCode: number;
      error?: unknown;
      meta?: unknown;
    }>(response);
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('Not Found');
    expect(body.meta).toBeUndefined();
  });

  it('GET / still answers Hello World!', async () => {
    const response = await request(app.getHttpServer()).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello World!');
  });
});
