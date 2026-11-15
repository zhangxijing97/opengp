// "Can still win the title" maths. This is a CALCULATED value, not provider
// data: a subject is still in contention when
//   currentPoints + maxPointsStillAvailable >= leaderPoints
// Equality counts as "still possible" because tie-breaks (countback) can
// still go either way. Only seasons with a reviewed points table are
// supported; other seasons return null instead of a guess.

export interface F1PointsRules {
  /** Most points one driver can score in a Grand Prix (incl. bonus). */
  raceDriverMax: number;
  /** Most points one team can score in a Grand Prix (two cars). */
  raceTeamMax: number;
  sprintDriverMax: number;
  sprintTeamMax: number;
}

// Sources: FIA sporting regulations as reported; fastest-lap point (top 10)
// 2019-2024, removed from 2025; sprint points 3-2-1 in 2021, 8..1 from 2022.
const RULES: ReadonlyArray<{ from: number; to: number; rules: F1PointsRules }> =
  [
    {
      from: 2019,
      to: 2020,
      rules: {
        raceDriverMax: 26,
        raceTeamMax: 44,
        sprintDriverMax: 0,
        sprintTeamMax: 0,
      },
    },
    {
      from: 2021,
      to: 2021,
      rules: {
        raceDriverMax: 26,
        raceTeamMax: 44,
        sprintDriverMax: 3,
        sprintTeamMax: 5,
      },
    },
    {
      from: 2022,
      to: 2024,
      rules: {
        raceDriverMax: 26,
        raceTeamMax: 44,
        sprintDriverMax: 8,
        sprintTeamMax: 15,
      },
    },
    {
      from: 2025,
      to: 2026,
      rules: {
        raceDriverMax: 25,
        raceTeamMax: 43,
        sprintDriverMax: 8,
        sprintTeamMax: 15,
      },
    },
  ];

export function f1PointsRules(season: number): F1PointsRules | null {
  return (
    RULES.find((entry) => season >= entry.from && season <= entry.to)?.rules ??
    null
  );
}

export function maxRemainingPoints(
  rules: F1PointsRules,
  subjectType: 'driver' | 'team',
  remainingRaces: number,
  remainingSprints: number,
): number {
  const race =
    subjectType === 'driver' ? rules.raceDriverMax : rules.raceTeamMax;
  const sprint =
    subjectType === 'driver' ? rules.sprintDriverMax : rules.sprintTeamMax;
  return remainingRaces * race + remainingSprints * sprint;
}

/** Returns one flag per points value; the leader is always true. */
export function canStillWinFlags(
  points: string[],
  maxRemaining: number,
): boolean[] {
  const values = points.map((value) => Number(value));
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    return points.map(() => false);
  }
  const leader = Math.max(...values);
  return values.map((value) => value + maxRemaining >= leader);
}
