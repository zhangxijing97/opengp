// Team colours of the F1 grid, for the team bars of result rows and standings rows. The values are the ones
// drawn in the design (Figma page 05, the standings table, 2026-11-15). The API has no colours, so this table
// is the source, like series-theme.ts. A team that is not listed gets the neutral colour.
//
// Teams are matched by their OpenGP id (`f1:team:red-bull`) or by a name from a result row ("Red Bull Racing").
// 2026 grid: Mercedes, Ferrari, Red Bull, McLaren, RB, Alpine, Haas, Audi, Aston Martin, Williams, Cadillac.

const NEUTRAL = 'var(--color-dot-inactive)';

const COLOURS: Readonly<Record<string, string>> = {
  mercedes: '#00A19B',
  ferrari: '#E8002D',
  'red-bull': '#3671C6',
  mclaren: '#FF8000',
  rb: '#6692FF',
  alpine: '#0093CC',
  haas: '#9CA3AF',
  audi: '#B91C1C',
  'aston-martin': '#229971',
  williams: '#64C4FF',
  cadillac: '#111827',
};

// Other spellings of the same team (provider names change with sponsors).
const ALIASES: Readonly<Record<string, string>> = {
  'mercedes-amg-petronas': 'mercedes',
  'scuderia-ferrari': 'ferrari',
  'red-bull-racing': 'red-bull',
  'oracle-red-bull-racing': 'red-bull',
  'mclaren-f1-team': 'mclaren',
  'rb-f1-team': 'rb',
  'racing-bulls': 'rb',
  'visa-cash-app-rb': 'rb',
  'alpine-f1-team': 'alpine',
  'haas-f1-team': 'haas',
  'moneygram-haas-f1-team': 'haas',
  'audi-f1-team': 'audi',
  sauber: 'audi',
  'kick-sauber': 'audi',
  'stake-f1-team-kick-sauber': 'audi',
  'aston-martin-aramco': 'aston-martin',
  'williams-racing': 'williams',
  'cadillac-f1-team': 'cadillac',
};

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The colour of a team from its id or name; the neutral colour when the team is not known. */
export function teamColour(idOrName: string | null | undefined): string {
  if (!idOrName) return NEUTRAL;
  const key = slug(idOrName.replace(/^f1:team:/, ''));
  return COLOURS[key] ?? COLOURS[ALIASES[key] ?? ''] ?? NEUTRAL;
}
