// Provider-agnostic JSON GET client with timeout, bounded retries with
// backoff, Retry-After handling, throttling and in-flight request coalescing.
// Every failure surfaces as a typed UpstreamError; nothing is swallowed.

import {
  HttpTransport,
  HttpTransportResponse,
  TransportTimeoutError,
} from './http-transport';
import {
  RequestThrottle,
  SleepFn,
  ThrottleOptions,
  ThrottleQuotaExceededError,
  defaultSleep,
} from './request-throttle';
import { UpstreamError } from './upstream-error';
import { toIsoUtc } from '../time/time-zone';

export const UPSTREAM_RUNTIME = Symbol('OPENGP_UPSTREAM_RUNTIME');

/** Optional runtime hooks; injected in tests to avoid real sleeping. */
export interface UpstreamRuntime {
  now?: () => number;
  sleep?: SleepFn;
}

export interface JsonHttpClientOptions {
  provider: string;
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  maxRetries: number;
  baseBackoffMs: number;
  /** Larger Retry-After values fail immediately instead of blocking a request. */
  maxRetryAfterMs: number;
  /**
   * Wall-clock budget for one logical request including retries, backoff and
   * throttle waits. Keeps user-facing latency bounded when a provider is slow.
   */
  totalBudgetMs: number;
  throttle: ThrottleOptions;
  /** Statuses that mean "entitlement required", not an outage. */
  accessRestrictedStatuses: number[];
}

export interface JsonGetOptions {
  /** OpenF1 answers 404 for an empty filter result; treat it as `[]`. */
  treatNotFoundAsEmptyArray?: boolean;
}

export interface JsonGetResult {
  body: unknown;
  status: number;
  retrievedAt: string;
}

type QueryValue = string | number | undefined;

export function parseRetryAfterMs(
  header: string | undefined,
  nowMs: number,
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) return Math.max(dateMs - nowMs, 0);
  return null;
}

export class JsonHttpClient {
  private readonly throttle: RequestThrottle;
  private readonly inFlight = new Map<string, Promise<JsonGetResult>>();
  private readonly now: () => number;
  private readonly sleep: SleepFn;

  constructor(
    private readonly options: JsonHttpClientOptions,
    private readonly transport: HttpTransport,
    runtime: UpstreamRuntime = {},
  ) {
    this.now = runtime.now ?? Date.now;
    this.sleep = runtime.sleep ?? defaultSleep;
    this.throttle = new RequestThrottle(options.throttle, this.now, this.sleep);
  }

  buildUrl(path: string, query: Record<string, QueryValue> = {}): string {
    const base = this.options.baseUrl.replace(/\/+$/, '');
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
    for (const key of Object.keys(query).sort()) {
      const value = query[key];
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  getJson(
    path: string,
    query: Record<string, QueryValue> = {},
    options: JsonGetOptions = {},
  ): Promise<JsonGetResult> {
    const url = this.buildUrl(path, query);
    const key = `${options.treatNotFoundAsEmptyArray ? 'e' : 's'}|${url}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const request = this.executeWithRetry(url, path, options).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, request);
    return request;
  }

  private backoffMs(attempt: number): number {
    return this.options.baseBackoffMs * 2 ** attempt;
  }

  /** Another attempt is allowed only if it can start before the deadline. */
  private canRetry(attempt: number, waitMs: number, deadline: number): boolean {
    return attempt < this.options.maxRetries && this.now() + waitMs < deadline;
  }

  private async executeWithRetry(
    url: string,
    path: string,
    options: JsonGetOptions,
  ): Promise<JsonGetResult> {
    const provider = this.options.provider;
    const deadline = this.now() + this.options.totalBudgetMs;
    let lastError: UpstreamError | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      let response: HttpTransportResponse;

      try {
        response = await this.throttle.run(() => {
          const remaining = deadline - this.now();
          if (remaining <= 0) {
            return Promise.reject(
              new TransportTimeoutError(`${provider} request budget exhausted`),
            );
          }
          return this.transport.get({
            url,
            timeoutMs: Math.min(this.options.timeoutMs, remaining),
            headers: {
              Accept: 'application/json',
              'User-Agent': this.options.userAgent,
            },
          });
        });
      } catch (error) {
        if (error instanceof ThrottleQuotaExceededError) {
          throw new UpstreamError(
            provider,
            'local_quota',
            `${provider} request budget exhausted`,
            { path, retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000) },
          );
        }
        lastError =
          error instanceof TransportTimeoutError
            ? new UpstreamError(provider, 'timeout', `${provider} timed out`, {
                path,
              })
            : new UpstreamError(
                provider,
                'network',
                `${provider} unreachable`,
                {
                  path,
                },
              );
        if (!this.canRetry(attempt, this.backoffMs(attempt), deadline)) break;
        await this.sleep(this.backoffMs(attempt));
        continue;
      }

      const status = response.status;

      if (status >= 200 && status < 300) {
        return {
          body: response.body,
          status,
          retrievedAt: toIsoUtc(this.now()),
        };
      }

      if (status === 404 && options.treatNotFoundAsEmptyArray) {
        return { body: [], status, retrievedAt: toIsoUtc(this.now()) };
      }

      if (this.options.accessRestrictedStatuses.includes(status)) {
        throw new UpstreamError(
          provider,
          'access_restricted',
          `${provider} denied access (HTTP ${status})`,
          { path, status },
        );
      }

      if (status === 429) {
        const retryAfterMs = parseRetryAfterMs(
          response.headers['retry-after'],
          this.now(),
        );
        lastError = new UpstreamError(
          provider,
          'rate_limited',
          `${provider} rate limited the request`,
          {
            path,
            status,
            retryAfterSeconds:
              retryAfterMs === null
                ? undefined
                : Math.ceil(retryAfterMs / 1000),
          },
        );
        const waitMs = retryAfterMs ?? this.backoffMs(attempt);
        if (
          waitMs > this.options.maxRetryAfterMs ||
          !this.canRetry(attempt, waitMs, deadline)
        ) {
          break;
        }
        await this.sleep(waitMs);
        continue;
      }

      if (status >= 500) {
        lastError = new UpstreamError(
          provider,
          'http_status',
          `${provider} responded with HTTP ${status}`,
          { path, status },
        );
        if (!this.canRetry(attempt, this.backoffMs(attempt), deadline)) break;
        await this.sleep(this.backoffMs(attempt));
        continue;
      }

      // Other 4xx responses are not retryable.
      throw new UpstreamError(
        provider,
        'http_status',
        `${provider} responded with HTTP ${status}`,
        { path, status },
      );
    }

    throw (
      lastError ??
      new UpstreamError(provider, 'network', `${provider} request failed`, {
        path,
      })
    );
  }
}
