// Pure F1 season-calendar builder. Jolpica anchors Round identity and the
// published schedule; OpenF1 supplements planned end times, cancellation
// markers, session names and session keys ONLY for meetings matched by
// scoped evidence. Ambiguity is reported as a warning and never merged.

import type {
  Availability,
  CanonicalRound,
  CanonicalSession,
  SchedulePrecision,
  SeasonCalendar,
  SourceFreshness,
  SourceRef,
} from '../canonical/canonical.types';
import {
  buildCircuitId,
  buildRoundId,
  buildSeasonId,
  buildSessionId,
  slugify,
} from '../canonical/canonical-id';
import {
  F1_CAPABILITY_ROUTES,
  F1_SERIES,
} from '../canonical/series-capabilities';
import { parseIsoInstant, toIsoUtc } from '../common/time/time-zone';
import type { JolpicaRace } from '../data-providers/jolpica/jolpica.types';
import type {
  OpenF1ApiMeeting,
  OpenF1ApiSession,
} from '../data-providers/openf1/openf1-api.types';
import {
  CIRCUIT_MATCH_WINDOW_MS,
  F1_VERIFIED_CIRCUIT_PAIRS,
  F1_VERIFIED_MEETING_PAIRS,
  F1VerifiedCircuitPair,
  F1VerifiedMeetingPair,
  INCLUDE_OPENF1_ONLY_CANCELLED_ROUNDS,
  SESSION_START_MATCH_TOLERANCE_MS,
} from './f1-identity.manifest';
import { assignF1RoundSlugs, baseRoundSlug } from './f1-round-identity';
import {
  F1_SESSION_KIND_INFO,
  F1SessionKind,
  JOLPICA_SCHEDULE_FIELDS,
  f1SessionDefaultName,
  mapOpenF1SessionKind,
} from './f1-session-kind';

export type OpenF1CalendarInput =
  | {
      status: 'ok';
      sessions: OpenF1ApiSession[];
      meetings: OpenF1ApiMeeting[];
      retrievedAt: string;
    }
  | { status: 'not_applicable'; reason: string }
  | { status: 'failed'; availability: Availability; reason: string };

export interface F1CalendarManifest {
  meetingPairs: readonly F1VerifiedMeetingPair[];
  circuitPairs: readonly F1VerifiedCircuitPair[];
  includeOpenF1OnlyCancelledRounds: boolean;
}

export interface F1CalendarBuildInput {
  season: number;
  jolpicaRaces: JolpicaRace[];
  jolpicaRetrievedAt: string;
  openf1: OpenF1CalendarInput;
  /** Freshness of each upstream input (defaults to none reported). */
  freshness?: SourceFreshness[];
  manifest?: Partial<F1CalendarManifest>;
}

const JOLPICA_SCHEDULE: SourceRef = {
  provider: 'jolpica',
  capability: 'session_schedule',
};
const OPENF1_SCHEDULE: SourceRef = {
  provider: 'openf1',
  capability: 'session_schedule',
};
const JOLPICA_CALENDAR: SourceRef = {
  provider: 'jolpica',
  capability: 'calendar',
};

const JOLPICA_TIME_PATTERN =
  /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

interface DraftSession {
  kind: F1SessionKind;
  startMs: number | null;
  date: string | null;
  precision: SchedulePrecision;
  endMs: number | null;
  cancelled: boolean | null;
  providerName: string | null;
  openf1SessionKey: number | null;
  sources: SourceRef[];
}

interface DraftRound {
  slug: string;
  aliasSlugs: string[];
  name: string;
  roundNumber: number | null;
  jolpicaCircuitId: string | null;
  circuit: { id: string; name: string } | null;
  locationLabel: string | null;
  sessions: DraftSession[];
  openf1MeetingKey: number | null;
  sources: SourceRef[];
  warnings: string[];
}

interface BundleSession {
  session: OpenF1ApiSession;
  kind: F1SessionKind | null;
  startMs: number | null;
  endMs: number | null;
}

interface MeetingBundle {
  meetingKey: number;
  meeting: OpenF1ApiMeeting | null;
  sessions: BundleSession[];
  hasRace: boolean;
}

function parseOptionalInstant(value: string | null): number | null {
  return value ? parseIsoInstant(value) : null;
}

