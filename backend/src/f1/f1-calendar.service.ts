// F1 calendar data access. Each upstream input is cached as its own snapshot
// with an independent freshness policy, fetched in parallel, and rebuilt into
// a calendar only when an input actually changed:
//   Jolpica schedule  (required)   -> failure without usable data throws
//   OpenF1 sessions   (optional)   -> failure degrades to partial enrichment
//   OpenF1 meetings   (optional)   -> failure only loses meeting names
// When a refresh fails, the last good snapshot is served for a bounded time
// and reported as stale (decision proposal DP-06); a failure is never turned
// into an empty success.

import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  CanonicalRound,
  CanonicalSession,
  SeasonCalendar,
  SourceFreshness,
} from '../canonical/canonical.types';
import {
  F1_FIRST_CHAMPIONSHIP_SEASON,
  OPENF1_FIRST_PUBLIC_SEASON,
} from '../canonical/series-capabilities';
import { CLOCK } from '../common/clock';
import type { Clock } from '../common/clock';
import { SnapshotStore } from '../common/upstream/snapshot-store';
import type {
  SnapshotPolicy,
  SnapshotRead,
} from '../common/upstream/snapshot-store';
import { TtlCache } from '../common/upstream/ttl-cache';
import { isUpstreamError } from '../common/upstream/upstream-error';
import { JolpicaClient } from '../data-providers/jolpica/jolpica.client';
import type {
  JolpicaFetchResult,
  JolpicaRace,
  JolpicaSeason,
} from '../data-providers/jolpica/jolpica.types';
import { OpenF1ApiClient } from '../data-providers/openf1/openf1-api.client';
import type {
  OpenF1ApiMeeting,
  OpenF1ApiSession,
} from '../data-providers/openf1/openf1-api.types';
import { buildF1SeasonCalendar } from './f1-calendar.builder';
import type { OpenF1CalendarInput } from './f1-calendar.builder';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const F1_SNAPSHOT_POLICY = {
  scheduleFreshPastMs: DAY_MS,
  scheduleFreshCurrentMs: 30 * MINUTE_MS,
  scheduleMaxStalePastMs: 7 * DAY_MS,
  scheduleMaxStaleCurrentMs: DAY_MS,
  openf1SessionsFreshPastMs: DAY_MS,
  openf1SessionsFreshCurrentMs: 15 * MINUTE_MS,
  openf1SessionsMaxStaleMs: DAY_MS,
  openf1MeetingsFreshMs: 6 * HOUR_MS,
  openf1MeetingsMaxStaleMs: 7 * DAY_MS,
  seasonsFreshMs: DAY_MS,
  seasonsMaxStaleMs: 30 * DAY_MS,
  /** OpenF1 restricts anonymous access around live sessions (~session + 30 min). */
  accessRestrictedCooldownMs: 5 * MINUTE_MS,
  rateLimitedCooldownMs: MINUTE_MS,
  defaultCooldownMs: 30_000,
} as const;

export const ALIAS_FOUND_TTL_MS = DAY_MS;
export const ALIAS_NOT_FOUND_TTL_MS = 10 * MINUTE_MS;
const MAX_BUILT_CALENDARS = 40;

export type RoundLookup =
  | { status: 'found'; calendar: SeasonCalendar; round: CanonicalRound }
  | { status: 'not_found' }
  | { status: 'unresolvable'; reason: string };

export type SessionLookup =
  | {
      status: 'found';
      calendar: SeasonCalendar;
      round: CanonicalRound;
      session: CanonicalSession;
    }
  | { status: 'not_found' }
  | { status: 'unresolvable'; reason: string };

interface OpenF1Read {
  input: OpenF1CalendarInput;
  freshness: SourceFreshness[];
  key: string;
}

