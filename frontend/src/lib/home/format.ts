// Text formatting for instants. The language is fixed (no language switching yet): US English,
// 12-hour clock, like the design ("3:00 AM", "times in PT").

export type TimeMode = 'time' | 'datetime' | 'date';

const OPTIONS: Record<TimeMode, Intl.DateTimeFormatOptions> = {
  time: { hour: 'numeric', minute: '2-digit' },
  datetime: { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  date: { weekday: 'short', month: 'short', day: 'numeric' },
};

/** "3:00 AM", "Fri, Oct 30, 11:30 AM" or "Fri, Oct 30". An unknown instant is "TBC", never midnight. */
export function formatInstant(iso: string | null, timeZone: string, mode: TimeMode): string {
  if (!iso) return 'TBC';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return new Intl.DateTimeFormat('en-US', { ...OPTIONS[mode], timeZone }).format(date);
}

/** A calendar date key (YYYY-MM-DD) as "Fri, Oct 30". */
export function formatDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { ...OPTIONS.date, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/**
 * A short name for a zone: "PT" for America/Los_Angeles, "ET" for New York, "UTC", and the offset ("GMT+9") for
 * zones with no abbreviation. The engine's generic name for those is "Japan Time" or "Germany Time", which reads
 * badly in "times in ...", so it is only used when it is an abbreviation.
 */
export function timeZoneLabel(timeZone: string, at: Date = new Date()): string {
  if (timeZone === 'UTC') return 'UTC';
  for (const timeZoneName of ['shortGeneric', 'short'] as const) {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName })
        .formatToParts(at)
        .find((item) => item.type === 'timeZoneName');
      if (part && (timeZoneName === 'short' || /^[A-Z]{2,5}$/.test(part.value))) return part.value;
    } catch {
      // Try the next style.
    }
  }
  return timeZone;
}

/** Available IANA time zones for a select, UTC included, sorted. */
export function timeZoneOptions(): string[] {
  const zones = new Set<string>(
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [],
  );
  zones.add('UTC');
  return [...zones].sort((a, b) => a.localeCompare(b));
}
