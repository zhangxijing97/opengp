// Typed OpenF1 client for the v1 pipeline. Free historical access only:
// HTTP 401/403 (e.g. while a live session restricts anonymous access) is an
// explicit access_restricted error, and 404 means "no matching rows".
// Rate guard stays below the documented 3 req/s and 30 req/min.

import { Inject, Injectable, Optional } from '@nestjs/common';
import { ShapeError } from '../../common/upstream/json-guards';
import { HTTP_TRANSPORT } from '../../common/upstream/http-transport';
import type { HttpTransport } from '../../common/upstream/http-transport';
import {
  JsonHttpClient,
  UPSTREAM_RUNTIME,
} from '../../common/upstream/json-http-client';
import type { UpstreamRuntime } from '../../common/upstream/json-http-client';
import { UpstreamError } from '../../common/upstream/upstream-error';
import { UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import type { UpstreamConfig } from '../../common/upstream/upstream.config';
import {
  parseOpenF1Array,
  parseOpenF1Meeting,
  parseOpenF1Session,
} from './openf1-api.parsers';
import type {
  OpenF1ApiMeeting,
  OpenF1ApiSession,
  OpenF1FetchResult,
} from './openf1-api.types';

@Injectable()
export class OpenF1ApiClient {
  private readonly http: JsonHttpClient;

  constructor(
    @Inject(HTTP_TRANSPORT) transport: HttpTransport,
    @Inject(UPSTREAM_CONFIG) config: UpstreamConfig,
    @Optional() @Inject(UPSTREAM_RUNTIME) runtime?: UpstreamRuntime,
  ) {
    this.http = new JsonHttpClient(
      {
        provider: 'openf1',
        baseUrl: config.openf1BaseUrl,
        userAgent: config.userAgent,
        timeoutMs: 5_000,
        maxRetries: 1,
        baseBackoffMs: 500,
        maxRetryAfterMs: 3_000,
        totalBudgetMs: 7_000,
        throttle: {
          maxConcurrent: 1,
          minIntervalMs: 400,
          windowMs: 60_000,
          maxRequestsPerWindow: 25,
        },
        accessRestrictedStatuses: [401, 403],
      },
      transport,
      runtime ?? {},
    );
  }

  fetchSessionsByYear(
    year: number,
  ): Promise<OpenF1FetchResult<OpenF1ApiSession>> {
    return this.fetchList('/sessions', { year }, parseOpenF1Session);
  }

  fetchMeetingsByYear(
    year: number,
  ): Promise<OpenF1FetchResult<OpenF1ApiMeeting>> {
    return this.fetchList('/meetings', { year }, parseOpenF1Meeting);
  }

  async fetchSessionByKey(
    sessionKey: number,
  ): Promise<OpenF1ApiSession | null> {
    const result = await this.fetchList(
      '/sessions',
      { session_key: sessionKey },
      parseOpenF1Session,
    );
    return result.items.find((item) => item.session_key === sessionKey) ?? null;
  }

  async fetchMeetingByKey(
    meetingKey: number,
  ): Promise<OpenF1ApiMeeting | null> {
    const result = await this.fetchList(
      '/meetings',
      { meeting_key: meetingKey },
      parseOpenF1Meeting,
    );
    return result.items.find((item) => item.meeting_key === meetingKey) ?? null;
  }

  private async fetchList<T>(
    path: string,
    query: Record<string, number>,
    parseItem: (value: unknown, path: string) => T,
  ): Promise<OpenF1FetchResult<T>> {
    const response = await this.http.getJson(path, query, {
      treatNotFoundAsEmptyArray: true,
    });
    try {
      return {
        items: parseOpenF1Array(response.body, parseItem),
        retrievedAt: response.retrievedAt,
      };
    } catch (error) {
      if (error instanceof ShapeError) {
        throw new UpstreamError(
          'openf1',
          'bad_response',
          `openf1 response failed validation at ${error.path}`,
          { path },
        );
      }
      throw error;
    }
  }
}
