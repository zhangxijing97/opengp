// F1 implementation of SeriesCalendarSource: chooses which season calendars
// an interval needs (Jolpica seasons are calendar years), resolves canonical
// and legacy OpenF1 identifiers, and reports coverage honestly.

import { Injectable } from '@nestjs/common';
import type {
  Availability,
  CanonicalRound,
  SeasonCalendar,
} from '../canonical/canonical.types';
import {
  parseLegacyOpenF1Alias,
  parseRoundId,
  parseSessionId,
} from '../canonical/canonical-id';
import { selectSessionsForInterval } from '../canonical/interval-selection';
import {
  calendarAvailability,
  calendarDegradationReasons,
} from '../canonical/series-calendar-source';
import type {
  IntervalCollection,
  ResolvedRound,
  ResolvedSession,
  SeriesCalendarSource,
} from '../canonical/series-calendar-source';
import {
  F1_FIRST_CHAMPIONSHIP_SEASON,
  F1_SERIES,
} from '../canonical/series-capabilities';
import type { CoverageEntry } from '../common/http/api-envelope';
import { notFound, serviceUnavailable } from '../common/http/api-errors';
import {
  candidateYearsForInterval,
  coreYearsForInterval,
} from '../common/time/local-date-interval';
import type { LocalDateInterval } from '../common/time/local-date-interval';
import { isUpstreamError } from '../common/upstream/upstream-error';
import { F1CalendarService } from './f1-calendar.service';

const SEASON_LEVEL_WARNING_PREFIXES = [
  'identity_',
  'openf1_enrichment_unavailable',
  'stale_data',
  'missing_data',
];

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

@Injectable()
export class F1CalendarSource implements SeriesCalendarSource {
  readonly seriesId = F1_SERIES.id;

  constructor(private readonly calendars: F1CalendarService) {}

