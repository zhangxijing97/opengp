// F1 championship standings: the Jolpica published snapshot (never rebuilt by
// summing results), plus additive season progress and a CALCULATED
// "can still win" flag (decision D3). Calendar problems only remove the
// additive parts; they never fail the standings themselves.

import { Inject, Injectable } from '@nestjs/common';
import {
  parseRoundId,
  parseSeasonId,
  slugify,
} from '../../canonical/canonical-id';
import type {
  Availability,
  SeasonCalendar,
  SourceRef,
} from '../../canonical/canonical.types';
import type {
  ChampionshipContention,
  StandingRow,
  StandingsOutcome,
} from '../../canonical/results.types';
import type {
  SeriesStandingsSource,
  StandingsQuery,
} from '../../canonical/series-calendar-source';
import { F1_SERIES } from '../../canonical/series-capabilities';
import { CLOCK } from '../../common/clock';
import type { Clock } from '../../common/clock';
import { invalidQuery } from '../../common/http/api-errors';
import { SnapshotStore } from '../../common/upstream/snapshot-store';
import { JolpicaClient } from '../../data-providers/jolpica/jolpica.client';
import type {
  JolpicaStandingRow,
  JolpicaStandingsResult,
} from '../../data-providers/jolpica/jolpica.types';
import { F1CalendarSource } from '../f1-calendar.source';
import {
  F1CalendarService,
  cooldownFor,
  describeFailure,
} from '../f1-calendar.service';
import {
  canStillWinFlags,
  f1PointsRules,
  maxRemainingPoints,
} from '../f1-championship-math';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

type StandingsSnapshot = Omit<JolpicaStandingsResult, 'retrievedAt'>;

function mapRow(
  row: JolpicaStandingRow,
  subjectType: 'driver' | 'team',
): StandingRow {
  const rank =
    row.position && /^\d+$/.test(row.position) ? Number(row.position) : null;
  const wins = row.wins && /^\d+$/.test(row.wins) ? Number(row.wins) : null;
  const teams = (row.Constructors ?? []).map((team) => ({
    id: `f1:team:${slugify(team.constructorId)}`,
    name: team.name,
  }));
  const subject =
    subjectType === 'driver' && row.Driver
      ? {
          id: `f1:driver:${slugify(row.Driver.driverId)}`,
          name: `${row.Driver.givenName} ${row.Driver.familyName}`,
          type: 'driver' as const,
          code: row.Driver.code ?? null,
        }
      : {
          id: `f1:team:${slugify(row.Constructor?.constructorId ?? 'unknown')}`,
          name: row.Constructor?.name ?? 'Unknown',
          type: 'team' as const,
          code: null,
        };
  return {
    rank,
    positionText: row.positionText ?? row.position ?? null,
    subject,
    teams: subjectType === 'driver' ? teams : [],
    points: row.points,
    wins,
    canStillWin: null,
  };
}

@Injectable()
export class F1StandingsService implements SeriesStandingsSource {
  readonly seriesId = F1_SERIES.id;
  private readonly snapshots: SnapshotStore<StandingsSnapshot>;

  constructor(
    private readonly jolpica: JolpicaClient,
    private readonly calendars: F1CalendarService,
    private readonly calendarSource: F1CalendarSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.snapshots = new SnapshotStore(60, clock);
  }

