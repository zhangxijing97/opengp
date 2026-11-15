// GET /api/v1/standings?seasonId&subjectType&asOfRoundId. Validates the
// query, routes to the series' standings source and builds the envelope.

import { Inject, Injectable } from '@nestjs/common';
import { parseSeasonId } from '../../canonical/canonical-id';
import type {
  StandingsOutcome,
  StandingsSubjectType,
} from '../../canonical/results.types';
import { SERIES_STANDINGS_SOURCES } from '../../canonical/series-calendar-source';
import type { SeriesStandingsSource } from '../../canonical/series-calendar-source';
import { classifySeriesId } from '../../canonical/series-capabilities';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { buildMeta } from '../../common/http/api-envelope';
import type { ApiResponse } from '../../common/http/api-envelope';
import {
  asApiError,
  invalidQuery,
  notFound,
  unsupportedCapability,
} from '../../common/http/api-errors';
import type { StandingsResponseData } from '../dto/api-v1.dto';

export interface StandingsQueryInput {
  seasonId: unknown;
  subjectType: unknown;
  asOfRoundId: unknown;
}

const SUBJECT_TYPES: readonly StandingsSubjectType[] = ['driver', 'team'];

@Injectable()
export class StandingsService {
  private readonly sourcesBySeries: Map<string, SeriesStandingsSource>;

  constructor(
    @Inject(SERIES_STANDINGS_SOURCES) sources: SeriesStandingsSource[],
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.sourcesBySeries = new Map(
      sources.map((source) => [source.seriesId, source]),
    );
  }

  async getStandings(
    query: StandingsQueryInput,
  ): Promise<ApiResponse<StandingsResponseData>> {
    const errors: string[] = [];
    const seasonId = typeof query.seasonId === 'string' ? query.seasonId : null;
    const parsedSeason = seasonId ? parseSeasonId(seasonId) : null;
    if (!seasonId || !parsedSeason) {
      errors.push('"seasonId" is required, e.g. "f1:2025".');
    }
    const subjectType =
      typeof query.subjectType === 'string' &&
      (SUBJECT_TYPES as readonly string[]).includes(query.subjectType)
        ? (query.subjectType as StandingsSubjectType)
        : null;
    if (!subjectType) errors.push('"subjectType" must be "driver" or "team".');
    if (
      query.asOfRoundId !== undefined &&
      typeof query.asOfRoundId !== 'string'
    ) {
      errors.push('"asOfRoundId" must be provided once.');
    }
    if (errors.length > 0 || !seasonId || !parsedSeason || !subjectType) {
      throw invalidQuery(errors);
    }

    const source = this.sourcesBySeries.get(parsedSeason.seriesId);
    if (!source) {
      if (classifySeriesId(parsedSeason.seriesId) === 'legacy_only') {
        throw unsupportedCapability(
          `Standings for "${parsedSeason.seriesId}" are not available in /api/v1 yet.`,
        );
      }
      throw notFound(`Season "${seasonId}" was not found.`);
    }

    const nowMs = this.clock();
    let outcome: StandingsOutcome | null;
    try {
      outcome = await source.getStandings(
        {
          seasonId,
          subjectType,
          asOfRoundId:
            typeof query.asOfRoundId === 'string' ? query.asOfRoundId : null,
        },
        nowMs,
      );
    } catch (error) {
      throw asApiError(error, `${subjectType}_standings`);
    }
    if (!outcome) throw notFound(`Season "${seasonId}" was not found.`);

    return {
      data: { standings: outcome.data },
      meta: buildMeta({
        availability: outcome.availability,
        retrievedAt: outcome.retrievedAt,
        sources: outcome.sources,
        warnings: outcome.warnings,
      }),
    };
  }
}
