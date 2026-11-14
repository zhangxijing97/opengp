# CLAUDE.md — OpenGP

Guidance for Claude Code (and any contributor) working in this repository. Keep it short; details live in `docs/`.

## 1. What this repo is

OpenGP is an Automotive Discovery Platform, starting with multi-series motorsport tracking (schedules, events, sessions, results, standings). The product name is **OpenGP**; the repository was historically called `motorsport-tracker`.

## 2. Layout and commands

| Path | What it is |
|---|---|
| `frontend/` | Next.js + React + TypeScript + Tailwind CSS web app |
| `backend/` | NestJS + TypeScript API (data providers: OpenF1, Sportradar, NASCAR; F1 v1 work with Jolpica + OpenF1 is in progress) |
| `docs/` | `architecture.md`, `api-contract.md`, `data-model.md`, `data-providers.md`, `product-strategy.md`, and `design/` (Figma handoff, see section 6) |

| Where | Command | Purpose |
|---|---|---|
| `frontend/` | `npm ci` then `npm run dev` | Install and start (http://localhost:3000) |
| `frontend/` | `npm run build`, `npm run lint` | Build, ESLint |
| `backend/` | `npm ci` then `npm run start:dev` | Install and start (http://localhost:3001) |
| `backend/` | `npm run build`, `npm run test`, `npm run test:e2e` | Build, tests. Note: `npm run lint` in `backend/` applies fixes automatically |

Environment: `frontend/.env.local` → `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3001`). `backend/.env` → `SPORTRADAR_API_KEY`. Never commit secrets.

## 3. Documentation rule

Every doc statement is one of **Current** (in source code), **Confirmed** (approved direction) or **Proposed** (not approved or not implemented). The source code and verified tests are the engineering truth. Do not describe proposed things as implemented.

## 4. Engineering principles (from `docs/architecture.md`)

1. Correctness before coverage: never infer an official race classification from fastest laps or live positions.
2. No fabricated values: keep unknown times, positions, points and statuses unknown. Do not invent defaults.
3. Explicit failure semantics: unsupported, not published, genuinely empty and upstream failure are four different states in the UI as well.
4. Stable API boundary: the frontend uses OpenGP contracts, never raw provider JSON.
5. Incremental: F1 first, then other series.

## 5. Frontend: verified facts (read from `main`) and what is still unchecked

Verified in `frontend/`:
- **Versions:** Next.js 16.2.4, React 19.2.4, TypeScript 5, ESLint 9, `lucide-react`, `@netlify/plugin-nextjs`. **Tailwind CSS v4** via `@tailwindcss/postcss` (`postcss.config.mjs`); there is no `tailwind.config`, so theme values go into CSS (`@theme`) in `globals.css`.
- **Router:** App Router under `frontend/src/app/`: `layout.tsx`, `page.tsx` (async server component; `searchParams` is a Promise), `events/[id]/page.tsx` (placeholder), `about/page.tsx`.
- **Existing Home:** FotMob-style, three columns `[250px | 1fr | 280px]` at max width 1280, groups sessions by competition (`CompetitionSection`), date via `?date=`. Components: `src/components/layout/{TopNav,LeftSidebar,RightSidebar}`, `src/components/matches/{MatchesToolbar,CompetitionSection,…}`. This is the **old design**; the redesign replaces it, not extends it.
- **Styling today:** `globals.css` = `@import "tailwindcss"` + plain `:root` variables (`--bg`, `--surface`, `--border`, `--text`, `--muted`, `--font-body`, `--font-display`, …) + a few base rules. Components use Tailwind utilities with raw values (for example `bg-[#f4f4f4]`, `rounded-[24px]`).
- **Fonts today:** `next/font/google` in `layout.tsx`: Inter (`--font-body`) and Rajdhani 400–700 (`--font-display`). Barlow Condensed and Barlow are **not** loaded yet.
- **Data layer today:** `src/lib/api.ts` calls the legacy `GET /events/today?date=` and `GET /sessions/:id/detail`, maps to `MatchItem` / `CompetitionGroup` (`src/lib/types.ts`, football-style fields such as `homeName`, `awayName`, `homeScore`), and **swallows failures into `[]` / `null`** (`console.warn`). That violates principle 3 above and must change in M6. Types are mirrored from `backend/src/events/types.ts`.

Not checked yet (verify in M0): the other files under `src/components/**`, tests, `eslint.config.*`, `next.config.*`, whether `frontend/AGENTS.md` or `frontend/CLAUDE.md` exists (if so, merge with this file; do not overwrite), and what is on `main` versus the open W03 PR in `backend/`.

## 6. Design source of truth (Figma)

- File key: `4ZHA4lgk5NbZDFzMoMUsSH`. Use ONLY the page **"05 · Dev Handoff · 前端交接"** (node `5932:2`). Other pages and the old `HomeUI` page are exploration history; do not implement from them.
- Link format: `https://www.figma.com/design/4ZHA4lgk5NbZDFzMoMUsSH/OpenGP?node-id=5944-1057` (node id with `:` written as `-`).
- Node ids, component list and build order: `docs/design/components.md`. Tokens: `docs/design/tokens.css` and `tokens.ts`. Rules: `docs/design/rules.md`. Tier/state rules: `docs/design/session-tiers.md`. Data mapping: `docs/design/data-mapping.md`. Open decisions: `docs/design/open-questions.md`.
- **Using the Figma MCP:** fetch one component or block at a time (by node id), never a whole Home frame (up to about 2,400 layers each: LIVE 2,385, DONE 2,099, IDLE 1,716). Use `get_design_context` for structure and `get_screenshot` for visual checks. Figma has no variables or styles bound, so values are hard-coded there; map them to the tokens, never copy hex values into components.

## 7. Working rules for the Home redesign

1. Do not invent. If the design, the docs or the API contract do not answer something, **stop and ask the owner**. List what you could not decide.
2. Use tokens (`--color-*`, `--radius-*`, `--space-*`, `.text-*`). No hard-coded hex values, font sizes or radii in components.
3. Names: React components PascalCase (`SessionRow`); Figma variant properties become props (`kind`, `state`, `series`, `surface`, `icon`) with kebab-case values; CSS classes and files kebab-case. A day card is a **DaySchedule**; the centre column is the **Schedule**; the left lists are **SeriesList**; the right column is **StandingsPanel**.
4. Data: the UI reads a design-specific **view model**, produced by an adapter from the API (`docs/design/data-mapping.md`). While the backend does not have the data (live progress, standings for other series, etc.), use typed fixtures behind the same adapter and show a visible "fixture data" marker. Never mix fixture data with real provider data silently.
5. Default delivery (change if the owner decides otherwise): build the new Home under a separate route (`/next`) and do not replace the existing pages until the owner says so. The design is desktop-only (1440 wide); there is no mobile or tablet design yet.
6. Work in milestones, on a branch per milestone, small commits, run `npm run lint` and `npm run build` in `frontend/` before finishing. Do not touch `backend/` unless asked.
7. Verify visually: screenshot the Figma node and the running page at the same width and compare. Do not chase pixel-perfect font rendering; do fix layout, spacing, colours and radii.
8. Language: code, comments, commit messages and docs in English. The owner usually writes to you in Chinese; answer in the language they use.

## 8. Out of scope for now

Mobile and tablet layouts, hover / pressed / focus / loading / empty / error states, mixed-state rows (live, done and upcoming in one day), dark mode, pages other than Home, sign-in and accounts, spoiler-free variants. They are listed in `docs/design/open-questions.md`; do not improvise them. Where the code needs a minimal safe behaviour (for example an error state), keep it plain and mark it `TODO(design)`.

## 9. Known issues in the design sheet (handle in code)

Some texts in the design are clipped by their container (LIVE: "18m left", "51m left", "Yellow flag", "Red flag"; DONE: a few times and results). Rule: the status area (LIVE, progress, time, result) must never be clipped; truncate titles and names with an ellipsis instead. See `docs/design/rules.md`.
