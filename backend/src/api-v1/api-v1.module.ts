// Versioned /api/v1 HTTP surface. Paths are prefixed per controller; there is
// deliberately no global prefix, so the six legacy routes keep their paths.

import { Module } from '@nestjs/common';
import {
  SERIES_CALENDAR_SOURCES,
  SERIES_RESULTS_SOURCES,
  SERIES_STANDINGS_SOURCES,
} from '../canonical/series-calendar-source';
import type {
  SeriesCalendarSource,
  SeriesResultsSource,
  SeriesStandingsSource,
} from '../canonical/series-calendar-source';
import { UpstreamModule } from '../common/upstream/upstream.module';
import { F1CalendarSource } from '../f1/f1-calendar.source';
import { F1Module } from '../f1/f1.module';
import { F1ResultsService } from '../f1/results/f1-results.service';
import { F1StandingsService } from '../f1/standings/f1-standings.service';
import { SessionResultsService } from './results/session-results.service';
import { RoundsController } from './rounds/rounds.controller';
import { RoundsService } from './rounds/rounds.service';
import { SeriesController } from './series/series.controller';
import { SeriesService } from './series/series.service';
import { SessionsController } from './sessions/sessions.controller';
import { StandingsController } from './standings/standings.controller';
import { StandingsService } from './standings/standings.service';

@Module({
  imports: [UpstreamModule, F1Module],
  controllers: [
    SeriesController,
    RoundsController,
    SessionsController,
    StandingsController,
  ],
  providers: [
    SeriesService,
    RoundsService,
    SessionResultsService,
    StandingsService,
    // One source per series validated for v1 (F1 today); add F2 etc. here.
    {
      provide: SERIES_CALENDAR_SOURCES,
      useFactory: (f1: F1CalendarSource): SeriesCalendarSource[] => [f1],
      inject: [F1CalendarSource],
    },
    {
      provide: SERIES_RESULTS_SOURCES,
      useFactory: (f1: F1ResultsService): SeriesResultsSource[] => [f1],
      inject: [F1ResultsService],
    },
    {
      provide: SERIES_STANDINGS_SOURCES,
      useFactory: (f1: F1StandingsService): SeriesStandingsSource[] => [f1],
      inject: [F1StandingsService],
    },
  ],
})
export class ApiV1Module {}
