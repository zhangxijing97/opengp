// Typed v1 API errors and the single mapping from upstream failures to HTTP
// status codes. Messages are generic; provider paths stay in server logs.

import { HttpException } from '@nestjs/common';
import type { Availability, SourceRef } from '../../canonical/canonical.types';
import { UpstreamError, isUpstreamError } from '../upstream/upstream-error';
import type { ApiErrorBody, ApiErrorCode } from './api-envelope';

export interface OpenGpApiErrorOptions {
  availability?: Availability;
  sources?: SourceRef[];
  details?: string[];
  retryAfterSeconds?: number;
  upstream?: UpstreamError;
}

export class OpenGpApiError extends HttpException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    httpStatus: number,
    readonly apiOptions: OpenGpApiErrorOptions = {},
  ) {
    super({ code, message }, httpStatus);
    this.message = message;
  }

  toBody(retrievedAt: string): ApiErrorBody {
    const body: ApiErrorBody = {
      error: { code: this.code, message: this.message },
      meta: {
        availability: this.apiOptions.availability ?? 'unknown',
        retrievedAt,
        sources: this.apiOptions.sources ?? [],
      },
    };
    if (this.apiOptions.details && this.apiOptions.details.length > 0) {
      body.error.details = this.apiOptions.details;
    }
    return body;
  }
}

export function invalidQuery(details: string[]): OpenGpApiError {
  return new OpenGpApiError(
    'INVALID_QUERY',
    'The request query is invalid.',
    400,
    {
      details,
    },
  );
}

export function notFound(message: string): OpenGpApiError {
  return new OpenGpApiError('NOT_FOUND', message, 404);
}

export function unsupportedCapability(message: string): OpenGpApiError {
  return new OpenGpApiError('UNSUPPORTED_CAPABILITY', message, 422, {
    availability: 'unsupported',
  });
}

export function serviceUnavailable(
  message: string,
  options: OpenGpApiErrorOptions = {},
): OpenGpApiError {
  return new OpenGpApiError('SERVICE_UNAVAILABLE', message, 503, options);
}

export function fromUpstreamError(
  error: UpstreamError,
  capability: string,
): OpenGpApiError {
  const sources: SourceRef[] = [{ provider: error.provider, capability }];
  const retryAfterSeconds = error.details.retryAfterSeconds;

  switch (error.kind) {
    case 'bad_response':
      return new OpenGpApiError(
        'UPSTREAM_BAD_RESPONSE',
        'Racing data provider returned an unexpected response.',
        502,
        { availability: 'upstream_error', sources, upstream: error },
      );
    case 'rate_limited':
    case 'local_quota':
      return serviceUnavailable(
        'Racing data is temporarily unavailable. Please retry later.',
        {
          availability: 'upstream_error',
          sources,
          retryAfterSeconds,
          upstream: error,
        },
      );
    case 'access_restricted':
      return serviceUnavailable(
        'Racing data provider is restricting access right now.',
        { availability: 'access_restricted', sources, upstream: error },
      );
    case 'timeout':
    case 'network':
    case 'http_status':
    default:
      return new OpenGpApiError(
        'UPSTREAM_UNAVAILABLE',
        'Racing data is temporarily unavailable.',
        502,
        { availability: 'upstream_error', sources, upstream: error },
      );
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 400) return 'INVALID_QUERY';
  if (status === 404) return 'NOT_FOUND';
  if (status === 422) return 'UNSUPPORTED_CAPABILITY';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'SERVICE_UNAVAILABLE';
  if (status === 502) return 'UPSTREAM_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

export function toOpenGpApiError(exception: unknown): OpenGpApiError {
  if (exception instanceof OpenGpApiError) return exception;
  if (isUpstreamError(exception))
    return fromUpstreamError(exception, 'unknown');
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = codeForStatus(status);
    const message =
      code === 'INTERNAL_ERROR'
        ? 'Unexpected server error.'
        : exception.message;
    return new OpenGpApiError(
      code,
      message,
      code === 'INTERNAL_ERROR' ? 500 : status,
    );
  }
  return new OpenGpApiError('INTERNAL_ERROR', 'Unexpected server error.', 500);
}
