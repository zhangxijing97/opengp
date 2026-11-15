import type { ClassificationRow, ResultGap, ResultSet } from '../api-v1/types';

// The result table of a session page: what each column of each row says. The component only draws it. Ranks are
// the published ones: a disqualified or retired entry has no position and shows DSQ, DNF, DNS or NC instead,
// never a number taken from the order of the list.

export type ResultTableKind = 'race' | 'qualifying' | 'practice';

export interface ResultTableRowVM {
  key: string;
  /** "1", "2", ... or DSQ, DNF, DNS, DNQ, NC. */
  position: string;
  driver: string;
  team: string;
  /** One text per column after the team, in the order of `headers`. */
  cells: string[];
}

export interface ResultTableVM {
  kind: ResultTableKind;
  /** Column titles, after Pos, Driver and Team. */
  headers: string[];
  rows: ResultTableRowVM[];
}

const NONE = '–';

/** 71622 gives "1:11.622"; 5455026 gives "1:30:55.026"; 31504 gives "31.504". */
export function formatLapMs(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return NONE;
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(3).padStart(6, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  if (minutes > 0) return `${minutes}:${seconds}`;
  return seconds.replace(/^0(?=\d)/, '');
}

export function formatGap(gap: ResultGap | null): string {
  if (!gap) return NONE;
  if (gap.kind === 'time_ms' && typeof gap.value === 'number') return `+${(gap.value / 1000).toFixed(3)}s`;
  if (gap.kind === 'laps') return `+${gap.value} ${Number(gap.value) === 1 ? 'lap' : 'laps'}`;
  return String(gap.value);
}

/** The position cell: the published rank, or what happened to the entry. */
export function positionText(row: ClassificationRow): string {
  if (row.classificationStatus === 'classified' && row.position !== null) return String(row.position);
  switch (row.classificationStatus) {
    case 'dsq':
      return 'DSQ';
    case 'dns':
      return 'DNS';
    case 'dnq':
      return 'DNQ';
    case 'not_classified':
      return row.finishStatus === 'dnf' ? 'DNF' : 'NC';
    default:
      // Not classified and nothing known about why: keep the provider's text, never a made-up rank.
      return row.positionText ?? NONE;
  }
}

function kindOf(set: ResultSet): ResultTableKind {
  if (set.kind === 'race' || set.kind === 'sprint') return 'race';
  if (set.kind === 'qualifying' || set.kind === 'sprint_qualifying') return 'qualifying';
  return 'practice';
}

function phase(row: ClassificationRow, which: 'Q1' | 'Q2' | 'Q3'): string {
  return formatLapMs(row.qualifyingPhases?.find((item) => item.phase === which)?.timeMs ?? null);
}

export function buildResultTable(set: ResultSet): ResultTableVM {
  const kind = kindOf(set);
  const headers =
    kind === 'race'
      ? ['Time / gap', 'Laps', 'Pts']
      : kind === 'qualifying'
        ? ['Q1', 'Q2', 'Q3']
        : ['Best lap', 'Gap', 'Laps'];
  const rows = set.classification.map((row, index): ResultTableRowVM => {
    const laps = row.laps !== null ? String(row.laps) : NONE;
    let cells: string[];
    if (kind === 'race') {
      // The winner shows the race time, the others the gap to the winner.
      const timeOrGap = row.position === 1 && row.elapsedMs !== null ? formatLapMs(row.elapsedMs) : formatGap(row.gap);
      cells = [timeOrGap, laps, row.points ?? NONE];
    } else if (kind === 'qualifying') {
      cells = [phase(row, 'Q1'), phase(row, 'Q2'), phase(row, 'Q3')];
    } else {
      cells = [formatLapMs(row.bestLapMs), formatGap(row.gap), laps];
    }
    return {
      key: `${row.id}:${index}`,
      position: positionText(row),
      driver: row.driver?.displayName ?? NONE,
      team: row.team?.name ?? NONE,
      cells,
    };
  });
  return { kind, headers, rows };
}
