// OpenGP design tokens (TypeScript mirror of tokens.css). Generated from the Figma handoff page.
// Keep tokens.css and tokens.ts in sync; the Figma page is the source of truth.

export const color = {
  brandIndigo: "#4652e5", // Brand indigo: buttons, light-mode text, bars, selected text
  brandIndigoLight: "#e9eafc", // Selected background, non-today ticket stub
  brandIndigoDark: "#6a73ea", // Dark-mode indigo. RESERVED, not used yet
  brandAmber: "#f59e0b", // Primary button, today ticket stub, nav bottom line, yellow progress
  brandAmberLight: "#fef1dd", // Light amber: hairlines, tag backgrounds
  brandInk: "#121212", // Ink: plates, stamps, button text. Same value as text-primary
  surfacePage: "#f4f4f4", // Page background
  surfaceCard: "#ffffff", // Cards, rows
  surfaceHeader: "#fafafa", // Header strip of the sidebar series lists
  surfaceInset: "#f5f5f5", // Result card, Drivers/Teams track, standings arrow buttons
  surfaceTrack: "#e8e8e8", // Week track
  borderDefault: "#e5e5e5", // 1px card outline, hole outline
  borderSeparator: "#f5f5f5", // 1px full-width separator drawn on the TOP edge of each row (not the first row)
  borderKeyline: "#cfcfcf", // 1px outline outside the footer sticker
  borderSegment: "#c9c9c9", // Outline of unfinished season-ruler segments
  dotInactive: "#d4d4d4", // Inactive carousel dots
  textPrimary: "#121212", // Primary text (same value as brand-ink)
  textSecondary: "#525252", // Secondary text
  textTertiary: "#737373", // Meta text: times, captions. Contrast TBD (open question)
  textDisabled: "#a3a3a3", // Past dates in the week strip. Contrast TBD
  textOnBrand: "#ffffff", // White text on indigo or ink
  textBrand: "#4652e5", // Selected-state indigo text
  textAmber: "#a76607", // Amber text: P1 label, '6 left', Yellow flag, RESCHEDULED. Contrast TBD
  statusLive: "#16a34a", // LIVE text, live progress, 'Can still win'. As TEXT it is 3.3:1; a text variant #15803D is suggested. Contrast TBD
  flagRed: "#dc2626", // Red flag text and progress
  flagYellow: "#f59e0b", // Yellow-family progress bars (text uses text-amber)
  position1: "#a76607", // P1 label (alias of text-amber)
  position2: "#64748b", // P2 label. Contrast TBD
  position3: "#b45309", // P3 label
  iconPrimary: "#121212", // Icon strokes
  iconMuted: "#8c8c8c", // Unselected star outline
  iconSubtle: "#a3a3a3", // Collapse arrows etc.
  iconQuiet: "#737373", // Rare secondary icons
  navGlass: "rgb(27 42 225 / 0.8)", // top nav only; pair with backdrop-filter: blur(20px)
} as const;

/** Series colour is data (series.color). These are the plate-band colours used in the design. */
export const seriesColor = {
  "gtwc-eu": "#7c3aed",
  "gtwc-am": "#2563eb",
  "f1": "#dc2626",
  "motogp": "#be123c",
  "wec": "#0f766e",
  "nascar": "#ca8a04",
  "indycar": "#334155",
  "formula-e": "#0284c7",
} as const;

export const font = {
  sans: '"Inter", system-ui, sans-serif',
  condensed: '"Barlow Condensed", Arial Narrow, sans-serif',
  data: '"Rajdhani", system-ui, sans-serif',
  brand: '"Barlow", system-ui, sans-serif',
} as const;

export const radius = {
  segment: 1.5, // season-ruler segments
  micro: 4, // small plate inside the series plate, '/' key chip
  plate: 6, // series plate outer frame
  pill: 8, // selected pill (24px tall)
  track: 10, // Drivers/Teams track (30px tall)
  control: 12, // search field, buttons (36px tall), icon button, result / podium cards, week cell (nested in the week track: 16 - 4 = 12)
  container: 16, // week track
  surface: 24, // sidebar lists, day schedule, standings, footer sticker
  full: 999, // circular elements
} as const;

export const shadow = {
  attached: "0 1px 3px rgb(0 0 0 / 0.10), 0 1px 1px rgb(0 0 0 / 0.08)",
} as const;

export const space = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  page: 84, // page side margin
} as const;

export const layout = {
  pageWidth: 1440,
  colSide: 288,
  colMain: 648,
  colGap: 24,
  stubWidth: 56,
} as const;

export type TextStyle = {
  family: keyof typeof font;
  weight: 400 | 500 | 600 | 700 | 800;
  size: number; // px
  lineHeight: number | string; // unitless multiplier, px string, or "normal"
  letterSpacing: string; // em or px
};

