# HANDOFF.md: replacements to apply (2026-11-14)

Apply each one with find and replace in `docs/design/HANDOFF.md`. If a find text is not there, change only the small part that is. Items 1 to 12 fix statements that are out of date; 13 to 19 record the new decisions and the code that now exists.

~~~text
1. Header
FIND:    Nothing is implemented yet.
REPLACE: Implemented on 2026-11-14 and still to be checked with a local lint and build: M1 (tokens and fonts), the shell (TopNav, Footer, Logo, Button, IconButton, search field) and the pages the design does not draw (docs/design/UNDRAWN.md). The Home itself (M2 to M5) is not implemented.

2. Section 4, the paragraph that starts "Status: **Proposed**. Based on" and ends "what is Proposed.**"
REPLACE THE WHOLE PARAGRAPH WITH:
Status: **Current** for the F1 calendar (`/api/v1`, Phase A; checked against `backend/src/api-v1/` on 2026-11-14), **Proposed** for results, standings and live data (not implemented). Field names written as `/api/v1` names in the table below are Current; the rest are Proposed. `docs/api-guide.md` lists what exists.

3. Section 4, architecture block
FIND:    API (legacy routes now, /api/v1 later)
REPLACE: API (/api/v1 for the F1 calendar; legacy routes only where v1 has no equivalent)

4. Section 4, row "Event name, round number"
FIND:    `GET /events`, `/events/:eventId` → `Round {name, roundNumber?, locationLabel?, circuitId?}`
REPLACE: `GET /api/v1/rounds`, `/api/v1/rounds/:roundId` → `RoundSummary {name, roundNumber, locationLabel, circuit}`

5a. Section 4, row "Day grouping and week"
FIND:    `Round.weekendKey?`, `Round.startsAt/endsAt`, `Session.scheduledStartAt`, `Session.timezone?`
REPLACE: `RoundSummary.startsAt/endsAt`, `SessionSummary.scheduledStartAt`
5b. Same row
FIND:    Confirm which field carries the track time zone.
REPLACE: Checked 2026-11-14: `/api/v1` has no `weekendKey` and no track time zone field. Adding them is a backend task at the start of M6. Until then `src/lib/home/adapter-v1.ts` takes the weekend from the UTC date of the first session.

6. Section 4, row "Row state"
FIND:    `Session.lifecycle ∈ {scheduled, running, finished, cancelled, unknown}`
REPLACE: `SessionSummary.lifecycle.status ∈ {scheduled, in_progress, completed, cancelled, postponed, unknown}` (`basis` is `time_inferred` unless the provider says cancelled). Mapped in `src/lib/home/tier.ts`.

7. Section 5, "Decisions already made". Add after the line "- Naming is function-first (...)":
FIND:    - Naming is function-first (schedule, day-schedule, session-row, series-list, standings-panel).
REPLACE: - Naming is function-first (schedule, day-schedule, session-row, series-list, standings-panel).

         ### Decided 2026-11-14 (the owner delegated these decisions; change a line to reopen it)

         - I (route): first decided to stage the new Home at `/next`; on the same day, because the platform is in early development and has no users, the staging was skipped and the new site was moved to the root (route group `(site)`). The old Home, About, event page and session page were removed; `/news` stays. `BASE_PATH` is empty. The layout is `noindex` until launch.
         - C (off-scale spacing): kept 1:1 as `--space-off-*` tokens; rounding is deferred to a later design cleanup.
         - F (series colours): one colour per series, the plate value from `tokens.css`. The left-list badge uses the same token, so the NASCAR and Formula E badges differ slightly from the design sheet. Check the plate colours of those two: they equal the badge colours of `nascar-xfinity` and `formula-2`.
         - G (today cell text): derived from state. Nothing started: `N to go`. In progress or partly done: `N left` (N = sessions not finished). All finished: `N done`.
         - A (status tags): implemented as drawn (`RESCHEDULED` colour tag, `Results pending` grey pill) so the three Home frames match. The V1 "dot + sentence" style is used only for statuses that have no drawn example.
         - B, D, E, H: implemented as designed. Contrast and small-text values are unchanged (E and H stay deferred). `/dev/tokens` lists every colour pair below 4.5:1.
         - Top nav: sticky at the top of the page; the glass effect needs content to scroll underneath.
         - Following: stored in the browser (`localStorage`) in v1; there are no accounts.
         - Backend: not touched in M1 to M5. The gaps for the Home (week by event weekend, track time zone, results preview, standings) are handled at the start of M6, with a written proposal first.
         - Rows the design does not draw: cancelled and postponed sessions replace the start time with the word (same text style, secondary grey, no strike-through) and are not counted in the day's session count, the today cell or "after midnight"; an unknown status keeps the time and adds "Status unknown"; rescheduled is not shown (no API field). Plain version, replace when the rows are designed.
         - Parts the design does not draw (search, settings, sign-in, event, session and series pages, footer pages, empty and error states): see `docs/design/UNDRAWN.md`.