function cooldownFor(error: Error): number {
  if (!isUpstreamError(error)) return F1_SNAPSHOT_POLICY.defaultCooldownMs;
  if (error.kind === 'access_restricted') {
    return F1_SNAPSHOT_POLICY.accessRestrictedCooldownMs;
  }
  if (error.kind === 'rate_limited' || error.kind === 'local_quota') {
    const retryAfterMs = (error.details.retryAfterSeconds ?? 0) * 1000;
    return Math.max(retryAfterMs, F1_SNAPSHOT_POLICY.rateLimitedCooldownMs);
  }
  return F1_SNAPSHOT_POLICY.defaultCooldownMs;
}

function describeFailure(error: Error): string {
  return isUpstreamError(error)
    ? `${error.provider} ${error.kind}`
    : 'unexpected error';
}

function freshnessOf<T>(
  provider: string,
  capability: string,
  read: SnapshotRead<T>,
): SourceFreshness {
  const item: SourceFreshness = {
    provider,
    capability,
    retrievedAt: read.retrievedAt,
    status: read.stale ? 'stale' : 'fresh',
  };
  if (read.staleReason) item.note = read.staleReason;
  return item;
}

@Injectable()
export class F1CalendarService {
  private readonly logger = new Logger(F1CalendarService.name);
  private readonly schedules: SnapshotStore<JolpicaRace[]>;
  private readonly openf1Sessions: SnapshotStore<OpenF1ApiSession[]>;
  private readonly openf1Meetings: SnapshotStore<OpenF1ApiMeeting[]>;
  private readonly seasons: SnapshotStore<JolpicaSeason[]>;
  private readonly built = new Map<
    number,
    { key: string; calendar: SeasonCalendar }
  >();
  private readonly sessionAliasCache: TtlCache<OpenF1ApiSession | null>;
  private readonly meetingAliasCache: TtlCache<OpenF1ApiMeeting | null>;

  constructor(
    private readonly jolpica: JolpicaClient,
    private readonly openf1: OpenF1ApiClient,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.schedules = new SnapshotStore(MAX_BUILT_CALENDARS, clock);
    this.openf1Sessions = new SnapshotStore(10, clock);
    this.openf1Meetings = new SnapshotStore(10, clock);
    this.seasons = new SnapshotStore(1, clock);
    this.sessionAliasCache = new TtlCache(500, clock);
    this.meetingAliasCache = new TtlCache(200, clock);
  }

  currentYear(): number {
    return new Date(this.clock()).getUTCFullYear();
  }

  /** Seasons that can be requested from Jolpica (1950 .. next year). */
  isSeasonInRange(season: number): boolean {
    return (
      Number.isInteger(season) &&
      season >= F1_FIRST_CHAMPIONSHIP_SEASON &&
      season <= this.currentYear() + 1
    );
  }

  async getSeasonCalendar(season: number): Promise<SeasonCalendar> {
    const [schedule, openf1] = await Promise.all([
      this.readSchedule(season),
      this.readOpenF1(season),
    ]);

    const key = JSON.stringify([
      schedule.retrievedAt,
      schedule.stale,
      openf1.key,
    ]);
    const memo = this.built.get(season);
    if (memo && memo.key === key) return memo.calendar;

    const calendar = buildF1SeasonCalendar({
      season,
      jolpicaRaces: schedule.value,
      jolpicaRetrievedAt: schedule.retrievedAt,
      openf1: openf1.input,
      freshness: [
        freshnessOf('jolpica', 'calendar', schedule),
        ...openf1.freshness,
      ],
    });
    for (const warning of calendar.warnings) {
      if (warning.startsWith('identity_')) this.logger.warn(warning);
    }

    this.built.delete(season);
    if (this.built.size >= MAX_BUILT_CALENDARS) {
      const [oldest] = this.built.keys();
      if (oldest !== undefined) this.built.delete(oldest);
    }
    this.built.set(season, { key, calendar });
    return calendar;
  }

