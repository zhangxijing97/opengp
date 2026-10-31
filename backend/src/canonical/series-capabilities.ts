// Which series the v1 API actually implements, and which provider owns each
// F1 capability. Legacy-only series stay on the six legacy routes; v1 does not
// advertise them as available.

import type { ProviderName } from './canonical.types';

export type V1Capability =
  | 'calendar'
  | 'session_schedule'
  | 'practice_result'
  | 'sprint_qualifying_result'
  | 'qualifying_result'
  | 'sprint_result'
  | 'race_result'
  | 'driver_standings'
  | 'team_standings';

export interface SeriesDefinition {
  id: string;
  name: string;
  category: string | null;
}

export interface CapabilityRoute {
  primary: ProviderName;
  supplements: ProviderName[];
  /** First season for which the primary provider claims coverage. */
  coverageFromSeason: number;
}

export const F1_SERIES: SeriesDefinition = {
  id: 'f1',
  name: 'Formula 1',
  category: 'Single-Seater',
};

/** Series validated for /api/v1. */
export const V1_IMPLEMENTED_SERIES: readonly SeriesDefinition[] = [F1_SERIES];

/** Series served only by legacy /events/* adapters (not validated for v1). */
export const LEGACY_ONLY_SERIES_IDS: readonly string[] = [
  'formula-e',
  'indycar',
  'indy-nxt',
  'motogp',
  'rally',
  'nascar-cup',
  'nascar-xfinity',
  'nascar-truck',
];

export const F1_FIRST_CHAMPIONSHIP_SEASON = 1950;
export const OPENF1_FIRST_PUBLIC_SEASON = 2023;

export const F1_CAPABILITY_ROUTES: Readonly<
  Record<V1Capability, CapabilityRoute>
> = {
  calendar: {
    primary: 'jolpica',
    supplements: ['openf1'],
    coverageFromSeason: 1950,
  },
  session_schedule: {
    primary: 'jolpica',
    supplements: ['openf1'],
    coverageFromSeason: 1950,
  },
  practice_result: {
    primary: 'openf1',
    supplements: [],
    coverageFromSeason: 2023,
  },
  sprint_qualifying_result: {
    primary: 'openf1',
    supplements: [],
    coverageFromSeason: 2023,
  },
  qualifying_result: {
    primary: 'jolpica',
    supplements: [],
    coverageFromSeason: 1950,
  },
  sprint_result: {
    primary: 'jolpica',
    supplements: [],
    coverageFromSeason: 2021,
  },
  race_result: {
    primary: 'jolpica',
    supplements: [],
    coverageFromSeason: 1950,
  },
  driver_standings: {
    primary: 'jolpica',
    supplements: [],
    coverageFromSeason: 1950,
  },
  team_standings: {
    primary: 'jolpica',
    supplements: [],
    coverageFromSeason: 1958,
  },
};

export type SeriesClassification = 'implemented' | 'legacy_only' | 'unknown';

export function classifySeriesId(seriesId: string): SeriesClassification {
  if (V1_IMPLEMENTED_SERIES.some((series) => series.id === seriesId)) {
    return 'implemented';
  }
  if (LEGACY_ONLY_SERIES_IDS.includes(seriesId)) return 'legacy_only';
  return 'unknown';
}

export function getImplementedSeries(
  seriesId: string,
): SeriesDefinition | null {
  return V1_IMPLEMENTED_SERIES.find((series) => series.id === seriesId) ?? null;
}
