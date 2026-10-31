// Normalized F1 session kinds and the reviewed mappings from each provider's
// vocabulary. OpenF1 needs BOTH session_name and session_type: a Sprint has
// session_type "Race" and Sprint Qualifying has session_type "Qualifying".

import type { SessionType } from '../canonical/canonical.types';
import type { V1Capability } from '../canonical/series-capabilities';
import type { JolpicaScheduleField } from '../data-providers/jolpica/jolpica.types';

export type F1SessionKind =
  | 'fp1'
  | 'fp2'
  | 'fp3'
  | 'sprint_qualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

export const F1_SESSION_KINDS: readonly F1SessionKind[] = [
  'fp1',
  'fp2',
  'fp3',
  'sprint_qualifying',
  'sprint',
  'qualifying',
  'race',
];

export interface F1SessionKindInfo {
  type: SessionType;
  defaultName: string;
  /** Practice number only; never a result rank. */
  sequence: number | null;
  order: number;
  resultCapability: V1Capability;
}

export const F1_SESSION_KIND_INFO: Readonly<
  Record<F1SessionKind, F1SessionKindInfo>
> = {
  fp1: {
    type: 'practice',
    defaultName: 'Practice 1',
    sequence: 1,
    order: 1,
    resultCapability: 'practice_result',
  },
  fp2: {
    type: 'practice',
    defaultName: 'Practice 2',
    sequence: 2,
    order: 2,
    resultCapability: 'practice_result',
  },
  fp3: {
    type: 'practice',
    defaultName: 'Practice 3',
    sequence: 3,
    order: 3,
    resultCapability: 'practice_result',
  },
  sprint_qualifying: {
    type: 'sprint_qualifying',
    defaultName: 'Sprint Qualifying',
    sequence: null,
    order: 4,
    resultCapability: 'sprint_qualifying_result',
  },
  sprint: {
    type: 'sprint',
    defaultName: 'Sprint',
    sequence: null,
    order: 5,
    resultCapability: 'sprint_result',
  },
  qualifying: {
    type: 'qualifying',
    defaultName: 'Qualifying',
    sequence: null,
    order: 6,
    resultCapability: 'qualifying_result',
  },
  race: {
    type: 'race',
    defaultName: 'Race',
    sequence: null,
    order: 7,
    resultCapability: 'race_result',
  },
};

export function isF1SessionKind(value: string): value is F1SessionKind {
  return (F1_SESSION_KINDS as readonly string[]).includes(value);
}

/** Season-aware display name used when no provider name is available. */
export function f1SessionDefaultName(
  kind: F1SessionKind,
  season: number,
): string {
  if (kind === 'sprint_qualifying' && season === 2023) return 'Sprint Shootout';
  return F1_SESSION_KIND_INFO[kind].defaultName;
}

/** Jolpica (Ergast-compatible) schedule object names -> kind. Race = top level. */
export const JOLPICA_SCHEDULE_FIELDS: ReadonlyArray<{
  field: JolpicaScheduleField;
  kind: F1SessionKind;
}> = [
  { field: 'FirstPractice', kind: 'fp1' },
  { field: 'SecondPractice', kind: 'fp2' },
  { field: 'ThirdPractice', kind: 'fp3' },
  { field: 'SprintQualifying', kind: 'sprint_qualifying' },
  { field: 'SprintShootout', kind: 'sprint_qualifying' },
  { field: 'Sprint', kind: 'sprint' },
  { field: 'Qualifying', kind: 'qualifying' },
];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Maps an OpenF1 session to a kind, or null for testing days and unknown
 * names. Exact names only: no fuzzy matching.
 */
export function mapOpenF1SessionKind(
  sessionName: string,
  sessionType: string,
): F1SessionKind | null {
  const name = normalize(sessionName);
  const type = normalize(sessionType);

  switch (name) {
    case 'practice 1':
      return type === 'practice' ? 'fp1' : null;
    case 'practice 2':
      return type === 'practice' ? 'fp2' : null;
    case 'practice 3':
      return type === 'practice' ? 'fp3' : null;
    case 'sprint qualifying':
    case 'sprint shootout':
      return type === 'qualifying' ? 'sprint_qualifying' : null;
    case 'sprint':
      return type === 'race' ? 'sprint' : null;
    case 'qualifying':
      return type === 'qualifying' ? 'qualifying' : null;
    case 'race':
      return type === 'race' ? 'race' : null;
    default:
      return null;
  }
}
