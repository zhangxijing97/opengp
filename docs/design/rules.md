# Business rules and UI conventions (Home)

Status tags: **[Confirmed]** decided by the owner, **[Decided, not designed]** decided but not drawn in Figma, **[Recommended]** my proposal, not yet approved. Source: Figma page 05, section 5.

## 1. Week, dates and time

- The week is Monday to Sunday. Which week a session belongs to is decided by its **event weekend (track-local dates)**, not by the user's local date: an Americas Sunday race that is already Monday for an Asia/Oceania user stays in the same week. [Decided, not implemented]
- Sessions that start after midnight (user's local time): add a divider `N sessions start after midnight` at the end of the day group and a `+1 day` label above the start time. [Decided, not designed]
- On Monday, default to the previous week until the spill-over sessions finish. The default selection is `WEEK` (the whole week). [Decided]
- Times are shown in the user's local time (a setting; the design shows `times in PT`). Upcoming rows show only the user's local start time (no countdown). Showing the track-local time is not designed.
- Unknown start time (`scheduledStartAt = null`): show `TBC`, sorted last in the day. Never show midnight for a date-only event.

## 2. Sorting and grouping

- Inside a day: by start time. Live sessions are **not** pinned. [Confirmed]
- Followed series go in the `Following` section on top; the rest in `All series`. Both use the same row structure. Practice sessions are single rows, not collapsed. [Confirmed]

## 3. Following and sign-in

- The star in the left lists and in rows toggles following. There is no database or account backend yet. [Recommended] persist it in the browser (localStorage) for v1. `SIGN IN` is a placeholder.
- The empty-Following state (a new user) is **not designed**.

## 4. Spoiler-free

A spoiler-free setting exists in the product plan. A finished-state row that hides results is **not designed**.

## 5. Tiers and states

See `session-tiers.md`.

## 6. Day-schedule ticket shape (generated, height varies)

The day schedule (`DaySchedule`) is a card with a ticket stub on the left. Its height depends on its rows, so its shapes are generated. Reference code with unit-test fixtures: `reference/ticket-stub.ts`.

- Card width 648, stub width 56, outer corners 24.
- Notch: half circle, radius 6, cut into the top and bottom edge, centred on x = 56.
- Holes: radius 1.9, centred on x = 56, at y = 20 + 7k for k = 0 … floor((H − 42) / 7). H = 245 → 30 holes, H = 554 → 74 holes.
- Fills: stub `--color-brand-amber` (today) / `--color-brand-indigo-light` (not today); face `--color-surface-card`; outline 1px `--color-border-default` along the outer edge and every hole.
- Notches and holes show the **page background**. Do not paint white discs over them. Row containers inside the card are transparent (a white row background covers half of every hole and notch).
- Stub content: top = weekday / day / month (and the `TODAY` stamp for today); bottom = session count at `H − 45` and `SESSIONS` at `H − 23`. They follow the card height; do not hard-code them.
- Implementation options: SVG path from the generator, or CSS mask. Pick one in Milestone 4 and say why.

## 7. Text overflow [Recommended]

- The status area (LIVE, progress, time, result) is never clipped. Titles and names truncate with an ellipsis.
- Rank bar names truncate; times and gaps stay whole.
- The design sheet contains clipped examples (LIVE: `18m left`, `51m left`, `Yellow flag`, `Red flag`; DONE: some start times and results). Implement the rule above instead of copying the clipping.

## 8. Rows and spacing

- Row heights in the design: single-line rows 40 or 41px; multi-line and race rows are taller. Paddings and gaps per variant are in the Figma spec cards (page 05, section 4, `SessionRow`); read them from the layers, do not guess.
- Separator: 1px `--color-border-separator` (full width) on the **top** edge of every row except the first in a card.
- The spacing scale is 2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 (`--space-*`), page margin 84 (`--space-page`). The design also uses off-scale values (1.5, 3, 5, 7, 9, 13, 14; counts in Figma section 3 C). Keep them 1:1 for pixel match or round them. Open question C.

## 9. Materials and elevation (the "pass" rules)

| Layer | Contents | Rule |
|---|---|---|
| Printed (flat) | sidebar lists, standings, rows | 1px border, no shadow, no holes, surfaces radius 24 |
| Punched (status) | the ticket stub of the day schedule | holes and notches mean only "today / not today"; flat |
| Attached (brand, footer, selected) | footer sticker, selected pills | one shared shadow, `--shadow-attached`. The 3px solid white border plus 1px `--color-border-keyline` is the sticker's die-cut edge, the only exception |
| App shell | glass top nav | `--color-nav-glass` (`#1B2AE1` at 80% opacity) + 20px background blur (`backdrop-filter: blur(20px)`) + a 3px `--color-brand-amber` line at the bottom |
| Printed marks | series plates, TODAY stamp | flat, no shadow |

Principles: data containers get no shadow; punching is only for the ticket stub; the 3px solid white border is only for the sticker; new components take their radius from `tokens.css` by short side (micro ≈ 1/5, controls ≈ 1/3, big surfaces 24; inner radius = outer radius − padding).

## 10. Status text styles

- Flags in single-line rows: lowercase full words, `.text-row-meta` size, colour `--color-flag-red` or `--color-text-amber`.
- In multi-line rows the status word uses `.text-row-live` (uppercase), same position as `LIVE`.
- `RESCHEDULED` and `Results pending` are currently colour tag / grey pill (open question A).

## 11. Layout (desktop only)

1440 = 84 + 288 + 24 + 648 + 24 + 288 + 84 (side column 12 modules, centre 27 modules, gap 1 module; module 24px). Whether the top nav is fixed or scrolls with the page, and the footer's exact shape, are not specified in the design: read the Footer spec card (section 4) and ask the owner about nav behaviour.
