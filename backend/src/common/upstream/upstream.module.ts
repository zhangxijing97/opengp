// Shared upstream infrastructure: HTTP transport, upstream configuration and
// the clock. Imported by feature modules; no global prefix or global state.

import { Module } from '@nestjs/common';
import { CLOCK, systemClock } from '../clock';
import { AxiosHttpTransport, HTTP_TRANSPORT } from './http-transport';
import { UPSTREAM_CONFIG, loadUpstreamConfig } from './upstream.config';

@Module({
  providers: [
    { provide: HTTP_TRANSPORT, useClass: AxiosHttpTransport },
    { provide: UPSTREAM_CONFIG, useFactory: () => loadUpstreamConfig() },
    { provide: CLOCK, useValue: systemClock },
  ],
  exports: [HTTP_TRANSPORT, UPSTREAM_CONFIG, CLOCK],
})
export class UpstreamModule {}
