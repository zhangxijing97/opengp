import { familyName } from '../../lib/home/standings-model';
import type { ResultRowVM } from '../../lib/home/types';

// The result blocks of a finished session row (Figma components ResultInline, ResultPodium and the
// result line of the single-line rows), built from the result teaser of the API: position, name, team.
// The teaser has no car number, so a driver is shown by family name. It also has no time or gap, so the
// podium rows have no time on the right yet (the design shows one; it needs `valueLabel` in the teaser).

const POSITION_COLOUR: Record<number, string> = {
  1: 'text-position-1',
  2: 'text-position-2',
  3: 'text-position-3',
};

function positionOf(entry: ResultRowVM, index: number): number {
  return entry.position ?? index + 1;
}

function PositionLabel({ label, position }: { label: string; position: number }) {
  return <span className={`text-row-result-label ${POSITION_COLOUR[position] ?? 'text-text-tertiary'}`}>{label}</span>;
}

// The team bar: 3px wide, in the team colour. Practice and sprint qualifying have no team, so no bar.
function TeamBar({ colour, height }: { colour: string | undefined; height: 'h-3.25' | 'h-3.5' | 'h-3.75' }) {
  if (!colour) return null;
  return (
    <span
      aria-hidden="true"
      className={`w-0.75 shrink-0 rounded-segment ${height}`}
      style={{ backgroundColor: colour }}
    />
  );
}

/** One line for the single-line rows: `P1 | name` (sprint qualifying) or `Fastest | name` (practice). */
export function ResultLine({ entry, label }: { entry: ResultRowVM; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <PositionLabel label={label} position={1} />
      <TeamBar colour={entry.teamColor} height="h-3.5" />
      <span className="text-row-result-name whitespace-nowrap">{familyName(entry.name)}</span>
    </span>
  );
}

/** Qualifying and sprint (tier T2): the winner in large type, the next two under it. */
export function ResultInline({ entries }: { entries: readonly ResultRowVM[] }) {
  const [first, ...rest] = entries;
  if (!first) return null;
  return (
    <span className="flex shrink-0 flex-col items-end gap-(--space-off-3)">
      <span className="flex items-center gap-1.25">
        <PositionLabel label="P1" position={1} />
        <TeamBar colour={first.teamColor} height="h-3.75" />
        <span className="text-podium-name-lg whitespace-nowrap uppercase">{familyName(first.name)}</span>
      </span>
      {rest.length > 0 ? (
        <span className="flex gap-3">
          {rest.slice(0, 2).map((entry, index) => {
            const position = positionOf(entry, index + 1);
            return (
              <span key={`${position}:${entry.name}`} className="flex items-center gap-1.25">
                <PositionLabel label={`P${position}`} position={position} />
                <TeamBar colour={entry.teamColor} height="h-3.25" />
                <span className="text-row-result-name whitespace-nowrap">{familyName(entry.name)}</span>
              </span>
            );
          })}
        </span>
      ) : null}
    </span>
  );
}

/** The main race (tier T1): a grey box with the top three, the winner on white. 240 x 86. */
export function ResultPodium({ entries }: { entries: readonly ResultRowVM[] }) {
  if (entries.length === 0) return null;
  return (
    <span className="flex w-60 shrink-0 flex-col gap-0.5 rounded-control bg-surface-inset px-2.5 py-1.75">
      {entries.slice(0, 3).map((entry, index) => {
        const position = positionOf(entry, index);
        const winner = position === 1;
        return (
          <span
            key={`${position}:${entry.name}`}
            className={`flex items-center justify-between ${winner ? 'rounded-plate bg-surface-card px-1.5 py-0.75' : 'py-0.5'}`}
          >
            <span className="flex h-4.5 items-center gap-1.5">
              <PositionLabel label={`P${position}`} position={position} />
              <TeamBar colour={entry.teamColor} height="h-3.25" />
              <span className={`text-podium-name whitespace-nowrap uppercase ${winner ? 'text-brand-ink' : 'text-text-secondary'}`}>
                {familyName(entry.name)}
              </span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
