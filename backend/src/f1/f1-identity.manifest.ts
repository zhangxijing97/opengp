// Reviewed identity manifest for F1 canonical IDs. Changes here change public
// IDs: review them like an API change and add a test. Entries are evidence-
// backed; nothing is inferred from names or numbers alone at runtime.

/**
 * Race-name slug exceptions, keyed by slugify(raceName). Any race not listed
 * uses slugify(raceName) with the trailing "-grand-prix" removed.
 */
export const F1_RACE_NAME_SLUGS: Readonly<Record<string, string>> = {
  'abu-dhabi-grand-prix': 'abu-dhabi',
  'argentine-grand-prix': 'argentina',
  'australian-grand-prix': 'australia',
  'austrian-grand-prix': 'austria',
  'belgian-grand-prix': 'belgium',
  'brazilian-grand-prix': 'brazil',
  'british-grand-prix': 'great-britain',
  'canadian-grand-prix': 'canada',
  'chinese-grand-prix': 'china',
  'dutch-grand-prix': 'netherlands',
  'european-grand-prix': 'europe',
  'french-grand-prix': 'france',
  'german-grand-prix': 'germany',
  'hungarian-grand-prix': 'hungary',
  'indian-grand-prix': 'india',
  'italian-grand-prix': 'italy',
  'japanese-grand-prix': 'japan',
  'korean-grand-prix': 'korea',
  'malaysian-grand-prix': 'malaysia',
  'mexican-grand-prix': 'mexico',
  'moroccan-grand-prix': 'morocco',
  'portuguese-grand-prix': 'portugal',
  'russian-grand-prix': 'russia',
  'saudi-arabian-grand-prix': 'saudi-arabia',
  'south-african-grand-prix': 'south-africa',
  'spanish-grand-prix': 'spain',
  'styrian-grand-prix': 'styria',
  'swedish-grand-prix': 'sweden',
  'swiss-grand-prix': 'switzerland',
  'turkish-grand-prix': 'turkey',
  'tuscan-grand-prix': 'tuscany',
};

/**
 * Explicit identity exceptions (renames, rescheduled events, collisions).
 * Matching key: season + Jolpica circuitId + slugify(raceName). `aliases`
 * keep previously issued slugs resolvable after a rename.
 */
export interface F1RoundIdentityOverride {
  season: number;
  circuitId: string;
  raceName: string;
  slug: string;
  aliases: string[];
  note: string;
}

export const F1_ROUND_IDENTITY_OVERRIDES: readonly F1RoundIdentityOverride[] =
  [];

/** Verified Jolpica Round <-> OpenF1 meeting pairs (strongest evidence). */
export interface F1VerifiedMeetingPair {
  season: number;
  circuitId: string;
  raceName: string;
  jolpicaRound: number;
  openf1MeetingKey: number;
  evidence: string;
}

export const F1_VERIFIED_MEETING_PAIRS: readonly F1VerifiedMeetingPair[] = [
  {
    season: 2025,
    circuitId: 'shanghai',
    raceName: 'Chinese Grand Prix',
    jolpicaRound: 2,
    openf1MeetingKey: 1255,
    evidence: 'W02-V, docs/f1-data-providers.md section 5.1',
  },
];

/** Verified Jolpica circuitId <-> OpenF1 circuit_key pairs. */
export interface F1VerifiedCircuitPair {
  jolpicaCircuitId: string;
  openf1CircuitKey: number;
  evidence: string;
}

export const F1_VERIFIED_CIRCUIT_PAIRS: readonly F1VerifiedCircuitPair[] = [
  {
    jolpicaCircuitId: 'shanghai',
    openf1CircuitKey: 49,
    evidence: 'W02-V, docs/f1-data-providers.md section 5.1',
  },
];

/**
 * Decision proposal DP-03: an OpenF1 Grand Prix meeting whose sessions are
 * ALL explicitly cancelled and which has no Jolpica Round (e.g. 2023 Imola)
 * is shown as a cancelled Round instead of disappearing. Set to false to keep
 * the calendar strictly Jolpica-anchored.
 */
export const INCLUDE_OPENF1_ONLY_CANCELLED_ROUNDS = true;

/** Maximum start-time difference treated as "the same scheduled session". */
export const SESSION_START_MATCH_TOLERANCE_MS = 60_000;

/** Window for circuit-crosswalk matching when no exact time anchor exists. */
export const CIRCUIT_MATCH_WINDOW_MS = 4 * 86_400_000;
