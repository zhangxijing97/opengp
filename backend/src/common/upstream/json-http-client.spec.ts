import {
  FakeHttpTransport,
  fakeTimeout,
  jsonResponse,
  route,
} from '../../../test/support/fake-http-transport';
import { JsonHttpClient, parseRetryAfterMs } from './json-http-client';
import type { JsonHttpClientOptions } from './json-http-client';
import { UpstreamError } from './upstream-error';

const OPTIONS: JsonHttpClientOptions = {
  provider: 'testprov',
  baseUrl: 'https://upstream.test/v1/',
  userAgent: 'OpenGP-test',
  timeoutMs: 1000,
  maxRetries: 2,
  baseBackoffMs: 10,
  maxRetryAfterMs: 5000,
  totalBudgetMs: 60_000,
  throttle: {
    maxConcurrent: 2,
    minIntervalMs: 0,
    windowMs: 60_000,
    maxRequestsPerWindow: 100,
  },
  accessRestrictedStatuses: [401, 403],
};

function makeClient(
  transport: FakeHttpTransport,
  overrides: Partial<JsonHttpClientOptions> = {},
) {
  const sleeps: number[] = [];
  const client = new JsonHttpClient({ ...OPTIONS, ...overrides }, transport, {
    now: () => Date.parse('2026-10-31T12:00:00Z'),
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  });
  return { client, sleeps };
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

describe('JsonHttpClient', () => {
  it('returns the body, sends identifying headers and sorts query params', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse([1, 2]),
    );
    const { client } = makeClient(transport);
    const result = await client.getJson('/items', { offset: 0, limit: 100 });
    expect(result.body).toEqual([1, 2]);
    expect(result.retrievedAt).toBe('2026-10-31T12:00:00Z');
    expect(transport.urls()).toEqual([
      'https://upstream.test/v1/items?limit=100&offset=0',
    ]);
    expect(transport.requests[0].headers['User-Agent']).toBe('OpenGP-test');
  });

  it('retries 5xx with backoff and then succeeds', async () => {
    const transport = new FakeHttpTransport()
      .on(route('/items'), jsonResponse({}, 503), 2)
      .on(route('/items'), jsonResponse(['ok']));
    const { client, sleeps } = makeClient(transport);
    expect((await client.getJson('/items')).body).toEqual(['ok']);
    expect(sleeps).toEqual([10, 20]);
  });

  it('raises http_status after exhausting retries instead of returning empty data', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse({}, 500),
    );
    const { client } = makeClient(transport);
    const error = await captureError(client.getJson('/items'));
    expect(error.kind).toBe('http_status');
    expect(error.details.status).toBe(500);
    expect(transport.requests).toHaveLength(3);
  });

  it('maps timeouts to a timeout error after retries', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      fakeTimeout(),
    );
    const { client } = makeClient(transport);
    expect((await captureError(client.getJson('/items'))).kind).toBe('timeout');
    expect(transport.requests).toHaveLength(3);
  });

  it('honours a short Retry-After on 429 and gives up on a long one', async () => {
    const short = new FakeHttpTransport()
      .on(route('/items'), jsonResponse({}, 429, { 'retry-after': '2' }), 1)
      .on(route('/items'), jsonResponse(['ok']));
    const shortClient = makeClient(short);
    expect((await shortClient.client.getJson('/items')).body).toEqual(['ok']);
    expect(shortClient.sleeps).toEqual([2000]);

    const long = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse({}, 429, { 'retry-after': '120' }),
    );
    const error = await captureError(makeClient(long).client.getJson('/items'));
    expect(error.kind).toBe('rate_limited');
    expect(error.details.retryAfterSeconds).toBe(120);
    expect(long.requests).toHaveLength(1);
  });

  it('treats 401/403 as access_restricted without retrying', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse({ detail: 'live' }, 401),
    );
    const error = await captureError(
      makeClient(transport).client.getJson('/items'),
    );
    expect(error.kind).toBe('access_restricted');
    expect(transport.requests).toHaveLength(1);
  });

  it('turns 404 into [] only when asked to (OpenF1 "no results")', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse({ detail: 'No results found.' }, 404),
    );
    const { client } = makeClient(transport);
    expect(
      (await client.getJson('/items', {}, { treatNotFoundAsEmptyArray: true }))
        .body,
    ).toEqual([]);
    expect((await captureError(client.getJson('/items'))).kind).toBe(
      'http_status',
    );
  });

  it('coalesces identical in-flight requests', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse(['ok']),
    );
    const { client } = makeClient(transport);
    const [a, b] = await Promise.all([
      client.getJson('/items', { year: 2025 }),
      client.getJson('/items', { year: 2025 }),
    ]);
    expect(a.body).toEqual(b.body);
    expect(transport.requests).toHaveLength(1);
  });

  it('fails fast with local_quota when the protective budget is used up', async () => {
    const transport = new FakeHttpTransport().on(
      route('/items'),
      jsonResponse(['ok']),
    );
    const { client } = makeClient(transport, {
      throttle: {
        maxConcurrent: 1,
        minIntervalMs: 0,
        windowMs: 60_000,
        maxRequestsPerWindow: 1,
      },
    });
    await client.getJson('/items', { page: 1 });
    const error = await captureError(client.getJson('/items', { page: 2 }));
    expect(error.kind).toBe('local_quota');
    expect(transport.requests).toHaveLength(1);
  });

  it('bounds total latency with a request budget across retries', async () => {
    let now = 0;
    const transport = new FakeHttpTransport().on(route('/items'), () => {
      now += 400;
      return jsonResponse({}, 503);
    });
    const client = new JsonHttpClient(
      { ...OPTIONS, totalBudgetMs: 1_000, baseBackoffMs: 100 },
      transport,
      {
        now: () => now,
        sleep: (ms) => {
          now += ms;
          return Promise.resolve();
        },
      },
    );
    const error = await captureError(client.getJson('/items'));
    expect(error.kind).toBe('http_status');
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1].timeoutMs).toBeLessThanOrEqual(500);
  });

  it('parses Retry-After seconds and HTTP dates', () => {
    const now = Date.parse('2026-10-31T12:00:00Z');
    expect(parseRetryAfterMs('3', now)).toBe(3000);
    expect(parseRetryAfterMs('Sat, 31 Oct 2026 12:00:10 GMT', now)).toBe(
      10_000,
    );
    expect(parseRetryAfterMs(undefined, now)).toBeNull();
    expect(parseRetryAfterMs('soon', now)).toBeNull();
  });
});
