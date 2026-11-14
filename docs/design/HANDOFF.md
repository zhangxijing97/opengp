# OpenGP Home redesign — design handoff

One document for the developer (Claude Code). Visual source of truth: Figma file `4ZHA4lgk5NbZDFzMoMUsSH`, page **"05 · Dev Handoff · 前端交接"** (node `5932:2`). Tokens are in `docs/design/tokens.css`. Everything here is **Confirmed design** unless marked Recommended or Proposed. Nothing is implemented yet. Desktop 1440 only, three states (LIVE, DONE, IDLE), design version Home v10.14.

Contents: 1 Figma and components · 2 Tiers and states · 3 Rules · 4 Data mapping · 5 Open questions · 6 Milestones · 7 Appendix (ticket-stub code)

---

## 1. Figma and components

Link format: `https://www.figma.com/design/4ZHA4lgk5NbZDFzMoMUsSH/OpenGP?node-id=5944-1057` (node id with `:` written as `-`). Fetch one component or block at a time, never a whole Home. Figma has no variables or styles (every value is hard-coded in layers); take values from `tokens.css`, and read sizes, paddings and radii from the spec cards (section 4 of the Figma page) or the layers.

File key `4ZHA4lgk5NbZDFzMoMUsSH`, page "05 · Dev Handoff · 前端交接" (`5932:2`). URL: `https://www.figma.com/design/4ZHA4lgk5NbZDFzMoMUsSH/OpenGP?node-id=<id with : replaced by ->`.

### Naming (applies to code and Figma)

- Figma component = PascalCase; variant property = lowercase word; value = lowercase kebab-case. Figma layer = lowercase kebab-case (text layers keep their text).
- Token names: `color-*`, `text-*`, `radius-*`, `shadow-*`, `space-*`, `layout-*`, `font-*`.
- Function over looks: **schedule** (centre column) > **day-schedule** (one day, with ticket stub) > **session-row**; **series-list** (left lists); **standings-panel** (right column). Avoid `card` except for pure surface shapes (`card-base`, `card-outline`).

### Page sections

| Section | Node |
|---|---|
| 0 Index | `5932:3` |
| 1 Homes (LIVE / DONE / IDLE) | `5932:51` |
| 2 Tiers and states (real rows, latest UI) | `5933:2161` |
| 3 Tokens and naming rules | `5934:788` |
| 4 Component specs (copies + specs read from layers) | `5936:788` |
| 5 Rules | `5939:966` |
| 6 Data fields (draft) | `5939:1000` |
| 7 Gaps and to-dos | `5939:1063` |
| 8 Component library | `5944:966` |

### Home frames (1440 wide)

| State | Home | top-nav | sidebar-series | schedule | sidebar-standings | footer | time-selector |
|---|---|---|---|---|---|---|---|
| LIVE (all in progress) | `5932:54` | `5944:2269` | `5944:2335` | `5932:307` | `5944:2663` | `5944:2292` | `5944:3038` |
| DONE (all finished) | `5932:2179` | `5944:3106` | `5944:3172` | `5932:2432` | `5944:3500` | `5944:3129` | `5944:3875` |
| IDLE (all not started) | `5932:4018` | `5944:3943` | `5944:4009` | `5932:4271` | `5944:4337` | `5944:3966` | `5944:4712` |

### Component library (section 8) and suggested React mapping

| Figma component | Node | Variants (props) | Suggested React | In the Homes |
|---|---|---|---|---|
| Plate | `5944:1057` | `series` = gtwc-eu, gtwc-am, f1, motogp, wec, nascar, indycar, formula-e | `<SeriesPlate series>` | instances in every row |
| Button | `5944:1066` | `kind=primary`, `icon` = none / arrow-up | `<Button icon>` | nested inside TopNav (`button-sign-in`) and Footer (`button-back-to-grid`) |
| IconButton | `5944:1080` | `surface` = nav / page / card | `<IconButton surface>` | nested inside blocks (`icon-button-settings`, `icon-button-prev`, `icon-button-next`, …) |
| SearchField | `5944:1088` | none | `<SearchField>` | nested in TopNav |
| SectionHeader | `5944:1414` | `kind` = following / all-series | `<SectionHeader kind>` | instances |
| TopNav | `5944:1451` | none | `<TopNav>` | instance |
| Footer | `5944:1499` | none | `<Footer>` | instance |
| TimeSelector | `5944:1557` | none | `<TimeSelector>` + `<WeekCell state>` | instance |
| SidebarSeries | `5944:1886` | none | `<SeriesSidebar>` > `<SeriesList variant>` > `<SeriesItem>` | instance |
| SidebarStandings | `5944:2268` | none | `<StandingsPanel>` | instance |
| WeekCell | `5944:1106` | `state` = selected / default / today | `<WeekCell state>` | reference only (frames in the Homes) |
| Stamp | `5944:1109` | none | `<TodayStamp>` | reference only |
| StatusTag | `5944:1117` | `kind` = rescheduled / results-pending | `<StatusTag kind>` | reference only |
| ResultInline | `5944:1132` | none | `<ResultInline>` | reference only |
| ResultPodium | `5944:1152` | none | `<ResultPodium>` | reference only |
| SessionRow | `5944:1394` | `kind` = single / multi / race; `state` = live / done / idle (9 variants) | `<SessionRow kind state>` | reference only (rows in the Homes are frames) |

