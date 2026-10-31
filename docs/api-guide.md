# OpenGP API Guide

A short, practical guide to the backend API. Full field definitions: [`api-contract.md`](./api-contract.md).

> **Status (2026-10-31):** `/api/v1` covers **Formula 1 schedules and sessions**. Results and standings are not available yet.

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

## 4. Querying a week

| Parameter | Meaning |
| --- | --- |
| `from` | First day, **included** (`YYYY-MM-DD`) |
| `to` | Day after the last day, **excluded**. A week is Monday → next Monday |
| `tz` | Your IANA time zone, e.g. `America/Los_Angeles`. Default `UTC` |
| `seriesId` | Optional, e.g. `f1` |

- A session belongs to the day it **starts in your time zone**; daylight-saving changes are handled.
- A Round lists only the sessions inside the range. Open the Round for the full weekend.
- A range can be 1–31 days.

Home-page tabs (Los Angeles time): [Last week](http://localhost:3001/api/v1/rounds?from=2026-10-19&to=2026-10-26&tz=America%2FLos_Angeles) · [This week](http://localhost:3001/api/v1/rounds?from=2026-10-26&to=2026-11-02&tz=America%2FLos_Angeles) · [Next week](http://localhost:3001/api/v1/rounds?from=2026-11-02&to=2026-11-09&tz=America%2FLos_Angeles)

In the browser, `Intl.DateTimeFormat().resolvedOptions().timeZone` gives the user's `tz`.

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

## 8. Data sources

Schedules come from [Jolpica-F1](https://github.com/jolpica/jolpica-f1) (1950 → now). [OpenF1](https://openf1.org) adds planned end times and cancellations (2023 → now). OpenF1 may block free access during live sessions; you then get `partial`, and schedules still work. Both publish data under CC BY-NC-SA 4.0; credit them in the UI.

## 9. Not yet available

- `/api/v1/sessions/:id/results` and `/api/v1/standings` (next phase).
- The old `/sessions/:id/detail` ranks drivers by fastest lap, which is **not** an official result.

To check a running backend in one command: `cd backend && node scripts/smoke-v1.mjs`.