/** Jolpica date + optional time. Missing time keeps date-only precision. */
export function parseJolpicaSchedule(
  date: string,
  time: string | undefined,
): {
  startMs: number | null;
  date: string | null;
  precision: SchedulePrecision;
  warning?: string;
} {
  if (time === undefined || time.trim() === '') {
    return { startMs: null, date, precision: 'date' };
  }
  const match = JOLPICA_TIME_PATTERN.exec(time.trim());
  if (!match) {
    return {
      startMs: null,
      date,
      precision: 'date',
      warning: `unparseable Jolpica time "${time}" kept as date-only`,
    };
  }
  // Ergast-compatible times are documented as UTC; an explicit zone wins.
  const zone = match[4] ?? 'Z';
  const instant = parseIsoInstant(
    `${date}T${match[1]}:${match[2]}:${match[3] ?? '00'}${zone}`,
  );
  if (instant === null) {
    return {
      startMs: null,
      date,
      precision: 'date',
      warning: `invalid Jolpica instant "${date} ${time}" kept as date-only`,
    };
  }
  return { startMs: instant, date: null, precision: 'instant' };
}

function draftFromJolpicaRace(
  race: JolpicaRace,
  slug: string,
  aliasSlugs: string[],
): DraftRound {
  const warnings: string[] = [];
  const sessions: DraftSession[] = [];

  const addSession = (kind: F1SessionKind, date: string, time?: string) => {
    if (sessions.some((existing) => existing.kind === kind)) {
      warnings.push(
        `duplicate_schedule_kind: "${race.raceName}" lists ${kind} more than once; kept the first entry`,
      );
      return;
    }
    const parsed = parseJolpicaSchedule(date, time);
    if (parsed.warning)
      warnings.push(`${race.raceName} ${kind}: ${parsed.warning}`);
    sessions.push({
      kind,
      startMs: parsed.startMs,
      date: parsed.date,
      precision: parsed.precision,
      endMs: null,
      cancelled: null,
      providerName: null,
      openf1SessionKey: null,
      sources: [JOLPICA_SCHEDULE],
    });
  };

  for (const { field, kind } of JOLPICA_SCHEDULE_FIELDS) {
    const slot = race[field];
    if (slot) addSession(kind, slot.date, slot.time);
  }
  addSession('race', race.date, race.time);

  const location = race.Circuit.Location;
  const labelParts = [location?.locality, location?.country].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );

  return {
    slug,
    aliasSlugs,
    name: race.raceName,
    roundNumber: Number(race.round),
    jolpicaCircuitId: race.Circuit.circuitId,
    circuit: {
      id: buildCircuitId(F1_SERIES.id, race.Circuit.circuitId),
      name: race.Circuit.circuitName,
    },
    locationLabel: labelParts.length > 0 ? labelParts.join(', ') : null,
    sessions,
    openf1MeetingKey: null,
    sources: [JOLPICA_CALENDAR],
    warnings,
  };
}

function bundleOpenF1(
  season: number,
  sessions: OpenF1ApiSession[],
  meetings: OpenF1ApiMeeting[],
): Map<number, MeetingBundle> {
  const bundles = new Map<number, MeetingBundle>();
  const meetingsByKey = new Map(
    meetings.map((meeting) => [meeting.meeting_key, meeting]),
  );

  for (const session of sessions) {
    if (session.year !== season) continue;
    const bundle = bundles.get(session.meeting_key) ?? {
      meetingKey: session.meeting_key,
      meeting: meetingsByKey.get(session.meeting_key) ?? null,
      sessions: [],
      hasRace: false,
    };
    const kind = mapOpenF1SessionKind(
      session.session_name,
      session.session_type,
    );
    bundle.sessions.push({
      session,
      kind,
      startMs: parseOptionalInstant(session.date_start),
      endMs: parseOptionalInstant(session.date_end),
    });
    if (kind === 'race') bundle.hasRace = true;
    bundles.set(session.meeting_key, bundle);
  }
  return bundles;
}

function raceAnchorMs(round: DraftRound): number | null {
  const race = round.sessions.find((session) => session.kind === 'race');
  if (!race) return null;
  if (race.startMs !== null) return race.startMs;
  if (race.date) return Date.parse(`${race.date}T12:00:00Z`);
  return null;
}

function hasTimeAnchor(round: DraftRound, bundle: MeetingBundle): boolean {
  return round.sessions.some(
    (session) =>
      session.startMs !== null &&
      bundle.sessions.some(
        (candidate) =>
          candidate.kind === session.kind &&
          candidate.startMs !== null &&
          Math.abs(candidate.startMs - (session.startMs as number)) <=
            SESSION_START_MATCH_TOLERANCE_MS,
      ),
  );
}