  async collectInterval(
    interval: LocalDateInterval,
  ): Promise<IntervalCollection> {
    const coreYears = coreYearsForInterval(interval);
    const coreSet = new Set(coreYears);
    const candidates = candidateYearsForInterval(interval).filter((year) =>
      this.calendars.isSeasonInRange(year),
    );
    const reasons: string[] = [];

    for (const year of coreYears) {
      if (year > this.calendars.currentYear() + 1) {
        reasons.push(`F1 ${year} calendar is not published yet`);
      }
    }

    const settled = await Promise.allSettled(
      candidates.map((year) => this.calendars.getSeasonCalendar(year)),
    );
    const loaded: SeasonCalendar[] = [];
    const failures: Array<{ year: number; error: Error }> = [];
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') loaded.push(result.value);
      else
        failures.push({
          year: candidates[index],
          error: asError(result.reason),
        });
    });

    const unexpected = failures.find(
      (failure) => !isUpstreamError(failure.error),
    );
    if (unexpected) throw unexpected.error;

    const coreInRange = coreYears.filter((year) =>
      this.calendars.isSeasonInRange(year),
    );
    const coreFailures = failures.filter((failure) =>
      coreSet.has(failure.year),
    );
    if (coreInRange.length > 0 && coreFailures.length === coreInRange.length) {
      throw coreFailures[0].error;
    }
    for (const failure of failures) {
      const kind = isUpstreamError(failure.error)
        ? failure.error.kind
        : 'error';
      reasons.push(`F1 ${failure.year} calendar unavailable (${kind})`);
    }

    let coreWithData = 0;
    const warnings: string[] = [];
    const rounds: IntervalCollection['rounds'] = [];

    for (const calendar of loaded) {
      if (coreSet.has(calendar.season)) {
        if (calendar.calendarEmpty) {
          reasons.push(
            `Provider has no published F1 ${calendar.season} calendar`,
          );
        } else {
          coreWithData++;
        }
        reasons.push(...calendarDegradationReasons(calendar));
      }
      warnings.push(
        ...calendar.warnings.filter((warning) =>
          SEASON_LEVEL_WARNING_PREFIXES.some((prefix) =>
            warning.startsWith(prefix),
          ),
        ),
      );
      for (const round of calendar.rounds) {
        const sessions = selectSessionsForInterval(round, interval);
        if (sessions.length === 0) continue;
        rounds.push({ round, sessions });
        warnings.push(...round.warnings);
      }
    }

    let availability: Availability;
    if (coreYears.every((year) => year < F1_FIRST_CHAMPIONSHIP_SEASON)) {
      availability = 'not_applicable';
      reasons.push(
        'Interval is before the first F1 World Championship season (1950)',
      );
    } else if (coreWithData === 0) {
      availability = 'unknown';
    } else if (reasons.length > 0) {
      availability = 'partial';
    } else {
      availability = 'available';
    }

    const coverage: CoverageEntry = { seriesId: this.seriesId, availability };
    if (reasons.length > 0) coverage.reason = [...new Set(reasons)].join('; ');

    return {
      rounds,
      coverage,
      sources: loaded.flatMap((calendar) => calendar.sources),
      warnings,
      retrievedAt: loaded.map((calendar) => calendar.retrievedAt),
    };
  }

  async resolveRound(id: string): Promise<ResolvedRound | null> {
    const legacy = parseLegacyOpenF1Alias(id);
    if (legacy?.kind === 'openf1_session') {
      throw notFound(`"${id}" is a Session alias; use /api/v1/sessions/${id}.`);
    }
    if (legacy?.kind === 'openf1_meeting') {
      const lookup = await this.calendars.findRoundByOpenF1MeetingKey(
        legacy.meetingKey,
      );
      if (lookup.status === 'unresolvable') {
        throw serviceUnavailable(
          'Legacy Round alias cannot be resolved right now.',
          {
            availability: 'upstream_error',
            sources: [{ provider: 'openf1', capability: 'session_schedule' }],
          },
        );
      }
      if (lookup.status === 'not_found') return null;
      return this.resolved(lookup.calendar, lookup.round, [
        `Resolved legacy alias "${id}" to "${lookup.round.id}"`,
      ]);
    }

    const parsed = parseRoundId(id);
    const season = parsed
      ? this.parseSeason(parsed.seriesId, parsed.seasonKey)
      : null;
    if (!parsed || season === null) return null;

    const calendar = await this.calendars.getSeasonCalendar(season);
    const round = this.findRound(calendar, parsed.roundSlug);
    if (!round) return null;
    return this.resolved(
      calendar,
      round,
      round.id === id ? [] : [`Resolved alias "${id}" to "${round.id}"`],
    );
  }

  async resolveSession(id: string): Promise<ResolvedSession | null> {
    const legacy = parseLegacyOpenF1Alias(id);
    if (legacy?.kind === 'openf1_meeting') {
      throw notFound(`"${id}" is a Round alias; use /api/v1/rounds/${id}.`);
    }
    if (legacy?.kind === 'openf1_session') {
      const lookup = await this.calendars.findSessionByOpenF1SessionKey(
        legacy.sessionKey,
      );
      if (lookup.status === 'unresolvable') {
        throw serviceUnavailable(
          'Legacy Session alias cannot be resolved right now.',
          {
            availability: 'upstream_error',
            sources: [{ provider: 'openf1', capability: 'session_schedule' }],
          },
        );
      }
      if (lookup.status === 'not_found') return null;
      return {
        ...this.resolved(lookup.calendar, lookup.round, [
          `Resolved legacy alias "${id}" to "${lookup.session.id}"`,
        ]),
        session: lookup.session,
        sources: lookup.session.sources,
      };
    }

    const parsed = parseSessionId(id);
    const season = parsed
      ? this.parseSeason(parsed.seriesId, parsed.seasonKey)
      : null;
    if (!parsed || season === null) return null;

    const calendar = await this.calendars.getSeasonCalendar(season);
    const round = this.findRound(calendar, parsed.roundSlug);
    const session = round?.sessions.find(
      (item) => item.kind === parsed.sessionToken,
    );
    if (!round || !session) return null;
    return {
      ...this.resolved(
        calendar,
        round,
        session.id === id ? [] : [`Resolved alias "${id}" to "${session.id}"`],
      ),
      session,
      sources: session.sources,
    };
  }

  private parseSeason(seriesId: string, seasonKey: string): number | null {
    if (seriesId !== this.seriesId || !/^\d{4}$/.test(seasonKey)) return null;
    const season = Number(seasonKey);
    return this.calendars.isSeasonInRange(season) ? season : null;
  }

  private findRound(
    calendar: SeasonCalendar,
    slug: string,
  ): CanonicalRound | undefined {
    return calendar.rounds.find(
      (item) => item.slug === slug || item.aliasSlugs.includes(slug),
    );
  }

  private resolved(
    calendar: SeasonCalendar,
    round: CanonicalRound,
    extraWarnings: string[],
  ): ResolvedRound {
    return {
      round,
      retrievedAt: calendar.retrievedAt,
      availability: calendarAvailability(calendar),
      sources: round.sources,
      warnings: [
        ...extraWarnings,
        ...round.warnings,
        ...calendarDegradationReasons(calendar),
      ],
    };
  }
}
