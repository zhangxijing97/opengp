# OpenGP API Guide

A short, practical guide to the backend API. Full field definitions: [`api-contract.md`](./api-contract.md).

> **Status (2026-11-15):** `/api/v1` covers **Formula 1 schedules, session results and championship standings**.

## 1. What it does

Ask for a date range in your time zone; get back the Grands Prix (**Rounds**) in that range, each with its **Sessions** (Practice 1, Qualifying, Race…).

```text
Series f1 → Season f1:2025 → Round f1:2025:china → Session f1:2025:china:fp1
```

Two rules apply everywhere:

- **No invented data.** Unknown values are `null`. A provider outage is an error, never an empty list.
- **Every response says how reliable it is** in `meta.availability`.

## 2. Getting started

```bash
cd backend && npm run start:dev    # API at http://localhost:3001
```

All new routes start with `/api/v1`. The older `/events/*` routes still work unchanged (see §7).

## 3. Endpoints

| Endpoint | Returns | Example |
| --- | --- | --- |
| `GET /api/v1/series` | Supported series | [try it](http://localhost:3001/api/v1/series) |
| `GET /api/v1/series/f1/seasons` | All F1 seasons | [try it](http://localhost:3001/api/v1/series/f1/seasons) |
| `GET /api/v1/rounds?from=&to=&tz=` | Rounds and sessions in a date range | [this week](http://localhost:3001/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=America%2FLos_Angeles) |
| `GET /api/v1/rounds/:roundId` | One Grand Prix with all sessions | [2025 China](http://localhost:3001/api/v1/rounds/f1:2025:china) |
| `GET /api/v1/sessions/:sessionId` | One session | [2025 China FP1](http://localhost:3001/api/v1/sessions/f1:2025:china:fp1) |
| `GET /api/v1/sessions/:sessionId/results` | Published classification of a session | [2025 China race](http://localhost:3001/api/v1/sessions/f1:2025:china:race/results) |
| `GET /api/v1/standings?seasonId=&subjectType=` | Driver or team standings | [2025 drivers](http://localhost:3001/api/v1/standings?seasonId=f1:2025&subjectType=driver) |

## 4. Querying a week

| Parameter | Meaning |
| --- | --- |
| `from` | First day, **included** (`YYYY-MM-DD`) |
| `to` | Day after the last day, **excluded**. A week is Monday → next Monday |
| `tz` | Your IANA time zone, e.g. `America/Los_Angeles`. Default `UTC` |
| `seriesId` | Optional, e.g. `f1` |
| `dateBasis` | `viewer` (default): group by the session's start date in `tz`. `track`: group by the date at the venue, so a race weekend stays together |

- A session belongs to the day it **starts in your time zone**; daylight-saving changes are handled.
- A Round lists only the sessions inside the range. Open the Round for the full weekend.
- A range can be 1–31 days.

Home-page tabs (Los Angeles time): [Last week](http://localhost:3001/api/v1/rounds?from=2026-10-19&to=2026-10-26&tz=America%2FLos_Angeles) · [This week](http://localhost:3001/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=America%2FLos_Angeles) · [Next week](http://localhost:3001/api/v1/rounds?from=2026-11-02&to=2026-11-09&tz=America%2FLos_Angeles)

In the browser, `Intl.DateTimeFormat().resolvedOptions().timeZone` gives the user's `tz`.

**For the Home week view use `dateBasis=track`.** Example: the Mexico City race (Sunday 1 Nov, 14:00 local) is Monday morning in Tokyo, yet it stays in that weekend: [try it](http://localhost:3001/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=Asia%2FTokyo&dateBasis=track). Each session then carries:

| Field | Meaning |
| --- | --- |
| `trackLocalDate` | Date at the venue; group day cards by this |
| `localDate` | Date in the viewer's `tz` |
| `dayOffset` | `localDate - trackLocalDate`: `+1` shows "+1 day", `-1` shows "−1 day", `0` shows nothing |

On a Monday, show the previous week while any of its sessions is not yet `completed`.

## 5. Reading a response

Successful responses are `{ "data": …, "meta": … }`. Shortened example:

```jsonc
{
  "data": {
    "rounds": [{
      "id": "f1:2025:china",
      "name": "Chinese Grand Prix",
      "locationLabel": "Shanghai, China",
      "status": "completed", "statusBasis": "time_inferred",
      "sessions": [{
        "id": "f1:2025:china:fp1",
        "name": "Practice 1",
        "scheduledStartAt": "2025-03-21T03:30:00Z",   // UTC
        "schedulePrecision": "instant",
        "lifecycle": { "status": "completed", "basis": "time_inferred" },
        "resultAvailability": "unknown"
      }]
    }]
  },
  "meta": { "availability": "available", "retrievedAt": "…", "sources": [ … ], "warnings": [] }
}
```

Fields that are easy to misread:

| Field | What it means |
| --- | --- |
| `meta.availability: "partial"` | Usable, but something is missing or out of date; `meta.coverage[].reason` says what. Not an error |
| `lifecycle.basis: "time_inferred"` | Status worked out from the schedule and the clock. **Not live timing** |
| `schedulePrecision: "date"` | Only the date is known; show no time |
| `resultAvailability: "unknown"` | Results were not checked by this endpoint. It does **not** mean there are no results |
| `endsAt` / `scheduledEndAt` | Planned end, not the actual finish |
| `resultPreview` | Teaser for finished sessions: `top_three` (Race, Sprint, Qualifying), `pole` (Sprint Qualifying) or `practice_leader` (Practice, with `metricLabel` best lap). `null` when not available |

## 6. IDs

Format: `f1:2025` (season), `f1:2025:china` (round), `f1:2025:china:race` (session).
Session kinds: `fp1`, `fp2`, `fp3`, `sprint_qualifying`, `sprint`, `qualifying`, `race`.

Old OpenF1 IDs still resolve on the new routes: [`openf1-session-9988`](http://localhost:3001/api/v1/sessions/openf1-session-9988) → `f1:2025:china:fp1`.

## 7. Errors

Errors are `{ "error": { "code", "message" }, "meta": { … } }`.

| HTTP | Code | When | Example |
| --- | --- | --- | --- |
| 400 | `INVALID_QUERY` | Bad date or time zone, range over 31 days | [try it](http://localhost:3001/api/v1/rounds?from=2026-10-01&to=2026-11-02) |
| 404 | `NOT_FOUND` | Unknown ID | [try it](http://localhost:3001/api/v1/rounds/f1:2025:atlantis) |
| 422 | `UNSUPPORTED_CAPABILITY` | Series only available on the old routes | [try it](http://localhost:3001/api/v1/rounds?from=2026-10-26&to=2026-11-02&seriesId=motogp) |
| 502 / 503 | `UPSTREAM_UNAVAILABLE` / `SERVICE_UNAVAILABLE` | A data provider failed or limited access | — |

## 8. Results and standings

`/sessions/:id/results` returns `resultSet: null` with an `availability` when there is nothing to show: `not_published` (not finished or not out yet), `unsupported` (Practice before 2023), `not_applicable` (cancelled), `access_restricted` (OpenF1 during live sessions). Rows keep the provider's rank: a disqualified driver has `position: null` and `classificationStatus: "dsq"`. Points are exact strings (`"12.5"`).

`/standings` returns the provider's published table (`asOfRoundId` for an earlier round). `canStillWin` is **calculated** (points + points still available ≥ leader's points; ties count as possible) and is `null` for seasons without a reviewed points table. `progress` gives rounds counted vs rounds in the calendar.

## 9. Data sources

Schedules come from [Jolpica-F1](https://github.com/jolpica/jolpica-f1) (1950 → now). [OpenF1](https://openf1.org) adds planned end times and cancellations (2023 → now). OpenF1 may block free access during live sessions; you then get `partial`, and schedules still work. Both publish data under CC BY-NC-SA 4.0; credit them in the UI.

## 10. Old routes

The old `/sessions/:id/detail` ranks drivers by fastest lap, which is **not** an official result. Use `/api/v1/sessions/:id/results` instead.

To check a running backend in one command: `cd backend && node scripts/smoke-v1.mjs`.
