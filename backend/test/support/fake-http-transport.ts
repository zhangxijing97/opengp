// Offline HTTP transport for tests. Routes match on URL path suffix and a
// subset of query parameters; unmatched requests fail loudly.

import {
  TransportNetworkError,
  TransportTimeoutError,
} from '../../src/common/upstream/http-transport';
import type {
  HttpTransport,
  HttpTransportRequest,
  HttpTransportResponse,
} from '../../src/common/upstream/http-transport';

export type FakeReply = HttpTransportResponse | Error;
type Responder = (url: URL) => FakeReply;

interface Route {
  match: (url: URL) => boolean;
  respond: Responder;
  remaining: number;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string | undefined> = {},
): HttpTransportResponse {
  return { status, headers, body };
}

export function fakeTimeout(): Error {
  return new TransportTimeoutError('fake timeout');
}

export function route(
  pathSuffix: string,
  query: Record<string, string> = {},
): (url: URL) => boolean {
  return (url) =>
    url.pathname.endsWith(pathSuffix) &&
    Object.entries(query).every(
      ([key, value]) => url.searchParams.get(key) === value,
    );
}

export class FakeHttpTransport implements HttpTransport {
  readonly requests: HttpTransportRequest[] = [];
  private readonly routes: Route[] = [];

  /** Register a responder; `times` limits how often it may answer. */
  on(
    match: (url: URL) => boolean,
    reply: FakeReply | Responder,
    times = Number.POSITIVE_INFINITY,
  ): this {
    const respond: Responder =
      typeof reply === 'function' ? reply : () => reply;
    this.routes.push({ match, respond, remaining: times });
    return this;
  }

  get(request: HttpTransportRequest): Promise<HttpTransportResponse> {
    this.requests.push(request);
    const url = new URL(request.url);
    const matched = this.routes.find(
      (item) => item.remaining > 0 && item.match(url),
    );
    if (!matched) {
      return Promise.reject(
        new TransportNetworkError(`No fake route for ${request.url}`),
      );
    }
    matched.remaining--;
    const reply = matched.respond(url);
    return reply instanceof Error
      ? Promise.reject(reply)
      : Promise.resolve(reply);
  }

  urls(): string[] {
    return this.requests.map((request) => request.url);
  }
}

/** Runtime hooks that make retries/backoff instantaneous in tests. */
export function instantRuntime(now: () => number = Date.now) {
  return { now, sleep: () => Promise.resolve() };
}
