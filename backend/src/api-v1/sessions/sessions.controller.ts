import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { ApiV1ExceptionFilter } from '../../common/http/api-v1-exception.filter';
import { RoundsService } from '../rounds/rounds.service';

@Controller('api/v1/sessions')
@UseFilters(ApiV1ExceptionFilter)
export class SessionsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Get(':sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.roundsService.getSession(sessionId);
  }
}
