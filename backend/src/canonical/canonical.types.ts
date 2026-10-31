// Canonical (provider-independent) vocabulary shared by the v1 API. These
// are in-memory projections of the logical model in docs/data-model.md, not
// database tables. Enum values follow OpenGP_HTTP_API_Contract_v1_Proposed.md.

export type Availability =
  | 'available'
  | 'partial'
  | 'not_published'
  | 'not_applicable'
  | 'unsupported'
  | 'access_restricted'
  | 'unknown'
  | 'upstream_error';

export type Lifecycle =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'unknown';

export type LifecycleBasis = 'provider' | 'time_inferred' | 'unknown';

export type PublicationStatus = 'provisional' | 'final_verified' | 'unknown';

export type SchedulePrecision = 'instant' | 'date' | 'unknown';

export type SessionType =
  | 'practice'
  | 'qualifying'
  | 'sprint_qualifying'
  | 'sprint'
  | 'race'
  | 'warmup'
  | 'test'
  | 'stage'
  | 'heat'
  | 'other';

export type RoundStatus =
  | 'scheduled'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'unknown';

export type ProviderName = 'jolpica' | 'openf1';

export interface SourceRef {
  /** Provider name; F1 v1 uses ProviderName values. */
  provider: string;
  capability: string;
}

export interface CanonicalSession {
  id: string;
  roundId: string;
  /** Series-specific normalized token, e.g. "fp1", "sprint_qualifying". */
  kind: string;
  type: SessionType;
  name: string;
  sequence: number | null;
  /** Tie-break order inside a Round when start times are equal or missing. */
  order: number;
  scheduledStartAt: string | null;
  /** Source-local date; only set when the start instant is unknown. */
  scheduledDate: string | null;
  schedulePrecision: SchedulePrecision;
  /** Planned end from the provider schedule; never an actual end time. */
  scheduledEndAt: string | null;
  /** Explicit provider cancellation marker; null when no provider says so. */
  cancelled: boolean | null;
  /** First season for which the result provider claims coverage. */
  resultCoverageFromSeason: number | null;
  external: {
    openf1SessionKey: number | null;
  };
  sources: SourceRef[];
}

export interface CanonicalRound {
  id: string;
  seasonId: string;
  seriesId: string;
  seriesName: string;
  season: number;
  slug: string;
  name: string;
  roundNumber: number | null;
  circuit: { id: string; name: string } | null;
  locationLabel: string | null;
  /** Earliest known scheduled session start. */
  startsAt: string | null;
  /** Latest known *planned* session end (OpenF1 schedule); null if unknown. */
  endsAt: string | null;
  sessions: CanonicalSession[];
  /** Additional slugs (same season) that resolve to this Round. */
  aliasSlugs: string[];
  external: {
    jolpica: { season: number; round: number; circuitId: string } | null;
    openf1MeetingKey: number | null;
  };
  sources: SourceRef[];
  warnings: string[];
}

/** Freshness of one upstream input used to build a calendar. */
export interface SourceFreshness {
  provider: string;
  capability: string;
  retrievedAt: string | null;
  /** fresh: within TTL; stale: refresh failed, older data served; missing: no data. */
  status: 'fresh' | 'stale' | 'missing';
  note?: string;
}

export interface EnrichmentStatus {
  availability: Availability;
  reason?: string;
}

export interface SeasonCalendar {
  seriesId: string;
  seasonId: string;
  season: number;
  rounds: CanonicalRound[];
  /** True when the primary provider returned no Rounds for the season. */
  calendarEmpty: boolean;
  enrichment: EnrichmentStatus;
  freshness: SourceFreshness[];
  sources: SourceRef[];
  warnings: string[];
  retrievedAt: string;
}
