import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiV1ExceptionFilter } from '../../common/http/api-v1-exception.filter';
import { StandingsService } from './standings.service';

@Controller('api/v1/standings')
@UseFilters(ApiV1ExceptionFilter)
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get()
  getStandings(
    @Query('seasonId') seasonId: unknown,
    @Query('subjectType') subjectType: unknown,
    @Query('asOfRoundId') asOfRoundId: unknown,
  ) {
    return this.standingsService.getStandings({
      seasonId,
      subjectType,
      asOfRoundId,
    });
  }
}
