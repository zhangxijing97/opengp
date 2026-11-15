import {
  canStillWinFlags,
  f1PointsRules,
  maxRemainingPoints,
} from './f1-championship-math';

describe('F1 championship maths', () => {
  it('knows the reviewed points rules per season and nothing else', () => {
    expect(f1PointsRules(2026)).toEqual({
      raceDriverMax: 25,
      raceTeamMax: 43,
      sprintDriverMax: 8,
      sprintTeamMax: 15,
    });
    expect(f1PointsRules(2024)?.raceDriverMax).toBe(26);
    expect(f1PointsRules(2021)?.sprintDriverMax).toBe(3);
    expect(f1PointsRules(2018)).toBeNull();
    expect(f1PointsRules(2027)).toBeNull();
  });

  it('adds up the points still available to a driver or a team', () => {
    const rules = f1PointsRules(2025);
    if (!rules) throw new Error('rules missing');
    expect(maxRemainingPoints(rules, 'driver', 1, 1)).toBe(33);
    expect(maxRemainingPoints(rules, 'team', 2, 1)).toBe(101);
    expect(maxRemainingPoints(rules, 'driver', 0, 0)).toBe(0);
  });

  it('counts equal-on-points as still possible and excludes the mathematically out', () => {
    expect(canStillWinFlags(['40', '18', '7', '5'], 33)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(canStillWinFlags(['12.5', '12.5', '0'], 0)).toEqual([
      true,
      true,
      false,
    ]);
    expect(canStillWinFlags([], 10)).toEqual([]);
  });
});
