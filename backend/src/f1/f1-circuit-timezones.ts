// Reviewed Jolpica circuitId -> IANA time zone table. Used to compute the
// venue-local date of each session (event-weekend grouping). Jolpica `date`
// is the UTC date of the start instant, so it cannot be used for this.
// Unknown circuits return null; the API then falls back to the viewer's date
// and reports a `track_timezone_unknown` warning.

export const F1_CIRCUIT_TIME_ZONES: Readonly<Record<string, string>> = {
  albert_park: 'Australia/Melbourne',
  americas: 'America/Chicago',
  bahrain: 'Asia/Bahrain',
  baku: 'Asia/Baku',
  buddh: 'Asia/Kolkata',
  catalunya: 'Europe/Madrid',
  hockenheimring: 'Europe/Berlin',
  hungaroring: 'Europe/Budapest',
  imola: 'Europe/Rome',
  indianapolis: 'America/Indiana/Indianapolis',
  interlagos: 'America/Sao_Paulo',
  istanbul: 'Europe/Istanbul',
  jeddah: 'Asia/Riyadh',
  losail: 'Asia/Qatar',
  magny_cours: 'Europe/Paris',
  marina_bay: 'Asia/Singapore',
  miami: 'America/New_York',
  monaco: 'Europe/Monaco',
  monza: 'Europe/Rome',
  mugello: 'Europe/Rome',
  nurburgring: 'Europe/Berlin',
  portimao: 'Europe/Lisbon',
  red_bull_ring: 'Europe/Vienna',
  ricard: 'Europe/Paris',
  rodriguez: 'America/Mexico_City',
  sepang: 'Asia/Kuala_Lumpur',
  shanghai: 'Asia/Shanghai',
  silverstone: 'Europe/London',
  sochi: 'Europe/Moscow',
  spa: 'Europe/Brussels',
  suzuka: 'Asia/Tokyo',
  valencia: 'Europe/Madrid',
  vegas: 'America/Los_Angeles',
  villeneuve: 'America/Toronto',
  yas_marina: 'Asia/Dubai',
  yeongam: 'Asia/Seoul',
  zandvoort: 'Europe/Amsterdam',
};

export function f1CircuitTimeZone(circuitId: string): string | null {
  return F1_CIRCUIT_TIME_ZONES[circuitId] ?? null;
}
