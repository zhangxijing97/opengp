import {
  BELGIUM_2021_RACE_ROW,
  BRAZIL_2024_DNS_ROW,
  CHINA_2025_QUALIFYING_ROWS,
  CHINA_2025_RACE_ROWS,
  DRIVERS_2025,
} from '../../../test/fixtures/jolpica-results.fixtures';
import {
  FP1_9988_DRIVERS as FP1_DRIVERS_RAW,
  FP1_9988_RESULTS as FP1_RESULTS_RAW,
  SQ_9989_DRIVERS as SQ_DRIVERS_RAW,
  SQ_9989_RESULTS as SQ_RESULTS_RAW,
} from '../../../test/fixtures/openf1-results.fixtures';
import {
  parseOpenF1Driver,
  parseOpenF1SessionResult,
} from '../../data-providers/openf1/openf1-api.parsers';
import {
  buildResultPreview,
  formatLapTimeMs,
  jolpicaStatuses,
  mapJolpicaQualifyingRows,
  mapJolpicaResultRows,
  mapOpenF1ResultRows,
  matchJolpicaDriver,
  parseLapTimeMs,
} from './f1-results.mapper';

const ctx = { sessionId: 'f1:2025:china:race', roundId: 'f1:2025:china' };
// Run fixtures through the production parsers, exactly like the client does.
const FP1_9988_RESULTS = FP1_RESULTS_RAW.map((row, i) =>
  parseOpenF1SessionResult(row, `$[${i}]`),
);
const FP1_9988_DRIVERS = FP1_DRIVERS_RAW.map((row, i) =>
  parseOpenF1Driver(row, `$[${i}]`),
);
const SQ_9989_RESULTS = SQ_RESULTS_RAW.map((row, i) =>
  parseOpenF1SessionResult(row, `$[${i}]`),
);
const SQ_9989_DRIVERS = SQ_DRIVERS_RAW.map((row, i) =>
  parseOpenF1Driver(row, `$[${i}]`),
);
const seasonDrivers = Object.values(DRIVERS_2025);

