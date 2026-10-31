// Deterministic, source-independent OpenGP identifiers.
//   Season  : f1:2025
//   Round   : f1:2025:china
//   Session : f1:2025:china:fp1
//   Circuit : f1:circuit:shanghai
// IDs are opaque to clients. Provider keys are never used as a whole ID;
// legacy OpenF1 IDs are only accepted as aliases.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SERIES_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEASON_KEY_PATTERN = /^\d{4}(?:-\d{2})?$/;
const SESSION_TOKEN_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const LEGACY_SESSION_PATTERN = /^openf1-session-(\d{1,9})$/;
const LEGACY_MEETING_PATTERN = /^openf1-(\d{1,9})$/;

export interface ParsedSeasonId {
  seriesId: string;
  seasonKey: string;
}

export interface ParsedRoundId extends ParsedSeasonId {
  roundSlug: string;
}

export interface ParsedSessionId extends ParsedRoundId {
  sessionToken: string;
  roundId: string;
}

export type LegacyOpenF1Alias =
  | { kind: 'openf1_meeting'; meetingKey: number }
  | { kind: 'openf1_session'; sessionKey: number };

/** ASCII kebab-case slug: "São Paulo Grand Prix" -> "sao-paulo-grand-prix". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function buildSeasonId(seriesId: string, seasonKey: string): string {
  return `${seriesId}:${seasonKey}`;
}

export function buildRoundId(
  seriesId: string,
  seasonKey: string,
  roundSlug: string,
): string {
  if (!isValidSlug(roundSlug)) {
    throw new RangeError(`Invalid round slug "${roundSlug}"`);
  }
  return `${seriesId}:${seasonKey}:${roundSlug}`;
}

export function buildSessionId(roundId: string, sessionToken: string): string {
  if (!SESSION_TOKEN_PATTERN.test(sessionToken)) {
    throw new RangeError(`Invalid session token "${sessionToken}"`);
  }
  return `${roundId}:${sessionToken}`;
}

export function buildCircuitId(
  seriesId: string,
  providerCircuitId: string,
): string {
  return `${seriesId}:circuit:${slugify(providerCircuitId)}`;
}

export function parseSeasonId(id: string): ParsedSeasonId | null {
  const parts = id.split(':');
  if (parts.length !== 2) return null;
  const [seriesId, seasonKey] = parts;
  if (!SERIES_PATTERN.test(seriesId) || !SEASON_KEY_PATTERN.test(seasonKey)) {
    return null;
  }
  return { seriesId, seasonKey };
}

export function parseRoundId(id: string): ParsedRoundId | null {
  const parts = id.split(':');
  if (parts.length !== 3) return null;
  const [seriesId, seasonKey, roundSlug] = parts;
  if (
    !SERIES_PATTERN.test(seriesId) ||
    !SEASON_KEY_PATTERN.test(seasonKey) ||
    !SLUG_PATTERN.test(roundSlug)
  ) {
    return null;
  }
  return { seriesId, seasonKey, roundSlug };
}

export function parseSessionId(id: string): ParsedSessionId | null {
  const parts = id.split(':');
  if (parts.length !== 4) return null;
  const round = parseRoundId(parts.slice(0, 3).join(':'));
  if (!round || !SESSION_TOKEN_PATTERN.test(parts[3])) return null;
  return {
    ...round,
    sessionToken: parts[3],
    roundId: parts.slice(0, 3).join(':'),
  };
}

export function parseLegacyOpenF1Alias(id: string): LegacyOpenF1Alias | null {
  const session = LEGACY_SESSION_PATTERN.exec(id);
  if (session)
    return { kind: 'openf1_session', sessionKey: Number(session[1]) };
  const meeting = LEGACY_MEETING_PATTERN.exec(id);
  if (meeting)
    return { kind: 'openf1_meeting', meetingKey: Number(meeting[1]) };
  return null;
}

export function legacyOpenF1SessionAlias(sessionKey: number): string {
  return `openf1-session-${sessionKey}`;
}

export function legacyOpenF1MeetingAlias(meetingKey: number): string {
  return `openf1-${meetingKey}`;
}
