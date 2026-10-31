// Typed upstream failure. Provider clients throw this instead of raw
// transport errors so services can distinguish an outage from a valid empty
// response and map each failure to an explicit HTTP status / availability.

export type UpstreamErrorKind =
  | 'timeout'
  | 'network'
  | 'http_status'
  | 'rate_limited'
  | 'access_restricted'
  | 'bad_response'
  | 'local_quota';

export interface UpstreamErrorDetails {
  status?: number;
  retryAfterSeconds?: number;
  /** Request path for logs only; never returned to API clients. */
  path?: string;
}

export class UpstreamError extends Error {
  constructor(
    readonly provider: string,
    readonly kind: UpstreamErrorKind,
    message: string,
    readonly details: UpstreamErrorDetails = {},
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export function isUpstreamError(error: unknown): error is UpstreamError {
  return error instanceof UpstreamError;
}
