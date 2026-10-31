import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiV1ExceptionFilter } from '../../common/http/api-v1-exception.filter';
import { RoundsService } from './rounds.service';

@Controller('api/v1/rounds')
@UseFilters(ApiV1ExceptionFilter)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  // Query values are typed `unknown`: repeated parameters arrive as arrays
  // and are rejected by validation with HTTP 400.
  @Get()
  listRounds(
    @Query('from') from: unknown,
    @Query('to') to: unknown,
    @Query('tz') tz: unknown,
    @Query('seriesId') seriesId: unknown,
  ) {
    return this.roundsService.listRounds({ from, to, tz, seriesId });
  }

  @Get(':roundId')
  getRound(@Param('roundId') roundId: string) {
    return this.roundsService.getRound(roundId);
  }
}
