import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { contrastRatio } from './contrast';
import { parseTokens } from './parse-tokens';
import type { CssVariable, ParsedTokens, TextStyle } from './parse-tokens';

export const metadata: Metadata = { title: 'Design tokens' };

// The page reads the file itself, so it always shows what the app really ships.
const TOKENS_PATH = path.join(process.cwd(), 'src', 'styles', 'tokens.css');

// Text styles in the handoff (HANDOFF.md section 3; Figma page 05, section 3 B).
const EXPECTED_TEXT_STYLES = 53;
// WCAG AA for normal text.
const MIN_TEXT_CONTRAST = 4.5;

// Preview strings copied from the rows of Figma page 05, section 3 B.
const SAMPLES: Record<string, string> = {
  'text-row-title': 'Example Circuit · Endurance',
  'text-row-title-sm': 'Example Circuit',
  'text-row-session': 'Free Practice',
  'text-row-meta': '18m left',
  'text-row-live': 'LIVE',
  'text-row-result-label': 'Fastest',
  'text-row-result-name': '#32 Aurora',
  'text-list-item': 'Formula 1',
  'text-card-title': 'Followed series',
  'text-section-count': '15 sessions this week',
  'text-caption': 'This week · times in PT',
  'text-week-label': 'WEEK',
  'text-week-sub': 'sessions',
  'text-table-head': 'DRIVER',
  'text-footer-body': 'Every racing series in one schedule',
  'text-footer-legal': '© 2026 OpenGP',
  'text-start-sub': 'ends ~4:00 AM',
  'text-row-time': '· 3:00 AM',
  'text-section-title': 'Following / All series',
  'text-group-label': 'PRO / CLASS WINNERS',
  'text-week-status': '6 left',
  'text-series-title': 'Formula 1',
  'text-season-note': '4 to go',
  'text-segment-selected': 'Drivers',
  'text-segment': 'Teams',
  'text-footer-fine': 'OpenGP is an independent service',
  'text-tag': 'RESCHEDULED',
  'text-week-date': '26',
  'text-week-date-strong': '15',
  'text-table-pos': '4',
  'text-table-driver': 'ANTONELLI',
  'text-table-stat': '9 15',
  'text-table-points': '365',
  'text-podium-name': '#64 SUMMIT',
  'text-podium-name-lg': '#64 SUMMIT',
  'text-class-winner': '#77 SABLE RACING',
  'text-roundel': '1 2 3',
  'text-start-time': '3:00 AM',
  'text-start-time-sm': '3:00 AM',
  'text-range-title': 'Oct 26 – Nov 1',
  'text-plate-code': 'GTWC EU',
  'text-stub-dow': 'SAT',
  'text-stub-day': '30',
  'text-stub-month': 'OCT',
  'text-stub-count': '6',
  'text-stub-caption': 'SESSIONS',
  'text-cta': 'SIGN IN',
  'text-footer-heading': 'PRODUCT / DATA / COMPANY',
  'text-stamp': 'TODAY',
  'text-round-label': 'ROUND',
  'text-round-number': '20',
  'text-round-total': '/ 24',
  'text-wordmark': 'OpenGP',
};
const FALLBACK_SAMPLE = 'Example Circuit 12:30 PM';

// Column header cells. Browsers centre <th> by default, so the alignment is explicit.
const HEAD_CELL = 'text-caption py-2 pr-4 text-left font-semibold';
const HEAD_CELL_LAST = 'text-caption py-2 text-left font-semibold';

const FAMILY_LABELS: Record<string, string> = {
  '--font-sans': 'Inter',
  '--font-data': 'Rajdhani',
  '--font-condensed': 'Barlow Condensed',
  '--font-brand': 'Barlow',
};

// One existing text style per family, used as the family specimen.
const FAMILY_SPECIMENS: Record<string, { className: string; text: string }> = {
  '--font-sans': { className: 'text-section-title', text: 'Example Circuit 0123' },
  '--font-data': { className: 'text-range-title', text: 'Oct 26 – Nov 1 365' },
  '--font-condensed': { className: 'text-stub-day', text: '30 OCT SAT' },
  '--font-brand': { className: 'text-wordmark', text: 'OpenGP' },
};

