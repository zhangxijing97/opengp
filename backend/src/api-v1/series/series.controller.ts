import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { ApiV1ExceptionFilter } from '../../common/http/api-v1-exception.filter';
import { SeriesService } from './series.service';

@Controller('api/v1/series')
@UseFilters(ApiV1ExceptionFilter)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get()
  listSeries() {
    return this.seriesService.listSeries();
  }

  @Get(':seriesId/seasons')
  listSeasons(@Param('seriesId') seriesId: string) {
    return this.seriesService.listSeasons(seriesId);
  }
}
