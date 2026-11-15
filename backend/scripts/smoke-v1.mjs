// OpenGP W03 /api/v1 smoke test (calendar, results, standings). Read-only GET requests.
// Usage:  node scripts/smoke-v1.mjs            (default http://localhost:3001)
//         BASE_URL=http://localhost:3001 node scripts/smoke-v1.mjs
// Requires Node 18+ (global fetch). Exit code 1 if any hard check FAILs.
// WARN = depends on live upstream state (e.g. OpenF1 restricting access during
// a live session) and is not treated as a failure.

const BASE = (process.env.BASE_URL ?? 'http://localhost:3001').replace(
  /\/+$/,
  '',
);
const AVAILABILITY = [
  'available',
  'partial',
  'not_published',
  'not_applicable',
  'unsupported',
  'access_restricted',
  'unknown',
  'upstream_error',
];
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

async function get(path) {
  const started = Date.now();
  try {
    const response = await fetch(BASE + path, {
      headers: { accept: 'application/json' },
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    return { status: response.status, body, text, ms: Date.now() - started };
  } catch (error) {
    return {
      status: 0,
      body: null,
      text: '',
      ms: Date.now() - started,
      error: String(error.cause?.code ?? error.message),
    };
  }
}

const localDate = (iso, tz) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

function envelope(r) {
  const e = [];
  if (!r.body || typeof r.body !== 'object') return ['response is not JSON'];
  if (typeof r.body.data !== 'object' || r.body.data === null)
    e.push('missing data object');
  const m = r.body.meta;
  if (!m) return [...e, 'missing meta'];
  if (!AVAILABILITY.includes(m.availability))
    e.push(`meta.availability invalid: ${m.availability}`);
  if (!ISO_UTC.test(m.retrievedAt ?? ''))
    e.push('meta.retrievedAt is not ISO UTC');
  if (!Array.isArray(m.sources)) e.push('meta.sources is not an array');
  if (!Array.isArray(m.warnings)) e.push('meta.warnings is not an array');
  return e;
}

const errorEnvelope = (code) => (r) => {
  const e = [];
  if (r.body?.error?.code !== code)
    e.push(`expected error.code ${code}, got ${r.body?.error?.code}`);
  if (!AVAILABILITY.includes(r.body?.meta?.availability))
    e.push('error meta.availability missing');
  if (r.body?.data !== undefined)
    e.push('error response must not contain data');
  return e;
};

function intervalInvariants(from, to, tz) {
  return (r) => {
    const e = envelope(r);
    if (e.length) return e;
    const { interval, rounds } = r.body.data;
    if (interval?.from !== from || interval?.to !== to || interval?.tz !== tz)
      e.push(`interval echo wrong: ${JSON.stringify(interval)}`);
    if (!Array.isArray(rounds)) return [...e, 'data.rounds is not an array'];
    const seen = new Set();
    for (const round of rounds) {
      if (!Array.isArray(round.sessions) || round.sessions.length === 0)
        e.push(`${round.id} has no sessions`);
      for (const s of round.sessions ?? []) {
        if (seen.has(s.id)) e.push(`session listed twice: ${s.id}`);
        seen.add(s.id);
        if (s.roundId !== round.id) e.push(`${s.id} roundId mismatch`);
        if (s.scheduledStartAt) {
          const day = localDate(s.scheduledStartAt, tz);
          if (day < from || day >= to)
            e.push(`${s.id} starts ${day} (${tz}) outside [${from}, ${to})`);
          if (s.schedulePrecision !== 'instant')
            e.push(`${s.id} has a time but precision ${s.schedulePrecision}`);
        } else if (
          s.scheduledDate &&
          (s.scheduledDate < from || s.scheduledDate >= to)
        ) {
          e.push(`${s.id} date ${s.scheduledDate} outside interval`);
        }
        if (s.resultPreview !== null) {
          if (s.resultAvailability !== 'available')
            e.push(
              `${s.id} has a teaser but resultAvailability ${s.resultAvailability}`,
            );
          const kind = s.id.split(':').pop();
          const expected = ['race', 'sprint', 'qualifying'].includes(kind)
            ? 'top_three'
            : kind === 'sprint_qualifying'
              ? 'pole'
              : 'practice_leader';
          if (s.resultPreview.kind !== expected)
            e.push(
              `${s.id} teaser kind ${s.resultPreview.kind}, expected ${expected} (tier rule)`,
            );
        }
        if (
          s.lifecycle?.status === 'completed' &&
          s.lifecycle?.basis !== 'time_inferred'
        )
          e.push(`${s.id} completed without time_inferred basis`);
      }
    }
    if (r.body.meta.coverage?.[0]?.seriesId !== 'f1')
      e.push('meta.coverage[0].seriesId should be f1');
    return e;
  };
}

const and =
  (...fns) =>
  (r) =>
    fns.flatMap((fn) => fn(r));
const roundIds = (r) => (r.body?.data?.rounds ?? []).map((x) => x.id);
const mexico = (r) =>
  (r.body?.data?.rounds ?? []).find((x) => /^f1:2026:mexico/.test(x.id));

const W = { from: '2026-10-26', to: '2026-11-02' };
const LA = 'America/Los_Angeles';
const rounds = (q) => `/api/v1/rounds?${new URLSearchParams(q).toString()}`;

const checks = [
  // ---- Legacy compatibility
  {
    group: 'Legacy',
    name: 'GET / still answers',
    path: '/',
    status: [200],
    check: (r) =>
      r.text === 'Hello World!' ? [] : ['body is not "Hello World!"'],
  },
  {
    group: 'Legacy',
    name: 'legacy /events/today keeps its plain-array shape',
    path: '/events/today?series=f1',
    status: [200],
    soft: true,
    hint: '500 here is PRE-EXISTING legacy behaviour when OpenF1 restricts access (fixed in Phase B)',
    check: (r) =>
      Array.isArray(r.body)
        ? []
        : ['expected a plain JSON array (no {data, meta})'],
  },
  {
    group: 'Legacy',
    name: 'no global /api/v1 prefix on legacy routes',
    path: '/api/v1/events/today',
    status: [404],
  },

  // ---- Series / seasons
  {
    group: 'Series',
    name: 'only validated series are listed',
    path: '/api/v1/series',
    status: [200],
    check: and(envelope, (r) =>
      JSON.stringify(r.body.data.series) ===
      JSON.stringify([
        { id: 'f1', name: 'Formula 1', category: 'Single-Seater' },
      ])
        ? []
        : ['data.series is not exactly [f1]'],
    ),
  },
  {
    group: 'Series',
    name: 'F1 seasons with coverage',
    path: '/api/v1/series/f1/seasons',
    status: [200],
    check: and(envelope, (r) => {
      const s = r.body.data.seasons ?? [];
      const e = [];
      for (const id of ['f1:1950', 'f1:2025'])
        if (!s.some((x) => x.id === id)) e.push(`missing ${id}`);
      const y1950 = s.find((x) => x.id === 'f1:1950');
      if (
        y1950?.coverage?.find((c) => c.capability === 'practice_result')
          ?.availability !== 'unsupported'
      )
        e.push('1950 practice_result should be unsupported');
      return e;
    }),
  },
  {
    group: 'Series',
    name: 'legacy-only series -> 422',
    path: '/api/v1/series/motogp/seasons',
    status: [422],
    check: errorEnvelope('UNSUPPORTED_CAPABILITY'),
  },
  {
    group: 'Series',
    name: 'unknown series -> 404',
    path: '/api/v1/series/xyz/seasons',
    status: [404],
    check: errorEnvelope('NOT_FOUND'),
  },

  // ---- Weekly calendar
  {
    group: 'Rounds',
    name: 'This Week (LA) Mon-Mon incl. DST change',
    path: rounds({ ...W, tz: LA, seriesId: 'f1' }),
    status: [200],
    check: and(intervalInvariants(W.from, W.to, LA), (r) => {
      const e = [];
      const i = r.body.data.interval;
      if (
        i.startsAt !== '2026-10-26T07:00:00Z' ||
        i.endsAt !== '2026-11-02T08:00:00Z'
      )
        e.push(`DST-aware boundaries wrong: ${i.startsAt} .. ${i.endsAt}`);
      const m = mexico(r);
      if (!m)
        e.push(
          `expected the Mexico City GP round; got ${roundIds(r).join(', ') || 'none'}`,
        );
      else if (m.sessions.length !== 5)
        e.push(`Mexico should list 5 sessions, got ${m.sessions.length}`);
      return e;
    }),
  },
  {
    group: 'Rounds',
    name: 'Last Week (LA)',
    path: rounds({ from: '2026-10-19', to: '2026-10-26', tz: LA }),
    status: [200],
    check: intervalInvariants('2026-10-19', '2026-10-26', LA),
  },
  {
    group: 'Rounds',
    name: 'Next Week (LA)',
    path: rounds({ from: '2026-11-02', to: '2026-11-09', tz: LA }),
    status: [200],
    check: intervalInvariants('2026-11-02', '2026-11-09', LA),
  },
  {
    group: 'Rounds',
    name: 'tz omitted defaults to UTC',
    path: rounds(W),
    status: [200],
    check: intervalInvariants(W.from, W.to, 'UTC'),
  },
  {
    group: 'Rounds',
    name: 'UTC+14: Mexico race moves to next week (this week)',
    path: rounds({ ...W, tz: 'Pacific/Kiritimati' }),
    status: [200],
    check: and(intervalInvariants(W.from, W.to, 'Pacific/Kiritimati'), (r) =>
      mexico(r)?.sessions.some((s) => s.id.endsWith(':race'))
        ? ['race should not be in this week for UTC+14']
        : [],
    ),
  },
  {
    group: 'Rounds',
    name: 'UTC+14: Mexico race moves to next week (next week)',
    path: rounds({
      from: '2026-11-02',
      to: '2026-11-09',
      tz: 'Pacific/Kiritimati',
    }),
    status: [200],
    check: and(
      intervalInvariants('2026-11-02', '2026-11-09', 'Pacific/Kiritimati'),
      (r) =>
        mexico(r)?.sessions.some((s) => s.id.endsWith(':race'))
          ? []
          : ['Mexico race should appear here for UTC+14'],
    ),
  },
  {
    group: 'Rounds',
    name: 'year rollover week',
    path: rounds({ from: '2026-12-28', to: '2027-01-04' }),
    status: [200],
    check: intervalInvariants('2026-12-28', '2027-01-04', 'UTC'),
  },
  {
    group: 'Rounds',
    name: '2025 China sprint weekend (canonical session IDs)',
    path: rounds({ from: '2025-03-17', to: '2025-03-24' }),
    status: [200],
    check: and(intervalInvariants('2025-03-17', '2025-03-24', 'UTC'), (r) => {
      const china = (r.body.data.rounds ?? []).find(
        (x) => x.id === 'f1:2025:china',
      );
      if (!china) return ['missing f1:2025:china'];
      const ids = china.sessions.map((s) => s.id).join(',');
      const expected = [
        'fp1',
        'sprint_qualifying',
        'sprint',
        'qualifying',
        'race',
      ]
        .map((k) => `f1:2025:china:${k}`)
        .join(',');
      return ids === expected ? [] : [`session IDs ${ids}`];
    }),
  },
  {
    group: 'Rounds',
    name: '1950 British GP is date-only (no invented time)',
    path: rounds({ from: '1950-05-08', to: '1950-05-15' }),
    status: [200],
    check: and(intervalInvariants('1950-05-08', '1950-05-15', 'UTC'), (r) => {
      const race = (r.body.data.rounds ?? []).find(
        (x) => x.id === 'f1:1950:great-britain',
      )?.sessions?.[0];
      if (!race) return ['missing f1:1950:great-britain'];
      return race.schedulePrecision === 'date' && race.scheduledStartAt === null
        ? []
        : [
            `expected date precision, got ${race.schedulePrecision} ${race.scheduledStartAt}`,
          ];
    }),
  },

  // ---- Validation
  {
    group: 'Validation',
    name: 'missing from -> 400',
    path: '/api/v1/rounds?to=2026-11-02',
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'impossible date -> 400',
    path: rounds({ from: '2026-02-30', to: '2026-03-02' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'from >= to -> 400',
    path: rounds({ from: '2026-11-02', to: '2026-11-02' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'more than 31 days -> 400',
    path: rounds({ from: '2026-10-01', to: '2026-11-02' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'invalid IANA tz -> 400',
    path: rounds({ ...W, tz: 'Mars/Base' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'raw offset tz "+08:00" -> 400',
    path: rounds({ ...W, tz: '+08:00' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'repeated from -> 400',
    path: '/api/v1/rounds?from=2026-10-26&from=2026-10-27&to=2026-11-02',
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'unknown seriesId -> 400',
    path: rounds({ ...W, seriesId: 'xyz' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Validation',
    name: 'legacy-only seriesId -> 422',
    path: rounds({ ...W, seriesId: 'motogp' }),
    status: [422],
    check: errorEnvelope('UNSUPPORTED_CAPABILITY'),
  },

  // ---- Detail endpoints
  {
    group: 'Detail',
    name: 'Round detail returns the full schedule',
    path: '/api/v1/rounds/f1:2025:china',
    status: [200],
    check: and(envelope, (r) => {
      const round = r.body.data.round;
      const e = [];
      if (round?.sessions?.length !== 5)
        e.push(`expected 5 sessions, got ${round?.sessions?.length}`);
      if (
        round?.status !== 'completed' ||
        round?.statusBasis !== 'time_inferred'
      )
        e.push(`status ${round?.status}/${round?.statusBasis}`);
      return e;
    }),
  },
  {
    group: 'Detail',
    name: 'percent-encoded Round ID',
    path: '/api/v1/rounds/f1%3A2025%3Achina',
    status: [200],
    check: and(envelope, (r) =>
      r.body.data.round?.id === 'f1:2025:china' ? [] : ['wrong round'],
    ),
  },
  {
    group: 'Detail',
    name: 'Session detail with round context',
    path: '/api/v1/sessions/f1:2025:china:fp1',
    status: [200],
    check: and(envelope, (r) =>
      r.body.data.round?.id === 'f1:2025:china' &&
      r.body.data.session?.type === 'practice'
        ? []
        : ['wrong session/round'],
    ),
  },
  {
    group: 'Detail',
    name: 'Session lists its legacy alias',
    path: '/api/v1/sessions/f1:2025:china:fp1',
    status: [200],
    soft: true,
    hint: 'needs OpenF1 enrichment; empty aliases + partial means OpenF1 is restricted/unavailable right now',
    check: (r) =>
      JSON.stringify(r.body?.data?.aliases) === '["openf1-session-9988"]'
        ? []
        : [`aliases ${JSON.stringify(r.body?.data?.aliases)}`],
  },
  {
    group: 'Detail',
    name: 'legacy session alias resolves',
    path: '/api/v1/sessions/openf1-session-9988',
    status: [200],
    soft: true,
    hint: '503 is expected while OpenF1 restricts access and the 2025 calendar is not cached yet',
    check: (r) =>
      r.body?.data?.session?.id === 'f1:2025:china:fp1'
        ? []
        : ['did not resolve to f1:2025:china:fp1'],
  },
  {
    group: 'Detail',
    name: 'legacy meeting alias resolves',
    path: '/api/v1/rounds/openf1-1255',
    status: [200],
    soft: true,
    hint: '503 is expected while OpenF1 restricts access',
    check: (r) =>
      r.body?.data?.round?.id === 'f1:2025:china'
        ? []
        : ['did not resolve to f1:2025:china'],
  },
  {
    group: 'Detail',
    name: '2023 Imola shown as cancelled (DP-03)',
    path: '/api/v1/rounds/f1:2023:emilia-romagna',
    status: [200],
    soft: true,
    hint: 'depends on OpenF1 marking all five 2023 Imola sessions cancelled',
    check: (r) =>
      r.body?.data?.round?.status === 'cancelled' &&
      r.body?.data?.round?.roundNumber === null
        ? []
        : [`status ${r.body?.data?.round?.status}`],
  },
  {
    group: 'Detail',
    name: 'non-existent session kind -> 404',
    path: '/api/v1/sessions/f1:2025:china:fp3',
    status: [404],
    check: errorEnvelope('NOT_FOUND'),
  },
  {
    group: 'Detail',
    name: 'unknown round -> 404',
    path: '/api/v1/rounds/f1:2025:atlantis',
    status: [404],
    check: errorEnvelope('NOT_FOUND'),
  },
  {
    group: 'Detail',
    name: 'pre-1950 season -> 404',
    path: '/api/v1/rounds/f1:1949:britain',
    status: [404],
    check: errorEnvelope('NOT_FOUND'),
  },
  {
    group: 'Detail',
    name: 'round alias on sessions route -> 404',
    path: '/api/v1/sessions/openf1-1255',
    status: [404],
    check: errorEnvelope('NOT_FOUND'),
  },

  // ---- Event-weekend grouping (dateBasis=track)
  {
    group: 'Track dates',
    name: 'Americas Sunday race stays in its weekend for Tokyo (+1 day)',
    path: rounds({ ...W, tz: 'Asia/Tokyo', dateBasis: 'track' }),
    status: [200],
    check: (r) => {
      const race = mexico(r)?.sessions.find((s) => s.id.endsWith(':race'));
      if (!race) return ['Mexico race missing from the track-dated week'];
      return race.dayOffset === 1 && race.trackLocalDate === '2026-11-01'
        ? []
        : [
            `dayOffset ${race.dayOffset}, trackLocalDate ${race.trackLocalDate}`,
          ];
    },
  },
  {
    group: 'Track dates',
    name: 'invalid dateBasis -> 400',
    path: rounds({ ...W, dateBasis: 'venue' }),
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Track dates',
    name: 'detail endpoint honours tz',
    path: '/api/v1/rounds/f1:2025:china?tz=Asia%2FShanghai',
    status: [200],
    check: (r) =>
      r.body?.data?.round?.sessions?.every(
        (s) =>
          typeof s.localDate === 'string' &&
          s.trackTimeZone === 'Asia/Shanghai',
      )
        ? []
        : ['localDate/trackTimeZone missing'],
  },

  // ---- Results (published classifications)
  {
    group: 'Results',
    name: '2025 China FP1 from OpenF1 (Norris P1, 1:31.504)',
    path: '/api/v1/sessions/f1:2025:china:fp1/results',
    status: [200],
    soft: true,
    hint: 'OpenF1 may restrict access during a live session (availability access_restricted)',
    check: (r) => {
      const first = r.body?.data?.resultSet?.classification?.[0];
      return first?.position === 1 && first?.bestLapMs === 91504
        ? []
        : [
            `availability ${r.body?.meta?.availability}, first row ${JSON.stringify(first)?.slice(0, 120)}`,
          ];
    },
  },
  {
    group: 'Results',
    name: '2025 China race: DSQ rows have no rank',
    path: '/api/v1/sessions/f1:2025:china:race/results',
    status: [200],
    check: (r) => {
      const rows = r.body?.data?.resultSet?.classification ?? [];
      const dsq = rows.filter((row) => row.classificationStatus === 'dsq');
      const e = [];
      if (rows[0]?.position !== 1) e.push('first row is not P1');
      if (dsq.length < 3) e.push(`expected 3 DSQ rows, got ${dsq.length}`);
      if (dsq.some((row) => row.position !== null))
        e.push('a DSQ row has a numeric position');
      return e;
    },
  },
  {
    group: 'Results',
    name: '2025 China SQ: Hadjar keeps P15 with DNF',
    path: '/api/v1/sessions/f1:2025:china:sprint_qualifying/results',
    status: [200],
    soft: true,
    hint: 'needs OpenF1 access',
    check: (r) => {
      const hadjar = r.body?.data?.resultSet?.classification?.find(
        (row) => row.driver?.number === '6',
      );
      return hadjar?.position === 15 && hadjar?.finishStatus === 'dnf'
        ? []
        : [`got ${JSON.stringify(hadjar)?.slice(0, 120)}`];
    },
  },
  {
    group: 'Results',
    name: 'future session has no result set (not_published)',
    path: '/api/v1/sessions/f1:2026:las-vegas:race/results',
    status: [200],
    check: (r) =>
      ['not_published', 'available'].includes(r.body?.meta?.availability)
        ? []
        : [`availability ${r.body?.meta?.availability}`],
  },
  {
    group: 'Results',
    name: 'unknown session results -> 404',
    path: '/api/v1/sessions/f1:2025:china:fp3/results',
    status: [404],
    check: errorEnvelope('NOT_FOUND'),
  },
  {
    group: 'Results',
    name: 'weekly list carries result teasers',
    path: rounds({ from: '2025-03-17', to: '2025-03-24', tz: 'Asia/Shanghai' }),
    status: [200],
    check: (r) => {
      const race = (r.body?.data?.rounds ?? [])
        .find((x) => x.id === 'f1:2025:china')
        ?.sessions?.find((s) => s.id.endsWith(':race'));
      return race?.resultPreview?.kind === 'top_three' &&
        race.resultPreview.names.length === 3
        ? []
        : [`race teaser ${JSON.stringify(race?.resultPreview)}`];
    },
  },

  // ---- Standings
  {
    group: 'Standings',
    name: '2025 drivers (final): only the champion can still win',
    path: '/api/v1/standings?seasonId=f1:2025&subjectType=driver',
    status: [200],
    check: and(envelope, (r) => {
      const s = r.body.data.standings;
      const e = [];
      if (!Array.isArray(s?.rows) || s.rows.length < 20)
        e.push(`expected 20+ rows, got ${s?.rows?.length}`);
      if (s?.rows?.[0]?.rank !== 1 || typeof s?.rows?.[0]?.points !== 'string')
        e.push('first row should be rank 1 with string points');
      if (s?.contention?.basis !== 'calculated')
        e.push('contention must be labelled calculated');
      if (s?.rows?.filter((row) => row.canStillWin === true).length !== 1)
        e.push('season complete: exactly one canStillWin');
      return e;
    }),
  },
  {
    group: 'Standings',
    name: '2025 teams',
    path: '/api/v1/standings?seasonId=f1:2025&subjectType=team',
    status: [200],
    check: and(envelope, (r) =>
      r.body.data.standings.rows?.[0]?.subject?.type === 'team'
        ? []
        : ['first subject is not a team'],
    ),
  },
  {
    group: 'Standings',
    name: 'missing subjectType -> 400',
    path: '/api/v1/standings?seasonId=f1:2025',
    status: [400],
    check: errorEnvelope('INVALID_QUERY'),
  },
  {
    group: 'Standings',
    name: 'legacy-only series -> 422',
    path: '/api/v1/standings?seasonId=motogp:2025&subjectType=driver',
    status: [422],
    check: errorEnvelope('UNSUPPORTED_CAPABILITY'),
  },
];

const counts = { PASS: 0, FAIL: 0, WARN: 0, INFO: 0 };
console.log(`OpenGP /api/v1 smoke test -> ${BASE}\n`);
let group = '';
for (const c of checks) {
  if (c.group !== group) {
    group = c.group;
    console.log(`\n== ${group}`);
  }
  const r = await get(c.path);
  if (r.status === 0) {
    console.log(
      `FAIL  ${c.name}\n      cannot connect (${r.error}). Is the backend running? cd backend && npm run start:dev`,
    );
    counts.FAIL++;
    continue;
  }
  const problems = [];
  if (!c.status.includes(r.status)) {
    problems.push(
      `HTTP ${r.status}, expected ${c.status.join('/')}` +
        (r.body?.error
          ? ` (${r.body.error.code}: ${r.body.error.message})`
          : ''),
    );
  } else if (c.check) {
    problems.push(...c.check(r));
  }
  const verdict =
    problems.length === 0
      ? c.info
        ? 'INFO'
        : 'PASS'
      : c.info
        ? 'INFO'
        : c.soft
          ? 'WARN'
          : 'FAIL';
  counts[verdict]++;
  const extra = r.body?.meta ? `  [${r.body.meta.availability}]` : '';
  console.log(
    `${verdict.padEnd(5)} ${c.name}  (${r.status}, ${r.ms} ms)${extra}\n      ${BASE}${c.path}`,
  );
  for (const p of problems) console.log(`      - ${p}`);
  if (problems.length && c.hint) console.log(`      hint: ${c.hint}`);
  const reasons = r.body?.meta?.coverage?.map((x) => x.reason).filter(Boolean);
  if (reasons?.length) console.log(`      coverage: ${reasons.join(' | ')}`);
  if (Array.isArray(r.body?.data?.rounds) && r.body.data.rounds.length) {
    console.log(
      `      rounds: ${r.body.data.rounds.map((x) => `${x.id} [${x.sessions.length}]`).join(', ')}`,
    );
  }
}

// Cache check: the same weekly query again should be served from memory.
const again = await get(rounds({ ...W, tz: LA, seriesId: 'f1' }));
console.log(
  `\n== Cache\n${again.status === 200 && again.ms < 1000 ? 'PASS ' : 'WARN '} repeated weekly query served in ${again.ms} ms`,
);
counts[again.status === 200 && again.ms < 1000 ? 'PASS' : 'WARN']++;

console.log(
  `\nSummary: ${counts.PASS} PASS, ${counts.FAIL} FAIL, ${counts.WARN} WARN, ${counts.INFO} INFO`,
);
process.exit(counts.FAIL > 0 ? 1 : 0);