export const text = {
  rowTitle: { family: "sans", weight: 600, size: 15, lineHeight: 1.4, letterSpacing: "-0.02em" }, // Event name in multi-line rows
  rowTitleSm: { family: "sans", weight: 500, size: 13, lineHeight: 1.4, letterSpacing: "-0.01em" }, // Event name in single-line rows
  rowSession: { family: "sans", weight: 500, size: 12, lineHeight: 1.4, letterSpacing: "0" }, // Session name
  rowMeta: { family: "sans", weight: 500, size: 12, lineHeight: "normal", letterSpacing: "0" }, // Time left / status text
  rowLive: { family: "sans", weight: 700, size: 11, lineHeight: "normal", letterSpacing: "0.06em" }, // LIVE and RED FLAG labels
  rowResultLabel: { family: "sans", weight: 600, size: 11, lineHeight: "normal", letterSpacing: "0" }, // P1 / P2 / P3 / Fastest labels
  rowResultName: { family: "sans", weight: 500, size: 13, lineHeight: "normal", letterSpacing: "0" }, // Result name in single-line rows
  listItem: { family: "sans", weight: 500, size: 13, lineHeight: 1.4, letterSpacing: "0" }, // Sidebar series item
  cardTitle: { family: "sans", weight: 600, size: 14, lineHeight: 1.4, letterSpacing: "-0.01em" }, // Sidebar list header
  sectionCount: { family: "sans", weight: 400, size: 13, lineHeight: 1.4, letterSpacing: "0" }, // '15 sessions this week'
  caption: { family: "sans", weight: 400, size: 12, lineHeight: 1.4, letterSpacing: "0" }, // 'This week · times in PT'
  weekLabel: { family: "sans", weight: 600, size: 10, lineHeight: 1.4, letterSpacing: "0.06em" }, // WEEK / MON / TUE ...
  weekSub: { family: "sans", weight: 500, size: 10, lineHeight: 1.4, letterSpacing: "0" }, // 'sessions' under the number
  tableHead: { family: "sans", weight: 600, size: 10, lineHeight: 1.4, letterSpacing: "0.04em" }, // Standings table header
  footerBody: { family: "sans", weight: 400, size: 13, lineHeight: 1.5, letterSpacing: "0" }, // Footer tagline and links
  footerLegal: { family: "sans", weight: 400, size: 12, lineHeight: 1.5, letterSpacing: "0" }, // Footer legal links
  startSub: { family: "sans", weight: 400, size: 11, lineHeight: 1.4, letterSpacing: "0" }, // 'ends ~4:00 AM', 'Can still win'
  rowTime: { family: "sans", weight: 400, size: 12, lineHeight: "normal", letterSpacing: "0" }, // ' · 3:00 AM' after the session name
  sectionTitle: { family: "sans", weight: 600, size: 16, lineHeight: 1.4, letterSpacing: "-0.025em" }, // Following / All series
  groupLabel: { family: "sans", weight: 600, size: 11, lineHeight: "normal", letterSpacing: "0.06em" }, // PRO / CLASS WINNERS
  weekStatus: { family: "sans", weight: 600, size: 10, lineHeight: 1.4, letterSpacing: "0" }, // '6 left' in the week cell
  seriesTitle: { family: "sans", weight: 600, size: 16, lineHeight: 1.4, letterSpacing: "-0.01em" }, // Standings title
  seasonNote: { family: "sans", weight: 500, size: 11, lineHeight: "normal", letterSpacing: "0" }, // '4 to go'
  segmentSelected: { family: "sans", weight: 600, size: 11, lineHeight: "16px", letterSpacing: "0" }, // Selected Drivers/Teams label
  segment: { family: "sans", weight: 500, size: 11, lineHeight: "16px", letterSpacing: "0" }, // Unselected Drivers/Teams label
  footerFine: { family: "sans", weight: 400, size: 11, lineHeight: 1.5, letterSpacing: "0" }, // Footer disclaimer
  tag: { family: "sans", weight: 700, size: 10, lineHeight: 1.5, letterSpacing: "0.06em" }, // RESCHEDULED tag
  weekDate: { family: "data", weight: 600, size: 18, lineHeight: 1.15, letterSpacing: "0" }, // Week cell date number
  weekDateStrong: { family: "data", weight: 700, size: 18, lineHeight: 1.15, letterSpacing: "0" }, // Selected / today date number
  tablePos: { family: "data", weight: 700, size: 14, lineHeight: 1.1, letterSpacing: "0" }, // Standings position
  tableDriver: { family: "data", weight: 600, size: 14, lineHeight: 1.15, letterSpacing: "0.03em" }, // Standings driver name
  tableStat: { family: "data", weight: 600, size: 14, lineHeight: 1.15, letterSpacing: "0.02em" }, // Standings wins / podiums
  tablePoints: { family: "data", weight: 700, size: 14, lineHeight: 1.15, letterSpacing: "0.02em" }, // Standings points
  podiumName: { family: "data", weight: 700, size: 14, lineHeight: "normal", letterSpacing: "0" }, // Rank bar name
  podiumNameLg: { family: "data", weight: 700, size: 15, lineHeight: "normal", letterSpacing: "0" }, // Large rank name
  classWinner: { family: "data", weight: 700, size: 13, lineHeight: "normal", letterSpacing: "0" }, // Class winner name
  roundel: { family: "data", weight: 700, size: 12, lineHeight: 1, letterSpacing: "0" }, // Position inside roundel
  startTime: { family: "data", weight: 700, size: 20, lineHeight: 1.15, letterSpacing: "0.03em" }, // Start time in multi-line upcoming rows
  startTimeSm: { family: "data", weight: 700, size: 15, lineHeight: 1.15, letterSpacing: "0.03em" }, // Start time in single-line upcoming rows
  rangeTitle: { family: "data", weight: 700, size: 20, lineHeight: 1.2, letterSpacing: "0.02em" }, // 'Oct 26 – Nov 1'
  plateCode: { family: "condensed", weight: 800, size: 13, lineHeight: "16px", letterSpacing: "0.5px" }, // Series plate code
  stubDow: { family: "condensed", weight: 700, size: 12, lineHeight: 1, letterSpacing: "0" }, // SAT / SUN on the stub
  stubDay: { family: "condensed", weight: 800, size: 34, lineHeight: 1, letterSpacing: "0" }, // Day number on the stub
  stubMonth: { family: "condensed", weight: 600, size: 10, lineHeight: 1, letterSpacing: "2.4px" }, // OCT / NOV on the stub
  stubCount: { family: "condensed", weight: 800, size: 20, lineHeight: 1, letterSpacing: "0" }, // Session count on the stub
  stubCaption: { family: "condensed", weight: 600, size: 9, lineHeight: 1, letterSpacing: "1px" }, // SESSIONS on the stub
  cta: { family: "condensed", weight: 800, size: 15, lineHeight: 1.4, letterSpacing: "1.6px" }, // SIGN IN / BACK TO GRID
  footerHeading: { family: "condensed", weight: 800, size: 13, lineHeight: 1.5, letterSpacing: "2px" }, // PRODUCT / DATA / COMPANY
  stamp: { family: "condensed", weight: 700, size: 10, lineHeight: 1, letterSpacing: "1.4px" }, // TODAY stamp
  roundLabel: { family: "condensed", weight: 600, size: 12, lineHeight: "normal", letterSpacing: "0.1em" }, // ROUND
  roundNumber: { family: "condensed", weight: 700, size: 20, lineHeight: "normal", letterSpacing: "0" }, // Round number
  roundTotal: { family: "condensed", weight: 600, size: 13, lineHeight: "normal", letterSpacing: "0" }, // '/ 24'
  wordmark: { family: "brand", weight: 500, size: 22, lineHeight: 1, letterSpacing: "-0.01em" }, // OpenGP wordmark
} as const satisfies Record<string, TextStyle>;

