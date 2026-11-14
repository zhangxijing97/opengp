# Session tiers (T1–T5) and the three states

Source: Figma page "01 · Product UI" sections 2 and 3 (the owner's tier design), redrawn in the latest UI on page 05, section 2 (frame ids in `components.md`). Rules are final; open points are at the end.

## Tiers

| Tier | Meaning | DONE (finished) | LIVE (in progress) | IDLE (not started) |
|---|---|---|---|---|
| **T1** | Main race | Timing tower with conditional header: three rows plus gap. Multi-class: a header row with the main class name (e.g. `PRO`) inside the card, plus a full-width `CLASS WINNERS` strip. Single class: no header. Results not published yet: collapse to one row (`Results pending`). | Same tower. Left column gets a third line: `LIVE · progress bar · time left`. Exceptions go on that line. | No result. Right side: local start time, and under it `ends …` (and `was …` when rescheduled). |
| **T2** | Main qualifying / sprint | Two-row podium: P1 with full name, P2 and P3 on the second row. | Same as T1 LIVE (third line is the progress line). | Same as T1 IDLE. |
| **T3** | Support sessions (pre-qualifying, sprint qualifying, heats, daily rally summaries) | One row, P1 only. Right side: `Fastest` or `P1` + colour bar + name. | One row: `LIVE` + 48px mini progress bar + time left. An exception word replaces the time left. | One row, right side only the local start time. |
| **T4** | Practice | Single row, not collapsed (Following and All series alike). Session name + local start time, right side `Fastest`. **Confirmed.** | Same as T3 LIVE. | Same as T3 IDLE. |
| **T5** | Sub-sessions (Q1/Q2/Q3, stages, single rally stages) | Not shown. | Only appears as a status, e.g. `Q1 · 9 min left` or `STAGE 2 · LAP 142 / 300`. | Not shown. |

## General rules

- All sessions of a day are sorted by start time. **Live sessions are not pinned.** (Confirmed.)
- Sessions with an unknown start time (TBC) go last in the day. Do not show midnight for a date-only event (matches `docs/data-model.md`: unknown instants stay `null`).
- In LIVE rows, `LIVE` sits directly in front of the progress bar. Exceptions go only on the progress line (no fourth line).
- Exceptions: red flag = red bar and the pulse stops (clock stopped). Yellow family (safety car, virtual safety car, full course yellow, NASCAR caution) = amber bar, pulse continues. Single-line rows: the lowercase full word replaces the time left (`Red flag`, `Safety car`, `Yellow flag`, `Virtual safety car`, `Full course yellow`, `Caution`) in the matching colour, row width unchanged. Multi-line rows: an uppercase word in the `LIVE` label style (`RED FLAG`, `SAFETY CAR`, `FULL COURSE YELLOW`) on the progress line.
- Upcoming rows show only the local start time (15px bold in single-line rows). No countdown. (A `Starting soon` state within 15 minutes of the start was considered and not added.)
- Result status (V1, final rule): a small dot + a short sentence in normal case — `Provisional`, `Results pending`, `Updated after penalty`. Tone: a note, not a warning. While pending, the tower shows skeleton placeholders. Position changes are marked ▲▼.

## Data-model hints

The tier is derived from the session type (`Session.type` in `docs/data-model.md`). The backend does not provide a tier; keep a lookup table in the adapter (`type → tier`). `Fastest` in practice rows comes from the published practice classification (best lap), which is legitimate for practice and qualifying; never use it for a race.

## Open points

1. Flags and statuses are text, but `RESCHEDULED` (IDLE) is a colour tag and `Results pending` (DONE) is a grey pill. V1 says "dot + sentence". Unify? (open-questions.md A)
2. `Provisional`, `Updated after penalty` and ▲▼ have no drawn examples yet. (open-questions.md B)
3. Today cell says `6 left` in all three states; for DONE it should probably say `6 done`, for IDLE `6 to go`.