  async findRoundByOpenF1MeetingKey(meetingKey: number): Promise<RoundLookup> {
    for (const { calendar } of this.built.values()) {
      const round = calendar.rounds.find(
        (item) => item.external.openf1MeetingKey === meetingKey,
      );
      if (round) return { status: 'found', calendar, round };
    }

    const meeting = await this.lookupMeeting(meetingKey);
    if (!meeting || !this.isSeasonInRange(meeting.year))
      return { status: 'not_found' };

    const calendar = await this.getSeasonCalendar(meeting.year);
    const round = calendar.rounds.find(
      (item) => item.external.openf1MeetingKey === meetingKey,
    );
    if (round) return { status: 'found', calendar, round };
    if (calendar.enrichment.availability !== 'available') {
      return {
        status: 'unresolvable',
        reason: calendar.enrichment.reason ?? 'OpenF1 enrichment unavailable',
      };
    }
    return { status: 'not_found' };
  }

  async findSessionByOpenF1SessionKey(
    sessionKey: number,
  ): Promise<SessionLookup> {
    const cached = this.findSessionInBuilt(sessionKey);
    if (cached) return cached;

    const openf1Session = await this.lookupSession(sessionKey);
    if (!openf1Session || !this.isSeasonInRange(openf1Session.year)) {
      return { status: 'not_found' };
    }

    const calendar = await this.getSeasonCalendar(openf1Session.year);
    const found = this.findSessionInCalendar(calendar, sessionKey);
    if (found) return found;
    if (calendar.enrichment.availability !== 'available') {
      return {
        status: 'unresolvable',
        reason: calendar.enrichment.reason ?? 'OpenF1 enrichment unavailable',
      };
    }
    return { status: 'not_found' };
  }

  async getSeasons(): Promise<JolpicaFetchResult<JolpicaSeason>> {
    const read = await this.seasons.read(
      'all',
      async () => {
        const result = await this.jolpica.fetchSeasons();
        return { value: result.items, retrievedAt: result.retrievedAt };
      },
      {
        freshMs: F1_SNAPSHOT_POLICY.seasonsFreshMs,
        maxStaleMs: F1_SNAPSHOT_POLICY.seasonsMaxStaleMs,
        failureCooldownMs: cooldownFor,
        describeFailure,
      },
    );
    return { items: read.value, retrievedAt: read.retrievedAt };
  }

  private findSessionInBuilt(sessionKey: number): SessionLookup | null {
    for (const { calendar } of this.built.values()) {
      const found = this.findSessionInCalendar(calendar, sessionKey);
      if (found) return found;
    }
    return null;
  }

  private findSessionInCalendar(
    calendar: SeasonCalendar,
    sessionKey: number,
  ): SessionLookup | null {
    for (const round of calendar.rounds) {
      const session = round.sessions.find(
        (item) => item.external.openf1SessionKey === sessionKey,
      );
      if (session) return { status: 'found', calendar, round, session };
    }
    return null;
  }

  private schedulePolicy(season: number): SnapshotPolicy {
    const past = season < this.currentYear();
    return {
      freshMs: past
        ? F1_SNAPSHOT_POLICY.scheduleFreshPastMs
        : F1_SNAPSHOT_POLICY.scheduleFreshCurrentMs,
      maxStaleMs: past
        ? F1_SNAPSHOT_POLICY.scheduleMaxStalePastMs
        : F1_SNAPSHOT_POLICY.scheduleMaxStaleCurrentMs,
      failureCooldownMs: cooldownFor,
      describeFailure,
    };
  }

  private readSchedule(season: number): Promise<SnapshotRead<JolpicaRace[]>> {
    return this.schedules.read(
      String(season),
      async () => {
        const result = await this.jolpica.fetchSeasonSchedule(season);
        return { value: result.items, retrievedAt: result.retrievedAt };
      },
      this.schedulePolicy(season),
    );
  }

