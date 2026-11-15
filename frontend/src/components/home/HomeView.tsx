'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNow } from '../../lib/client-state/clock';
import { useFollowing } from '../../lib/client-state/following';
import { useHydrated } from '../../lib/client-state/hydrated';
import { effectiveTimeZone, useSettings } from '../../lib/client-state/settings';
import { buildHomeVMFromRounds } from '../../lib/home/adapter-v1';
import { timeZoneLabel } from '../../lib/home/format';
import type { HomeData } from '../../lib/home/home-data';
import { countsByDay, defaultWeek, primaryDays, sectionCount, visibleDays } from '../../lib/home/home-model';
import { sessionCountLabel } from '../../lib/home/labels';
import { themeById } from '../../lib/home/series-theme';
import type { DayScheduleVM } from '../../lib/home/types';
import { localDate, mondayOf } from '../../lib/home/week';
import { WEEK_CELL_ID, buildWeekStrip } from '../../lib/home/week-strip';
import { DaySchedule } from './DaySchedule';
import { SectionHeader } from './SectionHeader';
import { SeriesSidebar } from './SeriesSidebar';
import { StandingsPanel } from './StandingsPanel';
import { ErrorState } from './states';
import { TimeSelector } from './TimeSelector';

// The Home (page 05 of the design): series lists on the left, the schedule in the middle, standings on
// the right, on the 288 / 648 / 288 grid.
//
// The server loaded the rounds of three weeks in UTC (it does not know the visitor's time zone). Here,
// in the browser, they are grouped into days in the visitor's zone, which is why this is a client
// component: the first render uses UTC and the server's clock, so it matches the server's HTML, and the
// real zone arrives right after. Series without data answer with no rounds (src/lib/home/series-sources.ts).

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-footer-body px-2 text-text-secondary">{children}</p>;
}

function DayList({ days }: { days: readonly DayScheduleVM[] }) {
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <DaySchedule key={day.dayKey} day={day} />
      ))}
    </div>
  );
}

function WeekView({
  week,
  data,
  nowMs,
  userTimeZone,
}: {
  week: string;
  data: HomeData;
  nowMs: number;
  userTimeZone: string;
}) {
  const following = useFollowing();
  const [selected, setSelected] = useState(WEEK_CELL_ID);
  const [followingOpen, setFollowingOpen] = useState(true);
  const [allOpen, setAllOpen] = useState(true);

  const followedIds = useMemo(() => new Set(following.seriesIds), [following.seriesIds]);
  const vm = useMemo(
    () => buildHomeVMFromRounds(data.rounds, { userTimeZone, nowMs, followedSeriesIds: followedIds }, week),
    [data.rounds, userTimeZone, nowMs, followedIds, week],
  );

  const todayKey = localDate(nowMs, userTimeZone);
  const follows = followedIds.size > 0;
  const cells = buildWeekStrip({
    weekStart: week,
    todayKey,
    selected,
    counts: countsByDay(primaryDays(vm, follows)),
  });
  const followingDays = visibleDays(vm.following, selected);
  const allDays = visibleDays(vm.allSeries, selected);
  const failed = data.failures.map((failure) => `${themeById(failure.seriesId)?.name ?? failure.seriesId} (${failure.code})`);

  return (
    <section aria-label="Schedule" className="flex w-(--layout-col-main) shrink-0 flex-col gap-4">
      <TimeSelector
        weekStart={week}
        currentWeekStart={mondayOf(todayKey)}
        cells={cells}
        zoneLabel={timeZoneLabel(userTimeZone, new Date(nowMs))}
        onSelect={setSelected}
      />

      {failed.length > 0 ? (
        <ErrorState title="Some schedules could not be loaded">
          <p>{failed.join(', ')}. What is shown below may be incomplete.</p>
        </ErrorState>
      ) : null}

      <SectionHeader
        kind="following"
        count={`${sessionCountLabel(sectionCount(vm.following))} this week`}
        expanded={followingOpen}
        onToggle={() => setFollowingOpen(!followingOpen)}
      />
      {followingOpen ? (
        !follows ? (
          <Hint>You are not following any series yet. Use the star next to a series on the left.</Hint>
        ) : sectionCount(vm.following) === 0 ? (
          <Hint>No sessions this week for the series you follow.</Hint>
        ) : followingDays.length === 0 ? (
          <Hint>No sessions on this day.</Hint>
        ) : (
          <DayList days={followingDays} />
        )
      ) : null}

      <SectionHeader
        kind="all-series"
        count={`${sessionCountLabel(sectionCount(vm.allSeries))} this week`}
        expanded={allOpen}
        onToggle={() => setAllOpen(!allOpen)}
      />
      {allOpen ? (
        sectionCount(vm.allSeries) === 0 ? (
          <Hint>{follows ? 'No other sessions this week.' : 'No sessions this week.'}</Hint>
        ) : allDays.length === 0 ? (
          <Hint>No sessions on this day.</Hint>
        ) : (
          <DayList days={allDays} />
        )
      ) : null}
    </section>
  );
}

export function HomeView({ data }: { data: HomeData }) {
  const router = useRouter();
  const settings = useSettings();
  const hydrated = useHydrated();
  const nowMs = useNow(data.renderedAtMs);
  const userTimeZone = hydrated ? effectiveTimeZone(settings) : 'UTC';
  const week = data.weekParam ?? defaultWeek(data.rounds, nowMs, userTimeZone);

  // The status of a session (live, finished) comes from the server's clock. Ask the server again every
  // minute while the page is open and visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <div className="mx-auto flex w-(--layout-page-width) items-start gap-6 px-(--space-page) pt-6 pb-12">
      <SeriesSidebar />
      <WeekView key={week} week={week} data={data} nowMs={nowMs} userTimeZone={userTimeZone} />
      <StandingsPanel />
    </div>
  );
}
