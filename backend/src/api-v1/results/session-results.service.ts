// GET /api/v1/sessions/:sessionId/results. Series-agnostic: asks each
// registered results source; the first that owns the ID answers.

import { Inject, Injectable } from '@nestjs/common';
import type { SessionResultsOutcome } from '../../canonical/results.types';
import { SERIES_RESULTS_SOURCES } from '../../canonical/series-calendar-source';
import type { SeriesResultsSource } from '../../canonical/series-calendar-source';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { buildMeta } from '../../common/http/api-envelope';
import type { ApiResponse } from '../../common/http/api-envelope';
import { asApiError, notFound } from '../../common/http/api-errors';
import { toIsoUtc } from '../../common/time/time-zone';
import type { SessionResultsData } from '../dto/api-v1.dto';

@Injectable()
export class SessionResultsService {
  constructor(
    @Inject(SERIES_RESULTS_SOURCES)
    private readonly sources: SeriesResultsSource[],
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getResults(
    sessionId: string,
  ): Promise<ApiResponse<SessionResultsData>> {
    const nowMs = this.clock();
    for (const source of this.sources) {
      let outcome: SessionResultsOutcome | null;
      try {
        outcome = await source.getSessionResults(sessionId, nowMs);
      } catch (error) {
        throw asApiError(error, 'session_results');
      }
      if (!outcome) continue;
      return {
        data: { sessionId: outcome.sessionId, resultSet: outcome.resultSet },
        meta: buildMeta({
          availability: outcome.availability,
          retrievedAt: outcome.retrievedAt ?? toIsoUtc(nowMs),
          sources: outcome.sources,
          warnings: outcome.warnings,
        }),
      };
    }
    const shown =
      sessionId.length > 80 ? `${sessionId.slice(0, 77)}...` : sessionId;
    throw notFound(`Session "${shown}" was not found.`);
  }
}
