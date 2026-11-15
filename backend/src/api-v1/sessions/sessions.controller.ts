import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiV1ExceptionFilter } from '../../common/http/api-v1-exception.filter';
import { SessionResultsService } from '../results/session-results.service';
import { RoundsService } from '../rounds/rounds.service';

@Controller('api/v1/sessions')
@UseFilters(ApiV1ExceptionFilter)
export class SessionsController {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly resultsService: SessionResultsService,
  ) {}

  @Get(':sessionId')
  getSession(@Param('sessionId') sessionId: string, @Query('tz') tz: unknown) {
    return this.roundsService.getSession(sessionId, tz);
  }

  @Get(':sessionId/results')
  getResults(@Param('sessionId') sessionId: string) {
    return this.resultsService.getResults(sessionId);
  }
}
