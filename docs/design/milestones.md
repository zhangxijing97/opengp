# Milestones for the Home redesign

Work in order. One branch and one Claude Code session per milestone (clear the context between milestones). Each milestone ends with: `npm run lint` and `npm run build` pass in `frontend/`, a short note of what was decided and what was left, and a list of questions for the owner. If something is not answered by the design, `rules.md`, `data-mapping.md` or `docs/api-contract.md`, **stop and ask**; do not invent.

## How to read the design

- Figma file key `4ZHA4lgk5NbZDFzMoMUsSH`, page 05 only. Node ids: `components.md`.
- Fetch one component or block at a time (`get_design_context` by node id). Never fetch a whole Home frame.
- The Figma file has no variables or styles. Take values from `tokens.css` / `tokens.ts`; the spec cards in Figma section 4 list sizes, paddings, radii and fonts read from the layers.
- Visual check: `get_screenshot` of the node and a screenshot of the running page at the same width (1440) side by side.

## M0 — Orientation (read-only, then two doc edits)

1. Confirm and extend the verified facts in `CLAUDE.md` §5 (Next.js 16, React 19, Tailwind v4, App Router, old FotMob-style Home, `lib/api.ts` swallowing errors). Read the rest of `src/components/**`, tests, `eslint.config.*`, `next.config.*`, and check for `frontend/AGENTS.md` / `CLAUDE.md`.
2. Inspect `backend/src/`: which routes exist today (legacy `/events/*`, `/sessions/:id/detail`, any `/api/v1/*`), and what the response types are. Record Current vs Proposed per field used in `data-mapping.md`.
3. Write `docs/frontend-architecture.md` (every statement tagged Current / Proposed) and update `docs/architecture.md` section 3 (see "Edits to existing docs" below).
4. Report: what in the current frontend can be reused, what the new Home must replace, and the answer to open question I (route `/next` or replace `/`).

Acceptance: the doc exists; no code changed besides docs; owner answers I.

## M1 — Tokens and fonts

- Tailwind is v4: put the tokens into `frontend/src/app/globals.css` as `@theme` variables (Tailwind then generates `bg-brand-indigo`, `rounded-surface`, … ) and keep the `.text-*` classes available. Do not delete the existing `:root` variables (`--bg`, `--surface`, `--font-body`, `--font-display`, …): the old Home still uses them until it is retired. Keep `tokens.ts` for JS use.
- Fonts: `layout.tsx` already loads Inter (`--font-body`) and Rajdhani 400–700 (`--font-display`) with `next/font/google`. Add Barlow Condensed (600, 700, 800) and Barlow (500), and expose `--font-sans`, `--font-data`, `--font-condensed`, `--font-brand` pointing at them (reuse the existing font objects; do not load Inter or Rajdhani twice).
- Add a dev-only page `/dev/tokens` that shows every colour swatch, radius, shadow and text style (53) like Figma page 05 section 3.

Acceptance: `/dev/tokens` matches Figma section 3; no hard-coded hex in new code; fonts render without layout shift.

## M2 — Atoms (gallery at `/dev/components`)

`SeriesPlate` (8 series), `Button` (primary; icon none / arrow-up), `IconButton` (surface nav / page / card), `SearchField`, `TodayStamp`, `StatusTag` (rescheduled / results-pending), `WeekCell` (selected / default / today). Props = Figma variant properties.

Acceptance: each atom side by side with its Figma node; sizes, radii, colours, fonts match.

## M3 — Blocks

`TopNav` (glass: `--color-nav-glass` + blur + amber line), `Footer`, `SeriesSidebar` (`SeriesList` followed / top / all, `SeriesItem`), `StandingsPanel`, `TimeSelector` (header + week track), `SectionHeader` (following / all-series). Static content from fixtures.

Acceptance: each block matches its node at 1440 (Figma Home frames `top-nav`, `sidebar-series`, `time-selector`, `sidebar-standings`, `footer`).

## M4 — Rows and the day schedule

