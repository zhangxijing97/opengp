import {
  buildCircuitId,
  buildRoundId,
  buildSessionId,
  legacyOpenF1SessionAlias,
  parseLegacyOpenF1Alias,
  parseRoundId,
  parseSessionId,
  slugify,
} from './canonical-id';

describe('canonical-id', () => {
  it('slugifies names to ASCII kebab-case', () => {
    expect(slugify('São Paulo Grand Prix')).toBe('sao-paulo-grand-prix');
    expect(slugify('  Emilia Romagna  Grand Prix ')).toBe(
      'emilia-romagna-grand-prix',
    );
    expect(slugify('red_bull_ring')).toBe('red-bull-ring');
  });

  it('builds the documented ID formats', () => {
    const roundId = buildRoundId('f1', '2025', 'china');
    expect(roundId).toBe('f1:2025:china');
    expect(buildSessionId(roundId, 'fp1')).toBe('f1:2025:china:fp1');
    expect(buildSessionId(roundId, 'sprint_qualifying')).toBe(
      'f1:2025:china:sprint_qualifying',
    );
    expect(buildCircuitId('f1', 'shanghai')).toBe('f1:circuit:shanghai');
    expect(() => buildRoundId('f1', '2025', 'Bad Slug')).toThrow();
  });

  it('parses canonical IDs and rejects malformed ones', () => {
    expect(parseRoundId('f1:2025:china')).toEqual({
      seriesId: 'f1',
      seasonKey: '2025',
      roundSlug: 'china',
    });
    expect(parseRoundId('f1:2025-26:tokyo')).toEqual({
      seriesId: 'f1',
      seasonKey: '2025-26',
      roundSlug: 'tokyo',
    });
    expect(parseRoundId('f1:2025')).toBeNull();
    expect(parseRoundId('f1:25:china')).toBeNull();
    expect(parseRoundId('openf1-1255')).toBeNull();
    expect(parseSessionId('f1:2025:china:race')).toMatchObject({
      roundId: 'f1:2025:china',
      sessionToken: 'race',
    });
    expect(parseSessionId('f1:2025:china:Race')).toBeNull();
    expect(parseSessionId('f1:2025:china')).toBeNull();
  });

  it('recognizes legacy OpenF1 aliases without treating them as canonical IDs', () => {
    expect(parseLegacyOpenF1Alias('openf1-session-9988')).toEqual({
      kind: 'openf1_session',
      sessionKey: 9988,
    });
    expect(parseLegacyOpenF1Alias('openf1-1255')).toEqual({
      kind: 'openf1_meeting',
      meetingKey: 1255,
    });
    expect(parseLegacyOpenF1Alias('openf1-session-abc')).toBeNull();
    expect(parseLegacyOpenF1Alias('f1:2025:china')).toBeNull();
    expect(legacyOpenF1SessionAlias(9988)).toBe('openf1-session-9988');
  });
});
