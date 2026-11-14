# Data mapping: Home design → OpenGP API

Status: **Proposed**. Based on `docs/api-contract.md` and `docs/data-model.md` as read on the repository's `main` branch. Those documents mark the v1 contract and the canonical model as **Proposed / not implemented** (reviewed 2026-10-30). The owner also reports that W03 Phase A (the F1 calendar under `/api/v1`) has been committed and Phase B (results, standings) has not started, so the docs may lag the code. **Before writing the adapter, read `backend/src/` and decide per field what is Current and what is Proposed.**

The frontend today (per `README.md`) calls the six legacy routes: `GET /events/today|upcoming|live|past`, `GET /events/:id`, `GET /sessions/:id/detail`. Their JSON is provider-derived, has no `{data, meta}` envelope, and OpenF1 "classification" there is fastest-lap order, which must not be shown as a race result.

## 1. Architecture

```
API (legacy routes now, /api/v1 later)
  → adapter (one per API version; picks real data or fixtures)
    → Home view model (this document, section 3)
      → components (design-specific props)
```

- Components never see API or provider JSON. When the backend moves from legacy to v1, only the adapter changes.
- Fixtures (three states: live, done, idle) implement the same view model. Show a visible "fixture data" marker whenever fixtures are on screen. Never mix fixture and real data without saying so.

## 2. Field mapping

| UI element | View-model field | Source in the contract / model | Gap or note |
|---|---|---|---|
| Series list, plate, badge | `seriesId`, `name`, `followed` | `GET /series` → `Series {id, name, category?, status?}` | Short code on the plate (`GTWC EU`), plate colour and badge colour are **not** in the model. Keep a `seriesTheme` map keyed by `seriesId` in the frontend (values: `tokens.css` `--color-series-*`, plus the 28 badge colours in Figma page 05, section 3 G2). `followed` is client state. Design series without backend coverage must degrade gracefully (v1 covers F1 first). |
| Event name, round number | `eventName`, `roundNumber` | `GET /events`, `/events/:eventId` → `Round {name, roundNumber?, locationLabel?, circuitId?}` | "Event" in the API is the model's `Round`. |
| Day grouping and week | `dayKey`, `weekendKey` | `Round.weekendKey?`, `Round.startsAt/endsAt`, `Session.scheduledStartAt`, `Session.timezone?` | Week assignment uses the event weekend in track-local dates (rules.md §1). Confirm which field carries the track time zone. |
| Session identity and tier | `sessionId`, `sessionName`, `tier` | `Session {id, type, name, sequence?}` | Tier is not provided. Map `Session.type → T1..T5` in the adapter (session-tiers.md). |
| Start / end time | `startsAt`, `endsAt` | `Session.scheduledStartAt?`, `scheduledEndAt?` (nullable) | `null` start → `TBC`, sorted last. `ends ~` is the **scheduled** end, not the actual end. |
| Row state | `state: 'idle' \| 'live' \| 'done'` | `Session.lifecycle ∈ {scheduled, running, finished, cancelled, unknown}` | `cancelled` and `unknown` have no design. Keep a plain fallback and mark `TODO(design)`. Lifecycle is **not** result publication. |
| Rescheduled (`RESCHEDULED`, `was …`) | `rescheduledFrom` | **No field** | Not in the model. Do not fake it. Propose a field such as `Session.previousScheduledStartAt?`, or derive from stored history. Until then, hide the tag for real data. |
| Results block | `result` | `GET /sessions/:id/results` → `data.resultSet {kind, publicationStatus, classification[]}` + `meta {availability, source, retrievedAt}` | See the availability table below. |
| Result rows | `position`, `positionText`, `name`, `carNumber`, `gapOrTime`, `classificationStatus`, `points` | `ClassificationRow {overallPosition?, classPosition?, positionText?, classificationStatus, laps?, points?, elapsedMs?, gapMs?, bestLapMs?}` | Display names, car numbers and team colours come via `RoundEntry` (`carNumber`, `displayName`) and drivers; the contract excerpt does not show them in the response. Check the DTOs. `points` is a **decimal string**: never parse to float for display. |
| `Fastest` in practice rows | `result.fastest` | Practice ResultSet, first row by best lap | Legitimate for practice and qualifying. Never derive a race result from fastest laps. |
| Multi-class tower | `result.classHeader`, `result.classWinners[]` | `ResultSet.competitionClassId`, `CompetitionClass {name, code}` | One ResultSet per class. Tower header = main class; strip = other classes' winners. |
| LIVE details (progress, time left, flag, clock stopped, stage text) | `live?` | **Not in v1** ("no free real-time promise"). Legacy `GET /events/live` exists (provider-derived JSON); W03 adds OpenF1 Race Control history | Make every `live` field optional. Hide what is missing. Do not fake progress. Polling vs push is undecided. |
| Standings | `standings.rows[]` | `GET /standings?seasonId=…&type=driver…` → `Standings`, `StandingRow {rank?, points, wins?, subject}` | `Can still win` (green bars + legend) is not provided and the model has no points engine. Hide it until the backend provides it. Position medals, team colour bars: no field → theme or data later. |
| Season progress (`ROUND 20 / 24`, `4 to go`) | `season.round`, `season.total` | Count of Rounds in the Season (`GET /series/:id/seasons`, `/events`) | Derive from the calendar; confirm. |
| Counts (`6 sessions`, `6 left`, `15 sessions this week`) | derived | session list | Computed in the adapter. The today cell text per state is an open question. |
| Settings | `timeZone`, `spoilerFree`, `followedSeriesIds` | none | Client storage. No account backend. |