// Contrast matrix: text-like colours against the four surfaces they are drawn on.
const SURFACE_TOKENS = [
  '--color-surface-card',
  '--color-surface-page',
  '--color-surface-inset',
  '--color-surface-track',
];
const TEXT_TOKEN_PREFIXES = [
  '--color-text-',
  '--color-status-',
  '--color-flag-',
  '--color-position-',
];
// Not drawn on the four surfaces: on-brand text sits on brand colours (see the pairs below)
// and the yellow flag colour is only used for progress bars.
const EXCLUDED_FROM_MATRIX = ['--color-text-on-brand', '--color-flag-yellow'];

// Pairs implied by the notes in tokens.css.
const CONTRAST_PAIRS = [
  { foreground: '--color-text-on-brand', background: '--color-brand-indigo', label: 'Button label on indigo' },
  { foreground: '--color-text-on-brand', background: '--color-brand-ink', label: 'Plate and stamp text on ink' },
  { foreground: '--color-brand-ink', background: '--color-brand-amber', label: 'Primary button label on amber' },
  { foreground: '--color-text-brand', background: '--color-brand-indigo-light', label: 'Selected pill text on light indigo' },
];

// 1440 = 84 + 288 + 24 + 648 + 24 + 288 + 84
const LAYOUT_SEGMENTS = [
  { label: 'Page margin', token: '--space-page', tone: 'bg-surface-track' },
  { label: 'Side column', token: '--layout-col-side', tone: 'bg-brand-indigo-light' },
  { label: 'Column gap', token: '--layout-col-gap', tone: 'bg-brand-amber-light' },
  { label: 'Main column', token: '--layout-col-main', tone: 'bg-brand-indigo-light' },
  { label: 'Column gap', token: '--layout-col-gap', tone: 'bg-brand-amber-light' },
  { label: 'Side column', token: '--layout-col-side', tone: 'bg-brand-indigo-light' },
  { label: 'Page margin', token: '--space-page', tone: 'bg-surface-track' },
];

