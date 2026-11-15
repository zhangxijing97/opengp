// Typed Jolpica-F1 client: MRData envelope validation, full pagination
// (limit=100, follow offset), retries/throttling via JsonHttpClient.
// Rate guard stays below the documented 4 req/s and 500 req/h.

import { Inject, Injectable, Optional } from '@nestjs/common';
import { ShapeError } from '../../common/upstream/json-guards';
import { HTTP_TRANSPORT } from '../../common/upstream/http-transport';
import type { HttpTransport } from '../../common/upstream/http-transport';
import {
  JsonHttpClient,
  UPSTREAM_RUNTIME,
} from '../../common/upstream/json-http-client';
import type { UpstreamRuntime } from '../../common/upstream/json-http-client';
import { UpstreamError } from '../../common/upstream/upstream-error';
import { UPSTREAM_CONFIG } from '../../common/upstream/upstream.config';
import type { UpstreamConfig } from '../../common/upstream/upstream.config';
import {
  parseJolpicaDriverItem,
  parseJolpicaPage,
  parseJolpicaRace,
  parseJolpicaSeason,
  qualifyingRowsOfRace,
  resultRowsOfRace,
  standingRowsOfList,
} from './jolpica.parsers';
import type {
  JolpicaDriver,
  JolpicaFetchResult,
  JolpicaPage,
  JolpicaQualifyingRow,
  JolpicaRace,
  JolpicaResultRow,
  JolpicaSeason,
  JolpicaStandingsResult,
} from './jolpica.types';

export const JOLPICA_PAGE_LIMIT = 100;
export const JOLPICA_MAX_PAGES = 30;

interface PagedRequest<T> {
  path: string;
  tableKey: string;
  listKey: string;
  /** Turns one list item (e.g. a Race) into zero or more rows. */
  parseItem: (value: unknown, path: string) => T[];
  /**
   * `exact`: MRData.total counts list items (calendar, seasons).
   * `atLeast`: total counts nested rows (results, standings); a page may
   * repeat its parent item, so only a shortfall is treated as incomplete.
   */
  completeness: 'exact' | 'atLeast';
}

@Injectable()
export class JolpicaClient {
  private readonly http: JsonHttpClient;

  constructor(
    @Inject(HTTP_TRANSPORT) transport: HttpTransport,
    @Inject(UPSTREAM_CONFIG) config: UpstreamConfig,
    @Optional() @Inject(UPSTREAM_RUNTIME) runtime?: UpstreamRuntime,
  ) {
    this.http = new JsonHttpClient(
      {
        provider: 'jolpica',
        baseUrl: config.jolpicaBaseUrl,
        userAgent: config.userAgent,
        timeoutMs: 6_000,
        maxRetries: 2,
        baseBackoffMs: 500,
        maxRetryAfterMs: 5_000,
        totalBudgetMs: 12_000,
        throttle: {
          maxConcurrent: 2,
          minIntervalMs: 300,
          windowMs: 3_600_000,
          maxRequestsPerWindow: 450,
        },
        accessRestrictedStatuses: [401, 403],
      },
      transport,
      runtime ?? {},
    );
  }

  /** Full season calendar: GET /{season}.json */
  fetchSeasonSchedule(
    season: number,
  ): Promise<JolpicaFetchResult<JolpicaRace>> {
    return this.fetchAllPages({
      path: `/${season}.json`,
      tableKey: 'RaceTable',
      listKey: 'Races',
      parseItem: (value, path) => [parseJolpicaRace(value, path)],
      completeness: 'exact',
    });
  }

  /** All championship seasons: GET /seasons.json */
  fetchSeasons(): Promise<JolpicaFetchResult<JolpicaSeason>> {
    return this.fetchAllPages({
      path: '/seasons.json',
      tableKey: 'SeasonTable',
      listKey: 'Seasons',
      parseItem: (value, path) => [parseJolpicaSeason(value, path)],
      completeness: 'exact',
    });
  }

  /** Grand Prix classification: GET /{season}/{round}/results.json */
  fetchRaceResults(
    season: number,
    round: number,
  ): Promise<JolpicaFetchResult<JolpicaResultRow>> {
    return this.fetchAllPages({
      path: `/${season}/${round}/results.json`,
      tableKey: 'RaceTable',
      listKey: 'Races',
      parseItem: resultRowsOfRace('Results'),
      completeness: 'atLeast',
    });
  }

