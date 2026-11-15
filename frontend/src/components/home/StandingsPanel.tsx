'use client';

import { useMemo, useState } from 'react';
import type { StandingsSubjectType } from '../../lib/api-v1/types';
import type { HomeStandings } from '../../lib/home/home-data';
import { buildStandingsVM } from '../../lib/home/standings-model';
import type { RulerSegment, StandingsRowVM } from '../../lib/home/standings-model';

// The right column (Figma component SidebarStandings): the series title, where the season stands (ROUND 20 / 24
// and the ruler), the Drivers / Teams switch, the table, and the legend of the green bar. From the design this
// leaves out: the carousel over series (only Formula 1 has standings) and the podiums column (the API has no
// podium counts). TODO(design) for both.

const GRID = 'grid grid-cols-[34px_1fr_28px_42px] items-center gap-x-1.5 px-4';

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

const TABS: { type: StandingsSubjectType; label: string }[] = [
  { type: 'driver', label: 'Drivers' },
  { type: 'team', label: 'Teams' },
];

export function StandingsPanel({ standings }: { standings: HomeStandings | null }) {
  const [tab, setTab] = useState<StandingsSubjectType>('driver');
  const data = standings ? (tab === 'driver' ? standings.driver : standings.team) : null;
  const vm = useMemo(() => (data ? buildStandingsVM(data) : null), [data]);
  const failure = standings?.failures.find((item) => item.subjectType === tab);

  if (!standings) {
    return (
      <aside aria-label="Standings" className="w-72 shrink-0 rounded-surface border border-border-default bg-surface-card px-4 py-4">
        <p className="text-footer-body text-text-secondary">No standings are available yet.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Standings" className="w-72 shrink-0 overflow-hidden rounded-surface border border-border-default bg-surface-card">
      <h2 className="text-series-title px-4 pt-4 pb-3">{standings.seriesName}</h2>

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
      ) : (
        <p className="text-footer-body border-t border-border-separator px-4 py-4 text-text-secondary">
          {failure
            ? `The standings could not be loaded (${failure.code}).`
            : 'The standings are not published yet.'}
        </p>
      )}
    </aside>
  );
}
