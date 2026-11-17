'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { useNow } from '../../lib/client-state/clock';
import { useDelayedFlag } from '../../lib/client-state/delayed';
import { useFollowing } from '../../lib/client-state/following';
import { useHydrated } from '../../lib/client-state/hydrated';
import { effectiveTimeZone, useSettings } from '../../lib/client-state/settings';
import { buildHomeVMFromRounds } from '../../lib/home/adapter-v1';
import { timeZoneLabel } from '../../lib/home/format';
import type { HomeFailure, ScheduleData } from '../../lib/home/home-data';
import { countsByDay, primaryDays, sectionCount, visibleDays } from '../../lib/home/home-model';
import { sessionCountLabel } from '../../lib/home/labels';
import { routes } from '../../lib/home/routes';
import { themeById } from '../../lib/home/series-theme';
import type { DayScheduleVM } from '../../lib/home/types';
import { localDate, mondayOf } from '../../lib/home/week';
import { WEEK_CELL_ID, buildWeekStrip } from '../../lib/home/week-strip';
import { DaySchedule } from './DaySchedule';
import { RetryButton } from './RetryButton';
import { SectionHeader } from './SectionHeader';
import { ErrorState } from './states';
import { TimeSelector } from './TimeSelector';

// The middle column of the Home (page 05 of the design): the time selector and the day schedules of one week.
//
// The server loaded ONE week by track date, in UTC (it does not know the visitor's time zone). Here, in the
// browser, the sessions are grouped into days in the visitor's zone, which is why this is a client component: the
// first render uses UTC and the server's clock, so it matches the server's HTML, and the real zone arrives right
// after. Series without data answer with no rounds (series-sources.ts).
//
// Going to another week keeps this column on screen until the new week has arrived (a React transition around
// router.push), so nothing blanks or jumps. The click shows at once: the arrow spins and the line under the title
// names the week being loaded. The list dims only if the wait is longer than a blink, so a fast answer does not
// flicker. This component is not remounted by a new week, so the focus stays on the arrow that was pressed.

/** The list dims only after this long, so a quick answer does not flicker. */
const DIM_AFTER_MS = 150;

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

/** State that starts again when the week changes: the chosen day and the open sections belong to one week. */
function useWeekScoped<T>(week: string, initial: T): readonly [T, (next: T) => void] {
  const [state, setState] = useState({ week, value: initial });
  return [state.week === week ? state.value : initial, (next: T) => setState({ week, value: next })];
}

function failureSentence(failures: readonly HomeFailure[]): string {
  const names = [...new Set(failures.map((failure) => themeById(failure.seriesId)?.name ?? failure.seriesId))].join(', ');
  return failures.some((failure) => failure.code === 'TIMEOUT')
    ? `${names} took too long to answer.`
    : `${names} did not answer.`;
}

export function ScheduleColumn({ data }: { data: ScheduleData }) {
  const router = useRouter();
  const settings = useSettings();
  const hydrated = useHydrated();
  const nowMs = useNow(data.renderedAtMs);
  const following = useFollowing();
  const userTimeZone = hydrated ? effectiveTimeZone(settings) : 'UTC';
  const week = data.week;

  const [isNavigating, startNavigation] = useTransition();
  const [requestedWeek, setRequestedWeek] = useState<string | null>(null);
  // Derived from the transition, so it cannot get stuck: it ends when the new week arrives or the request ends.
  const pendingWeek = isNavigating && requestedWeek !== null && requestedWeek !== week ? requestedWeek : null;
  const dimmed = useDelayedFlag(pendingWeek !== null, DIM_AFTER_MS);
  function goToWeek(target: string) {
    setRequestedWeek(target);
    startNavigation(() => {
      router.push(`${routes.home}?week=${target}`, { scroll: false });
    });
  }

  const [selected, setSelected] = useWeekScoped(week, WEEK_CELL_ID);
  const [followingOpen, setFollowingOpen] = useWeekScoped(week, true);
  const [allOpen, setAllOpen] = useWeekScoped(week, true);

  // The status of a session (live, finished) comes from the server's clock. While a session is in progress and the
  // page is open and visible, ask the server again every minute. Without a live session nothing is refreshed.
  const hasLive = data.rounds.some((round) =>
    round.sessions.some((session) => session.lifecycle.status === 'in_progress'),
  );
  useEffect(() => {
    if (!hasLive) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [hasLive, router]);

  const followedIds = useMemo(() => new Set(following.seriesIds), [following.seriesIds]);
  const vm = useMemo(
    () => buildHomeVMFromRounds(data.rounds, { userTimeZone, nowMs, followedSeriesIds: followedIds }, week),
    [data.rounds, userTimeZone, nowMs, followedIds, week],
  );

  // A failed request is not an empty week: with nothing to show and a failure, the lists give way to the error, and
  // the counts say "–", never "0".
  const failedAll = data.failures.length > 0 && data.rounds.length === 0;
  const todayKey = localDate(nowMs, userTimeZone);
  const follows = followedIds.size > 0;
  const cells = buildWeekStrip({
    weekStart: week,
    todayKey,
    selected,
    counts: countsByDay(primaryDays(vm, follows)),
    unavailable: failedAll,
  });
  const followingDays = visibleDays(vm.following, selected);
  const allDays = visibleDays(vm.allSeries, selected);

  return (
    <section
      aria-label="Schedule"
      aria-busy={pendingWeek !== null}
      className="flex w-(--layout-col-main) shrink-0 flex-col gap-4"
    >
      <TimeSelector
        weekStart={week}
        currentWeekStart={mondayOf(todayKey)}
        cells={cells}
        zoneLabel={timeZoneLabel(userTimeZone, new Date(nowMs))}
        pendingWeek={pendingWeek}
        onSelect={setSelected}
        onNavigate={goToWeek}
      />

      {failedAll ? (
        <ErrorState title="The schedule could not be loaded" code={data.failures[0].code}>
          <p>{failureSentence(data.failures)} That does not mean there are no sessions this week.</p>
          <div className="mt-3">
            <RetryButton />
          </div>
        </ErrorState>
      ) : (
        <>
          {data.failures.length > 0 ? (
            <ErrorState title="Some schedules could not be loaded" code={data.failures[0].code}>
              <p>{failureSentence(data.failures)} What is shown below may be incomplete.</p>
              <div className="mt-3">
                <RetryButton />
              </div>
            </ErrorState>
          ) : null}

          <div
            className={`flex flex-col gap-4 transition-opacity motion-reduce:transition-none ${dimmed ? 'opacity-60' : ''}`}
          >
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
          </div>
        </>
      )}
    </section>
  );
}
