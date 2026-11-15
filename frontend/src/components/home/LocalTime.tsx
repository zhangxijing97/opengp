'use client';

import { useHydrated } from '../../lib/client-state/hydrated';
import { effectiveTimeZone, useSettings } from '../../lib/client-state/settings';
import { formatInstant, timeZoneLabel } from '../../lib/home/format';
import type { TimeMode } from '../../lib/home/format';

// Times are shown in the user's time zone (setting, else the browser's). The server does not
// know the zone, so it renders UTC and says so; the browser swaps in the local time right after
// hydration (no hydration mismatch: the server snapshot of useHydrated is false).
export function LocalTime({ iso, mode = 'time' }: { iso: string | null; mode?: TimeMode }) {
  const settings = useSettings();
  const hydrated = useHydrated();
  if (!iso) return <span>TBC</span>;
  const zone = hydrated ? effectiveTimeZone(settings) : 'UTC';
  return (
    <time dateTime={iso} title={`${timeZoneLabel(zone)}`}>
      {formatInstant(iso, zone, mode)}
      {hydrated ? '' : ' UTC'}
    </time>
  );
}
