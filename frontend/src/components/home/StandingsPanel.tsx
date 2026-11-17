'use client';

import { useMemo, useState } from 'react';
import type { StandingsSubjectType } from '../../lib/api-v1/types';
import { useDelayedFlag } from '../../lib/client-state/delayed';
import { useStandings } from '../../lib/client-state/standings';
import type { StandingsTarget } from '../../lib/home/standings-data';
import { buildStandingsVM } from '../../lib/home/standings-model';
import type { RulerSegment, StandingsRowVM } from '../../lib/home/standings-model';
import { StandingsSkeleton } from './HomeSkeletons';

// The right column (Figma component SidebarStandings): the series title, where the season stands (ROUND 20 / 24
// and the ruler), the Drivers / Teams switch, the table, and the legend of the green bar. From the design this
// leaves out: the carousel over series (only Formula 1 has standings) and the podiums column (the API has no
// podium counts). TODO(design) for both.
//
// The panel loads its own data (src/lib/client-state/standings.ts) and never holds the schedule back. It is in
// one of four states, and they never look alike: loading (the skeleton, with the real title), failed (a message
// and Try again), published (the table), and not published yet.

const GRID = 'grid grid-cols-[34px_1fr_28px_42px] items-center gap-x-1.5 px-4';
const PANEL = 'w-72 shrink-0 overflow-hidden rounded-surface border border-border-default bg-surface-card';
const SLOW_AFTER_MS = 4_000;

// The roundel of the top three: a disc in gold, indigo or ink with a thin light ring inside.
function Roundel({ rank }: { rank: 1 | 2 | 3 }) {
  const fill = rank === 1 ? 'fill-brand-amber' : rank === 2 ? 'fill-brand-indigo' : 'fill-brand-ink';
  const text = rank === 1 ? 'text-brand-ink' : 'text-text-on-brand';
  return (
    <span className="relative inline-flex size-5.5 items-center justify-center">
      <svg className="absolute inset-0" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" strokeWidth="1.4" className={`${fill} stroke-brand-ink`} />
        <circle cx="11" cy="11" r="7.5" fill="none" strokeWidth="0.7" strokeOpacity="0.55" className="stroke-text-on-brand" />
      </svg>
      <span className={`text-roundel relative ${text}`}>{rank}</span>
    </span>
  );
}

function Row({ row }: { row: StandingsRowVM }) {
  return (
    <li className={`${GRID} relative py-1.5`}>
      {row.canStillWin ? (
        <span aria-hidden="true" className="absolute top-1.5 left-0 h-5.5 w-0.75 rounded-segment bg-status-live" />
      ) : null}
      <span className="flex h-5.5 items-center">
        {row.roundel ? <Roundel rank={row.roundel} /> : <span className="text-table-pos pl-2">{row.rankText}</span>}
      </span>
      <span className="flex min-w-0 items-center gap-(--space-off-7)">
        <span aria-hidden="true" className="h-3.5 w-0.75 shrink-0 rounded-segment" style={{ backgroundColor: row.teamColour }} />
        <span className="text-table-driver truncate" title={row.fullName}>
          {row.label}
        </span>
      </span>
      <span className="text-table-stat text-center">{row.wins}</span>
      <span className="text-table-points text-right">{row.points}</span>
    </li>
  );
}

function Segment({ kind }: { kind: RulerSegment }) {
  const shape =
    kind === 'current'
      ? 'h-5 bg-brand-amber'
      : kind === 'done'
        ? 'h-3.5 bg-brand-indigo'
        : 'h-3.5 border border-border-segment';
  return <span className={`w-1.75 shrink-0 rounded-segment ${shape}`} />;
}