function bundleCircuitKey(bundle: MeetingBundle): number | null {
  if (bundle.meeting?.circuit_key != null) return bundle.meeting.circuit_key;
  return (
    bundle.sessions.find((item) => item.session.circuit_key !== null)?.session
      .circuit_key ?? null
  );
}

function hasCircuitWindow(
  round: DraftRound,
  bundle: MeetingBundle,
  circuitPairs: readonly F1VerifiedCircuitPair[],
): boolean {
  if (!round.jolpicaCircuitId) return false;
  const pair = circuitPairs.find(
    (item) => item.jolpicaCircuitId === round.jolpicaCircuitId,
  );
  if (!pair || bundleCircuitKey(bundle) !== pair.openf1CircuitKey) return false;
  const roundRace = raceAnchorMs(round);
  const bundleRace = bundle.sessions.find(
    (item) => item.kind === 'race',
  )?.startMs;
  if (roundRace === null || bundleRace === undefined || bundleRace === null) {
    return false;
  }
  return Math.abs(roundRace - bundleRace) <= CIRCUIT_MATCH_WINDOW_MS;
}

function crosswalkMeetings(
  season: number,
  rounds: DraftRound[],
  bundles: Map<number, MeetingBundle>,
  manifest: F1CalendarManifest,
  warnings: string[],
): Map<number, number> {
  const roundToMeeting = new Map<number, number>();
  const claimedMeetings = new Set<number>();

  for (const pair of manifest.meetingPairs) {
    if (pair.season !== season) continue;
    const roundIndex = rounds.findIndex(
      (round) =>
        round.jolpicaCircuitId === pair.circuitId &&
        slugify(round.name) === slugify(pair.raceName),
    );
    const bundle = bundles.get(pair.openf1MeetingKey);
    if (roundIndex < 0 || !bundle) continue;
    if (
      roundToMeeting.has(roundIndex) ||
      claimedMeetings.has(bundle.meetingKey)
    ) {
      warnings.push(
        `identity_conflict: verified pair for meeting ${pair.openf1MeetingKey} conflicts with another verified pair; not merged`,
      );
      continue;
    }
    if (rounds[roundIndex].roundNumber !== pair.jolpicaRound) {
      rounds[roundIndex].warnings.push(
        `identity_review: verified pair recorded round ${pair.jolpicaRound}, Jolpica now reports round ${rounds[roundIndex].roundNumber}`,
      );
    }
    roundToMeeting.set(roundIndex, bundle.meetingKey);
    claimedMeetings.add(bundle.meetingKey);
  }

  const candidatesByMeeting = new Map<number, number[]>();
  const candidatesByRound = new Map<number, number[]>();
  for (const bundle of bundles.values()) {
    if (!bundle.hasRace || claimedMeetings.has(bundle.meetingKey)) continue;
    rounds.forEach((round, roundIndex) => {
      if (roundToMeeting.has(roundIndex)) return;
      if (
        hasTimeAnchor(round, bundle) ||
        hasCircuitWindow(round, bundle, manifest.circuitPairs)
      ) {
        candidatesByMeeting.set(bundle.meetingKey, [
          ...(candidatesByMeeting.get(bundle.meetingKey) ?? []),
          roundIndex,
        ]);
        candidatesByRound.set(roundIndex, [
          ...(candidatesByRound.get(roundIndex) ?? []),
          bundle.meetingKey,
        ]);
      }
    });
  }

  for (const [meetingKey, roundIndexes] of candidatesByMeeting) {
    const roundIndex = roundIndexes[0];
    const competing = candidatesByRound.get(roundIndex) ?? [];
    if (roundIndexes.length === 1 && competing.length === 1) {
      roundToMeeting.set(roundIndex, meetingKey);
      claimedMeetings.add(meetingKey);
    } else {
      warnings.push(
        `identity_ambiguous: OpenF1 meeting ${meetingKey} matches ${roundIndexes.length} round(s) and competes with ${competing.length} meeting(s); not merged`,
      );
    }
  }

  return roundToMeeting;
}

function attachOpenF1(draft: DraftSession, source: BundleSession): void {
  draft.openf1SessionKey = source.session.session_key;
  draft.endMs = source.endMs;
  draft.cancelled = source.session.is_cancelled;
  draft.providerName = source.session.session_name;
  if (draft.startMs === null && source.startMs !== null) {
    draft.startMs = source.startMs;
    draft.date = null;
    draft.precision = 'instant';
  }
  draft.sources = [...draft.sources, OPENF1_SCHEDULE];
}