`DaySchedule` is not a Figma component (height varies, shapes are generated): use the `day-schedule-*` frames above and the appendix (section 7).
The round series badge in the left list (a disc with a cream ring) is the component `SeriesBadge`; its main component is not on page 05 (it was renamed from an older name on an earlier page), so copy its look from the instances in the Homes (`series-item`).

### Layer anatomy of a Home (read from the file)

```
home-live                                  (home-done, home-idle: same structure)
├─ top-nav                                 instance of TopNav
│  ├─ nav-search > search-field            instance
│  ├─ nav-brand > logo
│  ├─ nav-actions > icon-button-settings, button-sign-in   instances
│  └─ nav-bottom-line
└─ page-body
   ├─ (content row)
   │  ├─ sidebar-series                    instance of SidebarSeries
   │  │  └─ series-list-followed | series-list-top | series-list-all  > list-header, series-item…
   │  ├─ schedule
   │  │  ├─ time-selector                  instance of TimeSelector
   │  │  │  ├─ time-selector-header > icon-button-prev, time-selector-title, icon-button-next
   │  │  │  └─ week-track > week-cell-week, week-cell-mon … week-cell-sun (today = week-cell-today)
   │  │  ├─ section-header-following
   │  │  ├─ day-schedule-following-fri-today | -sat | -sun
   │  │  ├─ section-header-all-series
   │  │  └─ day-schedule-all-series-fri-today | -sat | -sun
   │  └─ sidebar-standings                 instance of SidebarStandings
   │     └─ standings-panel > carousel-header, series-title, season-progress, tabs-row, table-header, table-row…
   └─ footer                               instance of Footer
      ├─ sticker-outline, sticker
      ├─ footer-content > footer-brand, footer-spacer, footer-column-product | -data | -company
      └─ legal-bar > (disclaimer text), legal-links, button-back-to-grid

day-schedule-*      card-base, stub-base, stub-content, session-rows, card-outline
session-rows        session-row…
session-row         row-main, result-line, icon-chevron
  row-main          plate-<series> (instance) > plate-body, event title text, session > ("·", session name), LIVE, progress > progress-track, progress-fill, progress-knob
  result-line       "Fastest" label, team-bar, result name
```

Other row kinds (multi-line, race, DONE podium, IDLE start time, class winners) have more children (`result-inline`, `result-podium`, `result-pending`, `start-time` …): open the matching `SessionRow` variant in section 8 or the day schedules above. The 3-level view above is what was read from `home-live`; do not assume names that are not in the file.

### Build order

1. Tokens + fonts (`tokens.css`, Inter / Rajdhani / Barlow Condensed / Barlow).
2. Atoms: SeriesPlate, Button, IconButton, SearchField, TodayStamp, StatusTag, WeekCell.
3. Blocks: TopNav, Footer, SeriesSidebar, StandingsPanel, TimeSelector, SectionHeader.
4. Rows: SessionRow variants + ResultInline / ResultPodium / ClassWinners.
5. DaySchedule (ticket shapes) and the Schedule.
6. Home assembly with fixtures (three states), then the data adapter.

Specs read from the layers (sizes, padding, radius, fonts) are in Figma section 4, one card per component.


---

## 2. Tiers and states

