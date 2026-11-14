# Components, Figma node ids and build order

File key `4ZHA4lgk5NbZDFzMoMUsSH`, page "05 · Dev Handoff · 前端交接" (`5932:2`). URL: `https://www.figma.com/design/4ZHA4lgk5NbZDFzMoMUsSH/OpenGP?node-id=<id with : replaced by ->`.

## Naming (applies to code and Figma)

- Figma component = PascalCase; variant property = lowercase word; value = lowercase kebab-case. Figma layer = lowercase kebab-case (text layers keep their text).
- Token names: `color-*`, `text-*`, `radius-*`, `shadow-*`, `space-*`, `layout-*`, `font-*`.
- Function over looks: **schedule** (centre column) > **day-schedule** (one day, with ticket stub) > **session-row**; **series-list** (left lists); **standings-panel** (right column). Avoid `card` except for pure surface shapes (`card-base`, `card-outline`).

## Page sections

| Section | Node |
|---|---|
| 0 Index | `5932:3` |
| 1 Homes (LIVE / DONE / IDLE) | `5932:51` |
| 2 Tiers and states (real rows, latest UI) | `5933:2161` |
| 3 Tokens and naming rules | `5934:788` |
| 4 Component specs (copies + specs read from layers) | `5936:788` |
| 5 Rules | `5939:966` |
| 6 Data fields (draft) | `5939:1000` |
| 7 Gaps and to-dos | `5939:1063` |
| 8 Component library | `5944:966` |

## Home frames (1440 wide)

| State | Home | top-nav | sidebar-series | schedule | sidebar-standings | footer | time-selector |
|---|---|---|---|---|---|---|---|
| LIVE (all in progress) | `5932:54` | `5944:2269` | `5944:2335` | `5932:307` | `5944:2663` | `5944:2292` | `5944:3038` |
| DONE (all finished) | `5932:2179` | `5944:3106` | `5944:3172` | `5932:2432` | `5944:3500` | `5944:3129` | `5944:3875` |
| IDLE (all not started) | `5932:4018` | `5944:3943` | `5944:4009` | `5932:4271` | `5944:4337` | `5944:3966` | `5944:4712` |

Day schedules (`day-schedule-<group>-<weekday>[-today]`; only Friday is today; `following` = Following section, `all-series` = All series section):

| | following-fri-today | following-sat | following-sun | all-series-fri-today | all-series-sat | all-series-sun |
|---|---|---|---|---|---|---|
| LIVE | `5932:366` | `5932:490` | `5932:698` | `5932:830` | `5932:1157` | `5932:1539` |
| DONE | `5932:2491` | `5932:2587` | `5932:2753` | `5932:2860` | `5932:3113` | `5932:3420` |
| IDLE | `5932:4330` | `5932:4402` | `5932:4503` | `5932:4571` | `5932:4750` | `5932:4933` |

## Component library (section 8) and suggested React mapping

| Figma component | Node | Variants (props) | Suggested React | In the Homes |
|---|---|---|---|---|
| Plate | `5944:1057` | `series` = gtwc-eu, gtwc-am, f1, motogp, wec, nascar, indycar, formula-e | `<SeriesPlate series>` | instances in every row |
| Button | `5944:1066` | `kind=primary`, `icon` = none / arrow-up | `<Button icon>` | nested inside TopNav (`button-sign-in`) and Footer (`button-back-to-grid`) |
| IconButton | `5944:1080` | `surface` = nav / page / card | `<IconButton surface>` | nested inside blocks (`icon-button-settings`, `icon-button-prev`, `icon-button-next`, …) |
| SearchField | `5944:1088` | none | `<SearchField>` | nested in TopNav |
| SectionHeader | `5944:1414` | `kind` = following / all-series | `<SectionHeader kind>` | instances |
| TopNav | `5944:1451` | none | `<TopNav>` | instance |
| Footer | `5944:1499` | none | `<Footer>` | instance |
| TimeSelector | `5944:1557` | none | `<TimeSelector>` + `<WeekCell state>` | instance |
| SidebarSeries | `5944:1886` | none | `<SeriesSidebar>` > `<SeriesList variant>` > `<SeriesItem>` | instance |
| SidebarStandings | `5944:2268` | none | `<StandingsPanel>` | instance |
| WeekCell | `5944:1106` | `state` = selected / default / today | `<WeekCell state>` | reference only (frames in the Homes) |
| Stamp | `5944:1109` | none | `<TodayStamp>` | reference only |
| StatusTag | `5944:1117` | `kind` = rescheduled / results-pending | `<StatusTag kind>` | reference only |
| ResultInline | `5944:1132` | none | `<ResultInline>` | reference only |
| ResultPodium | `5944:1152` | none | `<ResultPodium>` | reference only |
| SessionRow | `5944:1394` | `kind` = single / multi / race; `state` = live / done / idle (9 variants) | `<SessionRow kind state>` | reference only (rows in the Homes are frames) |