/**
 * DATA, NOT TOKENS. These come from the backend later (series.color, team.color). The values are what the design uses; use them for fixtures only.
 * Mismatch to resolve (open-questions.md F): NASCAR plate #ca8a04 vs badge #a16207; Formula E plate #0284c7 vs badge #0369a1.
 */
export const seriesBadgeColorFixture = {
  "formula-1": "#dc2626",
  "gtwc-america": "#2563eb",
  "gtwc-europe": "#7c3aed",
  "motogp": "#be123c",
  "wec": "#0f766e",
  "indycar": "#334155",
  "nascar": "#a16207",
  "formula-e": "#0369a1",
  "wrc": "#1d4ed8",
  "imsa": "#1e3a8a",
  "btcc": "#7c2d12",
  "dakar-rally": "#b45309",
  "dtm": "#1f2937",
  "elms": "#0e7490",
  "f1-academy": "#db2777",
  "formula-2": "#0284c7",
  "formula-3": "#64748b",
  "indy-nxt": "#475569",
  "moto2": "#9f1239",
  "moto3": "#f43f5e",
  "nascar-truck": "#854d0e",
  "nascar-xfinity": "#ca8a04",
  "nhra": "#b91c1c",
  "super-formula": "#4338ca",
  "super-gt": "#ea580c",
  "supercars": "#a76607",
  "world-of-outlaws": "#78350f",
  "worldsbk": "#be185d",
} as const;

/** The 19 team-bar colours that appear in the design (3px bar left of names in standings and rank bars). */
export const teamColorFixture = ["#16a34a", "#0d9488", "#6366f1", "#ea580c", "#7c3aed", "#db2777", "#0ea5e9", "#64748b", "#6692ff", "#00a19b", "#e8002d", "#3671c6", "#ff8000", "#0093cc", "#9ca3af", "#b91c1c", "#229971", "#64c4ff", "#111827"] as const;
