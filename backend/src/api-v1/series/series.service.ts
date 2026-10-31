// /api/v1/series and /api/v1/series/:seriesId/seasons. Only series validated
// for v1 are listed; legacy-only series answer 422, unknown ones 404.

import { Inject, Injectable } from '@nestjs/common';
import { buildSeasonId } from '../../canonical/canonical-id';
import {
  F1_CAPABILITY_ROUTES,
  F1_SERIES,
  V1_IMPLEMENTED_SERIES,
  V1Capability,
  classifySeriesId,
} from '../../canonical/series-capabilities';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { buildMeta } from '../../common/http/api-envelope';
import type { ApiResponse } from '../../common/http/api-envelope';
import {
  fromUpstreamError,
  notFound,
  unsupportedCapability,
} from '../../common/http/api-errors';
import { toIsoUtc } from '../../common/time/time-zone';
import { isUpstreamError } from '../../common/upstream/upstream-error';
import { F1CalendarService } from '../../f1/f1-calendar.service';
import type {
  JolpicaFetchResult,
  JolpicaSeason,
} from '../../data-providers/jolpica/jolpica.types';
import type {
  SeasonCoverageDto,
  SeasonDto,
  SeasonsListData,
  SeriesListData,
} from '../dto/api-v1.dto';

export function f1SeasonCoverage(season: number): SeasonCoverageDto[] {
  return (Object.keys(F1_CAPABILITY_ROUTES) as V1Capability[]).map(
    (capability) => {
      const route = F1_CAPABILITY_ROUTES[capability];
      let availability: SeasonCoverageDto['availability'] = 'unknown';
      if (season < route.coverageFromSeason) availability = 'unsupported';
      else if (capability === 'calendar') availability = 'available';
      return { capability, provider: route.primary, availability };
    },
  );
}

@Injectable()
export class SeriesService {
  constructor(
    private readonly f1Calendar: F1CalendarService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  listSeries(): ApiResponse<SeriesListData> {
    return {
      data: {
        series: V1_IMPLEMENTED_SERIES.map((series) => ({
          id: series.id,
          name: series.name,
          category: series.category,
        })),
      },
      meta: buildMeta({
        availability: 'available',
        retrievedAt: toIsoUtc(this.clock()),
        sources: [],
      }),
    };
  }

  async listSeasons(seriesId: string): Promise<ApiResponse<SeasonsListData>> {
    const classification = classifySeriesId(seriesId);
    if (classification === 'legacy_only') {
      throw unsupportedCapability(
        `Series "${seriesId}" is not available in /api/v1 yet; it is only served by the legacy /events routes.`,
      );
    }
    if (classification === 'unknown' || seriesId !== F1_SERIES.id) {
      throw notFound(`Series "${seriesId}" was not found.`);
    }

    let result: JolpicaFetchResult<JolpicaSeason>;
    try {
      result = await this.f1Calendar.getSeasons();
    } catch (error) {
      if (isUpstreamError(error)) throw fromUpstreamError(error, 'seasons');
      throw error;
    }

    const seasons: SeasonDto[] = result.items
      .map((item) => Number(item.season))
      .filter((year) => Number.isInteger(year))
      .sort((a, b) => a - b)
      .map((year) => ({
        id: buildSeasonId(F1_SERIES.id, String(year)),
        seriesId: F1_SERIES.id,
        seasonKey: String(year),
        name: `${year} Formula 1 World Championship`,
        year,
        coverage: f1SeasonCoverage(year),
      }));

    return {
      data: { seasons },
      meta: buildMeta({
        availability: 'available',
        retrievedAt: result.retrievedAt,
        sources: [{ provider: 'jolpica', capability: 'seasons' }],
        warnings: [
          'Season coverage lists provider-declared capability ranges; "unknown" means not verified for that season.',
        ],
      }),
    };
  }
}