function Failure({
  message,
  code,
  loading,
  onRetry,
}: {
  message: string;
  code: string;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="border-t border-border-separator px-4 py-4">
      <p className="text-footer-body text-flag-red">{message}</p>
      <p className="text-caption mt-1 font-mono text-text-tertiary">{code}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        aria-busy={loading || undefined}
        className="text-footer-body mt-3 font-semibold text-text-brand underline disabled:opacity-60"
      >
        {loading ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}

const TABS: { type: StandingsSubjectType; label: string }[] = [
  { type: 'driver', label: 'Drivers' },
  { type: 'team', label: 'Teams' },
];

const NOT_NONE = 'That is not the same as there being none.';

export function StandingsPanel({ target }: { target: StandingsTarget | null }) {
  const [tab, setTab] = useState<StandingsSubjectType>('driver');
  const { entry, loading, retry } = useStandings(target?.seasonId ?? null, target?.week);
  const slow = useDelayedFlag(entry === undefined, SLOW_AFTER_MS);
  const standings = entry?.status === 'ready' ? entry.data : null;
  const data = standings ? (tab === 'driver' ? standings.driver : standings.team) : null;
  const vm = useMemo(() => (data ? buildStandingsVM(data) : null), [data]);
  const failure = standings?.failures.find((item) => item.subjectType === tab);

  if (!target) {
    return (
      <aside aria-label="Standings" className="w-72 shrink-0 rounded-surface border border-border-default bg-surface-card px-4 py-4">
        <p className="text-footer-body text-text-secondary">No standings are available yet.</p>
      </aside>
    );
  }
  if (!entry) return <StandingsSkeleton title={target.seriesName} slow={slow} />;

  if (entry.status === 'error') {
    return (
      <aside aria-label="Standings" className={PANEL}>
        <h2 className="text-series-title px-4 pt-4 pb-3">{target.seriesName}</h2>
        <Failure
          message={`${entry.code === 'TIMEOUT' ? 'The standings took too long to load.' : 'The standings could not be loaded.'} ${NOT_NONE}`}
          code={entry.code}
          loading={loading}
          onRetry={retry}
        />
      </aside>
    );
  }

  return (
    <aside aria-label="Standings" className={PANEL}>
      <h2 className="text-series-title px-4 pt-4 pb-3">{target.seriesName}</h2>

      {vm?.round ? (
        <div className="flex flex-col gap-2 px-4 pb-3.5">
          <div className="flex items-end justify-between">
            <span className="flex items-baseline gap-1.25">
              <span className="text-round-label text-text-tertiary">ROUND</span>
              <span className="text-round-number">{vm.round.current}</span>
              <span className="text-round-total text-text-tertiary">/ {vm.round.total}</span>
            </span>
            <span className="text-season-note text-text-tertiary">{vm.remainingLabel}</span>
          </div>
          <div
            role="img"
            aria-label={`Round ${vm.round.current} of ${vm.round.total}`}
            className="flex h-5 items-center justify-between"
          >
            {vm.ruler.map((kind, index) => (
              <Segment key={index} kind={kind} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex px-4 pb-2.5">
        <div role="group" aria-label="Standings of" className="flex gap-0.5 rounded-track bg-surface-inset p-0.75">
          {TABS.map((item) => (
            <button
              key={item.type}
              type="button"
              aria-pressed={tab === item.type}
              onClick={() => setTab(item.type)}
              className={`flex items-center rounded-pill px-2.5 py-1 ${
                tab === item.type
                  ? 'text-segment-selected bg-brand-indigo-light text-text-brand'
                  : 'text-segment text-text-tertiary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {vm && vm.rows.length > 0 ? (
        <>
          <div className={`${GRID} border-t border-border-separator pt-2 pb-1.5 text-text-tertiary`}>
            <span className="text-table-head">#</span>
            <span className="text-table-head">{tab === 'driver' ? 'DRIVER' : 'TEAM'}</span>
            <span className="text-table-head text-center">W</span>
            <span className="text-table-head text-right">PTS</span>
          </div>
          <ul>
            {vm.rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </ul>
          {vm.showLegend ? (
            <div className="flex items-center gap-2 border-t border-border-separator px-4 py-3">
              <span aria-hidden="true" className="h-3.5 w-0.75 rounded-segment bg-status-live" />
              <span className="text-season-note font-normal text-text-secondary">Can still win the title</span>
            </div>
          ) : null}
        </>
      ) : failure ? (
        <Failure
          message={`${failure.code === 'TIMEOUT' ? 'These standings took too long to load.' : 'These standings could not be loaded.'} ${NOT_NONE}`}
          code={failure.code}
          loading={loading}
          onRetry={retry}
        />
      ) : (
        <p className="text-footer-body border-t border-border-separator px-4 py-4 text-text-secondary">
          The standings are not published yet.
        </p>
      )}
    </aside>
  );
}