function mergeMeetingIntoRound(round: DraftRound, bundle: MeetingBundle): void {
  round.openf1MeetingKey = bundle.meetingKey;
  round.sources = [...round.sources, OPENF1_SCHEDULE];
  const used = new Set<number>();
  const mappable = bundle.sessions.filter(
    (item): item is BundleSession & { kind: F1SessionKind } =>
      item.kind !== null,
  );

  // Pass 1: same kind.
  for (const draft of round.sessions) {
    const candidates = mappable.filter((item) => item.kind === draft.kind);
    if (candidates.length > 1) {
      round.warnings.push(
        `session_ambiguous: OpenF1 meeting ${bundle.meetingKey} has ${candidates.length} "${draft.kind}" sessions; not merged`,
      );
      candidates.forEach((item) => used.add(item.session.session_key));
      continue;
    }
    const match = candidates[0];
    if (!match) continue;
    if (
      draft.startMs !== null &&
      match.startMs !== null &&
      Math.abs(draft.startMs - match.startMs) > SESSION_START_MATCH_TOLERANCE_MS
    ) {
      round.warnings.push(
        `schedule_disagreement: ${draft.kind} start differs (jolpica ${toIsoUtc(draft.startMs)}, openf1 ${toIsoUtc(match.startMs)}); Jolpica start kept`,
      );
    }
    attachOpenF1(draft, match);
    used.add(match.session.session_key);
  }

  // Pass 2: same instant, different kind (e.g. a schedule slot labelled as
  // practice by one provider and as Sprint Shootout by the other). OpenF1
  // owns session identity/names, so its kind wins and a warning is kept.
  const jolpicaKinds = new Set(round.sessions.map((draft) => draft.kind));
  for (const draft of round.sessions) {
    if (draft.openf1SessionKey !== null || draft.startMs === null) continue;
    const sameInstant = mappable.filter(
      (item) =>
        !used.has(item.session.session_key) &&
        item.kind !== draft.kind &&
        !jolpicaKinds.has(item.kind) &&
        item.startMs !== null &&
        Math.abs(item.startMs - (draft.startMs as number)) <=
          SESSION_START_MATCH_TOLERANCE_MS,
    );
    if (sameInstant.length !== 1) continue;
    const match = sameInstant[0];
    round.warnings.push(
      `session_kind_conflict: slot at ${toIsoUtc(draft.startMs)} is "${draft.kind}" in Jolpica but "${match.session.session_name}" in OpenF1; OpenF1 kind "${match.kind}" used`,
    );
    jolpicaKinds.delete(draft.kind);
    draft.kind = match.kind;
    jolpicaKinds.add(match.kind);
    attachOpenF1(draft, match);
    used.add(match.session.session_key);
  }

  // Pass 3: sessions only OpenF1 lists for this verified meeting.
  for (const item of mappable) {
    if (used.has(item.session.session_key)) continue;
    if (round.sessions.some((draft) => draft.kind === item.kind)) {
      round.warnings.push(
        `session_duplicate: OpenF1 session ${item.session.session_key} duplicates "${item.kind}"; ignored`,
      );
      continue;
    }
    round.sessions.push({
      kind: item.kind,
      startMs: item.startMs,
      date: null,
      precision: item.startMs !== null ? 'instant' : 'unknown',
      endMs: item.endMs,
      cancelled: item.session.is_cancelled,
      providerName: item.session.session_name,
      openf1SessionKey: item.session.session_key,
      sources: [OPENF1_SCHEDULE],
    });
    round.warnings.push(
      `session_added_from_openf1: "${item.session.session_name}" is listed by OpenF1 but not by Jolpica`,
    );
    used.add(item.session.session_key);
  }
}