1. `SessionRow` for the 9 variants (`kind` single / multi / race × `state` live / done / idle) with `ResultInline`, `ResultPodium`, class winners, `LIVE` progress (flags: `session-tiers.md`).
2. `DaySchedule` with the ticket shapes (`rules.md` §6, `reference/ticket-stub.ts`). Choose SVG path or CSS mask and write down why. Unit-test the hole counts (245 → 30, 554 → 74). Holes and notches show the page background; row containers are transparent.
3. Apply the overflow rule (`rules.md` §7): status never clipped, titles truncate.

Acceptance: the six day schedules of `home-live`, `home-done` and `home-idle` can be reproduced from fixture data; row heights match the design (single-line 40 or 41px).

## M5 — Home assembly with fixtures

- Route `/next?state=live|done|idle` (or the route decided in M0) assembling `TopNav`, `SeriesSidebar`, `Schedule` (`TimeSelector`, two sections, day schedules), `StandingsPanel`, `Footer` at 1440 width, from typed fixtures (`HomeVM` in `data-mapping.md`). Show a visible "fixture data" marker.
- Fixtures reproduce the three Home frames' rows and counts (the design is the spec; read the texts from the nodes).

Acceptance: three states side by side with Figma Home frames (`5932:54`, `5932:2179`, `5932:4018`) with no visible layout differences other than text-rendering noise.

## M6 — Real data (F1 first)

- Adapter from the API to `HomeVM`. Legacy routes now (`src/lib/api.ts` today); `/api/v1` when the backend has it. One adapter per API version behind one interface; a flag chooses fixtures or real data. Replace the current "swallow errors and return `[]`" behaviour with an explicit error state.
- Respect `data-mapping.md` §2 and §4: `scheduledStartAt = null` → `TBC`; `availability` states are distinct (`not_published` → `Results pending`, `upstream_error` → error state, never "no results"); points are decimal strings; fastest-lap order is never a race result.
- Series without backend coverage: show nothing or a plain placeholder, not fake data.

Acceptance: today's real F1 sessions render in the new Home; loading, empty and error states exist in plain form and are marked `TODO(design)`.

## M7 — QA and release prep

- Visual diff against Figma at 1440 for the three states; accessibility pass (keyboard order, labels, contrast: report the open contrast list from `open-questions.md` E, do not choose values yourself).
- Decide with the owner: responsive fallback below 1440 (mobile is not designed), route switch-over, and which open questions (A–L) must be settled before release.
- Update `docs/design/README.md` status and `docs/frontend-architecture.md`.

## Edits to existing docs (apply in M0)

1. `README.md`, project structure block: add a line under `docs/`, keeping `└──` on the last entry:
   ```
   │   ├── design/           # Figma handoff for the Home redesign (tokens, rules, components, data mapping)
   ```
   `README.md`, section 8 "Documentation" table: add a row
   ```
   | [Design Handoff](docs/design/README.md) | Implement the Home redesign from Figma: tokens, rules, components, data mapping |
   ```
   (`docs/data-model.md` exists but is not listed in that table; consider adding it.)
2. `docs/architecture.md`, section 3 "Frontend Architecture (To Be Documented)": replace the paragraph that starts "Routing, components, state management, and API integration will be documented here…" with:
   > The Home redesign is specified in [`docs/design/`](design/README.md) (tokens, rules, components, data mapping). A review of the current frontend code is recorded in [`frontend-architecture.md`](frontend-architecture.md) once Milestone 0 is done. Until then, the source code remains the reference.

## First prompt to paste into Claude Code (repo root, Figma MCP connected, plan mode)

```
Read CLAUDE.md and everything in docs/design/ first. Then do Milestone 0 only (docs/design/milestones.md):
inspect frontend/ and backend/src, write docs/frontend-architecture.md, apply the two doc edits, and report.
Do not write feature code yet. If anything in the design, the docs or the API contract does not answer a question,
stop and list it for me instead of guessing. Answer me in Chinese; keep code, comments and docs in English.
```