  private async readOpenF1(season: number): Promise<OpenF1Read> {
    if (season < OPENF1_FIRST_PUBLIC_SEASON) {
      return {
        input: {
          status: 'not_applicable',
          reason: `OpenF1 public coverage starts in ${OPENF1_FIRST_PUBLIC_SEASON}`,
        },
        freshness: [],
        key: 'not_applicable',
      };
    }

    const past = season < this.currentYear();
    const key = String(season);
    const [sessions, meetings] = await Promise.allSettled([
      this.openf1Sessions.read(
        key,
        async () => {
          const result = await this.openf1.fetchSessionsByYear(season);
          return { value: result.items, retrievedAt: result.retrievedAt };
        },
        {
          freshMs: past
            ? F1_SNAPSHOT_POLICY.openf1SessionsFreshPastMs
            : F1_SNAPSHOT_POLICY.openf1SessionsFreshCurrentMs,
          maxStaleMs: F1_SNAPSHOT_POLICY.openf1SessionsMaxStaleMs,
          failureCooldownMs: cooldownFor,
          describeFailure,
        },
      ),
      this.openf1Meetings.read(
        key,
        async () => {
          const result = await this.openf1.fetchMeetingsByYear(season);
          return { value: result.items, retrievedAt: result.retrievedAt };
        },
        {
          freshMs: F1_SNAPSHOT_POLICY.openf1MeetingsFreshMs,
          maxStaleMs: F1_SNAPSHOT_POLICY.openf1MeetingsMaxStaleMs,
          failureCooldownMs: cooldownFor,
          describeFailure,
        },
      ),
    ]);

    if (sessions.status === 'rejected') {
      const error: unknown = sessions.reason;
      if (!isUpstreamError(error)) throw error;
      this.logger.warn(
        `OpenF1 sessions unavailable for ${season}: kind=${error.kind}`,
      );
      const restricted = error.kind === 'access_restricted';
      return {
        input: {
          status: 'failed',
          availability: restricted ? 'access_restricted' : 'upstream_error',
          reason: restricted
            ? `OpenF1 restricted access (${season} session enrichment omitted)`
            : `OpenF1 unavailable: ${error.kind} (${season} session enrichment omitted)`,
        },
        freshness: [],
        key: `failed:${error.kind}`,
      };
    }

    const freshness = [
      freshnessOf('openf1', 'session_schedule', sessions.value),
    ];
    let meetingItems: OpenF1ApiMeeting[] = [];
    let retrievedAt = sessions.value.retrievedAt;
    let meetingsKey = 'missing';

    if (meetings.status === 'fulfilled') {
      meetingItems = meetings.value.value;
      meetingsKey = `${meetings.value.retrievedAt}|${meetings.value.stale}`;
      if (meetings.value.retrievedAt < retrievedAt)
        retrievedAt = meetings.value.retrievedAt;
      freshness.push(freshnessOf('openf1', 'meetings', meetings.value));
    } else {
      const error: unknown = meetings.reason;
      if (!isUpstreamError(error)) throw error;
      freshness.push({
        provider: 'openf1',
        capability: 'meetings',
        retrievedAt: null,
        status: 'missing',
        note: 'meeting names for OpenF1-only rounds may be missing',
      });
    }

    return {
      input: {
        status: 'ok',
        sessions: sessions.value.value,
        meetings: meetingItems,
        retrievedAt,
      },
      freshness,
      key: `${sessions.value.retrievedAt}|${sessions.value.stale}|${meetingsKey}`,
    };
  }

  private async lookupSession(
    sessionKey: number,
  ): Promise<OpenF1ApiSession | null> {
    const key = String(sessionKey);
    const cached = this.sessionAliasCache.get(key);
    if (cached) return cached.value;
    const session = await this.openf1.fetchSessionByKey(sessionKey);
    this.sessionAliasCache.set(
      key,
      session,
      session ? ALIAS_FOUND_TTL_MS : ALIAS_NOT_FOUND_TTL_MS,
    );
    return session;
  }

  private async lookupMeeting(
    meetingKey: number,
  ): Promise<OpenF1ApiMeeting | null> {
    const key = String(meetingKey);
    const cached = this.meetingAliasCache.get(key);
    if (cached) return cached.value;
    const meeting = await this.openf1.fetchMeetingByKey(meetingKey);
    this.meetingAliasCache.set(
      key,
      meeting,
      meeting ? ALIAS_FOUND_TTL_MS : ALIAS_NOT_FOUND_TTL_MS,
    );
    return meeting;
  }
}