function draftFromCancelledMeeting(
  bundle: MeetingBundle,
  slug: string,
  circuitPairs: readonly F1VerifiedCircuitPair[],
): DraftRound {
  const circuitKey = bundleCircuitKey(bundle);
  const pair = circuitPairs.find(
    (item) => item.openf1CircuitKey === circuitKey,
  );
  const name = bundle.meeting?.meeting_name ?? '';
  const labelParts = [
    bundle.meeting?.location,
    bundle.meeting?.country_name,
  ].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  const sessions: DraftSession[] = [];
  for (const item of bundle.sessions) {
    if (
      item.kind === null ||
      sessions.some((draft) => draft.kind === item.kind)
    ) {
      continue;
    }
    sessions.push({
      kind: item.kind,
      startMs: item.startMs,
      date: null,
      precision: item.startMs !== null ? 'instant' : 'unknown',
      endMs: item.endMs,
      cancelled: true,
      providerName: item.session.session_name,
      openf1SessionKey: item.session.session_key,
      sources: [OPENF1_SCHEDULE],
    });
  }
  return {
    slug,
    aliasSlugs: [],
    name,
    roundNumber: null,
    jolpicaCircuitId: pair?.jolpicaCircuitId ?? null,
    circuit: pair
      ? {
          id: buildCircuitId(F1_SERIES.id, pair.jolpicaCircuitId),
          name: bundle.meeting?.circuit_short_name ?? pair.jolpicaCircuitId,
        }
      : null,
    locationLabel: labelParts.length > 0 ? labelParts.join(', ') : null,
    sessions,
    openf1MeetingKey: bundle.meetingKey,
    sources: [OPENF1_SCHEDULE],
    warnings: [
      'round_from_openf1_cancelled_meeting: not present in the Jolpica calendar; every OpenF1 session is marked cancelled',
    ],
  };
}

function sortKeyMs(session: DraftSession): number {
  if (session.startMs !== null) return session.startMs;
  if (session.date) return Date.parse(`${session.date}T23:59:59Z`);
  return Number.MAX_SAFE_INTEGER;
}

function finalizeRound(season: number, draft: DraftRound): CanonicalRound {
  const seasonKey = String(season);
  const roundId = buildRoundId(F1_SERIES.id, seasonKey, draft.slug);
  const ordered = [...draft.sessions].sort(
    (a, b) =>
      sortKeyMs(a) - sortKeyMs(b) ||
      F1_SESSION_KIND_INFO[a.kind].order - F1_SESSION_KIND_INFO[b.kind].order,
  );

  const sessions: CanonicalSession[] = ordered.map((draftSession) => {
    const info = F1_SESSION_KIND_INFO[draftSession.kind];
    return {
      id: buildSessionId(roundId, draftSession.kind),
      roundId,
      kind: draftSession.kind,
      type: info.type,
      name:
        draftSession.providerName ??
        f1SessionDefaultName(draftSession.kind, season),
      sequence: info.sequence,
      order: info.order,
      scheduledStartAt:
        draftSession.startMs !== null ? toIsoUtc(draftSession.startMs) : null,
      scheduledDate: draftSession.startMs === null ? draftSession.date : null,
      schedulePrecision: draftSession.precision,
      scheduledEndAt:
        draftSession.endMs !== null ? toIsoUtc(draftSession.endMs) : null,
      cancelled: draftSession.cancelled,
      resultCoverageFromSeason:
        F1_CAPABILITY_ROUTES[info.resultCapability].coverageFromSeason,
      external: { openf1SessionKey: draftSession.openf1SessionKey },
      sources: draftSession.sources,
    };
  });

  const starts = ordered
    .map((item) => item.startMs)
    .filter((value): value is number => value !== null);
  const ends = ordered
    .map((item) => item.endMs)
    .filter((value): value is number => value !== null);

  return {
    id: roundId,
    seasonId: buildSeasonId(F1_SERIES.id, seasonKey),
    seriesId: F1_SERIES.id,
    seriesName: F1_SERIES.name,
    season,
    slug: draft.slug,
    name: draft.name,
    roundNumber: draft.roundNumber,
    circuit: draft.circuit,
    locationLabel: draft.locationLabel,
    startsAt: starts.length > 0 ? toIsoUtc(Math.min(...starts)) : null,
    endsAt: ends.length > 0 ? toIsoUtc(Math.max(...ends)) : null,
    sessions,
    aliasSlugs: draft.aliasSlugs,
    external: {
      jolpica:
        draft.roundNumber !== null && draft.jolpicaCircuitId !== null
          ? {
              season,
              round: draft.roundNumber,
              circuitId: draft.jolpicaCircuitId,
            }
          : null,
      openf1MeetingKey: draft.openf1MeetingKey,
    },
    sources: draft.sources,
    warnings: draft.warnings,
  };
}

