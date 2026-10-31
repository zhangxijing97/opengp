# OpenGP — Formula 1 Data Providers & Field Mapping

> **Purpose:** Engineering reference for the **selected F1 data sources**: what each supplies, how to request it, how to interpret the response, and how to map it to OpenGP concepts.  
> **Status:** **Supplier selection: selected for F1 v1 design.** **Mapping: design input for D01.1; not yet an approved Canonical Model.** **Backend integration: not complete.**  
> **Reviewed:** 2026-10-29 · **Owner:** D01 · Engineering / W02 research handoff · [Repository](https://github.com/zhangxijing97/opengp)

**Scope:** Formula 1 only. This file does **not** define OpenGP's public HTTP API; see [`api-contract.md`](./api-contract.md). Other series remain under the cross-series [`data-providers.md`](./data-providers.md). Do not create an equivalent file for every series unless needed.

## 1. Decision, boundaries and evidence

### 1.1 Selected combination

- **Jolpica-F1 — primary:** season and Grand Prix identity, schedule, Race / Qualifying / Sprint classifications, driver and constructor identities, championship standings, and basic race lap data.
- **OpenF1 — supplementary:** detailed Session entities, planned end times and cancellation markers, Practice and Sprint Qualifying classifications, optional Race Control, starting-grid observations, sector laps and telemetry.
- **F1DB — deferred offline source:** archive, historical cross-checks, older Practice data and unusual historical statuses or shared cars. **Not** a production online API dependency for v1.

This combination is appropriate for a **non-commercial, mostly schedule-and-post-session F1 product** with no promised free real-time feed. Jolpica lacks the Practice and Sprint Qualifying result endpoints; OpenF1 starts in 2023 and is not the best canonical source for long historical results or identities. F1DB is a release-based database, not another HTTP results service.

### 1.2 Evidence labels

| Label | Meaning |
| --- | --- |
| **W02-V** | Real HTTP response or F1DB file was examined in OpenGP W02 (2026-10-28–29); accuracy verified **only** where the report says it compared specific fields against an official reference. |
| **DOC** | Published source documentation, terms, or repository source code. |
| **DESIGN** | Proposed OpenGP transformation or precedence policy; **requires D01.1 approval**. |
| **OPEN** | Not sufficiently checked, or blocked by a product/engineering choice. |

**Evidence boundary:** This document reuses W02's captured responses and read-only code audit. In this update we refreshed public supplier documentation; **we did not run new raw API requests or backend integration tests**. No provider is an official FIA/Formula 1 API. “Published classification” means upstream content reflecting published race results, **not** certification of final FIA status or guaranteed accuracy.

### 1.3 Capability ownership

| Capability | Preferred source | Complement / caution | Evidence |
| --- | --- | --- | --- |
| Series, Season, GP calendar / Event | **Jolpica** | OpenF1 `/meetings` also contains testing; do not treat every meeting as a GP round | W02-V / DOC |
| Planned Session type and start time | **Jolpica** for the GP schedule | **OpenF1** for independent `session_key`, planned end and cancelled marker | W02-V |
| Race classification, points, finishing status | **Jolpica** | OpenF1 for corroboration, not row-by-row mixing | W02-V |
| Qualifying Q1/Q2/Q3 classification | **Jolpica** | OpenF1 stage detail when justified | W02-V |
| Sprint race classification | **Jolpica** | Historical naming rules need season-aware mapping | W02-V |
| Practice FP1/FP2/FP3 results | **OpenF1** `/session_result` | Jolpica only has FP schedule; F1DB archives some older years | W02-V |
| Sprint Qualifying / Shootout results | **OpenF1** `/session_result` | Jolpica only has the schedule | W02-V |
| Drivers / constructors | **Jolpica** IDs | OpenF1 session-specific names, numbers and team color | W02-V |
| Driver / constructor standings | **Jolpica** | OpenF1 beta standings exist but are not the chosen source | W02-V / DOC |
| Basic race laps and end-of-lap position | **Jolpica** `/laps` | Docs say coverage starts in **1996** | DOC |
| Granular laps / sectors / pit / telemetry | **OpenF1** | Optional future depth; don't fetch entire telemetry for the base app | DOC |
| Session cancellation / Race Control | **OpenF1** | Race Control status is not proof of final classification | W02-V |
| Grid | Jolpica `grid` for recorded race grid; **OpenF1** for pre-race observations | OpenF1 `starting_grid` query requires relevant **Qualifying/Sprint Qualifying session key**, not Race key | W02-V |
| Deep historical Practice / shared cars / NC | **F1DB** offline, when needed | Data coverage is incomplete by era; import is deferred | W02-V |

## 2. Access, quotas, licensing and lifecycle

| Source | Base / delivery | Free access and rate limit | Coverage | Rights and operational caveats |
| --- | --- | --- | --- | --- |
| **Jolpica** | `https://api.jolpi.ca/ergast/f1/` | No API key currently; **4 req/s burst, 500 req/h sustained** unauthenticated; custom `User-Agent: OpenGP/<version>` required | Seasons **1950–present**, but individual fields/lap data vary by era | API data **CC BY-NC-SA 4.0** for non-commercial use; attribution/ShareAlike obligations; limits may fall; no uptime SLA |
| **OpenF1** | `https://api.openf1.org/v1/` | Free historical without key, **3 req/s, 30 req/min**; live window requires paid access | **2023–present** | Site intended for personal/education/research/non-commercial fan projects. Footer cites **CC BY-NC-SA 4.0**; FAQ says credit is optional: **conservatively attribute**; do not assume image or broadcast rights |
| **F1DB** | GitHub versioned JSON/CSV/SQLite/SQL download | Free releases, no per-record REST service or perpetual uptime guarantee | Historical material from **1950**, specific categories vary by period | **CC BY 4.0** with attribution; on-demand import, version + schema + hash tracking |

**OpenF1 live window:** According to its FAQ, data is considered live from **30 minutes before Session start until 30 minutes after Session end**. That interval is **not part of this free-first implementation**. The site does not promise a historical-data update latency SLA.

**Jolpica paging:** Ergast-compatible responses use `MRData.limit`, `MRData.offset`, `MRData.total` (frequently strings); defaults 30, maximum 100 per page. Set `limit=100`, follow `offset` until complete, and respect HTTP `429` and `Retry-After` where supplied. Do not repeatedly request each driver when a bulk endpoint suffices.

**F1DB sample release validated by W02:** `v2026.18.0` (2026-10-26), split JSON archive with verified SHA-256 `fba7a98c9b0ee946525e6ef497a86eb933f45fbf40398dd568e60196724e0840`; schema version **v6.5.0**. Do not silently treat a later release as the same tested artifact. This is an optional archive reference, not v1 install instructions.

**No license inheritance:** Jolpica, OpenF1 and F1DB rights must be tracked individually. A right to obtain JSON does not grant permission to republish Formula 1 imagery, logos, radio/audio, video or an FIA PDF. OpenGP should display suitable source attribution and a non-affiliation notice; any commercial expansion requires a separate rights review.

## 3. HTTP endpoint inventory and response envelopes

### 3.1 Jolpica (Ergast-compatible)

**Base:** `https://api.jolpi.ca/ergast/f1`; examples use `.json` and all available `limit` pagination. Data is wrapped in `MRData` with sub-tables (`RaceTable`, `StandingsTable`, etc.). Most numeric values are **JSON strings**.

| Data | Endpoint example or pattern | Important response path / fields | Priority |
| --- | --- | --- | --- |
| Seasons | `/seasons.json?limit=100` | `MRData.SeasonTable.Seasons[].season` | v1 |
| Calendar | `/{season}.json?limit=100` | `MRData.RaceTable.Races[]`: `season`, `round`, `raceName`, `Circuit`, `date`, `time`; optional practice, Qualifying, Sprint schedule objects | v1 |
| One GP | `/{season}/{round}.json` | A filtered `RaceTable.Races[]`; round is an attribute, not a permanent OpenGP identity | v1 |
| Race results | `/{season}/{round}/results.json?limit=100` | `Results[]`: `position`, `positionText`, `status`, `points`, `grid`, `laps`, `Time`, `FastestLap`, `Driver`, `Constructor` | v1 |
| Qualifying | `/{season}/{round}/qualifying.json?limit=100` | `QualifyingResults[]`: `position`, `Q1`, `Q2`, `Q3`, `Driver`, `Constructor` | v1 |
| Sprint results | `/{season}/{round}/sprint.json?limit=100` | `SprintResults[]`: similar to Race, including points | v1 |
| Driver standings | `/{season}/driverStandings.json?limit=100` or `/{season}/{round}/driverStandings.json?limit=100` | `StandingsTable.StandingsLists[].DriverStandings[]`; rank, points, wins, driver, constructors | v1 |
| Constructor standings | `/{season}/constructorStandings.json?limit=100` (or round-filtered) | `ConstructorStandings[]`; rank, points, wins, constructor | v1 |
| Drivers / Constructors | `/{season}/drivers.json`, `/{season}/constructors.json` | `Driver.driverId` / `Constructor.constructorId` and names | As needed |
| **Basic race laps** | `/{season}/{round}/laps.json?limit=100&offset=0` | `RaceTable.Races[].Laps[]`: `number`, `Timings[]` (`driverId`, `position`, `time`) | Optional; documented from 1996 |
| Pit stops | `/{season}/{round}/pitstops.json?limit=100` | Pit-stop event data; verify field semantics before adoption | Optional |
| Status dictionary | `/status.json` | Historical race-result status terms, **not** live Session status | Reference only |

**Not provided through the validated Ergast-compatible endpoints:** published Practice result tables, Sprint Qualifying result tables, independent Session IDs, guaranteed actual Session finish, Race Control or full car telemetry. A calendar `FirstPractice` field is a **schedule**, not a Practice classification.

**Jolpica examples (source-shaped, shortened):**

```json
{
  "MRData": {
    "RaceTable": {
      "season": "2025",
      "round": "2",
      "Races": [{
        "raceName": "Chinese Grand Prix",
        "Results": [{
          "number": "16",
          "position": "18",
          "positionText": "D",
          "status": "Disqualified",
          "laps": "0",
          "points": "0"
        }]
      }]
    }
  }
}
```

*Extracted/shortened from W02's recorded 2025 Chinese GP result sample. `position` can be a display order even when `positionText` signifies a DSQ; never turn this row into canonical P18.*

### 3.2 OpenF1

**Base:** `https://api.openf1.org/v1`; most endpoints return a **top-level JSON array**. Use exact `year`, `meeting_key`, `session_key` or `driver_number` filters; avoid unbounded telemetry requests.

| Data | Endpoint / example | Important response fields | Priority |
| --- | --- | --- | --- |
| GP / testing meetings | `/meetings?year=2026` | `meeting_key`, `year`, `meeting_name`, circuit, country / location and date | v1 support |
| Sessions | `/sessions?year=2025&country_name=China` or `/sessions?session_key={key}` | `session_key`, `meeting_key`, `session_name`, `session_type`, `date_start`, `date_end`, `is_cancelled`, `gmt_offset` | **v1** |
| Practice / SQ results | `/session_result?session_key={key}` | `position`, `driver_number`, `number_of_laps`, `duration`, `gap_to_leader`, `dnf`, `dns`, `dsq`, sometimes `points` | **v1** |
| Drivers in Session | `/drivers?session_key={key}` | `driver_number`, `name_acronym`, `full_name`, `team_name`, `team_colour`; `headshot_url` is not automatically licensed for reuse | v1 support |
| Starting grid | `/starting_grid?session_key={qualifyingSessionKey}` | `position`, `driver_number`, `lap_duration`, `session_key` | Optional; v1 if pre-race grid required |
| Race control | `/race_control?session_key={key}` | `date`, `category`, `message`, `flag`, `driver_number`, `lap_number` | Optional |
| Detailed laps | `/laps?session_key={key}&driver_number={number}` | `lap_number`, `lap_duration`, `duration_sector_1/2/3`, speed and timing fields | Optional |
| Driver standings (beta) | `/championship_drivers?session_key={raceKey}` | `position_start/current`, `points_start/current`; race key and driver identifier | Cross-check only |
| Team standings (beta) | `/championship_teams?session_key={raceKey}` | Similar start/current positions/points; `team_name` | Cross-check only |
| Telemetry / position / stints / pit / weather | `/car_data`, `/position`, `/stints`, `/pit`, `/weather`, etc. | High-volume timing / telemetry; see official API documentation | Deferred |

**Important OpenF1 schema semantics:**

- `session_name` **and** `session_type` are both required to map a Session kind. A Sprint session may have `session_type="Race"`; Sprint Qualifying can have `session_type="Qualifying"`.
- `date_start` and `date_end` are **planned** Session window fields. Do not treat `date_end` as a measured chequered-flag moment.
- `session_result.duration` changes meaning by Session: Practice = fastest lap seconds; Qualifying / Sprint Qualifying = **Q1/Q2/Q3 array** (nullable phases); Race / Sprint = total race time, potentially absent. `gap_to_leader` may be numeric, string (`+1 LAP`), stage array, or null. Validate by Session type before mapping.
- `number_of_laps`, `position`, `dnf`, `dns`, `dsq`, `points` can be null, absent or semantically different; **do not assume a single universal numeric row schema**.
- `session_result` is post-Session published data. An OpenF1 `position` is a supplier-published classification observation, **not** a rank to recalculate by sorting laps.
- **Grid query caveat:** W02 verified `/starting_grid?session_key=9994` (China 2025 Qualifying) and `...=9989` (Sprint Qualifying) returned data, while `...=9998` (Race session key) returned HTTP 404. Keep `qualifyingSessionKey` and intended race/sprint Session distinct; do not declare the endpoint broken or mislabel the grid as the qualifying result.
- `SESSION FINISHED` in Race Control is only a control message; it is **not** proof that results are final, penalties exhausted, or standings updated.

**OpenF1 practice example (W02-V, 2025 Chinese GP FP1, session `9988`):**

```json
{
  "position": 1,
  "driver_number": 4,
  "number_of_laps": 23,
  "dnf": false,
  "dns": false,
  "dsq": false,
  "duration": 91.504,
  "gap_to_leader": 0,
  "meeting_key": 1255,
  "session_key": 9988
}
```

**OpenF1 Sprint Qualifying exception (W02-V, 2025 Chinese GP SQ, session `9989`):**

```json
{
  "position": 15,
  "driver_number": 6,
  "dnf": true,
  "dns": false,
  "dsq": false,
  "duration": [92.171, null, null],
  "gap_to_leader": [0.959, null, null],
  "session_key": 9989
}
```

**Hadjar has P15 and `dnf=true` simultaneously**. A status flag must not erase an already recorded classification position.

### 3.3 F1DB (offline; not a REST API)

If approved for historical import, use a pinned GitHub release / checksum and its matching **split-file schema**. Relevant collections include season, race, driver, constructor, Practice result, qualifying result, sprint qualifying/race result, race result, per-round standings and participant tables. Note that records in some files begin later than 1950 (e.g. W02 saw FP1 starting in 1986), and a release can include future races with **no results**. Do not auto-overwrite Jolpica results with F1DB rows.

## 4. Proposed provider-to-OpenGP mapping

**Design-only mapping.** These names describe intended **canonical concepts**. `api-contract.md` and D01.1 must finalize actual TypeScript types, endpoint DTOs, nullability and persistence before code changes.

### 4.1 Series / Season / Event / Session

| Canonical concept (candidate) | Jolpica source | OpenF1 source | Interpretation |
| --- | --- | --- | --- |
| `Series.code` | `MRData.series` = `f1` | Implicit F1 | OpenGP owns series ID; never use provider name as ID |
| `Season.year` | `season` string | `year` number | Parse/validate year; internal `seasonId` separate |
| `Event.externalIdentity` | `season` + `round` (composite adapter key) | `meeting_key` | Crosswalk; round can change after schedule revision |
| `Event.displayName` | `raceName` | `meeting_name` | Prefer selected source, preserve aliases |
| `Venue / Circuit` | `Circuit.circuitId`, `Location.*` | `circuit_key`, `circuit_short_name`, `location` | Explicit circuit crosswalk; not just fuzzy name matching |
| `Session.externalIdentity` | Season + round + kind **locally constructed** | `session_key` | Jolpica does **not** expose independent Session ID in this API |
| `Session.kind / ordinal` | `FirstPractice`, `SecondPractice`, `ThirdPractice`, `SprintQualifying`/`SprintShootout`, `Sprint`, `Qualifying`, Race | `session_name` **plus** `session_type` | F1 kinds FP1/2/3, SQ, Sprint, Qualifying, Race; handle historical names |
| `Session.scheduledStartAt` | Session `date` + `time` | `date_start` | Offset-aware UTC instant where available; date-only precision if time missing |
| `Session.scheduledEndAt` | Mostly unavailable | `date_end` | Scheduled end only; nullable |
| `Session.cancelled` | Not exposed in validated calendar API | `is_cancelled` | Preserve cancelled events, don't silently delete them |
| `Session.actualEndAt` | No validated field | Race Control **observation**, not direct authoritative end field | Nullable; do not copy `date_end` |
| `Session.timezone` | Circuit / location only | `gmt_offset` (offset, not timezone ID) | Do not infer IANA zone from a fixed GMT offset alone |

**Session kind examples:** `session_type=Race + session_name=Sprint` → Sprint; `session_type=Qualifying + session_name=Sprint Qualifying` → Sprint Qualifying. The name **Sprint Shootout** is a historical name, not necessarily another distinct session type. A year-specific mapping table is required for the evolving F1 Sprint format.

### 4.2 Driver / Team / Entry (identity)

| Canonical concept (candidate) | Preferred mapping | Constraints |
| --- | --- | --- |
| `Driver` identity | Jolpica `Driver.driverId` → external ID crosswalk | `full_name`, acronym or car number are **not** durable identities |
| `Constructor` identity | Jolpica `Constructor.constructorId` → crosswalk | Team branding/name can change by season; OpenF1 only supplies `team_name` |
| `Entry.carNumber` | Event result `number` or session `driver_number` | Use **string**; number can change between seasons; historical records must not use the driver's current permanent number |
| `EntryParticipant` | Mapped Driver + Entry, scoped to event/session | Historical **shared cars** mean more than one driver may belong to one Entry |
| `SessionParticipation` | OpenF1 `/drivers?session_key=` | Practice stand-ins are not automatically Race participants |
| `DriverTeamAssociation` | Actual per-event constructors plus season context | A driver may switch teams mid-season; do not collapse the historical link |

### 4.3 Classification / lap timing / points

| Candidate canonical field | Jolpica source | OpenF1 source | Required rule |
| --- | --- | --- | --- |
| `classificationPosition: number?` | `positionText` numeric for officially classified ranks; `position` may be display order | `position` + flags | DSQ/NC may require null; **do not assign race rank from best laps** |
| `displayOrder` / `rawPositionText` | `position`, `positionText` | Raw `position` plus response order | Sorting in UI must not alter sporting classification |
| `classificationStatus` | `positionText` **and** `status` | `dsq`, `dns`, `dnf`, `position` | Separate from finishing/participation status; preserve raw data |
| `participationOrFinishStatus` | `status` and other source fields | `dnf`, `dns`, `dsq` | DNF may coexist with classified position; do not equate all `R` with DNF |
| `pointsAwarded: decimal?` | `points` **string**, e.g. `"12.5"` | `points` in tested some rows; context-specific | Preserve fractional precision; `null` != 0, and Practice has no points |
| `lapsCompleted: number?` | `laps` string | `number_of_laps` nullable | Provider semantics can conflict on DSQ; never blindly fill missing laps from another source |
| `raceElapsedMs` | `Time.millis` total time, if present | Race/Sprint duration seconds | `Time.millis` is **not automatically gap** |
| `gapToLeader` | `Time.time` may be `+9.748`; lapped status | `gap_to_leader` number/string/array | Model time/laps/unknown as different types |
| `qualifyingPhases[]` | `Q1`, `Q2`, `Q3` nullable/missing | `duration[]` for qualification | Preserve phase order and nulls; do not rerank by fastest Q1 |
| `practiceBestLapMs` | No Practice results endpoint | Practice `duration` seconds | Use published `session_result`, not local aggregate of raw lap array |
| `fastestLap` (supplement) | `FastestLap` | `/laps` | Descriptive statistic; **not classification position** |
| `gridPosition / gridStatus` | `grid` string (0 may mean pit lane) | `/starting_grid` using qualifying key | Grid is separate from qualifying result; race penalties may alter grid |
| `baseRaceLap` | `/laps` `number` + `Timings[].time`, `.position` | `/laps` `lap_number`, `lap_duration`, sector durations | Track source, time unit and 1996+ Jolpica coverage |
| `StandingsAsOfRound` | `StandingsLists[].round` | Beta `session_key` | Prefer Jolpica, preserve as-of round and whether season is ongoing |
| `StandingsRow` | driver/constructor `position`, `points`, `wins` | Beta `points_start/current` | Do **not** reconstruct standings by naively summing races; preserve supplier snapshot |

### 4.4 Three distinct status axes

A single `status` field is insufficient; D01.1 should model at least these **independent concepts**:

1. **Session lifecycle:** scheduled / started / suspended / finished / cancelled / unknown. “Finished” based solely on clock should be labelled **inferred**, not provider-verified.
2. **Data availability:** available / partial / not_yet_published / not_applicable / unsupported / upstream_error / access_restricted / unknown. `HTTP 200` with empty list **does not** imply “no event” or “DNS”.
3. **Result publication / revision:** unknown / provisional / final-verified, plus `observedAt`, `contentHash`, `supersedesId` where appropriate. **Do not automatically label Jolpica `HTTP 200` as FIA-final.**

`classificationStatus` (CLASSIFIED / NC / DSQ / DNS / ...) is **separate again** from Session lifecycle and result publication. Suggested enums are design examples until D01.1 approves them.

## 5. Cross-provider identifiers and source precedence

### 5.1 Verified matching example — China GP 2025

| Entity | Jolpica | OpenF1 | F1DB (archive) |
| --- | --- | --- | --- |
| Event | `season=2025`, `round=2` | `meeting_key=1255` | `raceId=1127` |
| Practice 1 | Calendar `FirstPractice` | `session_key=9988` | Race 1127 FP1 records |
| Sprint Qualifying | `SprintQualifying` schedule | `session_key=9989` | Race 1127 SQ records |
| Sprint Race | `Sprint` schedule/results | `session_key=9993` | Race 1127 Sprint records |
| GP Qualifying | `Qualifying` schedule/results | `session_key=9994` | Race 1127 Qualifying records |
| GP Race | `date` / `time` + results | `session_key=9998` | Race 1127 results |
| Hamilton | `Driver.driverId=hamilton` | `driver_number=44` **in that season/session** | `driverId=lewis-hamilton` |
| Ferrari | `constructorId=ferrari` | `team_name` with season-specific alias | `constructorId=ferrari` |
| Shanghai circuit | `circuitId=shanghai` | `circuit_key=49` | `circuitId=shanghai` |

**DESIGN matching order:** (1) same season, (2) known circuit crosswalk, (3) event identity and date range, (4) Session kind and start time, (5) manual review if ambiguous. Use explicit `ExternalIdentity(provider, entityType, externalId, scope, validFrom, validTo)` or an equivalent mapping table. Never match solely by country, driver number or fuzzy team name. Re-scheduled Events should keep the same OpenGP identity and a schedule revision/alias.

Current `openf1-session-{sessionKey}` IDs are **existing public identifiers**. Preserve resolution/alias behavior during migration rather than breaking links immediately. New canonical ID format is **not yet decided**.

### 5.2 Precedence and reconciliation

1. **One result table, one chosen classification source.** Race/Qualifying/Sprint: Jolpica. Practice/Sprint Qualifying: OpenF1. Save other providers as comparison/supplemental snapshots, never splice mixed ranking rows into one official table.
2. **Jolpica for canonical Driver/Constructor identities;** OpenF1 enriches session participation and optional display metadata. Crosswalk before merge.
3. **Scheduled session time:** Jolpica GP schedule anchors it; OpenF1 complements with planned end and cancellation. On conflict, record both and flag a review, not silent overwrite.
4. **Use a declared source for each field and a capture timestamp.** Record original response/source key, normalized mapping version, content hash, and possible revision chain.
5. **Revision matters:** post-session DSQ and amended results can change standings. Re-fetch affected results and standings together; mark transitional inconsistency rather than displaying contradictory data as final.
6. **Rate-aware read architecture:** request caching and shared syncing should be designed before scale. An always-running scheduler, persistent storage, and hosting constraints require a later D01 engineering decision; they are **not automatically approved by this document**.

## 6. W02 sample verification and regression fixtures

The following cases were **recorded and checked in W02**, not newly re-run here. They are recommended tests after D01.1 decides the Canonical contract. “V” refers only to the checked scope listed.

| Case | Observed / cross-checked behavior | Assertion OpenGP should preserve |
| --- | --- | --- |
| **2025 Chinese GP — FP1** (`OpenF1 session 9988`) | OpenF1 and F1DB: 20 participants; all 20 positions, best lap milliseconds and lap counts checked against official F1 results | Practice classification is published `/session_result`, not best-lap sorting implemented locally |
| **2025 Chinese GP — Sprint Qualifying** (`9989`) | All 20 places checked; Hadjar P15 **and** `dnf=true`; phase durations include nulls | Preserve P15; do not equate `dnf` with unclassified or erase Q2/Q3 nulls |
| **2025 Chinese GP — Race & Sprint** | Race final after penalties: Leclerc/Hamilton/Gasly DSQ; Alonso NC/DNF; Sprint Hamilton P1, 19 laps, 8 points | Disqualifications and revision handling; no stale standings mixed with amended result |
| **2025 Chinese GP — DSQ lap discrepancy** | Leclerc: Jolpica `laps="0"`; OpenF1 `number_of_laps=null`; F1DB `laps=56` | Preserve source semantics; do not present 0 as proof he physically drove zero laps |
| **2024 Brazil GP** | Albon/Stroll DNS; Hülkenberg DSQ; Jolpica may use `positionText=W` for DNS | Preserve start status and non-numeric classification; don't auto-produce race rank |
| **2021 Belgian GP** | 12.5 winner points and single-lap classified event | Decimal points, historical rule changes, missing time fields |
| **1950 British GP** | Kelly `positionText=R` and `status=Not classified`; historical shared cars/duplicate positions | `R` is **not always DNF**; allow multiple people per Entry and repeated result positions |
| **2023 Imola cancellation** | Five OpenF1 Sessions with `is_cancelled=true` | Keep cancelled events, not “deleted/no schedule” |
| **2026 Australian GP** | Jolpica and OpenF1 sample schedules, Race/Qualifying, driver and team standings checked in W02 | Ordinary-weekend smoke test and Session identity linkage |
| **2008 Brazilian GP / pre-2023 Practice** | Historical F1DB Practice records exist where OpenF1 has no coverage | Historical coverage is capability-specific, not “all years all fields” |
| **2025 Chinese GP Grid query** | OpenF1 Qualifying key `9994` succeeds; Race key `9998` returns 404 | Grid query requires correct Session scope; 404 is not general endpoint outage |

**Suggested automated acceptance flow:** capture a legally reusable and minimized source fixture; validate schema and mapping; assert domain invariants; compare against the specified official reference where allowed; test null/0/missing/404/429/timeout/cancelled; ensure a repeated sync does not duplicate an Event and an amended result creates a new snapshot.

Do not commit provider secrets or redistribution-restricted official PDFs.

### Stable references for the cases above

- [F1 2025 Chinese GP Race results](https://www.formula1.com/en/results/2025/races/1255/china/race-result)
- [F1 2025 Chinese GP FP1 results](https://www.formula1.com/en/results/2025/races/1255/china/practice/1)
- [F1 2025 Chinese GP Sprint Qualifying](https://www.formula1.com/en/results/2025/races/1255/china/sprint-qualifying)
- [F1 2025 Chinese GP Sprint Race](https://www.formula1.com/en/results/2025/races/1255/china/sprint-results)
- [F1 2024 Brazilian GP Race results](https://www.formula1.com/en/results/2024/races/1249/brazil/race-result)
- [F1 2021 Belgian GP Race results](https://www.formula1.com/en/results/2021/races/1074/belgium/race-result)
- [F1 1950 British GP Race results](https://www.formula1.com/en/results/1950/races/94/great-britain/race-result)

These URLs are **verification references**, not permission to scrape or redistribute their full contents. W02 sample bodies and hashes remain in the original research handoff, **not in this GitHub repo**. A future PR should add only reusable, minimized fixture data and explicit license/provenance notes.

## 7. Implementation readiness and unresolved items

### 7.1 Current backend changes needed (after contract approval)

| Existing code | Gap | Suggested engineering task |
| --- | --- | --- |
| `openf1/openf1.provider.ts` | Lap-best sorting and assigned `position=index+1`; not a published Race classification | **P0:** remove any claim that this is official ranking; replace F1 classifications with responsible provider's result feed |
| `openf1/openf1.client.ts` | Existing client fetches meetings, sessions, drivers and laps; does not implement new `/session_result` mapping in the verified code baseline | Add typed, validated `session_result` client and mapper for Practice / SQ |
| `racing-data-provider.registry.ts` | First adapter by series | Introduce capability-aware routing for F1, preserving other series |
| `events/types.ts` | Single `status`, mandatory numeric position/laps, mandatory Session end timestamp | Canonical status axes, nullable fields, decimal points, source provenance, source-independent IDs |
| `events.service.ts` | `Promise.allSettled` can turn failures into empty arrays | Make true empty / not yet published / unsupported / upstream error distinguishable |
| `jolpica/` | Calendar and seasons client implemented for `/api/v1` (2026-10-31) | Add results, qualifying, sprint and standings (next phase) |
| Existing `/events/*` and `/sessions/:id/detail` | Current routes and provider-shaped IDs are in use | Define compatibility/aliases before changing route/DTO behavior |

This document **does not mandate a database**, scheduler, cloud migration or `/api/v1` prefix by itself. Those are D01 design choices dependent on freshness requirements, traffic and the approved Canonical/API Contract. Avoid changing NASCAR and Sportradar modules as part of the F1 task unless an explicit compatibility need is identified.

### 7.2 Open questions / gates

- **Canonical model:** exact entity/DTO fields, entry scope, IDs, nullable timings, source metadata and enum names — **D01.1 approval required**.
- **Publication semantics:** how to label provisional vs final, how to detect changes and when to alert — W02 verified final amended snapshots exist, **not** the speed of publication or amendment propagation.
- **Historic gaps:** 1950–2022 Practice and rare status coverage needs per-season coverage tracking; F1DB import remains deferred unless product scope changes.
- **Free live:** not available as a guaranteed free capability; decide whether OpenGP v1 should show scheduled/inferred status rather than “live”.
- **Grid:** mapping from Qualifying/SQ key to intended Race/Sprint and late pit-lane penalties still needs special-case testing.
- **Licensing/attribution:** confirm release-time credit implementation and whether any image/media use is actually licensed; API JSON rights do not imply image rights.
- **Caching/hosting:** define where snapshots persist and how scheduled fetches work on the actual Render tier; avoid one request per user page view.
- **Runtime verification:** directly test final adapters in the development environment, including `HTTP 429`, timeout, unexpected types, source revision and end-to-end API response; these tests were **not performed in this document task**.

**Handoff gate:** D01.1 may start Canonical Data Model v1 now. Backend implementation may begin once the F1 v1 scope, canonical/HTTP contract, compatibility policy, and initial verification fixtures are approved. A successful build alone is not proof of data correctness.

## 8. Primary documentation and evidence sources

**Supplier documentation (refreshed 2026-10-29):**

- [Jolpica API endpoint reference](https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md)
- [Jolpica race laps endpoint (1996+)](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/laps.md)
- [Jolpica rate limits](https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md)
- [Jolpica Terms of Use](https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md)
- [OpenF1 API documentation](https://openf1.org/docs/)
- [OpenF1 access / limits / FAQ / licensing footer](https://openf1.org/)
- [F1DB repository and schema information](https://github.com/f1db/f1db)
- [F1DB pinned W02 release v2026.18.0](https://github.com/f1db/f1db/releases/tag/v2026.18.0)

**W02 research evidence:** Two local reports titled *OpenGP — F1 Final API Strategy & Canonical Data Mapping Handoff* (2026-10-28 and 2026-10-29), plus their recorded Stage 2/4 API responses. The 2026-10-29 report performed direct sampled HTTP/API and cross-source checks and supersedes earlier uncertain field assumptions. **These reports are research artifacts supplied to this documentation task; they are not files linked from this repository.**

**Related OpenGP docs:** [Provider overview](./data-providers.md) · [Canonical/API contract](./api-contract.md) · [Architecture](./architecture.md).
