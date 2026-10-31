import { NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { UpstreamError } from '../upstream/upstream-error';
import { ApiV1ExceptionFilter } from './api-v1-exception.filter';
import {
  fromUpstreamError,
  invalidQuery,
  toOpenGpApiError,
} from './api-errors';

describe('v1 API errors', () => {
  it('maps upstream failures to explicit statuses, never to success', () => {
    const cases: Array<[UpstreamError['kind'], number, string]> = [
      ['timeout', 502, 'UPSTREAM_UNAVAILABLE'],
      ['network', 502, 'UPSTREAM_UNAVAILABLE'],
      ['http_status', 502, 'UPSTREAM_UNAVAILABLE'],
      ['bad_response', 502, 'UPSTREAM_BAD_RESPONSE'],
      ['rate_limited', 503, 'SERVICE_UNAVAILABLE'],
      ['local_quota', 503, 'SERVICE_UNAVAILABLE'],
      ['access_restricted', 503, 'SERVICE_UNAVAILABLE'],
    ];
    for (const [kind, status, code] of cases) {
      const error = fromUpstreamError(
        new UpstreamError('jolpica', kind, 'x'),
        'calendar',
      );
      expect(error.getStatus()).toBe(status);
      expect(error.code).toBe(code);
      expect(error.toBody('2026-10-31T12:00:00Z').meta.sources).toEqual([
        { provider: 'jolpica', capability: 'calendar' },
      ]);
    }
  });

  it('normalizes Nest and unknown exceptions', () => {
    expect(toOpenGpApiError(new NotFoundException('nope')).code).toBe(
      'NOT_FOUND',
    );
    const unknown = toOpenGpApiError(new Error('secret detail'));
    expect(unknown.getStatus()).toBe(500);
    expect(unknown.message).toBe('Unexpected server error.');
  });

  it('writes the error envelope and Retry-After through the filter', () => {
    const written: {
      status?: number;
      body?: unknown;
      headers: Record<string, string>;
    } = { headers: {} };
    const response = {
      status(code: number) {
        written.status = code;
        return response;
      },
      json(body: unknown) {
        written.body = body;
        return response;
      },
      setHeader(name: string, value: string) {
        written.headers[name] = value;
        return response;
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;

    new ApiV1ExceptionFilter().catch(
      invalidQuery(['"from" is required']),
      host,
    );
    expect(written.status).toBe(400);
    expect(written.body).toMatchObject({
      error: { code: 'INVALID_QUERY', details: ['"from" is required'] },
      meta: { availability: 'unknown', sources: [] },
    });

    const limited = new UpstreamError('openf1', 'rate_limited', 'x', {
      retryAfterSeconds: 30,
    });
    new ApiV1ExceptionFilter().catch(limited, host);
    expect(written.status).toBe(503);
    expect(written.headers['Retry-After']).toBe('30');
  });
});
