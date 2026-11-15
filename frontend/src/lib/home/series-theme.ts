// Series list of the design (Figma page 05, section 3 G2 and the sidebar lists) with the colours
// and plate codes the design uses. Colours are DATA (series.color), not design tokens, except
// for the 8 series that have a plate: those use the plate token for the badge as well
// (HANDOFF.md section 5, decision F). Hex values below are data copied from Figma G2.

export interface SeriesTheme {
  /** Frontend series id (the id used in the Figma sheet). */
  id: string;
  /** Series id of the backend `/api/v1`, or null while the backend does not serve the series. */
  apiId: string | null;
  name: string;
  /** CSS colour value for the badge dot (and the plate band when there is a plate). */
  color: string;
  /** Text of the series plate in session rows. Only the 8 series with a plate in the design. */
  plateCode?: string;
  /** Extra words that find the series in search. */
  aliases: readonly string[];
}

// Alphabetical, as in the "All series" list of the design.
export const SERIES_THEMES: readonly SeriesTheme[] = [
  { id: 'btcc', apiId: null, name: 'BTCC', color: '#7C2D12', aliases: ['british touring car championship'] },
  { id: 'dakar-rally', apiId: null, name: 'Dakar Rally', color: '#B45309', aliases: ['dakar', 'rally raid'] },
  { id: 'dtm', apiId: null, name: 'DTM', color: '#1F2937', aliases: ['deutsche tourenwagen masters'] },
  { id: 'elms', apiId: null, name: 'ELMS', color: '#0E7490', aliases: ['european le mans series'] },
  { id: 'f1-academy', apiId: null, name: 'F1 Academy', color: '#DB2777', aliases: [] },
  { id: 'formula-1', apiId: 'f1', name: 'Formula 1', color: 'var(--color-series-f1)', plateCode: 'F1', aliases: ['f1', 'formula one', 'grand prix'] },
  { id: 'formula-2', apiId: null, name: 'Formula 2', color: '#0284C7', aliases: ['f2'] },
  { id: 'formula-3', apiId: null, name: 'Formula 3', color: '#64748B', aliases: ['f3'] },
  { id: 'formula-e', apiId: null, name: 'Formula E', color: 'var(--color-series-formula-e)', plateCode: 'Formula E', aliases: ['fe', 'electric'] },
  { id: 'gtwc-america', apiId: null, name: 'GTWC America', color: 'var(--color-series-gtwc-am)', plateCode: 'GTWC AM', aliases: ['gt world challenge america'] },
  { id: 'gtwc-europe', apiId: null, name: 'GTWC Europe', color: 'var(--color-series-gtwc-eu)', plateCode: 'GTWC EU', aliases: ['gt world challenge europe', 'sro'] },
  { id: 'imsa', apiId: null, name: 'IMSA', color: '#1E3A8A', aliases: ['weathertech'] },
  { id: 'indy-nxt', apiId: null, name: 'Indy NXT', color: '#475569', aliases: ['indy lights'] },
  { id: 'indycar', apiId: null, name: 'IndyCar', color: 'var(--color-series-indycar)', plateCode: 'IndyCar', aliases: ['indy car', 'indy 500'] },
  { id: 'moto2', apiId: null, name: 'Moto2', color: '#9F1239', aliases: [] },
  { id: 'moto3', apiId: null, name: 'Moto3', color: '#F43F5E', aliases: [] },
  { id: 'motogp', apiId: null, name: 'MotoGP', color: 'var(--color-series-motogp)', plateCode: 'MotoGP', aliases: ['moto gp', 'motorcycle'] },
  { id: 'nascar', apiId: null, name: 'NASCAR', color: 'var(--color-series-nascar)', plateCode: 'NASCAR', aliases: ['nascar cup', 'stock car'] },
  { id: 'nascar-truck', apiId: null, name: 'NASCAR Truck', color: '#854D0E', aliases: ['craftsman truck'] },
  { id: 'nascar-xfinity', apiId: null, name: 'NASCAR Xfinity', color: '#CA8A04', aliases: ['xfinity'] },
  { id: 'nhra', apiId: null, name: 'NHRA', color: '#B91C1C', aliases: ['drag racing'] },
  { id: 'super-formula', apiId: null, name: 'Super Formula', color: '#4338CA', aliases: [] },
  { id: 'super-gt', apiId: null, name: 'Super GT', color: '#EA580C', aliases: [] },
  { id: 'supercars', apiId: null, name: 'Supercars', color: '#A76607', aliases: ['v8 supercars', 'australian'] },
  { id: 'wec', apiId: null, name: 'WEC', color: 'var(--color-series-wec)', plateCode: 'WEC', aliases: ['world endurance championship', 'endurance', 'le mans'] },
  { id: 'world-of-outlaws', apiId: null, name: 'World of Outlaws', color: '#78350F', aliases: ['sprint cars'] },
  { id: 'worldsbk', apiId: null, name: 'WorldSBK', color: '#BE185D', aliases: ['wsbk', 'world superbike', 'superbike'] },
  { id: 'wrc', apiId: null, name: 'WRC', color: '#1D4ED8', aliases: ['rally', 'world rally championship'] },
];

// The "Top series" list of the design, in its order.
export const TOP_SERIES_IDS: readonly string[] = [
  'formula-1',
  'motogp',
  'wec',
  'indycar',
  'nascar',
  'formula-e',
  'wrc',
  'imsa',
];

export function themeById(id: string): SeriesTheme | undefined {
  return SERIES_THEMES.find((theme) => theme.id === id);
}

export function themeByApiId(apiId: string): SeriesTheme | undefined {
  return SERIES_THEMES.find((theme) => theme.apiId === apiId);
}

/** Frontend series id for an API series id. Unknown API ids pass through unchanged. */
export function frontendSeriesId(apiId: string): string {
  return themeByApiId(apiId)?.id ?? apiId;
}