export function buildF1SeasonCalendar(
  input: F1CalendarBuildInput,
): SeasonCalendar {
  const manifest: F1CalendarManifest = {
    meetingPairs: input.manifest?.meetingPairs ?? F1_VERIFIED_MEETING_PAIRS,
    circuitPairs: input.manifest?.circuitPairs ?? F1_VERIFIED_CIRCUIT_PAIRS,
    includeOpenF1OnlyCancelledRounds:
      input.manifest?.includeOpenF1OnlyCancelledRounds ??
      INCLUDE_OPENF1_ONLY_CANCELLED_ROUNDS,
  };
  const { season } = input;
  const warnings: string[] = [];
  const freshness = input.freshness ?? [];
  for (const item of freshness) {
    if (item.status === 'fresh') continue;
    warnings.push(
      item.status === 'stale'
        ? `stale_data: ${item.provider} ${item.capability} from ${item.retrievedAt ?? 'unknown time'} is served because refresh failed${item.note ? ` (${item.note})` : ''}`
        : `missing_data: ${item.provider} ${item.capability} unavailable${item.note ? ` (${item.note})` : ''}`,
    );
  }

  const identity = assignF1RoundSlugs(
    season,
    input.jolpicaRaces.map((race) => ({
      round: Number(race.round),
      circuitId: race.Circuit.circuitId,
      raceName: race.raceName,
    })),
  );
  warnings.push(...identity.warnings);

  const drafts = input.jolpicaRaces.map((race, index) =>
    draftFromJolpicaRace(
      race,
      identity.assignments[index].slug,
      identity.assignments[index].aliasSlugs,
    ),
  );

  const sources: SourceRef[] = [JOLPICA_CALENDAR];
  let enrichment: SeasonCalendar['enrichment'];
  let retrievedAt = input.jolpicaRetrievedAt;

  if (input.openf1.status === 'ok') {
    sources.push(OPENF1_SCHEDULE);
    enrichment = { availability: 'available' };
    if (input.openf1.retrievedAt < retrievedAt)
      retrievedAt = input.openf1.retrievedAt;

    const bundles = bundleOpenF1(
      season,
      input.openf1.sessions,
      input.openf1.meetings,
    );
    const matches = crosswalkMeetings(
      season,
      drafts,
      bundles,
      manifest,
      warnings,
    );
    for (const [roundIndex, meetingKey] of matches) {
      const bundle = bundles.get(meetingKey);
      if (bundle) mergeMeetingIntoRound(drafts[roundIndex], bundle);
    }

    const matchedMeetings = new Set(matches.values());
    const takenSlugs = new Set(
      drafts.flatMap((draft) => [draft.slug, ...draft.aliasSlugs]),
    );
    for (const bundle of bundles.values()) {
      if (!bundle.hasRace || matchedMeetings.has(bundle.meetingKey)) continue;
      const allCancelled =
        bundle.sessions.length > 0 &&
        bundle.sessions.every((item) => item.session.is_cancelled === true);
      const name = bundle.meeting?.meeting_name ?? null;
      if (allCancelled && manifest.includeOpenF1OnlyCancelledRounds && name) {
        const slug = baseRoundSlug(name);
        if (slug.length === 0 || takenSlugs.has(slug)) {
          warnings.push(
            `identity_ambiguous: cancelled OpenF1 meeting ${bundle.meetingKey} "${name}" collides with an existing round slug; not shown`,
          );
          continue;
        }
        takenSlugs.add(slug);
        drafts.push(
          draftFromCancelledMeeting(bundle, slug, manifest.circuitPairs),
        );
        continue;
      }
      warnings.push(
        `openf1_meeting_unmatched: OpenF1 meeting ${bundle.meetingKey}${name ? ` "${name}"` : ''} has no proven Jolpica round; its sessions were not merged`,
      );
    }
  } else if (input.openf1.status === 'not_applicable') {
    enrichment = {
      availability: 'not_applicable',
      reason: input.openf1.reason,
    };
  } else {
    enrichment = {
      availability: input.openf1.availability,
      reason: input.openf1.reason,
    };
    warnings.push(`openf1_enrichment_unavailable: ${input.openf1.reason}`);
  }

  const rounds = drafts
    .map((draft) => finalizeRound(season, draft))
    .sort((a, b) => {
      const aNumber = a.roundNumber ?? Number.MAX_SAFE_INTEGER;
      const bNumber = b.roundNumber ?? Number.MAX_SAFE_INTEGER;
      if (aNumber !== bNumber) return aNumber - bNumber;
      return (a.startsAt ?? '').localeCompare(b.startsAt ?? '');
    });

  return {
    seriesId: F1_SERIES.id,
    seasonId: buildSeasonId(F1_SERIES.id, String(season)),
    season,
    rounds,
    calendarEmpty: input.jolpicaRaces.length === 0,
    enrichment,
    freshness,
    sources,
    warnings,
    retrievedAt,
  };
}