  async getStandings(query: StandingsQuery): Promise<StandingsOutcome | null> {
    const parsed = parseSeasonId(query.seasonId);
    if (
      !parsed ||
      parsed.seriesId !== this.seriesId ||
      !/^\d{4}$/.test(parsed.seasonKey)
    ) {
      return null;
    }
    const season = Number(parsed.seasonKey);
    if (!this.calendars.isSeasonInRange(season)) return null;

    let requestedRound: number | null = null;
    if (query.asOfRoundId !== null) {
      const invalid = invalidQuery([
        `"asOfRoundId" must be a round of ${query.seasonId}.`,
      ]);
      // Reject another season's canonical ID without any upstream call.
      const parsedRound = parseRoundId(query.asOfRoundId);
      if (parsedRound && parsedRound.seasonKey !== parsed.seasonKey)
        throw invalid;
      const resolved = await this.calendarSource.resolveRound(
        query.asOfRoundId,
      );
      if (
        !resolved ||
        resolved.round.season !== season ||
        resolved.round.roundNumber === null
      ) {
        throw invalid;
      }
      requestedRound = resolved.round.roundNumber;
    }

    const current = season >= this.calendars.currentYear();
    const read = await this.snapshots.read(
      `${season}:${requestedRound ?? 'latest'}:${query.subjectType}`,
      async () => {
        const result = await this.jolpica.fetchStandings(
          season,
          requestedRound,
          query.subjectType,
        );
        return {
          value: { round: result.round, rows: result.rows },
          retrievedAt: result.retrievedAt,
        };
      },
      {
        freshMs: current ? 10 * MINUTE_MS : DAY_MS,
        maxStaleMs: current ? DAY_MS : 30 * DAY_MS,
        failureCooldownMs: cooldownFor,
        describeFailure,
        refreshInBackground: true,
      },
    );

    const warnings: string[] = [];
    let calendar: SeasonCalendar | null = null;
    try {
      calendar = await this.calendars.getSeasonCalendar(season);
    } catch {
      warnings.push(
        'Season calendar unavailable; progress and title contention are omitted',
      );
    }

    const rows = read.value.rows.map((row) => mapRow(row, query.subjectType));
    const asOfRound = read.value.round;
    const contention = this.contentionFor(
      season,
      query.subjectType,
      asOfRound,
      calendar,
      rows,
      warnings,
    );

    const capability =
      query.subjectType === 'driver' ? 'driver_standings' : 'team_standings';
    const sources: SourceRef[] = [{ provider: 'jolpica', capability }];
    if (calendar) sources.push({ provider: 'jolpica', capability: 'calendar' });

    let availability: Availability = 'available';
    if (rows.length === 0) availability = 'not_published';
    else if (!calendar) availability = 'partial';

    return {
      data: {
        seasonId: query.seasonId,
        subjectType: query.subjectType,
        asOfRoundId:
          calendar?.rounds.find(
            (round) => round.external.jolpica?.round === asOfRound,
          )?.id ?? null,
        publicationStatus: 'unknown',
        rows,
        progress: {
          completedRounds: asOfRound,
          totalRounds: calendar
            ? calendar.rounds.filter((round) => round.roundNumber !== null)
                .length
            : null,
        },
        contention,
      },
      availability,
      retrievedAt: read.retrievedAt,
      sources,
      warnings,
    };
  }

  private contentionFor(
    season: number,
    subjectType: 'driver' | 'team',
    asOfRound: number | null,
    calendar: SeasonCalendar | null,
    rows: StandingRow[],
    warnings: string[],
  ): ChampionshipContention | null {
    const rules = f1PointsRules(season);
    if (!rules) {
      warnings.push(
        'Title contention is only calculated for seasons with a reviewed points table (2019-2026)',
      );
      return null;
    }
    if (!calendar || asOfRound === null || rows.length === 0) return null;

    const remaining = calendar.rounds.filter(
      (round) => round.roundNumber !== null && round.roundNumber > asOfRound,
    );
    const runs = (kind: string) =>
      remaining.filter((round) =>
        round.sessions.some(
          (session) => session.kind === kind && session.cancelled !== true,
        ),
      ).length;
    const remainingRaces = runs('race');
    const remainingSprints = runs('sprint');
    const max = maxRemainingPoints(
      rules,
      subjectType,
      remainingRaces,
      remainingSprints,
    );
    const flags = canStillWinFlags(
      rows.map((row) => row.points),
      max,
    );
    rows.forEach((row, index) => {
      row.canStillWin = flags[index];
    });
    const leader = rows.reduce((best, row) =>
      Number(row.points) > Number(best.points) ? row : best,
    );
    return {
      basis: 'calculated',
      remainingRaces,
      remainingSprints,
      maxRemainingPoints: max,
      leaderPoints: leader.points,
    };
  }
}