### Result availability → UI

| `meta.availability` | UI |
|---|---|
| `available` | Show the result block (`publicationStatus: provisional` → `Provisional` status line; `final` or `unknown` → no status line; never claim "final" without evidence) |
| `not_published` | `Results pending` (collapsed one-row state for T1) |
| `partial` | Show what exists; the wording is not designed |
| `unsupported`, `not_applicable`, `access_restricted` | Hide the result block (not designed; keep it plain) |
| `upstream_error` | Error state. **Never render as "no results".** Not designed |

### 2a. What the legacy API returns today (Current, from `backend/src/events/types.ts` and `frontend/src/lib/api.ts` on `main`)

```ts
type SessionStatus = 'upcoming' | 'live' | 'finished' | 'cancelled';
type SessionCategory = 'practice' | 'qualifying' | 'race' | 'sprint' | 'test' | 'warmup' | 'stage' | 'heat' | 'feature' | 'shootout' | 'other';
Event   { id; series: {id, name, category}; season: {id, year, name}; eventName; roundNumber?; roundLabel?; country; location; venueName; dateStart; dateEnd; sessions: Session[] }
Session { id; eventId; name; category: SessionCategory; startTime; endTime; status: SessionStatus }
SessionDetail { event: {...}; session: Session; classification: { position; driverNumber; driverName; teamName; headshotUrl?; bestLapTime?; gapToLeader?; laps }[] }
```

| Design need | Legacy source | Note |
|---|---|---|
| Row state (idle / live / done) | `Session.status` (`upcoming` / `live` / `finished`) | `cancelled` has no design. `startTime` and `endTime` are always present strings here (no `null` for TBC). |
| Tier T1–T5 | `Session.category` + `Session.name` | `category` has 11 values; map them in the adapter. Sprint qualifying / shootout vs. main qualifying cannot be told apart by `category` alone: check `name`. |
| Series (plate, list) | `Event.series.{id, name, category}` | No short code, no colour (theme map in the frontend). |
| Event name, round, venue | `eventName`, `roundNumber?`, `roundLabel?`, `venueName`, `location`, `country` | |
| Results / podium | `SessionDetail.classification[]` (one request per session) | **Fastest-lap order, not an official classification** (`docs/api-contract.md`). Use it only for practice and qualifying `Fastest`. Do not show race podiums from it. No `availability`, no `publicationStatus`, no class (multi-class) information, no gaps for P2/P3 in the design's format. |
| LIVE progress / flags | none | Not provided. |

## 3. View-model sketch (Proposed)

```ts
type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
type RowState = 'idle' | 'live' | 'done';
type Flag = 'yellow' | 'safety_car' | 'vsc' | 'full_course_yellow' | 'caution' | 'red';

interface ResultRowVM {
  position?: number; positionText?: string; name: string; carNumber?: string;
  teamColor?: string; gapOrTime?: string; classificationStatus?: string; points?: string; // decimal string
}
interface SessionRowVM {
  id: string; seriesId: string; eventName: string; sessionName: string; tier: Tier;
  state: RowState; startsAt: string | null; endsAt: string | null; // ISO 8601 with offset
  trackLocalTimeLabel?: string; rescheduledFrom?: string | null; starred: boolean;
  live?: { progress?: number; timeLeftLabel?: string; flag?: Flag; clockStopped?: boolean; statusText?: string };
  result?: {
    availability: 'available' | 'partial' | 'not_published' | 'unsupported' | 'upstream_error' | 'access_restricted' | 'not_applicable';
    publicationStatus?: 'unknown' | 'provisional' | 'final';
    classHeader?: string; rows?: ResultRowVM[]; classWinners?: { classCode: string; name: string }[];
  };
}
interface DayScheduleVM { dayKey: string; weekday: string; day: number; month: string; isToday: boolean; sessionCount: number; rows: SessionRowVM[]; }
interface HomeVM { weekStart: string; weekEnd: string; following: DayScheduleVM[]; allSeries: DayScheduleVM[]; standings?: unknown; seriesLists: unknown; }
```

## 4. Rules from the contract that the UI must respect

- Empty is not the same as not published, unsupported or failed (`docs/api-contract.md`, "Standard response envelope").
- Unknown stays unknown: `null` times, no invented defaults, no midnight for date-only events.
- Points are decimal strings. Position text and classification status (DNF, DNS, DSQ, NC) stay distinct.
- The frontend uses OpenGP contracts, not provider JSON. Keep legacy and v1 behind the adapter.
