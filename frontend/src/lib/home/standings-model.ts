import type { StandingRow, StandingsData } from '../api-v1/types';
import { teamColour } from './team-theme';

// The standings panel (Figma component SidebarStandings): what each row and the season ruler say. The
// component only draws this. The table has no podiums column: the API does not send podium counts.

export interface StandingsRowVM {
  key: string;
  /** 1, 2 or 3 draws the roundel of the design; null draws a plain number. */
  roundel: 1 | 2 | 3 | null;
  /** The number shown in the position cell. */
  rankText: string;
  /** Upper case family name for a driver, team name for a team. */
  label: string;
  /** Full name, for the accessible label. */
  fullName: string;
  teamColour: string;
  wins: string;
  /** Exact decimal text from the API. */
  points: string;
  /** The green bar of the design: the title is still mathematically possible. */
  canStillWin: boolean;
}

export type RulerSegment = 'done' | 'current' | 'todo';

export interface StandingsVM {
  round: { current: number; total: number } | null;
  /** "4 to go", or "Season complete". */
  remainingLabel: string | null;
  /** One segment per round of the season. The current one is the last round in these standings. */
  ruler: RulerSegment[];
  rows: StandingsRowVM[];
  /** True when at least one row has the green bar, so the legend has something to explain. */
  showLegend: boolean;
}

const PARTICLES = new Set(['de', 'van', 'von', 'der', 'den', 'di', 'da', 'del', 'le', 'la', 'dos']);

/** "Andrea Kimi Antonelli" gives "Antonelli"; "Nyck de Vries" gives "de Vries". */
export function familyName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length >= 3 && PARTICLES.has(parts[parts.length - 2].toLowerCase())) {
    return parts.slice(-2).join(' ');
  }
  return parts[parts.length - 1];
}

function rowOf(row: StandingRow, index: number): StandingsRowVM {
  const isDriver = row.subject.type === 'driver';
  const rank = row.rank;
  return {
    key: `${row.subject.id}:${index}`,
    roundel: rank === 1 || rank === 2 || rank === 3 ? rank : null,
    rankText: rank !== null ? String(rank) : (row.positionText ?? '–'),
    label: (isDriver ? familyName(row.subject.name) : row.subject.name).toUpperCase(),
    fullName: row.subject.name,
    // A driver's first listed team is the one the design shows (Lawson: RB, not Red Bull).
    teamColour: teamColour(isDriver ? (row.teams[0]?.id ?? null) : row.subject.id),
    wins: row.wins !== null ? String(row.wins) : '–',
    points: row.points,
    canStillWin: row.canStillWin === true,
  };
}

export function buildStandingsVM(data: StandingsData): StandingsVM {
  const { completedRounds, totalRounds } = data.progress;
  const hasProgress = completedRounds !== null && totalRounds !== null && totalRounds > 0;
  const total = hasProgress ? (totalRounds as number) : 0;
  const done = hasProgress ? Math.min(Math.max(completedRounds as number, 0), total) : 0;
  const ruler: RulerSegment[] = hasProgress
    ? Array.from({ length: total }, (_, index): RulerSegment =>
        index < done - 1 ? 'done' : index === done - 1 ? 'current' : 'todo',
      )
    : [];
  const rows = data.rows.map(rowOf);
  return {
    round: hasProgress ? { current: done, total } : null,
    remainingLabel: hasProgress ? (total - done > 0 ? `${total - done} to go` : 'Season complete') : null,
    ruler,
    rows,
    showLegend: rows.some((row) => row.canStillWin),
  };
}
