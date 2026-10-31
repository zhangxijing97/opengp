import { f1SessionDefaultName, mapOpenF1SessionKind } from './f1-session-kind';

describe('F1 session kinds', () => {
  it('maps OpenF1 sessions using both session_name and session_type', () => {
    expect(mapOpenF1SessionKind('Practice 1', 'Practice')).toBe('fp1');
    expect(mapOpenF1SessionKind('Practice 3', 'Practice')).toBe('fp3');
    expect(mapOpenF1SessionKind('Sprint Qualifying', 'Qualifying')).toBe(
      'sprint_qualifying',
    );
    expect(mapOpenF1SessionKind('Sprint Shootout', 'Qualifying')).toBe(
      'sprint_qualifying',
    );
    expect(mapOpenF1SessionKind('Sprint', 'Race')).toBe('sprint');
    expect(mapOpenF1SessionKind('Qualifying', 'Qualifying')).toBe('qualifying');
    expect(mapOpenF1SessionKind('Race', 'Race')).toBe('race');
  });

  it('returns null for testing days and inconsistent name/type pairs', () => {
    expect(mapOpenF1SessionKind('Day 1', 'Practice')).toBeNull();
    expect(mapOpenF1SessionKind('Sprint', 'Qualifying')).toBeNull();
    expect(mapOpenF1SessionKind('Race', 'Practice')).toBeNull();
  });

  it('uses season-aware default names', () => {
    expect(f1SessionDefaultName('sprint_qualifying', 2023)).toBe(
      'Sprint Shootout',
    );
    expect(f1SessionDefaultName('sprint_qualifying', 2025)).toBe(
      'Sprint Qualifying',
    );
    expect(f1SessionDefaultName('fp2', 2025)).toBe('Practice 2');
  });
});