8. Section 5, table row E (the ratio was measured on the wrong background)
FIND:    amber text on white 4.2:1
REPLACE: amber text on `#F4F4F4` 4.20:1 (on white it is 4.62:1)

9. Section 6, M0 step 1
FIND:    1. Check `CLAUDE.md` section 5 against the repo (it was read from a repository snapshot).
REPLACE: 1. Check `CLAUDE.md` section 4 (frontend facts) against the repo. Done 2026-11-14: all correct except the backend bullet, which is now fixed.

10. Section 6, M0 step 2
FIND:    The docs on `main` say v1 is Proposed; the owner says W03 (F1 on Jolpica + OpenF1) is in progress (PR #1).
REPLACE: Done 2026-11-14: `/api/v1` exists (Phase A, F1 schedules and sessions) in `backend/src/api-v1/`; results and standings do not.

11. Section 6, M1 fonts bullet
FIND:    Add Barlow Condensed (weights 600, 700, 800) and Barlow (500).
REPLACE: Barlow Condensed (600, 700, 800) and Barlow (500) are loaded in `src/styles/fonts.ts`, not in the root layout, and attached by the layout of each new route together with the `og-root` class (done in M1).

12. Section 6, M6 first bullet
FIND:    Legacy routes now (`src/lib/api.ts` today); `/api/v1` when the backend has it.
REPLACE: `/api/v1` for the F1 calendar (it exists, with a typed client in `src/lib/api-v1/client.ts` and an adapter in `src/lib/home/adapter-v1.ts`); the legacy routes (`src/lib/api.ts`) only where v1 has no equivalent.

13. Section 6, "M2 — Atoms", first line under the heading
FIND:    `SeriesPlate` (8 series), `Button` (primary; icon none / arrow-up), `IconButton` (surface nav / page / card), `SearchField`, `TodayStamp`, `StatusTag` (rescheduled / results-pending), `WeekCell` (selected / default / today).
REPLACE: `SeriesPlate` (8 series), `TodayStamp`, `StatusTag` (rescheduled / results-pending), `WeekCell` (selected / default / today). Already built on 2026-11-14 and to be checked against Figma, not rebuilt: `Button`, `IconButton` (nav / page / card), the search field (`SearchBox`) in `src/components/home/`.

14. Section 6, "M3 — Blocks", first line under the heading
FIND:    `TopNav` (glass: `--color-nav-glass` + blur + amber line), `Footer`,
REPLACE: `TopNav` and `Footer` (built on 2026-11-14, check against Figma: `src/components/home/TopNav.tsx`, `Footer.tsx`),

15. Section 5, "Shelved" list, last line
FIND:    Dark mode
REPLACE: Dark mode. For what was built for the other shelved items, and what is still left, see `docs/design/UNDRAWN.md`.

16. Header, second replacement (apply after item 1)
FIND:    Implemented on 2026-11-14
REPLACE: The Home was built on 2026-11-15 (M2 to M5 as far as the data allows, M6 for Formula 1; see `docs/design/UNDRAWN.md` section 7). It is not yet checked against Figma at 1440 with a local build. Implemented on 2026-11-14

17. Section 6, "M5 — Home assembly with fixtures", first line under the heading
FIND:    Route `/next?state=live|done|idle`
REPLACE: Built on 2026-11-15 as the real Home at `/` with real Formula 1 data and no fixtures (decided with the owner); the three states are not built as fixtures yet. Original text: Route `/next?state=live|done|idle`

18. Section 6, "M6 — Real data (F1 first)", last line before "Acceptance"
FIND:    Series without backend coverage: show nothing or a plain placeholder, not fake data.
REPLACE: Series without backend coverage: show nothing. Built as a stand-in request per series with the same answer shape and no rounds (`src/lib/home/series-sources.ts`), decided with the owner on 2026-11-14; not fake data. Results, progress, flags and standings are not served yet, so finished rows have no result block and live rows have no progress.

19. Section 5, "Decided" list: add at the end
ADD:     Home, 2026-11-15: counts in the week track are for the followed series, or for all series when nothing is followed; a card is at least 96px high; `Results pending` shows only for `not_published`; the week range has no caret until a picker is designed; the footer sticker is three slices and runs edge to edge. Scores and reasons: `docs/design/UNDRAWN.md` section 7.
~~~