interface Group<T> {
  key: string;
  items: T[];
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Group<T>[] {
  const groups: Group<T>[] = [];
  for (const item of items) {
    const key = keyOf(item);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

function valueOf(variables: CssVariable[], name: string): string | undefined {
  return variables.find((variable) => variable.name === name)?.value;
}

function pixels(value: string | undefined): number {
  return value ? Number.parseFloat(value) : 0;
}

function formatRatio(ratio: number | null): string {
  return ratio === null ? 'n/a' : `${ratio.toFixed(2)}:1`;
}

function stripPrefix(name: string, prefix: string): string {
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-surface border border-border-default bg-surface-card p-6"
    >
      <h2 className="text-series-title mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ColourCard({ token }: { token: CssVariable }) {
  return (
    <li className="min-w-0">
      {/* White left half and ink right half, so translucent colours are visible. */}
      <div className="relative h-16 overflow-hidden rounded-control border border-border-default bg-surface-card">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-brand-ink" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: `var(${token.name})` }}
        />
      </div>
      <p className="text-card-title mt-2 break-words">
        {stripPrefix(token.name, '--color-')}
      </p>
      <p className="text-caption font-mono">{token.value}</p>
      {token.note ? (
        <p className="text-caption text-text-secondary">{token.note}</p>
      ) : null}
    </li>
  );
}

function RatioCell({ ratio }: { ratio: number | null }) {
  const low = ratio !== null && ratio < MIN_TEXT_CONTRAST;
  return (
    <span className="font-mono">
      {formatRatio(ratio)}
      {low ? <span className="text-tag ml-2 text-flag-red">below 4.5:1</span> : null}
    </span>
  );
}

function StyleRow({ style }: { style: TextStyle }) {
  return (
    <tr className="border-b border-border-separator align-baseline">
      <th scope="row" className="text-caption py-2 pr-4 text-left font-mono font-normal">
        {style.className}
      </th>
      <td className="text-caption py-2 pr-4 font-mono">{style.weight}</td>
      <td className="text-caption py-2 pr-4 font-mono">{style.size}</td>
      <td className="text-caption py-2 pr-4 font-mono">{style.lineHeight}</td>
      <td className="text-caption py-2 pr-4 font-mono">{style.letterSpacing}</td>
      <td className="py-2 pr-4">
        <span className={style.className}>
          {SAMPLES[style.className] ?? FALLBACK_SAMPLE}
        </span>
      </td>
      <td className="text-caption py-2 text-text-secondary">{style.note}</td>
    </tr>
  );
}

function SpacingList({ tokens }: { tokens: CssVariable[] }) {
  return (
    <ul className="grid gap-2">
      {tokens.map((token) => (
        <li
          key={token.name}
          className="grid grid-cols-[9rem_5rem_1fr] items-center gap-4"
        >
          <span className="text-caption font-mono">{token.name}</span>
          <span className="text-caption font-mono text-text-secondary">{token.value}</span>
          <span
            aria-hidden="true"
            className="block h-3 bg-brand-indigo"
            style={{ width: `var(${token.name})` }}
          />
        </li>
      ))}
    </ul>
  );
}

export default async function TokensPage() {
  let parsed: ParsedTokens;
  try {
    parsed = parseTokens(await readFile(TOKENS_PATH, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return (
      <main className="min-h-screen bg-surface-page p-6">
        <p className="text-row-title rounded-control border border-border-default bg-surface-card p-4">
          Could not read src/styles/tokens.css: {reason}
        </p>
      </main>
    );
  }

  const { variables, textStyles } = parsed;
  const colours = variables.filter((v) => v.name.startsWith('--color-'));
  const radii = variables.filter((v) => v.name.startsWith('--radius-'));
  const shadows = variables.filter((v) => v.name.startsWith('--shadow-'));
  const blurs = variables.filter((v) => v.name.startsWith('--blur-'));
  const fonts = variables.filter((v) => v.name.startsWith('--font-'));
  const spacing = variables.filter(
    (v) => v.name.startsWith('--space-') && !v.name.startsWith('--space-off-'),
  );
  const offScale = variables.filter((v) => v.name.startsWith('--space-off-'));
  const layout = variables.filter((v) => v.name.startsWith('--layout-'));

  const colourGroups = groupBy(colours, (token) =>
    stripPrefix(token.name, '--color-').split('-')[0],
  );
  const styleGroups = groupBy(textStyles, (style) => style.family);

  const surfaceValues = SURFACE_TOKENS.map((name) => ({
    name,
    value: valueOf(variables, name) ?? '',
  }));
  const textColours = colours.filter(
    (token) =>
      !EXCLUDED_FROM_MATRIX.includes(token.name) &&
      TEXT_TOKEN_PREFIXES.some((prefix) => token.name.startsWith(prefix)),
  );

  const segmentWidths = LAYOUT_SEGMENTS.map((segment) =>
    pixels(valueOf(variables, segment.token)),
  );
  const segmentTotal = segmentWidths.reduce((sum, width) => sum + width, 0);
  const pageWidth = pixels(valueOf(variables, '--layout-page-width'));

  return (
    <main className="min-h-screen bg-surface-page px-6 py-8">
      <div className="mx-auto flex max-w-(--layout-page-width) flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-range-title">Design tokens</h1>
          <p className="text-caption text-text-secondary">
            Read from src/styles/tokens.css on every request. Compare with Figma page 05, section 3
            (node 5934:788). Dev pages return 404 in production unless ENABLE_DEV_PAGES=1.
          </p>
          <p className="text-caption text-text-secondary">
            {colours.length} colours, {radii.length} radii, {shadows.length} shadow, {blurs.length} blur,{' '}
            {spacing.length + offScale.length} spacing values, {layout.length} layout values,{' '}
            {fonts.length} font families, {textStyles.length} text styles.
          </p>
          {textStyles.length !== EXPECTED_TEXT_STYLES ? (
            <p className="text-row-meta rounded-control border border-border-default bg-brand-amber-light p-3 text-text-amber">
              Expected {EXPECTED_TEXT_STYLES} text styles but found {textStyles.length}. Check that
              every .text-* rule in tokens.css is on one line.
            </p>
          ) : null}
        </header>

        <nav aria-label="Sections">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {['colour', 'typography', 'spacing', 'radius', 'shadow', 'contrast', 'integration'].map((id) => (
              <li key={id}>
                <a href={`#${id}`} className="text-card-title text-brand-indigo underline underline-offset-2">
                  {id}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Section id="colour" title="Colour">
          <div className="flex flex-col gap-6">
            {colourGroups.map((group) => (
              <div key={group.key}>
                <h3 className="text-card-title mb-3 text-text-secondary">{group.key}</h3>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
                  {group.items.map((token) => (
                    <ColourCard key={token.name} token={token} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="typography" title="Typography">
          <h3 className="text-card-title mb-3 text-text-secondary">Font families</h3>
          <ul className="mb-8 grid gap-4 md:grid-cols-2">
            {fonts.map((font) => {
              const specimen = FAMILY_SPECIMENS[font.name];
              return (
                <li key={font.name} className="rounded-control border border-border-default p-4">
                  <p className="text-card-title">
                    {font.name} ({FAMILY_LABELS[font.name] ?? 'unknown'})
                  </p>
                  <p className="text-caption mb-3 break-words font-mono text-text-secondary">
                    {font.value}
                  </p>
                  {specimen ? (
                    <p className={specimen.className}>{specimen.text}</p>
                  ) : null}
                  {font.note ? (
                    <p className="text-caption mt-3 text-text-secondary">{font.note}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="text-caption mb-6 text-text-secondary">
            If the Barlow specimens look like Arial or Helvetica, the font did not load.
          </p>

          <h3 className="text-card-title mb-3 text-text-secondary">Text styles</h3>
          {styleGroups.map((group) => (
            <div key={group.key} className="mb-6 last:mb-0">
              <h4 className="text-card-title mb-2">
                {group.key} ({FAMILY_LABELS[group.key] ?? 'unknown'}), {group.items.length} styles
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border-default text-text-secondary">
                      <th scope="col" className={HEAD_CELL}>Class</th>
                      <th scope="col" className={HEAD_CELL}>Weight</th>
                      <th scope="col" className={HEAD_CELL}>Size</th>
                      <th scope="col" className={HEAD_CELL}>Line height</th>
                      <th scope="col" className={HEAD_CELL}>Letter spacing</th>
                      <th scope="col" className={HEAD_CELL}>Preview</th>
                      <th scope="col" className={HEAD_CELL_LAST}>Used for</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((style) => (
                      <StyleRow key={style.className} style={style} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Section>

        <Section id="spacing" title="Spacing and layout">
          <h3 className="text-card-title mb-3 text-text-secondary">Scale</h3>
          <SpacingList tokens={spacing} />

          <h3 className="text-card-title mb-1 mt-8 text-text-secondary">Off-scale values kept 1:1</h3>
          <p className="text-caption mb-3 text-text-secondary">
            Open question C in HANDOFF.md section 5: decided to keep the design values.
          </p>
          <SpacingList tokens={offScale} />

          <h3 className="text-card-title mb-1 mt-8 text-text-secondary">Desktop grid</h3>
          <p className="text-caption mb-3 text-text-secondary">
            {pageWidth} = {segmentWidths.join(' + ')} = {segmentTotal}.{' '}
            {segmentTotal === pageWidth
              ? 'The columns add up to the page width.'
              : 'Mismatch: the columns do not add up to the page width.'}
          </p>
          <div className="overflow-x-auto">
            <div
              className="flex h-16 border border-border-default"
              style={{ width: 'var(--layout-page-width)' }}
            >
              {LAYOUT_SEGMENTS.map((segment, index) => (
                <div
                  key={`${index}-${segment.token}`}
                  aria-hidden="true"
                  className={`${segment.tone} shrink-0 border-r border-border-default last:border-r-0`}
                  style={{ width: `var(${segment.token})` }}
                />
              ))}
            </div>
          </div>
          <table className="mt-4 border-collapse text-left">
            <tbody>
              {layout.map((token) => (
                <tr key={token.name} className="border-b border-border-separator">
                  <th scope="row" className="text-caption py-1 pr-6 text-left font-mono font-normal">
                    {token.name}
                  </th>
                  <td className="text-caption py-1 pr-6 font-mono">{token.value}</td>
                  <td className="text-caption py-1 text-text-secondary">{token.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section id="radius" title="Radius">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-default text-text-secondary">
                  <th scope="col" className={HEAD_CELL}>Token</th>
                  <th scope="col" className={HEAD_CELL}>Value</th>
                  <th scope="col" className={HEAD_CELL}>Preview</th>
                  <th scope="col" className={HEAD_CELL_LAST}>Used for</th>
                </tr>
              </thead>
              <tbody>
                {radii.map((token) => (
                  <tr key={token.name} className="border-b border-border-separator align-middle">
                    <th scope="row" className="text-caption py-2 pr-4 text-left font-mono font-normal">
                      {token.name}
                    </th>
                    <td className="text-caption py-2 pr-4 font-mono">{token.value}</td>
                    <td className="py-2 pr-4">
                      <div
                        aria-hidden="true"
                        className="h-10 w-24 border border-border-keyline bg-surface-inset"
                        style={{ borderRadius: `var(${token.name})` }}
                      />
                    </td>
                    <td className="text-caption py-2 text-text-secondary">{token.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="shadow" title="Shadow and blur">
          <ul className="grid gap-4">
            {shadows.map((token) => (
              <li key={token.name} className="rounded-control bg-surface-page p-6">
                <div
                  aria-hidden="true"
                  className="h-16 w-48 rounded-control bg-surface-card"
                  style={{ boxShadow: `var(${token.name})` }}
                />
                <p className="text-card-title mt-4">{token.name}</p>
                <p className="text-caption break-words font-mono text-text-secondary">{token.value}</p>
                <p className="text-caption text-text-secondary">{token.note}</p>
              </li>
            ))}
            {blurs.map((token) => (
              <li key={token.name} className="rounded-control border border-border-default p-4">
                <p className="text-card-title">{token.name}</p>
                <p className="text-caption font-mono text-text-secondary">{token.value}</p>
                <p className="text-caption text-text-secondary">{token.note}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="contrast" title="Contrast">
          <p className="text-caption mb-4 text-text-secondary">
            WCAG ratio of each text-like colour on each surface. These are not real pairings, only a
            map of what the palette allows. Ratios below 4.5:1 are marked. Open question E in
            HANDOFF.md section 5: the values are deferred, so none is changed here.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-default text-text-secondary">
                  <th scope="col" className={HEAD_CELL}>Text colour</th>
                  {surfaceValues.map((surface) => (
                    <th key={surface.name} scope="col" className={HEAD_CELL}>
                      on {stripPrefix(surface.name, '--color-')}
                      <span className="block font-mono font-normal">{surface.value}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {textColours.map((token) => (
                  <tr key={token.name} className="border-b border-border-separator align-baseline">
                    <th scope="row" className="text-caption py-2 pr-4 text-left font-normal">
                      <span className="font-mono">{stripPrefix(token.name, '--color-')}</span>
                      <span className="block font-mono text-text-secondary">{token.value}</span>
                    </th>
                    {surfaceValues.map((surface) => (
                      <td key={surface.name} className="text-caption py-2 pr-4">
                        <RatioCell ratio={contrastRatio(token.value, surface.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-card-title mb-2 mt-8 text-text-secondary">Pairs implied by the token notes</h3>
          <ul className="grid gap-1">
            {CONTRAST_PAIRS.map((pair) => (
              <li key={`${pair.foreground}-${pair.background}`} className="text-caption">
                {pair.label}:{' '}
                <RatioCell
                  ratio={contrastRatio(
                    valueOf(variables, pair.foreground) ?? '',
                    valueOf(variables, pair.background) ?? '',
                  )}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="integration" title="Integration">
          <p className="text-caption mb-4 text-text-secondary">
            The old globals.css resets links and buttons without a cascade layer. Inside og-root those
            resets are rolled back, so utilities and text styles reach links and buttons. If the link
            below is not indigo and underlined, or the button label is not Barlow Condensed, the
            rollback failed.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="#integration"
              className="text-card-title text-brand-indigo underline underline-offset-2"
            >
              Indigo underlined link
            </a>
            <button
              type="button"
              className="text-cta h-9 rounded-control bg-brand-amber px-4 text-brand-ink"
            >
              SIGN IN
            </button>
          </div>
        </Section>
      </div>
    </main>
  );
}