  /** Sprint classification: GET /{season}/{round}/sprint.json */
  fetchSprintResults(
    season: number,
    round: number,
  ): Promise<JolpicaFetchResult<JolpicaResultRow>> {
    return this.fetchAllPages({
      path: `/${season}/${round}/sprint.json`,
      tableKey: 'RaceTable',
      listKey: 'Races',
      parseItem: resultRowsOfRace('SprintResults'),
      completeness: 'atLeast',
    });
  }

  /** Qualifying classification: GET /{season}/{round}/qualifying.json */
  fetchQualifyingResults(
    season: number,
    round: number,
  ): Promise<JolpicaFetchResult<JolpicaQualifyingRow>> {
    return this.fetchAllPages({
      path: `/${season}/${round}/qualifying.json`,
      tableKey: 'RaceTable',
      listKey: 'Races',
      parseItem: qualifyingRowsOfRace,
      completeness: 'atLeast',
    });
  }

  /** Drivers entered in a season: GET /{season}/drivers.json */
  fetchSeasonDrivers(
    season: number,
  ): Promise<JolpicaFetchResult<JolpicaDriver>> {
    return this.fetchAllPages({
      path: `/${season}/drivers.json`,
      tableKey: 'DriverTable',
      listKey: 'Drivers',
      parseItem: parseJolpicaDriverItem,
      completeness: 'exact',
    });
  }

  /**
   * Published standings snapshot: GET /{season}[/{round}]/driverStandings.json
   * or constructorStandings.json. `round` null = latest.
   */
  async fetchStandings(
    season: number,
    round: number | null,
    subjectType: 'driver' | 'team',
  ): Promise<JolpicaStandingsResult> {
    const resource =
      subjectType === 'driver' ? 'driverStandings' : 'constructorStandings';
    const listKey =
      subjectType === 'driver' ? 'DriverStandings' : 'ConstructorStandings';
    let asOfRound: number | null = null;
    const result = await this.fetchAllPages({
      path:
        round === null
          ? `/${season}/${resource}.json`
          : `/${season}/${round}/${resource}.json`,
      tableKey: 'StandingsTable',
      listKey: 'StandingsLists',
      parseItem: standingRowsOfList(listKey, (value) => {
        asOfRound = value;
      }),
      completeness: 'atLeast',
    });
    return {
      round: asOfRound,
      rows: result.items,
      retrievedAt: result.retrievedAt,
    };
  }

  private async fetchAllPages<T>(
    request: PagedRequest<T>,
  ): Promise<JolpicaFetchResult<T>> {
    const items: T[] = [];
    let offset = 0;
    let retrievedAt: string | null = null;

    for (let page = 0; page < JOLPICA_MAX_PAGES; page++) {
      const response = await this.http.getJson(request.path, {
        limit: JOLPICA_PAGE_LIMIT,
        offset,
      });
      retrievedAt ??= response.retrievedAt;

      let parsed: JolpicaPage;
      try {
        parsed = parseJolpicaPage(
          response.body,
          request.tableKey,
          request.listKey,
        );
        parsed.items.forEach((item, index) => {
          items.push(
            ...request.parseItem(
              item,
              `$.MRData.${request.tableKey}.${request.listKey}[${offset + index}]`,
            ),
          );
        });
      } catch (error) {
        throw this.toBadResponse(error, request.path);
      }

      const pageSize = parsed.limit > 0 ? parsed.limit : JOLPICA_PAGE_LIMIT;
      const nextOffset = parsed.offset + pageSize;
      if (nextOffset >= parsed.total || parsed.items.length === 0) {
        const complete =
          request.completeness === 'exact'
            ? items.length === parsed.total
            : items.length >= parsed.total;
        if (!complete) {
          throw new UpstreamError(
            'jolpica',
            'bad_response',
            `jolpica pagination incomplete: received ${items.length} of ${parsed.total}`,
            { path: request.path },
          );
        }
        return { items, retrievedAt: retrievedAt ?? response.retrievedAt };
      }
      offset = nextOffset;
    }

    throw new UpstreamError(
      'jolpica',
      'bad_response',
      `jolpica pagination exceeded ${JOLPICA_MAX_PAGES} pages`,
      { path: request.path },
    );
  }

  private toBadResponse(error: unknown, path: string): Error {
    if (error instanceof ShapeError) {
      return new UpstreamError(
        'jolpica',
        'bad_response',
        `jolpica response failed validation at ${error.path}`,
        { path },
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
