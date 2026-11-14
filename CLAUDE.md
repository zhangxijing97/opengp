# CLAUDE.md — OpenGP

Guidance for Claude Code working in this repository. Keep it short; details live in `docs/`.

## 1. What this repo is

OpenGP is an Automotive Discovery Platform, starting with multi-series motorsport tracking (schedules, events, sessions, results, standings). Product name **OpenGP**; the repo was historically `motorsport-tracker`.

## 2. Layout and commands

| Path | What it is |
|---|---|
| `frontend/` | Next.js web app |
| `backend/` | NestJS API (adapters: OpenF1, Sportradar, NASCAR; F1 v1 work on Jolpica + OpenF1 is in progress, PR #1) |
| `docs/` | `architecture.md`, `api-contract.md`, `data-model.md`, `data-providers.md`, `f1-data-providers.md`, `product-strategy.md`, and `design/` (Figma handoff) |

| Where | Command |
|---|---|
| `frontend/` | `npm ci`, `npm run dev` (http://localhost:3000), `npm run build`, `npm run lint` (`eslint`) |
| `backend/` | `npm ci`, `npm run start:dev` (http://localhost:3001), `npm run build`, `npm run test`, `npm run test:e2e`. Note: `npm run lint` in `backend/` auto-fixes |

Env: `frontend/.env.local` → `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3001`). `backend/.env` → `SPORTRADAR_API_KEY`. Never commit secrets.

## 3. Documentation rule and engineering principles

Docs distinguish **Current** (in code), **Confirmed** (approved) and **Proposed** (not approved or not implemented). Code and verified tests are the truth. Principles (`docs/architecture.md` 4.2): correctness before coverage (never infer an official race classification from fastest laps); no fabricated values; unsupported / not published / genuinely empty / upstream failure are four different states, in the UI too; the frontend uses OpenGP contracts, never raw provider JSON; F1 first.

## 4. Frontend facts (read from the repository)

- Next.js 16.2.4, **App Router** (`frontend/src/app`), React 19.2.4, TypeScript 5, ESLint 9, `lucide-react`, Netlify (`@netlify/plugin-nextjs`, `netlify.toml`).
- **Tailwind v4**: `@import "tailwindcss"` at the top of `src/app/globals.css`; no `tailwind.config`, no `@theme` yet. `globals.css` also has old `:root` variables (`--bg`, `--surface`, `--border`, `--text`, `--muted`, …) and `.font-display` / `.font-body`.
- Fonts via `next/font/google` in `src/app/layout.tsx`: Inter → `--font-body`, Rajdhani 400–700 → `--font-display`.
- Existing UI is **football-shaped** (FotMob style): `MatchItem {homeName, awayName, scores…}`, `components/layout` (`TopNav`, `LeftSidebar`, `RightSidebar`), `components/matches` (`MatchesToolbar`, `CompetitionSection`, `MatchRow`), `components/common`, mock data in `src/lib`. Routes: `/`, `/about`, `/events/[id]`, `/news`, `/news/[id]`, `/sessions/[id]`. The home page is a server component: 3-column grid (250 / fluid / 280, max 1280) calling `getTodayCompetitionGroups(date)` with `?date=`.
- `src/lib/api.ts` calls the legacy `GET /events/today` and `GET /sessions/:id/detail` and returns `[]` / `null` on any failure. That hides upstream errors; **do not reuse it for the new Home** (principle above).
- Backend on `main`: only the legacy routes. `/api/v1` is **Proposed** in `docs/api-contract.md`; check `backend/src` before relying on it.

## 5. Design source of truth

- Handoff doc: `docs/design/HANDOFF.md` (components, tiers, rules, data mapping, open questions, milestones). Tokens: `docs/design/tokens.css`.
- Figma file `4ZHA4lgk5NbZDFzMoMUsSH`, **only** page "05 · Dev Handoff · 前端交接" (node `5932:2`). Other pages are exploration history.
- Figma MCP: fetch one component or block by node id (ids in HANDOFF.md section 1), never a whole Home frame (up to about 2,400 layers). `get_design_context` for structure, `get_screenshot` for visual checks. Figma has no variables or styles: map values to `tokens.css`, never copy hex values into components.

## 6. Working rules

1. Do not invent. If the design, HANDOFF.md or the API contract does not answer something, stop and ask the owner; list what you could not decide.
2. Use tokens (`--color-*`, `--radius-*`, `--space-*`, `.text-*`). No hard-coded hex, font sizes or radii in new components.
3. Names: React components PascalCase; Figma variant properties become props (`kind`, `state`, `series`, `surface`, `icon`) with kebab-case values. The day card is **DaySchedule**, the centre column **Schedule**, left lists **SeriesList**, right column **StandingsPanel**.
4. Do not modify or delete the old pages and components. Defaults (change if the owner says so): new Home at route `/next`; new code in `src/components/home/`, `src/app/next/`, tokens in `src/styles/tokens.css`. Desktop 1440 only; mobile is not designed.
5. Data: components read a design-specific view model produced by an adapter (HANDOFF.md section 4). Until the backend has the data, use typed fixtures with a visible "fixture data" marker; never mix fixture and real data silently.
6. One branch and one session per milestone, small commits, `npm run lint` and `npm run build` in `frontend/` before finishing. Do not touch `backend/` unless asked.
7. Verify visually: Figma screenshot vs the running page at the same width.
8. Code, comments, commit messages and docs in English; answer the owner in the language they write (usually Chinese).

## 7. Out of scope for now

Mobile and tablet, hover / focus / loading / empty / error states, mixed-state rows, dark mode, other pages, sign-in, spoiler-free rows (HANDOFF.md section 5). Where code needs a plain safe behaviour (for example an error state), keep it minimal and mark it `TODO(design)`.
