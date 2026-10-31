// Exception filter applied with @UseFilters on /api/v1 controllers only, so
// the legacy routes keep NestJS's default error behaviour unchanged.

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { toIsoUtc } from '../time/time-zone';
import { toOpenGpApiError } from './api-errors';

@Catch()
export class ApiV1ExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiV1');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const apiError = toOpenGpApiError(exception);
    const status = apiError.getStatus();
    const upstream = apiError.apiOptions.upstream;

    if (upstream) {
      this.logger.warn(
        `upstream failure provider=${upstream.provider} kind=${upstream.kind} status=${
          upstream.details.status ?? 'n/a'
        } path=${upstream.details.path ?? 'n/a'} -> HTTP ${status}`,
      );
    } else if (status >= 500) {
      const detail =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : '';
      this.logger.error(`unhandled error -> HTTP ${status}`, detail);
    }

    if (apiError.apiOptions.retryAfterSeconds !== undefined) {
      response.setHeader(
        'Retry-After',
        String(apiError.apiOptions.retryAfterSeconds),
      );
    }
    response.status(status).json(apiError.toBody(toIsoUtc(Date.now())));
  }
}