`DaySchedule` is not a Figma component (height varies, shapes are generated): use the `day-schedule-*` frames above and `reference/ticket-stub.ts`.
The round series badge in the left list (a disc with a cream ring) is the component `SeriesBadge`; its main component is not on page 05 (it was renamed from an older name on an earlier page), so copy its look from the instances in the Homes (`series-item`).

## Layer anatomy of a Home (read from the file)

```
home-live                                  (home-done, home-idle: same structure)
├─ top-nav                                 instance of TopNav
│  ├─ nav-search > search-field            instance
│  ├─ nav-brand > logo
│  ├─ nav-actions > icon-button-settings, button-sign-in   instances
│  └─ nav-bottom-line
└─ page-body
   ├─ (content row)
   │  ├─ sidebar-series                    instance of SidebarSeries
   │  │  └─ series-list-followed | series-list-top | series-list-all  > list-header, series-item…
   │  ├─ schedule
   │  │  ├─ time-selector                  instance of TimeSelector
   │  │  │  ├─ time-selector-header > icon-button-prev, time-selector-title, icon-button-next
   │  │  │  └─ week-track > week-cell-week, week-cell-mon … week-cell-sun (today = week-cell-today)
   │  │  ├─ section-header-following
   │  │  ├─ day-schedule-following-fri-today | -sat | -sun
   │  │  ├─ section-header-all-series
   │  │  └─ day-schedule-all-series-fri-today | -sat | -sun
   │  └─ sidebar-standings                 instance of SidebarStandings
   │     └─ standings-panel > carousel-header, series-title, season-progress, tabs-row, table-header, table-row…
   └─ footer                               instance of Footer
      ├─ sticker-outline, sticker
      ├─ footer-content > footer-brand, footer-spacer, footer-column-product | -data | -company
      └─ legal-bar > (disclaimer text), legal-links, button-back-to-grid

day-schedule-*      card-base, stub-base, stub-content, session-rows, card-outline
session-rows        session-row…
session-row         row-main, result-line, icon-chevron
  row-main          plate-<series> (instance) > plate-body, event title text, session > ("·", session name), LIVE, progress > progress-track, progress-fill, progress-knob
  result-line       "Fastest" label, team-bar, result name
```

Other row kinds (multi-line, race, DONE podium, IDLE start time, class winners) have more children (`result-inline`, `result-podium`, `result-pending`, `start-time` …): open the matching `SessionRow` variant in section 8 or the day schedules above. The 3-level view above is what was read from `home-live`; do not assume names that are not in the file.

## Build order

1. Tokens + fonts (`tokens.css`, Inter / Rajdhani / Barlow Condensed / Barlow).
2. Atoms: SeriesPlate, Button, IconButton, SearchField, TodayStamp, StatusTag, WeekCell.
3. Blocks: TopNav, Footer, SeriesSidebar, StandingsPanel, TimeSelector, SectionHeader.
4. Rows: SessionRow variants + ResultInline / ResultPodium / ClassWinners.
5. DaySchedule (ticket shapes) and the Schedule.
6. Home assembly with fixtures (three states), then the data adapter.

Specs read from the layers (sizes, padding, radius, fonts) are in Figma section 4, one card per component.
