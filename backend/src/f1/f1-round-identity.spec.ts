import { assignF1RoundSlugs, baseRoundSlug } from './f1-round-identity';

describe('F1 round identity', () => {
  it('derives readable slugs from the reviewed race-name table', () => {
    expect(baseRoundSlug('Chinese Grand Prix')).toBe('china');
    expect(baseRoundSlug('British Grand Prix')).toBe('great-britain');
    expect(baseRoundSlug('São Paulo Grand Prix')).toBe('sao-paulo');
    expect(baseRoundSlug('Mexico City Grand Prix')).toBe('mexico-city');
    expect(baseRoundSlug('70th Anniversary Grand Prix')).toBe(
      '70th-anniversary',
    );
    expect(baseRoundSlug('Indianapolis 500')).toBe('indianapolis-500');
  });

  it('keeps distinct races at one circuit distinct (2020 double-headers)', () => {
    const result = assignF1RoundSlugs(2020, [
      { round: 1, circuitId: 'red_bull_ring', raceName: 'Austrian Grand Prix' },
      { round: 2, circuitId: 'red_bull_ring', raceName: 'Styrian Grand Prix' },
      { round: 4, circuitId: 'silverstone', raceName: 'British Grand Prix' },
      {
        round: 5,
        circuitId: 'silverstone',
        raceName: '70th Anniversary Grand Prix',
      },
    ]);
    expect(result.assignments.map((item) => item.slug)).toEqual([
      'austria',
      'styria',
      'great-britain',
      '70th-anniversary',
    ]);
    expect(result.warnings).toHaveLength(0);
  });

  it('detects slug collisions and disambiguates them with a warning instead of merging', () => {
    const result = assignF1RoundSlugs(2030, [
      { round: 3, circuitId: 'circuit_a', raceName: 'Spanish Grand Prix' },
      { round: 9, circuitId: 'circuit_b', raceName: 'Spanish Grand Prix' },
    ]);
    expect(result.assignments.map((item) => item.slug)).toEqual([
      'spain-circuit-a',
      'spain-circuit-b',
    ]);
    expect(result.warnings[0]).toContain('identity_collision');

    const sameCircuit = assignF1RoundSlugs(2030, [
      { round: 3, circuitId: 'circuit_a', raceName: 'Spanish Grand Prix' },
      { round: 9, circuitId: 'circuit_a', raceName: 'Spanish Grand Prix' },
    ]);
    expect(sameCircuit.assignments.map((item) => item.slug)).toEqual([
      'spain-circuit-a-r3',
      'spain-circuit-a-r9',
    ]);
  });

  it('applies reviewed overrides and keeps renamed slugs as aliases', () => {
    const result = assignF1RoundSlugs(
      2026,
      [
        {
          round: 9,
          circuitId: 'catalunya',
          raceName: 'Barcelona-Catalunya Grand Prix',
        },
      ],
      [
        {
          season: 2026,
          circuitId: 'catalunya',
          raceName: 'Barcelona-Catalunya Grand Prix',
          slug: 'barcelona',
          aliases: ['barcelona-catalunya', 'barcelona'],
          note: 'test-only override',
        },
      ],
    );
    expect(result.assignments[0]).toEqual({
      slug: 'barcelona',
      aliasSlugs: ['barcelona-catalunya'],
    });
    expect(result.warnings[0]).toContain('identity_alias_conflict');
  });
});
