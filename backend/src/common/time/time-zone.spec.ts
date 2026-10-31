import {
  localDateOf,
  parseIsoInstant,
  resolveIanaTimeZone,
  startOfLocalDayUtcMs,
  toIsoUtc,
} from './time-zone';

const utc = (iso: string) => Date.parse(iso);

describe('time-zone', () => {
  it('accepts IANA names and rejects offsets or garbage', () => {
    expect(resolveIanaTimeZone('America/Los_Angeles')).toBe(
      'America/Los_Angeles',
    );
    expect(resolveIanaTimeZone('utc')).toBe('UTC');
    expect(resolveIanaTimeZone('Etc/GMT+8')).toBe('Etc/GMT+8');
    expect(resolveIanaTimeZone('+08:00')).toBeNull();
    expect(resolveIanaTimeZone('Mars/Olympus_Mons')).toBeNull();
    expect(resolveIanaTimeZone('')).toBeNull();
    expect(resolveIanaTimeZone('America/Los Angeles')).toBeNull();
  });

  it('assigns local dates correctly around the 2026-11-01 US DST end', () => {
    const tz = 'America/Los_Angeles';
    // PDT (UTC-7) before the change on Monday 2026-10-26.
    expect(localDateOf(utc('2026-10-26T06:59:59Z'), tz)).toBe('2026-10-25');
    expect(localDateOf(utc('2026-10-26T07:00:00Z'), tz)).toBe('2026-10-26');
    // PST (UTC-8) after the change: Sunday ends at 08:00Z on Monday.
    expect(localDateOf(utc('2026-11-02T07:59:59Z'), tz)).toBe('2026-11-01');
    expect(localDateOf(utc('2026-11-02T08:00:00Z'), tz)).toBe('2026-11-02');
  });

  it('finds local midnight as a UTC instant on both sides of DST changes', () => {
    expect(
      toIsoUtc(startOfLocalDayUtcMs('2026-10-26', 'America/Los_Angeles')),
    ).toBe('2026-10-26T07:00:00Z');
    expect(
      toIsoUtc(startOfLocalDayUtcMs('2026-11-02', 'America/Los_Angeles')),
    ).toBe('2026-11-02T08:00:00Z');
    // Europe/London leaves BST at 01:00Z on 2026-10-25.
    expect(toIsoUtc(startOfLocalDayUtcMs('2026-10-25', 'Europe/London'))).toBe(
      '2026-10-24T23:00:00Z',
    );
    expect(toIsoUtc(startOfLocalDayUtcMs('2026-10-26', 'Europe/London'))).toBe(
      '2026-10-26T00:00:00Z',
    );
    expect(
      toIsoUtc(startOfLocalDayUtcMs('2027-01-01', 'Pacific/Kiritimati')),
    ).toBe('2026-12-31T10:00:00Z');
  });

  it('returns the first instant of the local day for many zones and dates', () => {
    const zones = [
      'UTC',
      'America/Los_Angeles',
      'Europe/London',
      'Australia/Lord_Howe',
      'America/Santiago',
      'Asia/Kolkata',
    ];
    const dates = [
      '2026-03-08',
      '2026-03-29',
      '2026-04-05',
      '2026-09-06',
      '2026-10-04',
      '2026-11-01',
    ];
    for (const zone of zones) {
      for (const date of dates) {
        const start = startOfLocalDayUtcMs(date, zone);
        expect(localDateOf(start, zone)).toBe(date);
        expect(localDateOf(start - 1000, zone) < date).toBe(true);
      }
    }
  });

  it('parses only instants that carry an explicit offset', () => {
    expect(parseIsoInstant('2025-03-21T03:30:00+00:00')).toBe(
      utc('2025-03-21T03:30:00Z'),
    );
    expect(parseIsoInstant('2025-03-21T11:30:00+08:00')).toBe(
      utc('2025-03-21T03:30:00Z'),
    );
    expect(parseIsoInstant('2025-03-21')).toBeNull();
    expect(parseIsoInstant('2025-03-21T03:30:00')).toBeNull();
    expect(toIsoUtc(utc('2025-03-21T03:30:00.000Z'))).toBe(
      '2025-03-21T03:30:00Z',
    );
  });
});