Source: Figma page "01 · Product UI" sections 2 and 3 (the owner's tier design), redrawn in the latest UI on page 05, section 2 (frame ids in section 1). Rules are final; open points are at the end.

### Tiers

| Tier | Meaning | DONE (finished) | LIVE (in progress) | IDLE (not started) |
|---|---|---|---|---|
| **T1** | Main race | Timing tower with conditional header: three rows plus gap. Multi-class: a header row with the main class name (e.g. `PRO`) inside the card, plus a full-width `CLASS WINNERS` strip. Single class: no header. Results not published yet: collapse to one row (`Results pending`). | Same tower. Left column gets a third line: `LIVE · progress bar · time left`. Exceptions go on that line. | No result. Right side: local start time, and under it `ends …` (and `was …` when rescheduled). |
| **T2** | Main qualifying / sprint | Two-row podium: P1 with full name, P2 and P3 on the second row. | Same as T1 LIVE (third line is the progress line). | Same as T1 IDLE. |
| **T3** | Support sessions (pre-qualifying, sprint qualifying, heats, daily rally summaries) | One row, P1 only. Right side: `Fastest` or `P1` + colour bar + name. | One row: `LIVE` + 48px mini progress bar + time left. An exception word replaces the time left. | One row, right side only the local start time. |
| **T4** | Practice | Single row, not collapsed (Following and All series alike). Session name + local start time, right side `Fastest`. **Confirmed.** | Same as T3 LIVE. | Same as T3 IDLE. |
| **T5** | Sub-sessions (Q1/Q2/Q3, stages, single rally stages) | Not shown. | Only appears as a status, e.g. `Q1 · 9 min left` or `STAGE 2 · LAP 142 / 300`. | Not shown. |

### General rules

- All sessions of a day are sorted by start time. **Live sessions are not pinned.** (Confirmed.)
- Sessions with an unknown start time (TBC) go last in the day. Do not show midnight for a date-only event (matches `docs/data-model.md`: unknown instants stay `null`).
- In LIVE rows, `LIVE` sits directly in front of the progress bar. Exceptions go only on the progress line (no fourth line).
- Exceptions: red flag = red bar and the pulse stops (clock stopped). Yellow family (safety car, virtual safety car, full course yellow, NASCAR caution) = amber bar, pulse continues. Single-line rows: the lowercase full word replaces the time left (`Red flag`, `Safety car`, `Yellow flag`, `Virtual safety car`, `Full course yellow`, `Caution`) in the matching colour, row width unchanged. Multi-line rows: an uppercase word in the `LIVE` label style (`RED FLAG`, `SAFETY CAR`, `FULL COURSE YELLOW`) on the progress line.
- Upcoming rows show only the local start time (15px bold in single-line rows). No countdown. (A `Starting soon` state within 15 minutes of the start was considered and not added.)
- Result status (V1, final rule): a small dot + a short sentence in normal case — `Provisional`, `Results pending`, `Updated after penalty`. Tone: a note, not a warning. While pending, the tower shows skeleton placeholders. Position changes are marked ▲▼.

### Data-model hints

The tier is derived from the session type (`Session.type` in `docs/data-model.md`). The backend does not provide a tier; keep a lookup table in the adapter (`type → tier`). `Fastest` in practice rows comes from the published practice classification (best lap), which is legitimate for practice and qualifying; never use it for a race.

### Open points

1. Flags and statuses are text, but `RESCHEDULED` (IDLE) is a colour tag and `Results pending` (DONE) is a grey pill. V1 says "dot + sentence". Unify? (section 5 A)
2. `Provisional`, `Updated after penalty` and ▲▼ have no drawn examples yet. (section 5 B)
3. Today cell says `6 left` in all three states; for DONE it should probably say `6 done`, for IDLE `6 to go`.


---

## 3. Rules

Status tags: **[Confirmed]** decided by the owner, **[Decided, not designed]** decided but not drawn in Figma, **[Recommended]** my proposal, not yet approved. Source: Figma page 05, section 5.

### 1. Week, dates and time

- The week is Monday to Sunday. Which week a session belongs to is decided by its **event weekend (track-local dates)**, not by the user's local date: an Americas Sunday race that is already Monday for an Asia/Oceania user stays in the same week. [Decided, not implemented]
- Sessions that start after midnight (user's local time): add a divider `N sessions start after midnight` at the end of the day group and a `+1 day` label above the start time. [Decided, not designed]
- On Monday, default to the previous week until the spill-over sessions finish. The default selection is `WEEK` (the whole week). [Decided]
- Times are shown in the user's local time (a setting; the design shows `times in PT`). Upcoming rows show only the user's local start time (no countdown). Showing the track-local time is not designed.
- Unknown start time (`scheduledStartAt = null`): show `TBC`, sorted last in the day. Never show midnight for a date-only event.

### 2. Sorting and grouping

- Inside a day: by start time. Live sessions are **not** pinned. [Confirmed]
- Followed series go in the `Following` section on top; the rest in `All series`. Both use the same row structure. Practice sessions are single rows, not collapsed. [Confirmed]

### 3. Following and sign-in

- The star in the left lists and in rows toggles following. There is no database or account backend yet. [Recommended] persist it in the browser (localStorage) for v1. `SIGN IN` is a placeholder.
- The empty-Following state (a new user) is **not designed**.

### 4. Spoiler-free

A spoiler-free setting exists in the product plan. A finished-state row that hides results is **not designed**.

### 5. Tiers and states

See section 2.

### 6. Day-schedule ticket shape (generated, height varies)

The day schedule (`DaySchedule`) is a card with a ticket stub on the left. Its height depends on its rows, so its shapes are generated. Reference code with unit-test fixtures: the appendix (section 7).

- Card width 648, stub width 56, outer corners 24.
- Notch: half circle, radius 6, cut into the top and bottom edge, centred on x = 56.
- Holes: radius 1.9, centred on x = 56, at y = 20 + 7k for k = 0 … floor((H − 42) / 7). H = 245 → 30 holes, H = 554 → 74 holes.
- Fills: stub `--color-brand-amber` (today) / `--color-brand-indigo-light` (not today); face `--color-surface-card`; outline 1px `--color-border-default` along the outer edge and every hole.
- Notches and holes show the **page background**. Do not paint white discs over them. Row containers inside the card are transparent (a white row background covers half of every hole and notch).
- Stub content: top = weekday / day / month (and the `TODAY` stamp for today); bottom = session count at `H − 45` and `SESSIONS` at `H − 23`. They follow the card height; do not hard-code them.
- Implementation options: SVG path from the generator, or CSS mask. Pick one in Milestone 4 and say why.

### 7. Text overflow [Recommended]

- The status area (LIVE, progress, time, result) is never clipped. Titles and names truncate with an ellipsis.
- Rank bar names truncate; times and gaps stay whole.
- The design sheet contains clipped examples (LIVE: `18m left`, `51m left`, `Yellow flag`, `Red flag`; DONE: some start times and results). Implement the rule above instead of copying the clipping.

### 8. Rows and spacing

- Row heights in the design: single-line rows 40 or 41px; multi-line and race rows are taller. Paddings and gaps per variant are in the Figma spec cards (page 05, section 4, `SessionRow`); read them from the layers, do not guess.
- Separator: 1px `--color-border-separator` (full width) on the **top** edge of every row except the first in a card.
- The spacing scale is 2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 (`--space-*`), page margin 84 (`--space-page`). The design also uses off-scale values (1.5, 3, 5, 7, 9, 13, 14; counts in Figma section 3 C). Keep them 1:1 for pixel match or round them. Open question C.

### 9. Materials and elevation (the "pass" rules)

| Layer | Contents | Rule |
|---|---|---|
| Printed (flat) | sidebar lists, standings, rows | 1px border, no shadow, no holes, surfaces radius 24 |
| Punched (status) | the ticket stub of the day schedule | holes and notches mean only "today / not today"; flat |
| Attached (brand, footer, selected) | footer sticker, selected pills | one shared shadow, `--shadow-attached`. The 3px solid white border plus 1px `--color-border-keyline` is the sticker's die-cut edge, the only exception |
| App shell | glass top nav | `--color-nav-glass` (`#1B2AE1` at 80% opacity) + 20px background blur (`backdrop-filter: blur(20px)`) + a 3px `--color-brand-amber` line at the bottom |
| Printed marks | series plates, TODAY stamp | flat, no shadow |

Principles: data containers get no shadow; punching is only for the ticket stub; the 3px solid white border is only for the sticker; new components take their radius from `tokens.css` by short side (micro ≈ 1/5, controls ≈ 1/3, big surfaces 24; inner radius = outer radius − padding).

### 10. Status text styles

- Flags in single-line rows: lowercase full words, `.text-row-meta` size, colour `--color-flag-red` or `--color-text-amber`.
- In multi-line rows the status word uses `.text-row-live` (uppercase), same position as `LIVE`.
- `RESCHEDULED` and `Results pending` are currently colour tag / grey pill (open question A).

### 11. Layout (desktop only)

1440 = 84 + 288 + 24 + 648 + 24 + 288 + 84 (side column 12 modules, centre 27 modules, gap 1 module; module 24px). Whether the top nav is fixed or scrolls with the page, and the footer's exact shape, are not specified in the design: read the Footer spec card (section 4) and ask the owner about nav behaviour.


---

## 4. Data mapping

Status: **Proposed**. Based on `docs/api-contract.md` and `docs/data-model.md` as read on the repository's `main` branch. Those documents mark the v1 contract and the canonical model as **Proposed / not implemented** (reviewed 2026-10-30). The owner also reports that W03 Phase A (the F1 calendar under `/api/v1`) has been committed and Phase B (results, standings) has not started, so the docs may lag the code. **Before writing the adapter, read `backend/src/` and decide per field what is Current and what is Proposed.**

The frontend today calls `GET /events/today` and `GET /sessions/:id/detail` (`frontend/src/lib/api.ts`), and returns `[]` / `null` on ANY failure, which hides upstream errors; the new adapter must not do that. The legacy event shape is `{ series{id,name,category}, season, eventName, roundNumber?, roundLabel?, country, location, venueName, sessions[{id, eventId, name, category, startTime, endTime, status: 'upcoming'|'live'|'finished'|'cancelled'}] }` (no TBC, no results, no availability). The six legacy routes are listed in `docs/api-contract.md`. Their JSON is provider-derived, has no `{data, meta}` envelope, and OpenF1 "classification" there is fastest-lap order, which must not be shown as a race result.

### 1. Architecture

```
API (legacy routes now, /api/v1 later)
  → adapter (one per API version; picks real data or fixtures)
    → Home view model (this document, section 3)
      → components (design-specific props)
```

- Components never see API or provider JSON. When the backend moves from legacy to v1, only the adapter changes.
- Fixtures (three states: live, done, idle) implement the same view model. Show a visible "fixture data" marker whenever fixtures are on screen. Never mix fixture and real data without saying so.

### 2. Field mapping

| UI element | View-model field | Source in the contract / model | Gap or note |
|---|---|---|---|
| Series list, plate, badge | `seriesId`, `name`, `followed` | `GET /series` → `Series {id, name, category?, status?}` | Short code on the plate (`GTWC EU`), plate colour and badge colour are **not** in the model. Keep a `seriesTheme` map keyed by `seriesId` in the frontend (values: `tokens.css` `--color-series-*`, plus the 28 badge colours in Figma page 05, section 3 G2). `followed` is client state. Design series without backend coverage must degrade gracefully (v1 covers F1 first). |
| Event name, round number | `eventName`, `roundNumber` | `GET /events`, `/events/:eventId` → `Round {name, roundNumber?, locationLabel?, circuitId?}` | "Event" in the API is the model's `Round`. |
| Day grouping and week | `dayKey`, `weekendKey` | `Round.weekendKey?`, `Round.startsAt/endsAt`, `Session.scheduledStartAt`, `Session.timezone?` | Week assignment uses the event weekend in track-local dates (section 3 §1). Confirm which field carries the track time zone. |
| Session identity and tier | `sessionId`, `sessionName`, `tier` | `Session {id, type, name, sequence?}` | Tier is not provided. Map `Session.type → T1..T5` in the adapter (section 2). |
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

#### Result availability → UI

| `meta.availability` | UI |
|---|---|
| `available` | Show the result block (`publicationStatus: provisional` → `Provisional` status line; `final` or `unknown` → no status line; never claim "final" without evidence) |
| `not_published` | `Results pending` (collapsed one-row state for T1) |
| `partial` | Show what exists; the wording is not designed |
| `unsupported`, `not_applicable`, `access_restricted` | Hide the result block (not designed; keep it plain) |
| `upstream_error` | Error state. **Never render as "no results".** Not designed |

#### 2a. What the legacy API returns today (Current, from `backend/src/events/types.ts` and `frontend/src/lib/api.ts` on `main`)

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

### 3. View-model sketch (Proposed)

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

### 4. Rules from the contract that the UI must respect

- Empty is not the same as not published, unsupported or failed (`docs/api-contract.md`, "Standard response envelope").
- Unknown stays unknown: `null` times, no invented defaults, no midnight for date-only events.
- Points are decimal strings. Position text and classification status (DNF, DNS, DSQ, NC) stay distinct.
- The frontend uses OpenGP contracts, not provider JSON. Keep legacy and v1 behind the adapter.


---

## 5. Open questions

Last updated with the Figma handoff page (page 05). IDs are referenced from other docs.

### Decisions already made (do not reopen)

- Live sessions are not pinned; every session is sorted by start time.
- Practice sessions are single rows, not collapsed (Following and All series).
- Neutral text colours merged: primary `#121212` (same as brand ink), secondary `#525252`, tertiary `#737373`, disabled `#A3A3A3`.
- Text clipping and text-contrast failures in the design sheet are handled in code, not in Figma.
- Naming is function-first (schedule, day-schedule, session-row, series-list, standings-panel).

### Needs an owner decision

| ID | Question | Notes |
|---|---|---|
| A | Flags are text, but `RESCHEDULED` is a colour tag and `Results pending` a grey pill. Unify to the V1 style ("dot + sentence")? | section 2 |
| B | Result statuses `Provisional`, `Updated after penalty` and ▲▼ position changes have no drawn examples. | Rule is final; visuals missing |
| C | Spacing scale is 2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 (+ page 84), but the design also uses off-scale values: 1.5 (plate padding, 184×), 3 (67×), 5 (126×), 7 (45×), 9 (105×), 13 (25×), 14 (94×). Keep 1:1 or round to the scale? | section 3 (8); Figma section 3 C |
| D | Icon-button shape: the settings button is a rounded square (radius 12), the arrows are circles. Keep? | |
| E | Contrast: 97 text layers are below 4.5:1 (tertiary text on `#F5F5F5` 4.35:1, past dates on `#E8E8E8` 2.06:1, amber text on white 4.2:1, LIVE green as text 3.3:1, P2 slate on `#F5F5F5` 4.36:1). Candidate fixes discussed, none chosen: grey `#737373` → `#666666`; LIVE text → `#15803D` (bars keep `#16A34A`); amber text → about `#8F5506`; a darker slate; a darker disabled grey. | Deferred by the owner; decide before release |
| F | Series colour mismatch between plate band and left-list badge: NASCAR plate `#CA8A04` vs badge `#A16207`; Formula E plate `#0284C7` vs badge `#0369A1`. Use one `series.color`. | The other 6 plate series match |
| G | Today cell text: `6 left` in all states. DONE → `6 done`? IDLE → `6 to go`? | |
| H | Text below 11px: 32 layers at 9–10px. Raise? | |
| I | Delivery: new route `/next` behind the existing site (default in CLAUDE.md) or replace `/`? | Needs a responsive plan first |
| J | `rescheduledFrom` (`was …`) has no field in the data model. Add one? | section 4 |
| K | `Can still win` in standings, team colour bars, series short codes: where does this data come from? | section 4 |
| L | Live data (progress, flags, time left): source, refresh method, and whether LIVE rows ship in the first release. | v1 promises no real-time |

### Shelved (not designed; do not improvise)

- Mobile and tablet layouts (the design is 1440 only).
- Mixed-state rows: live, done and upcoming in the same day card, plus cancelled, postponed and other row states.
- Interaction and feedback states: hover, pressed, focus ring, disabled, skeleton, empty (including empty Following), error, offline.
- Spoiler-free variant of finished rows.
- Other pages and click targets: row chevron destination, search results, settings, sign-in, series page, event page, Following management.
- Dark mode (`--color-brand-indigo-dark` is reserved; the sticker and pills would need a different "attached" cue because shadows disappear on dark).

### Known issues in the design sheet

- Clipped text in the Homes: LIVE has 6 clipped texts (including `18m left`, `51m left`, `Yellow flag`, `Red flag` and one event title), DONE has 8 (start times and results). Implement "status never clipped, titles truncate".
- Only some blocks are real Figma components (section 8). Session rows and day schedules are frames, not component instances. No Figma variables or styles exist; every value is hard-coded in the layers and documented only as text in section 3.
- Layer names in the three Homes were cleaned up for the handoff (4,263 non-text layers, no default names left).


---

## 6. Milestones

Work in order, one branch and one Claude Code session per milestone, clear the context between milestones. Each ends with `npm run lint` and `npm run build` passing in `frontend/`, a short note of decisions and leftovers, and questions for the owner. If the design, this document or `docs/api-contract.md` does not answer something, stop and ask.

Work in order. One branch and one Claude Code session per milestone (clear the context between milestones). Each milestone ends with: `npm run lint` and `npm run build` pass in `frontend/`, a short note of what was decided and what was left, and a list of questions for the owner. If something is not answered by the design, section 3, section 4 or `docs/api-contract.md`, **stop and ask**; do not invent.

### M0 — Confirm and decide (no feature code)

1. Check `CLAUDE.md` section 5 against the repo (it was read from a repository snapshot).
2. Check `backend/src/` for `/api/v1` routes. The docs on `main` say v1 is Proposed; the owner says W03 (F1 on Jolpica + OpenF1) is in progress (PR #1).
3. Ask the owner the decisions that block M1 to M5: route (default `/next`), where new code lives (default `src/components/home/`, `src/app/next/`, `src/styles/tokens.css`), and whether old pages stay untouched (default yes).

### M1 — Tokens and fonts

- Copy `tokens.css` into the app (default `frontend/src/styles/tokens.css`, imported from `src/app/globals.css`). Tailwind here is v4 (`@import "tailwindcss"`, no config file, no `@theme` yet): move the colour, radius, shadow and font variables into `@theme` where it gives useful utilities; keep `--space-*` and `--layout-*` as plain variables; keep the `.text-*` classes.
- Fonts: `layout.tsx` already loads Inter (`--font-body`) and Rajdhani 400–700 (`--font-display`) with `next/font/google`. Add Barlow Condensed (weights 600, 700, 800) and Barlow (500). The family names in `tokens.css` are placeholders: map `--font-sans`, `--font-data`, `--font-condensed`, `--font-brand` to the `next/font` CSS variables. Do not rename or remove the existing `--font-body`, `--font-display`, `.font-display`, `.font-body` or the old `:root` variables; the old pages use them.
- Add a dev-only page `src/app/dev/tokens/page.tsx` that shows every colour, radius, shadow and text style (53), like Figma page 05 section 3.

Acceptance: `/dev/tokens` matches Figma section 3; old pages look unchanged; no hard-coded hex in new code; `npm run lint` and `npm run build` pass.

### M2 — Atoms (gallery at `/dev/components`)

`SeriesPlate` (8 series), `Button` (primary; icon none / arrow-up), `IconButton` (surface nav / page / card), `SearchField`, `TodayStamp`, `StatusTag` (rescheduled / results-pending), `WeekCell` (selected / default / today). Props = Figma variant properties.

Acceptance: each atom side by side with its Figma node; sizes, radii, colours, fonts match.

### M3 — Blocks

`TopNav` (glass: `--color-nav-glass` + blur + amber line), `Footer`, `SeriesSidebar` (`SeriesList` followed / top / all, `SeriesItem`), `StandingsPanel`, `TimeSelector` (header + week track), `SectionHeader` (following / all-series). Static content from fixtures.

Acceptance: each block matches its node at 1440 (Figma Home frames `top-nav`, `sidebar-series`, `time-selector`, `sidebar-standings`, `footer`).

### M4 — Rows and the day schedule

1. `SessionRow` for the 9 variants (`kind` single / multi / race × `state` live / done / idle) with `ResultInline`, `ResultPodium`, class winners, `LIVE` progress (flags: section 2).
2. `DaySchedule` with the ticket shapes (section 3 (6), the appendix (section 7)). Choose SVG path or CSS mask and write down why. Unit-test the hole counts (245 → 30, 554 → 74). Holes and notches show the page background; row containers are transparent.
3. Apply the overflow rule (section 3 (7)): status never clipped, titles truncate.

Acceptance: the six day schedules of `home-live`, `home-done` and `home-idle` can be reproduced from fixture data; row heights match the design (single-line 40 or 41px).

### M5 — Home assembly with fixtures

- Route `/next?state=live|done|idle` (or the route decided in M0) assembling `TopNav`, `SeriesSidebar`, `Schedule` (`TimeSelector`, two sections, day schedules), `StandingsPanel`, `Footer` at 1440 width, from typed fixtures (`HomeVM` in section 4). Show a visible "fixture data" marker.
- Fixtures reproduce the three Home frames' rows and counts (the design is the spec; read the texts from the nodes).

Acceptance: three states side by side with Figma Home frames (`5932:54`, `5932:2179`, `5932:4018`) with no visible layout differences other than text-rendering noise.

### M6 — Real data (F1 first)

- Adapter from the API to `HomeVM`. Legacy routes now (`src/lib/api.ts` today); `/api/v1` when the backend has it. One adapter per API version behind one interface; a flag chooses fixtures or real data. Replace the current "swallow errors and return `[]`" behaviour with an explicit error state.
- Respect section 4 (2 and 4): `scheduledStartAt = null` → `TBC`; `availability` states are distinct (`not_published` → `Results pending`, `upstream_error` → error state, never "no results"); points are decimal strings; fastest-lap order is never a race result.
- Series without backend coverage: show nothing or a plain placeholder, not fake data.

Acceptance: today's real F1 sessions render in the new Home; loading, empty and error states exist in plain form and are marked `TODO(design)`.

### M7 — QA and release prep

- Visual diff against Figma at 1440 for the three states; accessibility pass (keyboard order, labels, contrast: report the open contrast list from section 5, item E, do not choose values yourself).
- Decide with the owner: responsive fallback below 1440 (mobile is not designed), route switch-over, and which open questions (A–L) must be settled before release.
- Update the status line at the top of `docs/design/HANDOFF.md` and the frontend part of `docs/architecture.md` (section 3 is still marked "to be documented").



---

## 7. Appendix: ticket-stub reference code

Generates the day-schedule shapes for any height (see section 3, "Day-schedule ticket shape"). Use as a starting point and unit-test the hole counts.

```ts
/**
 * Reference implementation: shapes of the "day schedule" ticket card.
 *
 * The card height depends on how many session rows it holds, so the three vector
 * shapes (card base, stub, outline) must be generated per height. This is the exact
 * geometry used in the Figma file (page 05 > section 8 / day-schedule layers).
 *
 * Geometry (px), card width W = 648 by default, stub width 56:
 *  - outer corners: radius 24
 *  - notch: a half circle of radius 6 cut into the top edge and the bottom edge, centred on x = 56
 *  - holes: circles of radius 1.9 centred on x = 56, at y = 20 + 7 * k, k = 0 .. floor((H - 42) / 7)
 *    (half of each hole bites into the stub, half into the card face)
 *
 * Expected hole counts (use as unit-test fixtures): H = 245 -> 30, H = 554 -> 74.
 *
 * Rendering notes:
 *  - cardBase and cardOutline use fill-rule "evenodd"; holes and notches must show the PAGE background,
 *    never a white disc drawn on top.
 *  - Row containers on top of the card must have a TRANSPARENT background, otherwise they cover half of
 *    every hole and half of each notch (this was a real bug in the design file).
 *  - Colours: card face color-surface-card, stub color-brand-amber (today) or color-brand-indigo-light
 *    (not today), outline 1px color-border-default.
 */
export const STUB = {
  cardWidth: 648,
  stubWidth: 56,
  cornerRadius: 24,
  notchRadius: 6,
  holeRadius: 1.9,
  holeFirstY: 20,
  holePitch: 7,
  holeBottomClearance: 22,
} as const;

export type TicketShape = {
  /** path for the white card face (outline + holes, evenodd) */
  cardBase: string;
  /** path for the coloured stub (left 56px, scalloped right edge, evenodd not needed) */
  stubBase: string;
  /** path for the 1px outline stroke (same geometry as cardBase) */
  cardOutline: string;
  holeCount: number;
};

const f3 = (n: number) => Math.round(n * 1000) / 1000;

export function holeCenters(height: number): number[] {
  const last = Math.floor((height - 42) / STUB.holePitch);
  return Array.from({ length: last + 1 }, (_, k) => STUB.holeFirstY + STUB.holePitch * k);
}

function outlinePath(H: number, W: number): string {
  let d =
    `M 24 0 L 50 0 C 50 3.309 52.69 6 56 6 C 59.309 6 62 3.309 62 0 L ${W - 24} 0 ` +
    `C ${f3(W - 10.74)} 0 ${W} 10.739 ${W} 24 L ${W} ${f3(H - 24)} ` +
    `C ${W} ${f3(H - 10.739)} ${f3(W - 10.74)} ${H} ${W - 24} ${H} L 62 ${H} ` +
    `C 62 ${f3(H - 3.309)} 59.309 ${H - 6} 56 ${H - 6} C 52.69 ${H - 6} 50 ${f3(H - 3.309)} 50 ${H} ` +
    `L 24 ${H} C 10.739 ${H} 0 ${f3(H - 10.739)} 0 ${H - 24} L 0 24 C 0 10.739 10.739 0 24 0 Z`;
  for (const c of holeCenters(H)) {
    d +=
      ` M 57.9 ${c} C 57.9 ${f3(c + 1.049)} 57.049 ${f3(c + 1.9)} 56 ${f3(c + 1.9)}` +
      ` C 54.951 ${f3(c + 1.9)} 54.1 ${f3(c + 1.049)} 54.1 ${c}` +
      ` C 54.1 ${f3(c - 1.049)} 54.951 ${f3(c - 1.9)} 56 ${f3(c - 1.9)}` +
      ` C 57.049 ${f3(c - 1.9)} 57.9 ${f3(c - 1.049)} 57.9 ${c} Z`;
  }
  return d;
}

function stubPath(H: number): string {
  const centers = holeCenters(H);
  let d = `M 24 0 L 50 0 C 50 3.309 52.69 6 56 6 L 56 ${f3(centers[0] - 1.9)}`;
  centers.forEach((c, i) => {
    d +=
      ` C 54.951 ${f3(c - 1.9)} 54.1 ${f3(c - 1.05)} 54.1 ${c}` +
      ` C 54.1 ${f3(c + 1.049)} 54.951 ${f3(c + 1.9)} 56 ${f3(c + 1.9)}`;
    d += i < centers.length - 1 ? ` L 56 ${f3(centers[i + 1] - 1.9)}` : ` L 56 ${H - 6}`;
  });
  d +=
    ` C 52.69 ${H - 6} 50 ${f3(H - 3.309)} 50 ${H} L 24 ${H} ` +
    `C 10.739 ${H} 0 ${f3(H - 10.739)} 0 ${H - 24} L 0 24 C 0 10.739 10.739 0 24 0 Z`;
  return d;
}

export function buildTicketShape(height: number, width: number = STUB.cardWidth): TicketShape {
  const H = Math.round(height);
  return {
    cardBase: outlinePath(H, width),
    stubBase: stubPath(H),
    cardOutline: outlinePath(H, width),
    holeCount: holeCenters(H).length,
  };
}

// Sanity checks (move into a real unit test):
//   holeCenters(245).length === 30   // 20, 27, ... 223
//   holeCenters(554).length === 74   // 20, 27, ... 531
```
