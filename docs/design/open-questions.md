# Open questions, shelved work and known issues

Last updated with the Figma handoff page (page 05). IDs are referenced from other docs.

## Decisions already made (do not reopen)

- Live sessions are not pinned; every session is sorted by start time.
- Practice sessions are single rows, not collapsed (Following and All series).
- Neutral text colours merged: primary `#121212` (same as brand ink), secondary `#525252`, tertiary `#737373`, disabled `#A3A3A3`.
- Text clipping and text-contrast failures in the design sheet are handled in code, not in Figma.
- Naming is function-first (schedule, day-schedule, session-row, series-list, standings-panel).

## Needs an owner decision

| ID | Question | Notes |
|---|---|---|
| A | Flags are text, but `RESCHEDULED` is a colour tag and `Results pending` a grey pill. Unify to the V1 style ("dot + sentence")? | session-tiers.md |
| B | Result statuses `Provisional`, `Updated after penalty` and ▲▼ position changes have no drawn examples. | Rule is final; visuals missing |
| C | Spacing scale is 2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 (+ page 84), but the design also uses off-scale values: 1.5 (plate padding, 184×), 3 (67×), 5 (126×), 7 (45×), 9 (105×), 13 (25×), 14 (94×). Keep 1:1 or round to the scale? | rules.md §8; Figma section 3 C |
| D | Icon-button shape: the settings button is a rounded square (radius 12), the arrows are circles. Keep? | |
| E | Contrast: 97 text layers are below 4.5:1 (tertiary text on `#F5F5F5` 4.35:1, past dates on `#E8E8E8` 2.06:1, amber text on white 4.2:1, LIVE green as text 3.3:1, P2 slate on `#F5F5F5` 4.36:1). Candidate fixes discussed, none chosen: grey `#737373` → `#666666`; LIVE text → `#15803D` (bars keep `#16A34A`); amber text → about `#8F5506`; a darker slate; a darker disabled grey. | Deferred by the owner; decide before release |
| F | Series colour mismatch between plate band and left-list badge: NASCAR plate `#CA8A04` vs badge `#A16207`; Formula E plate `#0284C7` vs badge `#0369A1`. Use one `series.color`. | The other 6 plate series match |
| G | Today cell text: `6 left` in all states. DONE → `6 done`? IDLE → `6 to go`? | |
| H | Text below 11px: 32 layers at 9–10px. Raise? | |
| I | Delivery: new route `/next` behind the existing site (default in CLAUDE.md) or replace `/`? | Needs a responsive plan first |
| J | `rescheduledFrom` (`was …`) has no field in the data model. Add one? | data-mapping.md |
| K | `Can still win` in standings, team colour bars, series short codes: where does this data come from? | data-mapping.md |
| L | Live data (progress, flags, time left): source, refresh method, and whether LIVE rows ship in the first release. | v1 promises no real-time |

## Shelved (not designed; do not improvise)

- Mobile and tablet layouts (the design is 1440 only).
- Mixed-state rows: live, done and upcoming in the same day card, plus cancelled, postponed and other row states.
- Interaction and feedback states: hover, pressed, focus ring, disabled, skeleton, empty (including empty Following), error, offline.
- Spoiler-free variant of finished rows.
- Other pages and click targets: row chevron destination, search results, settings, sign-in, series page, event page, Following management.
- Dark mode (`--color-brand-indigo-dark` is reserved; the sticker and pills would need a different "attached" cue because shadows disappear on dark).

## Known issues in the design sheet

- Clipped text in the Homes: LIVE has 6 clipped texts (including `18m left`, `51m left`, `Yellow flag`, `Red flag` and one event title), DONE has 8 (start times and results). Implement "status never clipped, titles truncate".
- Only some blocks are real Figma components (section 8). Session rows and day schedules are frames, not component instances. No Figma variables or styles exist; every value is hard-coded in the layers and documented only as text in section 3.
- Layer names in the three Homes were cleaned up for the handoff (4,263 non-text layers, no default names left).
