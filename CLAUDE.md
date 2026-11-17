# CLAUDE.md — OpenGP

Guidance for Claude Code working in this repository. Keep it short; details live in `docs/`.

## 1. What this repo is

OpenGP is an Automotive Discovery Platform, starting with multi-series motorsport tracking (schedules, events, sessions, results, standings). Product name **OpenGP**; the repo was historically `motorsport-tracker`.

## 2. Layout and commands

| Path | What it is |
|---|---|
| `frontend/` | Next.js web app |
| `backend/` | NestJS API: legacy routes (OpenF1, Sportradar, NASCAR adapters) and `/api/v1` for F1 on Jolpica + OpenF1 (schedules and sessions are done; results and standings are not) |
| `docs/` | `architecture.md`, `api-contract.md`, `api-guide.md`, `data-model.md`, `data-providers.md`, `f1-data-providers.md`, `product-strategy.md`, and `design/` (Figma handoff, `UNDRAWN.md`) |

| Where | Command |
|---|---|
| `frontend/` | `npm ci`, `npm run dev` (http://localhost:3000), `npm run build`, `npm run lint` (`eslint`) |
| `frontend/` | Unit tests of the logic in `src/lib/home/`: `npx tsx --test src/lib/home/*.test.ts` (there is no test runner in `package.json` yet; the files use `node:test`) |
| `backend/` | `npm ci`, `npm run start:dev` (http://localhost:3001), `npm run build`, `npm run test`, `npm run test:e2e`. Note: `npm run lint` in `backend/` auto-fixes |

Env: `frontend/.env.local` → `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3001`), `NEXT_PUBLIC_CONTACT_EMAIL` (contact page; unset means the page says so). `backend/.env` → `SPORTRADAR_API_KEY`. Optional: `ENABLE_DEV_PAGES=1` makes `/dev/*` available in a production build. Never commit secrets.

## 3. Documentation rule and engineering principles

Docs distinguish **Current** (in code), **Confirmed** (approved) and **Proposed** (not approved or not implemented). Code and verified tests are the truth. Principles (`docs/architecture.md` 4.2): correctness before coverage (never infer an official race classification from fastest laps); no fabricated values; unsupported / not published / genuinely empty / upstream failure are four different states, in the UI too; the frontend uses OpenGP contracts, never raw provider JSON; F1 first.

## 4. Frontend facts (read from the repository)

- Next.js 16.2.4, **App Router** (`frontend/src/app`), React 19.2.4, TypeScript 5, ESLint 9, `lucide-react`, Netlify (`@netlify/plugin-nextjs`, `netlify.toml`).
- **Tailwind v4**: `@import "tailwindcss"` at the top of `src/app/globals.css`, followed since M1 by `@import "../styles/tokens.css"`; no `tailwind.config`. `globals.css` also has old `:root` variables (`--bg`, `--surface`, `--border`, `--text`, `--muted`, …), `.font-display` / `.font-body`, and **unlayered** resets for `a`, `button` and `img`. An unlayered rule beats every Tailwind utility (checked in a browser), so on old pages a colour utility on an `<a>` or a font utility on a `<button>` has no effect. New routes roll the `a` and `button` resets back inside `.og-root` (see section 5).
- Fonts via `next/font/google`: Inter → `--font-body` and Rajdhani 400–700 → `--font-display` in `src/app/layout.tsx` (classes on `<body>`); Barlow Condensed and Barlow in `src/styles/fonts.ts`, not in the root layout.
- `tsconfig` maps `@/*` to the frontend root (`./*`), not to `src/`. Use relative imports in new code.
- Old UI, football-shaped (FotMob style): `components/layout` (`TopNav`, `LeftSidebar`, `RightSidebar`), `components/matches` (`MatchesToolbar`, `CompetitionSection`, `MatchRow`), `components/common`, mock data in `src/lib`. Since 2026-11-14 only `/news` and `/news/[id]` still use it (with `TopNav` and `mock-data`); the old Home, About, event and session pages were removed when the new site moved to the root, so the rest of it is dead code.
- `src/lib/api.ts` calls the legacy `GET /events/today` and `GET /sessions/:id/detail` and returns `[]` / `null` on any failure. That hides upstream errors; **do not reuse it for the new Home** (principle above). The new client is `src/lib/api-v1/client.ts`: it returns data or an explicit error.
- Backend on `main` (checked 2026-11-14): the legacy routes (`/events/*`, `/sessions/:id/detail`) and `/api/v1` for F1 in `backend/src/api-v1/`: `GET /api/v1/series`, `/series/:seriesId/seasons`, `/rounds?from&to&tz&seriesId`, `/rounds/:roundId`, `/sessions/:sessionId`, all in a `{data, meta}` envelope. No results or standings endpoints yet. No track time zone on a round. See `docs/api-guide.md` and `docs/api-contract.md`.
- New code (2026-11-14, not yet run through `next build`): `src/styles/` tokens and fonts; `src/components/home/` the shell and the Home (TopNav, Footer, HomeView, TimeSelector, DaySchedule, SessionRow, SeriesSidebar, StandingsPanel, …) and the page parts (Logo, Button, IconButton, SearchBox, states, …); `src/lib/home/` week and day logic, tiers, row states, v1 adapter, search, series theme (28 series), with `*.test.ts`; `src/lib/api-v1/` types and client; `src/lib/client-state/` settings and following stores (localStorage); `src/app/(site)/` the pages of the new site (a route group: no prefix in the URL); `src/app/dev/tokens` the token gallery. What each page does and why: `docs/design/UNDRAWN.md`.

## 5. Design source of truth

- Handoff doc: `docs/design/HANDOFF.md` (components, tiers, rules, data mapping, open questions, milestones). Parts the design does not draw, and what was built for them: `docs/design/UNDRAWN.md`. Tokens: `docs/design/tokens.css` is the handoff snapshot; do not edit it. The app copy is `frontend/src/styles/tokens.css`; it holds the same values and its header lists the few differences. Design changes go into both.
- Figma file `4ZHA4lgk5NbZDFzMoMUsSH`, **only** page "05 · Dev Handoff · 前端交接" (node `5932:2`). Other pages are exploration history.
- Figma MCP: fetch one component or block by node id (ids in HANDOFF.md section 1), never a whole Home frame (up to about 2,400 layers). `get_design_context` for structure, `get_screenshot` for visual checks; for exact sizes, colours and icon paths a read-only `use_figma` script that returns a compact dump is cheaper. Figma has no variables or styles: map values to `tokens.css`, never copy hex values into components.
- Tokens in code: colours, radii, the shadow and the blur are Tailwind theme variables (`bg-brand-indigo`, `rounded-surface`, `shadow-attached`, `backdrop-blur-glass`); spacing and layout are plain `var(--space-*)` / `var(--layout-*)` (off-scale values are `--space-off-*`); typography is the 53 `.text-*` classes (`@layer components`, so utilities can override them). The 28 series colours are data in `src/lib/home/series-theme.ts`.
- Fonts and the design root: every new route needs a layout whose wrapper element has the class `og-root` and `designFontVariables` from `src/styles/fonts.ts` (see `src/app/(site)/layout.tsx`). The `--font-*` tokens only resolve inside it. Inside `.og-root` the old `a` and `button` resets are rolled back, so utilities and `.text-*` work on links and buttons. `.og-canvas` is the fixed 1440 desktop canvas; `.og-nav` makes the focus ring white on the indigo nav and footer.
- Already built, so do not rebuild them in M2 and M3: Button (primary, icon none or arrow-up), IconButton (nav, page, card), the search field (as `SearchBox`, with type-ahead), Logo, TopNav, Footer, and `RowTime` (the start time of an upcoming row, with the plain look of cancelled, postponed and unknown). Check them against Figma, then extend.
- `/dev/tokens` shows every token read from `src/styles/tokens.css`, with a contrast table. Dev pages return 404 in a production build unless `ENABLE_DEV_PAGES=1`.

## 6. Working rules

1. Do not invent. If the design, HANDOFF.md, UNDRAWN.md or the API contract does not answer something, stop and ask the owner; list what you could not decide. Where a plain safe behaviour is needed anyway, keep it minimal and tag it: `TODO(design)` (needs a Figma design), `TODO(owner)` (needs a decision or a fact), `TODO(legal)` (needs a lawyer).
2. Use tokens (`--color-*`, `--radius-*`, `--space-*`, `.text-*`). No hard-coded hex, font sizes or radii in new components.
3. Names: React components PascalCase; Figma variant properties become props (`kind`, `state`, `series`, `surface`, `icon`) with kebab-case values. The day card is **DaySchedule**, the centre column **Schedule**, left lists **SeriesList**, right column **StandingsPanel**.
4. The new site is in `src/app/(site)/` at the root (moved from `/next` on 2026-11-14, see UNDRAWN.md section 6). Old pages that still exist: `src/app/news/` (own nav, no replacement). Do not extend the old components or `src/lib/api.ts`; they are dead code to be removed with a tool (`npx knip`). Shared files (`src/app/globals.css`, `src/app/layout.tsx`) may change only additively. New code goes in `src/components/home/`, `src/lib/`, `src/styles/`; dev pages in `src/app/dev/`. Desktop 1440 only; mobile is not designed. The page is at least 1440 wide: the nav and the footer fill the window, the content stays on the 1440 grid (`mx-auto w-(--layout-page-width)`). The layout is `noindex` until launch (`TODO(owner)`).
5. Data: components read a design-specific view model produced by an adapter (HANDOFF.md section 4, `src/lib/home/adapter-v1.ts`). Until the backend has the data, use typed fixtures with a visible "fixture data" marker; never mix fixture and real data silently. Show a time with `LocalTime` (the user's zone), never `toLocaleString` on the server. Show a failed request as an error state, never as an empty list. The Home asks every series through `src/lib/home/series-sources.ts`: Formula 1 is a real request, every other series is a stand-in with the same shape and no rounds until the backend serves it (give the series an `apiId` in `series-theme.ts`). The server loads one week by track date (`dateBasis=track`); the standings panel loads its own data through `/home-standings`, so neither can hold the other back; the browser groups days in the visitor's zone. Result blocks and the standings come from the API; never fill a missing result with a guess.
6. One branch and one session per milestone, small commits, `npm run lint` and `npm run build` in `frontend/` before finishing, and the unit tests when `src/lib/` changed. Do not touch `backend/` unless asked.
7. Verify visually: Figma screenshot vs the running page at the same width.
8. Code, comments, commit messages and docs in English; answer the owner in the language they write (usually Chinese).

## 7. Out of scope for now

Phone and tablet layouts, hover and pressed states beyond the basics, the designed look of cancelled / postponed / rescheduled rows (a plain version exists: `RowTime`, `src/lib/home/row-text.ts`), the spoiler-free finished row, dark mode, languages, motion, analytics (HANDOFF.md section 5, UNDRAWN.md section 1). Pages that exist only as plain drafts: the legal pages (`TODO(legal)`), the series pages.
