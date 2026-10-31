// F1 v1 data module: typed Jolpica + OpenF1 clients, the snapshot-backed
// calendar service and the F1 SeriesCalendarSource. Independent of the
// legacy DataProvidersModule; legacy routing is untouched.

import { Module } from '@nestjs/common';
import { UpstreamModule } from '../common/upstream/upstream.module';
import { JolpicaClient } from '../data-providers/jolpica/jolpica.client';
import { OpenF1ApiClient } from '../data-providers/openf1/openf1-api.client';
import { F1CalendarService } from './f1-calendar.service';
import { F1CalendarSource } from './f1-calendar.source';

@Module({
  imports: [UpstreamModule],
  providers: [
    JolpicaClient,
    OpenF1ApiClient,
    F1CalendarService,
    F1CalendarSource,
  ],
  exports: [
    JolpicaClient,
    OpenF1ApiClient,
    F1CalendarService,
    F1CalendarSource,
  ],
})
export class F1Module {}
