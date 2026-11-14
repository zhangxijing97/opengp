# OpenGP Home redesign: design handoff

This folder is the developer handoff for the Home page redesign. The visual source of truth is Figma; this folder holds what Figma cannot carry as machine-readable text: tokens, rules, component list, data mapping and open decisions.

- Figma file key: `4ZHA4lgk5NbZDFzMoMUsSH`
- Use only the page **"05 · Dev Handoff · 前端交接"** (node `5932:2`). Other pages and the old `HomeUI` page are exploration history.
- Design version: Home v10.14 handoff, desktop 1440 only, three states (LIVE, DONE, IDLE).
- Status vocabulary follows the repo rule: **Current / Confirmed / Proposed**. Everything here is **Confirmed design** unless a section says Recommended or Proposed. Nothing in this folder is implemented yet.

## Files

| File | What it is |
|---|---|
| `tokens.css`, `tokens.ts` | Colours, font families, radius, shadow, spacing, layout, and all 53 text styles. Same data, two formats. Generated from the Figma section 3. |
| `rules.md` | Business rules and UI conventions: week and time, sorting, following, ticket-stub geometry, overflow, materials. |
| `session-tiers.md` | Session tiers T1–T5 × the three states (LIVE, DONE, IDLE), with the confirmed decisions. |
| `components.md` | Naming, Figma node ids (sections, Homes, day schedules, library components), React mapping, layer anatomy, build order. |
| `data-mapping.md` | How each part of the Home maps to `docs/api-contract.md` and `docs/data-model.md`; gaps; view-model sketch. |
| `open-questions.md` | Owner decisions still needed (A–L), shelved work, known design-sheet issues. |
| `milestones.md` | M0–M7 plan with acceptance criteria, edits to existing docs, and the first Claude Code prompt. |
| `reference/ticket-stub.ts` | Reference implementation of the day-schedule ticket shapes, with expected hole counts. |

## Glossary (Chinese terms used in Figma ↔ names in code)

| Figma / Chinese | Name in code |
|---|---|
| 赛程（中栏） | `Schedule` (`schedule`) |
| 日卡 / 单日赛程（带票根） | `DaySchedule` (`day-schedule-*`) |
| 场次行 | `SessionRow` (`session-row`) |
| 左栏系列列表 | `SeriesList` (`series-list-followed / top / all`), items `SeriesItem` |
| 积分榜面板 | `StandingsPanel` (`standings-panel`) |
| 号牌 | `SeriesPlate` (`plate-*`) |
| 票根 | stub (`stub-base`, `stub-content`) |
| 通行证规则 | the "pass" material rules (`rules.md` §9) |
| 完赛 / 进行中 / 未开始 | DONE / LIVE / IDLE |

## Naming rules (short)

Tokens: lowercase kebab-case with a category prefix (`color-`, `text-`, `radius-`, `shadow-`, `space-`, `font-`), named by use, not by value. CSS variables are `--` + token name; text styles are `.text-*` classes. Figma components PascalCase; variant properties lowercase words (`kind`, `state`, `series`, `surface`, `icon`) with kebab-case values. Layers lowercase kebab-case by role. One scope word per concept (schedule, day-schedule, row, series-list, standings-panel, plate, stub, nav, footer); no `md / lg`.

## What is not designed

Mobile and tablet, interaction states (hover, pressed, focus, empty, error, loading), mixed-state rows, dark mode, other pages, spoiler-free rows, sign-in. See `open-questions.md`.

## Known facts about the Figma file

- 0 Figma variables, 0 styles. Every value is hard-coded in layers; section 3 documents them as text and `tokens.*` mirrors them.
- Section 8 holds the Figma component library (16 components, `SessionRow` has 9 variants). The Homes use instances for the blocks (nav, footer, sidebars, time selector, section headers, plates); session rows and day schedules are frames.
- Node counts: `home-live` 2,385, `home-done` 2,099, `home-idle` 1,716. Fetch by component, not by Home.