describe('F1 result mapping', () => {
  it('parses and formats lap times without floating-point drift', () => {
    expect(parseLapTimeMs('1:31.504')).toBe(91504);
    expect(parseLapTimeMs('31.504')).toBe(31504);
    expect(parseLapTimeMs('1:30:55.026')).toBe(5455026);
    expect(parseLapTimeMs('DNF')).toBeNull();
    expect(formatLapTimeMs(91504)).toBe('1:31.504');
    expect(formatLapTimeMs(5455026)).toBe('1:30:55.026');
  });

  it('maps Jolpica positionText codes to classification and finish statuses', () => {
    expect(jolpicaStatuses('3', 'Finished')).toEqual({
      classificationStatus: 'classified',
      finishStatus: 'finished',
    });
    expect(jolpicaStatuses('12', '+1 Lap')).toEqual({
      classificationStatus: 'classified',
      finishStatus: 'finished',
    });
    expect(jolpicaStatuses('15', 'Engine')).toEqual({
      classificationStatus: 'classified',
      finishStatus: 'dnf',
    });
    expect(jolpicaStatuses('R', 'Retired')).toEqual({
      classificationStatus: 'not_classified',
      finishStatus: 'dnf',
    });
    expect(jolpicaStatuses('R', 'Not classified')).toEqual({
      classificationStatus: 'not_classified',
      finishStatus: 'unknown',
    });
    expect(jolpicaStatuses('D', 'Disqualified')).toEqual({
      classificationStatus: 'dsq',
      finishStatus: 'dsq',
    });
    expect(jolpicaStatuses('W', 'Did not start')).toEqual({
      classificationStatus: 'dns',
      finishStatus: 'dns',
    });
    expect(jolpicaStatuses('F', 'Did not qualify')).toEqual({
      classificationStatus: 'dnq',
      finishStatus: 'dns',
    });
  });

  it('never turns a Jolpica display order into a rank for DSQ / retired rows (2025 China)', () => {
    const rows = mapJolpicaResultRows(CHINA_2025_RACE_ROWS, ctx);
    expect(rows.map((row) => row.position)).toEqual([
      1,
      2,
      3,
      null,
      null,
      null,
    ]);
    const leclerc = rows.find((row) => row.driver?.id === 'f1:driver:leclerc');
    expect(leclerc).toMatchObject({
      positionText: 'D',
      classificationStatus: 'dsq',
      finishStatus: 'dsq',
      laps: 0,
      points: '0',
    });
    expect(rows[0]).toMatchObject({
      id: 'f1:2025:china:race:driver-81',
      elapsedMs: 5455026,
      gap: null,
      bestLapMs: 95520,
      team: { id: 'f1:team:mclaren', name: 'McLaren' },
    });
    expect(rows[1].gap).toEqual({ kind: 'time_ms', value: 9748 });
    expect(rows[0].driver).toEqual({
      id: 'f1:driver:piastri',
      displayName: 'Oscar Piastri',
      number: '81',
      code: 'PIA',
    });
  });

  it('keeps fractional points as exact text and maps a withdrawal as DNS', () => {
    expect(mapJolpicaResultRows([BELGIUM_2021_RACE_ROW], ctx)[0].points).toBe(
      '12.5',
    );
    expect(mapJolpicaResultRows([BRAZIL_2024_DNS_ROW], ctx)[0]).toMatchObject({
      position: null,
      classificationStatus: 'dns',
      finishStatus: 'dns',
    });
  });

  it('keeps qualifying phases in order with nulls for phases not reached', () => {
    const rows = mapJolpicaQualifyingRows(CHINA_2025_QUALIFYING_ROWS, ctx);
    expect(rows[0].qualifyingPhases).toEqual([
      { phase: 'Q1', timeMs: 91591 },
      { phase: 'Q2', timeMs: 91200 },
      { phase: 'Q3', timeMs: 90641 },
    ]);
    expect(rows[3].qualifyingPhases?.map((phase) => phase.timeMs)).toEqual([
      92418,
      null,
      null,
    ]);
  });

  it('links an OpenF1 driver only on number plus abbreviation or family name', () => {
    expect(
      matchJolpicaDriver(FP1_9988_DRIVERS[0], seasonDrivers)?.driverId,
    ).toBe('norris');
    expect(matchJolpicaDriver(FP1_9988_DRIVERS[2], seasonDrivers)).toBeNull();
    expect(
      matchJolpicaDriver(
        { ...FP1_9988_DRIVERS[0], name_acronym: 'XXX', last_name: 'Someone' },
        seasonDrivers,
      ),
    ).toBeNull();
  });

  it('maps published practice results (best lap) and flags unlinked drivers', () => {
    const mapped = mapOpenF1ResultRows(
      'fp1',
      FP1_9988_RESULTS,
      FP1_9988_DRIVERS,
      seasonDrivers,
      { sessionId: 'f1:2025:china:fp1', roundId: 'f1:2025:china' },
    );
    expect(mapped.unmatchedDrivers).toBe(1);
    expect(mapped.rows[0]).toMatchObject({
      position: 1,
      bestLapMs: 91504,
      laps: 23,
      gap: null,
      points: null,
      team: null,
      driver: {
        id: 'f1:driver:norris',
        displayName: 'Lando Norris',
        code: 'NOR',
      },
    });
    expect(mapped.rows[1].gap).toEqual({ kind: 'time_ms', value: 96 });
    expect(mapped.rows[2].driver).toMatchObject({
      id: 'f1:driver:max-verstappen',
      displayName: 'Max VERSTAPPEN',
      number: '1',
    });
  });

  it('keeps a recorded P15 together with dnf=true in Sprint Qualifying (Hadjar, 2025 China)', () => {
    const mapped = mapOpenF1ResultRows(
      'sprint_qualifying',
      SQ_9989_RESULTS,
      SQ_9989_DRIVERS,
      seasonDrivers,
      {
        sessionId: 'f1:2025:china:sprint_qualifying',
        roundId: 'f1:2025:china',
      },
    );
    const hadjar = mapped.rows.find((row) => row.driver?.number === '6');
    expect(hadjar).toMatchObject({
      position: 15,
      classificationStatus: 'classified',
      finishStatus: 'dnf',
      bestLapMs: null,
      gap: null,
    });
    expect(hadjar?.qualifyingPhases).toEqual([
      { phase: 'Q1', timeMs: 92171 },
      { phase: 'Q2', timeMs: null },
      { phase: 'Q3', timeMs: null },
    ]);
  });

  it('builds tiered teasers and returns null when nothing is classified', () => {
    const race = mapJolpicaResultRows(CHINA_2025_RACE_ROWS, ctx);
    expect(buildResultPreview('race', race)).toMatchObject({
      kind: 'top_three',
      names: ['Oscar Piastri', 'Lando Norris', 'George Russell'],
      metricLabel: null,
    });
    const sq = mapOpenF1ResultRows(
      'sprint_qualifying',
      SQ_9989_RESULTS,
      SQ_9989_DRIVERS,
      seasonDrivers,
      ctx,
    ).rows;
    expect(buildResultPreview('sprint_qualifying', sq)).toMatchObject({
      kind: 'pole',
      names: ['Lewis Hamilton'],
      metricLabel: '1:30.849',
    });
    expect(
      buildResultPreview(
        'race',
        mapJolpicaResultRows([BRAZIL_2024_DNS_ROW], ctx),
      ),
    ).toBeNull();
  });
});
