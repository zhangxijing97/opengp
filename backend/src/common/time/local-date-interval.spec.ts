import {
  candidateYearsForInterval,
  coreYearsForInterval,
  intervalContainsDate,
  intervalContainsInstant,
  parseLocalDateInterval,
} from './local-date-interval';
import type { LocalDateInterval } from './local-date-interval';

function parseOk(input: {
  from: unknown;
  to: unknown;
  tz: unknown;
}): LocalDateInterval {
  const result = parseLocalDateInterval(input);
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.interval;
}

function parseErrors(input: {
  from: unknown;
  to: unknown;
  tz: unknown;
}): string[] {
  const result = parseLocalDateInterval(input);
  return result.ok ? [] : result.errors;
}

describe('parseLocalDateInterval', () => {
  it('parses a Monday-to-Monday week in an IANA zone across the DST change', () => {
    const interval = parseOk({
      from: '2026-10-26',
      to: '2026-11-02',
      tz: 'America/Los_Angeles',
    });
    expect(interval.days).toBe(7);
    expect(interval.startsAtUtc).toBe('2026-10-26T07:00:00Z');
    expect(interval.endsAtUtc).toBe('2026-11-02T08:00:00Z');
  });

  it('defaults to UTC when tz is omitted', () => {
    expect(
      parseOk({ from: '2026-10-26', to: '2026-11-02', tz: undefined }).timeZone,
    ).toBe('UTC');
  });

  it('rejects missing, malformed, impossible and repeated values', () => {
    expect(
      parseErrors({ from: undefined, to: '2026-11-02', tz: undefined }),
    ).toHaveLength(1);
    expect(
      parseErrors({ from: '2026-10-26', to: 'next-week', tz: undefined }),
    ).toHaveLength(1);
    expect(
      parseErrors({ from: '2026-02-30', to: '2026-03-02', tz: undefined }),
    ).toHaveLength(1);
    expect(
      parseErrors({
        from: ['2026-10-26', '2026-10-27'],
        to: '2026-11-02',
        tz: undefined,
      }),
    ).toHaveLength(1);
    expect(
      parseErrors({ from: '2026-10-26', to: '2026-11-02', tz: 'Not/AZone' }),
    ).toHaveLength(1);
    expect(
      parseErrors({ from: '2026-10-26', to: '2026-11-02', tz: '+08:00' }),
    ).toHaveLength(1);
  });

  it('enforces from < to and the 31-day maximum', () => {
    expect(
      parseErrors({ from: '2026-11-02', to: '2026-11-02', tz: undefined })[0],
    ).toContain('earlier');
    expect(
      parseErrors({ from: '2026-11-03', to: '2026-11-02', tz: undefined })[0],
    ).toContain('earlier');
    expect(
      parseErrors({ from: '2026-10-01', to: '2026-11-02', tz: undefined })[0],
    ).toContain('31');
    expect(
      parseOk({ from: '2026-10-01', to: '2026-11-01', tz: undefined }).days,
    ).toBe(31);
  });

  it('includes the last local Sunday and excludes next Monday (inclusive/exclusive)', () => {
    const interval = parseOk({
      from: '2026-10-26',
      to: '2026-11-02',
      tz: 'America/Los_Angeles',
    });
    expect(
      intervalContainsInstant(interval, Date.parse('2026-10-26T06:59:59Z')),
    ).toBe(false);
    expect(
      intervalContainsInstant(interval, Date.parse('2026-10-26T07:00:00Z')),
    ).toBe(true);
    expect(
      intervalContainsInstant(interval, Date.parse('2026-11-02T07:30:00Z')),
    ).toBe(true);
    expect(
      intervalContainsInstant(interval, Date.parse('2026-11-02T08:00:00Z')),
    ).toBe(false);
    expect(intervalContainsDate(interval, '2026-11-01')).toBe(true);
    expect(intervalContainsDate(interval, '2026-11-02')).toBe(false);
  });

  it('selects every season year that can hold sessions near a year change', () => {
    const rollover = parseOk({
      from: '2026-12-28',
      to: '2027-01-04',
      tz: undefined,
    });
    expect(candidateYearsForInterval(rollover)).toEqual([2026, 2027]);
    expect(coreYearsForInterval(rollover)).toEqual([2026, 2027]);

    const newYearWeek = parseOk({
      from: '2027-01-01',
      to: '2027-01-08',
      tz: 'Pacific/Kiritimati',
    });
    expect(candidateYearsForInterval(newYearWeek)).toEqual([2026, 2027]);
    expect(coreYearsForInterval(newYearWeek)).toEqual([2027]);

    const midYear = parseOk({
      from: '2026-06-01',
      to: '2026-06-08',
      tz: undefined,
    });
    expect(candidateYearsForInterval(midYear)).toEqual([2026]);
  });
});
