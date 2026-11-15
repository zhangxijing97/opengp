// Pure mapping from provider result rows to canonical ClassificationRows.
// One published source per session (contract section 1.6): Jolpica for
// Race/Sprint/Qualifying, OpenF1 /session_result for Practice/Sprint
// Qualifying. Ranks always come from the provider, never from sorting laps.

import { slugify } from '../../canonical/canonical-id';
import type {
  ClassificationRow,
  ClassificationStatus,
  FinishStatus,
  QualifyingPhase,
  ResultGap,
  ResultPreview,
} from '../../canonical/results.types';
import type {
  JolpicaDriver,
  JolpicaQualifyingRow,
  JolpicaResultRow,
} from '../../data-providers/jolpica/jolpica.types';
import type {
  OpenF1ApiDriver,
  OpenF1ApiSessionResult,
} from '../../data-providers/openf1/openf1-api.types';
import type { F1SessionKind } from '../f1-session-kind';

export interface RowContext {
  sessionId: string;
  roundId: string;
}

/** "1:31.504", "31.504" or "1:32:11.123" -> milliseconds. */
export function parseLapTimeMs(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = /^(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(text.trim());
  if (!match) return null;
  const parts = [match[1], match[2]]
    .filter((part) => part !== undefined)
    .map(Number);
  const seconds = Number(match[3]);
  const [hours, minutes] = parts.length === 2 ? parts : [0, parts[0] ?? 0];
  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

/** milliseconds -> "1:31.504" (or "1:32:11.123" for an hour or more). */
export function formatLapTimeMs(ms: number): string {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(3).padStart(6, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

function driverIdOf(driverId: string): string {
  return `f1:driver:${slugify(driverId)}`;
}

function rowIds(ctx: RowContext, number: string | null, fallback: string) {
  const key = number ?? slugify(fallback);
  return {
    id: `${ctx.sessionId}:driver-${key}`,
    roundEntryId: `${ctx.roundId}:entry-${key}`,
  };
}

function isFinished(status: string | undefined): boolean {
  if (!status) return false;
  return (
    status === 'Finished' ||
    status === 'Lapped' ||
    /^\+\d+ Laps?$/i.test(status)
  );
}

/**
 * Jolpica positionText codes: digits = classified, R = retired (not
 * classified), D = disqualified, E = excluded, W = withdrawn (did not start),
 * F = failed to qualify, N = not classified.
 */
export function jolpicaStatuses(
  positionText: string,
  status: string | undefined,
): { classificationStatus: ClassificationStatus; finishStatus: FinishStatus } {
  if (/^\d+$/.test(positionText)) {
    return {
      classificationStatus: 'classified',
      finishStatus: isFinished(status)
        ? 'finished'
        : status
          ? 'dnf'
          : 'unknown',
    };
  }
  switch (positionText) {
    case 'R':
      return {
        classificationStatus: 'not_classified',
        finishStatus:
          status && /not classified/i.test(status) ? 'unknown' : 'dnf',
      };
    case 'D':
    case 'E':
      return { classificationStatus: 'dsq', finishStatus: 'dsq' };
    case 'W':
      return { classificationStatus: 'dns', finishStatus: 'dns' };
    case 'F':
      return { classificationStatus: 'dnq', finishStatus: 'dns' };
    case 'N':
      return {
        classificationStatus: 'not_classified',
        finishStatus: 'unknown',
      };
    default:
      return { classificationStatus: 'unknown', finishStatus: 'unknown' };
  }
}

function jolpicaGap(
  row: JolpicaResultRow,
  position: number | null,
): ResultGap | null {
  if (position === 1) return null;
  const timeText = row.Time?.time;
  if (timeText?.startsWith('+')) {
    const ms = parseLapTimeMs(timeText.slice(1));
    if (ms !== null) return { kind: 'time_ms', value: ms };
  }
  const lapped = row.status ? /^\+(\d+) Laps?$/i.exec(row.status) : null;
  if (lapped) return { kind: 'laps', value: Number(lapped[1]) };
  return null;
}

function jolpicaDriver(driver: JolpicaDriver, number: string | null) {
  return {
    id: driverIdOf(driver.driverId),
    displayName: `${driver.givenName} ${driver.familyName}`,
    number,
    code: driver.code ?? null,
  };
}

/** Race or Sprint results (Jolpica). Provider order is preserved. */
export function mapJolpicaResultRows(
  rows: JolpicaResultRow[],
  ctx: RowContext,
): ClassificationRow[] {
  return rows.map((row) => {
    const number = row.number ?? row.Driver.permanentNumber ?? null;
    const statuses = jolpicaStatuses(row.positionText, row.status);
    const position =
      statuses.classificationStatus === 'classified'
        ? Number(row.positionText)
        : null;
    const millis = row.Time?.millis;
    return {
      ...rowIds(ctx, number, row.Driver.driverId),
      sessionEntryId: null,
      driver: jolpicaDriver(row.Driver, number),
      team: row.Constructor
        ? {
            id: `f1:team:${slugify(row.Constructor.constructorId)}`,
            name: row.Constructor.name,
          }
        : null,
      position,
      positionText: row.positionText,
      ...statuses,
      laps:
        row.laps !== undefined && /^\d+$/.test(row.laps)
          ? Number(row.laps)
          : null,
      points: row.points ?? null,
      bestLapMs: parseLapTimeMs(row.FastestLap?.Time?.time),
      elapsedMs:
        millis !== undefined && /^\d+$/.test(millis) ? Number(millis) : null,
      gap: jolpicaGap(row, position),
    };
  });
}

/** Qualifying results (Jolpica); Q1/Q2/Q3 keep their nulls. */
export function mapJolpicaQualifyingRows(
  rows: JolpicaQualifyingRow[],
  ctx: RowContext,
): ClassificationRow[] {
  return rows.map((row) => {
    const number = row.number ?? row.Driver.permanentNumber ?? null;
    const position =
      row.position && /^\d+$/.test(row.position) ? Number(row.position) : null;
    return {
      ...rowIds(ctx, number, row.Driver.driverId),
      sessionEntryId: null,
      driver: jolpicaDriver(row.Driver, number),
      team: row.Constructor
        ? {
            id: `f1:team:${slugify(row.Constructor.constructorId)}`,
            name: row.Constructor.name,
          }
        : null,
      position,
      positionText: row.position ?? null,
      classificationStatus: position !== null ? 'classified' : 'unknown',
      finishStatus: 'unknown',
      laps: null,
      points: null,
      bestLapMs: null,
      elapsedMs: null,
      gap: null,
      qualifyingPhases: (['Q1', 'Q2', 'Q3'] as const).map((phase) => ({
        phase,
        timeMs: parseLapTimeMs(row[phase]),
      })),
    };
  });
}

/**
 * Links an OpenF1 driver to a Jolpica driver only on two matching facts:
 * season car number AND (abbreviation OR family name). Never by number alone.
 */
export function matchJolpicaDriver(
  driver: OpenF1ApiDriver,
  seasonDrivers: JolpicaDriver[],
): JolpicaDriver | null {
  const number = String(driver.driver_number);
  const matches = seasonDrivers.filter(
    (candidate) =>
      candidate.permanentNumber === number &&
      ((driver.name_acronym !== null &&
        candidate.code === driver.name_acronym) ||
        (driver.last_name !== null &&
          candidate.familyName.toLowerCase() ===
            driver.last_name.toLowerCase())),
  );
  return matches.length === 1 ? matches[0] : null;
}

function secondsToMs(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000);
}

/** Practice / Sprint Qualifying results (OpenF1 /session_result). */
export function mapOpenF1ResultRows(
  kind: F1SessionKind,
  results: OpenF1ApiSessionResult[],
  drivers: OpenF1ApiDriver[],
  seasonDrivers: JolpicaDriver[],
  ctx: RowContext,
): { rows: ClassificationRow[]; unmatchedDrivers: number } {
  const byNumber = new Map(
    drivers.map((driver) => [driver.driver_number, driver]),
  );
  let unmatchedDrivers = 0;
  const qualifyingType = kind === 'sprint_qualifying' || kind === 'qualifying';

  const rows = results.map((result): ClassificationRow => {
    const number = String(result.driver_number);
    const driver = byNumber.get(result.driver_number) ?? null;
    const matched = driver ? matchJolpicaDriver(driver, seasonDrivers) : null;
    if (!matched) unmatchedDrivers++;
    const displayName = matched
      ? `${matched.givenName} ${matched.familyName}`
      : (driver?.full_name ?? `Car ${number}`);

    let classificationStatus: ClassificationStatus = 'unknown';
    if (result.dsq) classificationStatus = 'dsq';
    else if (result.dns) classificationStatus = 'dns';
    else if (result.position !== null) classificationStatus = 'classified';

    let finishStatus: FinishStatus = 'unknown';
    if (result.dsq) finishStatus = 'dsq';
    else if (result.dns) finishStatus = 'dns';
    else if (result.dnf) finishStatus = 'dnf';

    const phases = Array.isArray(result.duration) ? result.duration : null;
    const single = typeof result.duration === 'number' ? result.duration : null;
    const gapValue = Array.isArray(result.gap_to_leader)
      ? null
      : result.gap_to_leader;
    let gap: ResultGap | null = null;
    if (!qualifyingType && typeof gapValue === 'number' && gapValue > 0) {
      gap = { kind: 'time_ms', value: Math.round(gapValue * 1000) };
    } else if (
      !qualifyingType &&
      typeof gapValue === 'string' &&
      gapValue.length > 0
    ) {
      gap = { kind: 'text', value: gapValue };
    }

    const row: ClassificationRow = {
      ...rowIds(ctx, number, number),
      sessionEntryId: null,
      driver: {
        id: matched
          ? driverIdOf(matched.driverId)
          : `f1:driver:${slugify(driver?.full_name ?? `car-${number}`)}`,
        displayName,
        number,
        code: matched?.code ?? driver?.name_acronym ?? null,
      },
      team: null,
      position: result.position,
      positionText:
        result.position !== null
          ? String(result.position)
          : result.dsq
            ? 'DSQ'
            : result.dns
              ? 'DNS'
              : null,
      classificationStatus,
      finishStatus,
      laps: result.number_of_laps,
      points: typeof result.points === 'number' ? String(result.points) : null,
      bestLapMs: qualifyingType ? null : secondsToMs(single),
      elapsedMs: null,
      gap,
    };
    if (qualifyingType && phases) {
      row.qualifyingPhases = phases.slice(0, 3).map((value, index) => ({
        phase: (['Q1', 'Q2', 'Q3'] as const)[index],
        timeMs: secondsToMs(value),
      }));
    }
    return row;
  });

  // Provider ranks first, unranked rows after, original order otherwise.
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        (a.row.position ?? Number.MAX_SAFE_INTEGER) -
          (b.row.position ?? Number.MAX_SAFE_INTEGER) || a.index - b.index,
    )
    .map((item) => item.row);
  return { rows: ordered, unmatchedDrivers };
}

function lastPhaseTime(phases: QualifyingPhase[] | undefined): number | null {
  const times = (phases ?? [])
    .map((phase) => phase.timeMs)
    .filter((value): value is number => value !== null);
  return times.length > 0 ? times[times.length - 1] : null;
}

/**
 * List teaser by session tier (decision D4):
 * L1 Race / Sprint / Qualifying -> top three; L2 Sprint Qualifying -> pole;
 * L3 Practice -> leader with best lap.
 */
export function buildResultPreview(
  kind: F1SessionKind,
  rows: ClassificationRow[],
): ResultPreview | null {
  const ranked = rows
    .filter(
      (row) =>
        row.classificationStatus === 'classified' && row.position !== null,
    )
    .sort((a, b) => (a.position as number) - (b.position as number));
  const toEntry = (row: ClassificationRow) => ({
    position: row.position,
    name: row.driver?.displayName ?? row.positionText ?? 'Unknown',
    code: row.driver?.code ?? null,
    teamName: row.team?.name ?? null,
  });

  if (kind === 'race' || kind === 'sprint' || kind === 'qualifying') {
    const top = ranked
      .filter((row) => (row.position as number) <= 3)
      .slice(0, 3);
    if (top.length === 0) return null;
    const entries = top.map(toEntry);
    return {
      kind: 'top_three',
      names: entries.map((e) => e.name),
      metricLabel: null,
      entries,
    };
  }

  const leader = ranked.find((row) => row.position === 1);
  if (!leader) return null;
  const entry = toEntry(leader);
  if (kind === 'sprint_qualifying') {
    const time = lastPhaseTime(leader.qualifyingPhases);
    return {
      kind: 'pole',
      names: [entry.name],
      metricLabel: time !== null ? formatLapTimeMs(time) : null,
      entries: [entry],
    };
  }
  return {
    kind: 'practice_leader',
    names: [entry.name],
    metricLabel:
      leader.bestLapMs !== null ? formatLapTimeMs(leader.bestLapMs) : null,
    entries: [entry],
  };
}
