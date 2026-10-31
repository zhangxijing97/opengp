// Versioned /api/v1 HTTP surface. Paths are prefixed per controller; there is
// deliberately no global prefix, so the six legacy routes keep their paths.

import { Module } from '@nestjs/common';
import { SERIES_CALENDAR_SOURCES } from '../canonical/series-calendar-source';
import type { SeriesCalendarSource } from '../canonical/series-calendar-source';
import { UpstreamModule } from '../common/upstream/upstream.module';
import { F1CalendarSource } from '../f1/f1-calendar.source';
import { F1Module } from '../f1/f1.module';
import { RoundsController } from './rounds/rounds.controller';
import { RoundsService } from './rounds/rounds.service';
import { SeriesController } from './series/series.controller';
import { SeriesService } from './series/series.service';
import { SessionsController } from './sessions/sessions.controller';

@Module({
  imports: [UpstreamModule, F1Module],
  controllers: [SeriesController, RoundsController, SessionsController],
  providers: [
    SeriesService,
    RoundsService,
    {
      // Register one SeriesCalendarSource per series validated for v1.
      provide: SERIES_CALENDAR_SOURCES,
      useFactory: (f1: F1CalendarSource): SeriesCalendarSource[] => [f1],
      inject: [F1CalendarSource],
    },
  ],
})
export class ApiV1Module {}
