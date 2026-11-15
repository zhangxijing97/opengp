# Parts the design does not draw: what was built, how it works, what was left

Decided and built on 2026-11-14 by the engineer, on the owner's instruction to pick the most reasonable option and to score the options when unsure. Everything here is **Decided, not designed**: no Figma frame exists. Places that need a design carry `TODO(design)`; places that need the owner carry `TODO(owner)`; legal text carries `TODO(legal)`. Change a line here to reopen a decision.

Status: implemented, type-checked, unit-tested, checked for server and client boundary mistakes, rendered in a real browser against a mocked API. **Not** run through `next build` or `npm run lint`.

## 1. Which parts, and the ranking

Scores are 0 to 5 per axis, assigned by the engineer. Score = 0.35 × Need + 0.20 × (5 − Dependency risk) + 0.20 × Verifiable + 0.25 × (5 − Effort). A rough ranking tool, not a measurement. Threshold: 3.0 or more is built now.

| # | Part | Need | Dep. risk | Verif. | Effort | Score | Decision |
|---|---|---|---|---|---|---|---|
| 10 | 404, error and loading pages | 4 | 0 | 5 | 1 | 4.40 | Built |
| 11 | Empty, error and skeleton components | 4 | 0 | 5 | 1 | 4.40 | Built |
| 12 | Focus ring, reduced motion | 4 | 1 | 5 | 1 | 4.20 | Built (tokens.css) |
| 14 | Following and settings stores | 4 | 0 | 5 | 2 | 4.15 | Built |
| 1 | Shell: TopNav, Footer, Logo, Button, IconButton, search field | 5 | 1 | 5 | 3 | 4.05 | Built (from the Figma nodes) |
| 3 | Settings page | 4 | 1 | 5 | 2 | 3.95 | Built |
| 4 | Sign-in page | 3 | 1 | 5 | 1 | 3.85 | Built (placeholder) |
| 8 | About, About our data, Contact and Report a data issue | 3 | 1 | 5 | 1 | 3.85 | Built |
| 13 | Week and day logic, tiers, row states, v1 adapter | 5 | 2 | 5 | 3 | 3.85 | Built, with tests |
| 5, 6 | Event page, session page | 4 | 1 | 4 | 2 | 3.75 | Built |
| 2 | Search | 4 | 2 | 5 | 3 | 3.50 | Built |
| 22 | Page titles, noindex | 2 | 1 | 5 | 1 | 3.50 | Built (minimal) |
| 9 | Legal pages: terms, privacy, cookies, accessibility, notice | 3 | 3 | 5 | 2 | 3.20 | Built as drafts |
| 7 | All series page, series page | 3 | 3 | 4 | 2 | 3.00 | Built (minimal) |
| 15 | Visuals of cancelled, postponed, rescheduled and mixed-state rows | 3 | 4 | 2 | 3 | 2.15 | Plain version built (section 3, Statuses; `RowTime`). The designed look waits for the row design (M4) |
| 16 | Spoiler-free finished row | 2 | 4 | 2 | 2 | 2.05 | Left: the setting is stored, the row is M4 |
| 21 | Analytics and consent banner | 1 | 2 | 3 | 3 | 2.05 | Not planned: the app has no analytics |
| 20 | Motion | 1 | 3 | 1 | 2 | 1.70 | Left |
| 19 | Languages | 1 | 4 | 3 | 4 | 1.40 | Left (owner: no language switching yet) |
| 17 | Phone and tablet layouts | 2 | 5 | 3 | 5 | 1.30 | Left: no design yet. Below 1440 the pages scroll sideways; this must be solved before launch |
| 18 | Dark mode | 1 | 5 | 2 | 5 | 0.75 | Not planned (`--color-brand-indigo-dark` is reserved) |

## 2. Methods compared for the two parts with real alternatives

### Search

Weights: simplicity 30, fits the data we have (F1 only, no database) 25, quality of use 20, accessibility 15, room to grow 10.

| Method | Simp. | Data fit | Use | A11y | Grow | Score |
|---|---|---|---|---|---|---|
| S5 Server-rendered results page from a GET form | 9 | 8 | 5 | 10 | 5 | 7.70 |
| S1 Type-ahead over an in-memory index | 8 | 8 | 8 | 8 | 5 | 7.70 |
| S2 New backend search endpoint | 4 | 6 | 9 | 8 | 9 | 6.60 |
| S4 Index built at build time | 7 | 4 | 7 | 8 | 3 | 6.00 |
| S3 Hosted search service | 2 | 3 | 10 | 8 | 10 | 5.55 |

**Chosen: S5 plus S1 on the same function.** The form works without JavaScript and is the fallback; the type-ahead is a progressive enhancement. S2 comes when there are more series, or when a season calendar endpoint exists.

### Settings

Weights: simplicity 30, accessibility without custom focus management 25, has an address and works without JavaScript 20, speed of use 25.

| Method | Simp. | A11y | Address | Speed | Score |
|---|---|---|---|---|---|
| A page | 9 | 9 | 10 | 5 | 8.20 |
| Pop-up from the gear | 6 | 6 | 2 | 9 | 5.95 |
| Modal dialog | 5 | 6 | 3 | 8 | 5.60 |

**Chosen: a page.** The gear in the nav links to it. A pop-up needs a design and focus handling.

## 3. How each part behaves

### Routes

The new site lives in the `(site)` route group of `src/app`. A folder name in parentheses is not part of the URL, so its pages are at the root. On 2026-11-14 they were moved there from the staged `/next` copy: the platform is in early development and has no users, so the staging stage was skipped. `BASE_PATH` in `src/lib/home/routes.ts` is the prefix in front of every route; it is empty. The layout is `noindex` until launch: remove `robots` in `(site)/layout.tsx` then (`TODO(owner)`).

| Route | What it is |
|---|---|
| `/` | Placeholder Home with links. The weekly schedule is milestone M5 |
| `/search?q=` | Results: series and events |
| `/search-index` | JSON for the type-ahead, cached 5 minutes |
| `/settings` | Time zone, spoiler setting, followed series, clear stored data |
| `/sign-in` | Placeholder |
| `/series`, `/series/[seriesId]` | The 28 series of the design; a series shows its events for the next 31 days |
| `/rounds/[roundId]`, `/sessions/[sessionId]` | From `/api/v1`. Unknown id: 404 |
| `/about`, `/data`, `/contact` | Static. Contact with `?topic=data` is "Report a data issue" |
| `/legal/{terms,privacy,cookies,accessibility,notice}` | Drafts, five fixed slugs |

The footer links of the design point at these: Schedule, All series, About our data, Report a data issue, About, Contact, Terms of use, Privacy policy, Cookie settings, Accessibility, Legal notice. BACK TO GRID is `#top`.

### Search

Series come from the design list (`series-theme.ts`). Events come from `/api/v1/rounds` for the window from 14 days ago to 48 days ahead (two calls, the API answers at most 31 days). Matching: lower case, no accents, every word must match; the title beats an alias beats a substring; an alias that equals the word counts as a title (typing `f1` finds Formula 1 first, not F1 Academy). If events cannot be loaded, the page says so and never shows "no results" for a failed request. The data service has no cache and its providers are rate limited, so a complete index is kept in memory for five minutes; an incomplete index is never kept, and the index route sends `no-store` for it.

The nav field follows the WAI-ARIA combobox pattern: arrows move, Enter opens the active suggestion or searches, Escape closes and then clears, Tab closes, `/` focuses (unless the user is typing in a field). It grows from 164 to 288 px while focused. The look of the suggestion list is not drawn: `TODO(design)`.

### Time

- A week is Monday to Sunday. A round belongs to the week of its first session (the event weekend rule). The API has no track time zone, so the date is taken in UTC unless the adapter is given a zone; that is exact for F1, whose weekends start on Thursday or Friday.
- Sessions are grouped by the user's day. If a track zone is supplied, they are grouped by the track's day and the user's day gives the offset: `+1 day` and the divider `N sessions start after midnight`. The opposite direction is `−1 day`. `TODO(design)`: the design only has `+1 day`.
- Without a track zone, a weekend session that the user's calendar pushes past Sunday stays at the end of Sunday with `+1 day`.
- Date-only sessions show the date and `TBC`. A missing time is `TBC`, never midnight, and sorts last in the day. Live sessions are not pinned.
- The default week on Monday is the previous week while one of its sessions that starts on Monday (user's calendar) is unfinished; a session without an end counts as unfinished for three hours.
- Today cell: none started `N to go`, partly done or live `N left`, all done `N done`.
- Times follow the setting, else the browser. The server does not know the zone, so it renders UTC and labels it; the browser switches right after hydration without a mismatch.

### Statuses

Row state: scheduled is idle, in progress is live, completed is done. The states the design does not draw get a plain version (decided 2026-11-14; `src/lib/home/row-text.ts` and `RowTime`). `TODO(design)`.

- **Cancelled and postponed:** the row keeps its upcoming layout and the start time is replaced by the word, in the same text style, in the secondary text colour, without a strike-through (the same way the design replaces the time left of a live row by "Red flag"). The session is listed but it does not count: not in "N to go" or "N left", not in the session count of the day, not in "N sessions start after midnight".
- **Unknown:** the time stays and a small note says "Status unknown".
- **Rescheduled:** the API has no field for it, so nothing is shown.
- **Mixed days** need nothing special: every row takes its own state.

The status of a session is worked out from the clock, so every page that shows it says "It is not live timing". Results do not exist in the API: the session page shows one sentence from the availability value and never anything that looks like a classification.

### Following and settings

Stored in `localStorage` (`opengp.settings.v1`, `opengp.following.v1`), not on a server. Corrupt storage falls back to defaults; ids that are not strings are dropped and duplicates removed. "Clear stored data" removes both after a second click. There are no cookies.

### States

Empty and failed are different states and never look alike. An empty result says what to do; a failure shows the error code. 404, error and loading pages exist in the `(site)` group. All are plain: `TODO(design)`.

### Keyboard focus, motion, layout

Focus is a 2 px outline: indigo on the page, white on the indigo nav and footer; it lives in the base layer so a utility can override it. Reduced-motion users get near-zero transitions. The page is a fixed 1440 canvas, centred on wider screens. Below 1440 it scrolls sideways: there is no phone or tablet design, so the site cannot be launched yet.

### Legal pages

Plain-language drafts that describe how the app works. They carry a visible "Draft for review" note. `TODO(legal)`: a lawyer must review the terms, the privacy policy, the cookie text and the legal notice.

## 4. Things the owner has to do

1. Set `NEXT_PUBLIC_CONTACT_EMAIL`. Until then the contact page says "Contact details are not set up yet".
2. Confirm the privacy text: no analytics or advertising scripts, and the hosting providers named (Netlify, Render).
3. Fill in the operator name and address in the legal notice.
4. Have the legal drafts reviewed.
5. Check the plate colours of NASCAR and Formula E: `#CA8A04` equals the badge colour of `nascar-xfinity`, and `#0284C7` equals the badge colour of `formula-2`. The plate may have taken the colour of a sibling series.
6. Set `NEXT_PUBLIC_API_BASE_URL` for the deployed frontend, or every data page shows its error state (which is the correct behaviour).

## 5. Gaps found in the API

- No track time zone or weekend dates on a round: week and day grouping are approximate until the backend adds them.
- No season calendar endpoint: a series page can only show the next 31 days; search finds events only in a 62-day window.
- No search endpoint.
- No cache in the data service: every uncached search, series or event view calls it, and the providers allow few requests (`docs/f1-data-providers.md`, access and quotas). The search index is cached in memory for five minutes; the data service should cache the calendar itself.
- No results or standings, so session pages say results are not available, and the Home has no result towers, podiums or standings table (section 7).
- Only Formula 1 exists: the other 27 series are listed as "Coming soon" on the series pages, and answer the Home with no rounds (section 7).

## 6. The move from `/next` to the root (2026-11-14)

Removed, because the new site replaces them: `app/page.tsx` (old Home), `app/about/`, `app/events/` (a placeholder page), `app/sessions/` (the old session page, which also clashed with the new `sessions/[sessionId]`: Next does not allow two different dynamic names at one level). Moved: `app/next/` became `app/(site)/`; no import had to change. Kept: `app/news/` (no replacement and not in the design), all old components, `src/lib/api.ts` and the mock data.

What follows from it:

- `/news` is an island: the new nav has no link to it. Decide whether to delete it or to link it (`TODO(owner)`).
- Old components that nothing imports now (the football-shaped Home components, `LeftSidebar`, `RightSidebar`, `src/lib/api.ts` if the news pages do not use it) are dead code. Find them with a tool, for example `npx knip`, and delete them in a separate commit.
- Links in the old components that point to `/events/..` and `/sessions/..` are not reachable any more (no old page links to them); `/sessions/[sessionId]` is now the new page with new ids.
- The route table was checked: the move without the deletions fails at `/`, `/about` and `/sessions/*`; with the deletions there is no clash.
- Rollback: `git revert` the move commit, or publish the previous deploy in Netlify.
- The Home is built (section 7). `--keep-old-home` of the script is only for a checkout that still has the old Home.

## 7. The Home (2026-11-15, with results and standings)

Built from the design (Figma page 05: the three Homes and the components of section 8). `src/app/(site)/page.tsx` loads the data; `src/components/home/HomeView.tsx` draws the three columns: series lists 288, schedule 648, standings 288, gaps 24, margins 84. The nav and the footer run edge to edge of the window; the content stays on the 1440 grid. Below 1440 the page still scrolls sideways (mobile is not designed).

### Data

- The server asks for ONE week by track date (`dateBasis=track`): a race weekend stays together whatever time zone the visitor is in, and the backend sends only the sessions of that week (`src/lib/home/home-data.ts`). It asks in UTC because the server does not know the visitor's zone; the browser then groups the sessions into days in the visitor's zone. The first render uses UTC and the server's clock, so it matches the server's HTML, and the real zone arrives right after: times can change once, a moment after the page appears.
- Without `?week=` the server picks the week: this week (UTC), except on a Monday while a session of the weekend before is not finished; only then is the week before loaded as well. A visitor far from UTC can see the old week for a few hours at the turn of the week. With `?week=YYYY-MM-DD` that week is loaded; the arrows are links to the weeks around it.
- The standings of Formula 1 (drivers and teams) are loaded with the week, for the season of the week's Thursday.
- Only Formula 1 has real requests (an `apiId` in `series-theme.ts`). Every other series has a stand-in request with the same answer shape and no rounds (`src/lib/home/series-sources.ts`), so those series look like they have no events. Decided with the owner on 2026-11-14. To switch a series on, give it an `apiId`.
- Statuses (live, finished) come from the server's clock. While a session is in progress and the tab is visible the page asks the server again every minute; without a live session nothing is refreshed.
- A failed request shows an error (above the schedule, or inside the standings panel). It is never shown as an empty week or an empty table.

### What each part does

- **Time selector**: the week range, "This week / Next week / Last week" and the visitor's zone, arrows, and the week track. WEEK shows every day; a day cell shows only that day. The track counts the sessions of the followed series, or of all series for a visitor who follows nothing (the design counts the followed ones only). Today says `N to go` before anything starts, `N left` once something is live or finished, `N done` at the end of the day.
- **Day schedule**: the ticket of the design (`ticket-shape.ts`). The height is computed from the row heights for the server render, then follows the measured height. A card is at least 96px and a single row sits in the middle; the session count at the bottom of the stub is left out under 132px.
- **Session rows**: single line for T3 and T4, two lines for T1 and T2. Upcoming: the start time (`+1 day` in front when the visitor's calendar is a day ahead of the weekend) and `ends ~` under it. A session of the weekend stays with its track day, even when the visitor's calendar puts it on Monday.
- **Finished rows** show the result block of their tier, from the result teaser of the API: T1 (race) the podium box (114px high row); T2 (qualifying, sprint) the winner in large type and the next two; T3 (sprint qualifying) `P1 | name`; T4 (practice) `Fastest | name`. Drivers are shown by family name, with the team colour bar (practice and sprint qualifying have no team, so no bar). With no teaser: the grey pill `Results pending` when the API says `not_published`, `Results unavailable` when the provider failed (`upstream_error`, `access_restricted`), nothing otherwise.
- **Live rows** show `LIVE` and nothing else: no progress bar, time left or flags. The status is worked out from the clock, not from live timing.
- **Standings column**: title, ROUND n / total with the season ruler (done, current, to go), the Drivers / Teams switch, the table (roundels for the top three, team colour bar, wins, points) and the green bar with its legend. `Can still win` comes from the backend and is calculated.
- **Session page**: the full classification as the provider published it (positions, DSQ / DNF / DNS instead of a rank, times and gaps, qualifying phases), with a note that it is not certified as final.

### Built differently from the design, on purpose

- The footer sticker is drawn in three slices so the arc and the chamfer stay round at any width; the 1px keyline is not drawn (the white edge covers it in the Figma file).
- The caret next to the week range (a week picker) is not drawn: the picker is not designed.
- `Results pending` uses `surface-inset` (#F5F5F5); the design's #F0F0F0 has no token.
- The podium rows have no time or gap on the right (the design shows them): the result teaser of the API has none. The standings table has no podiums column (POD) and the panel has no carousel over series: the API has no podium counts and only Formula 1 has standings.
- Team bars use 1.5px corners (`--radius-segment`), the design 1px.
- The collapse buttons have different accessible names ("Collapse All series sessions" and "Collapse All series list").
- Zones with no abbreviation are shown as an offset ("GMT+9").
- Team colours come from a table in `team-theme.ts` (the values drawn in the design); a team that is not in it gets the neutral colour.

### Not built, because the data or the design does not exist

The LIVE progress bar, time left and flags; the track-local time ("4:05 PM at the track") and the `RESCHEDULED` tag with `was ...`; a podiums column and a car number in the result rows; the three designed states as fixtures for a visual diff; the week picker; hover and pressed states beyond a tint; the layout below 1440.

### Decisions, scored

Score = 0.30 Fit to the design + 0.30 Correctness + 0.25 Simplicity + 0.15 Low risk, each 0 to 5. The numbers are the engineer's judgment, not measurements.

| Decision | Options (score) | Chosen |
|---|---|---|
| How the week is loaded | one week by track date 4.60; viewer date, no track date 3.05; three weeks in UTC and a rule in the browser 2.85 | one week by track date |
| Who picks the default week | the server, from UTC 4.00; the browser, with three weeks loaded 3.95; the browser, with a redirect 3.80 | the server |
| Podium without times | the box with names only 4.40; no podium, use the inline layout 3.85; load every race's results for times 3.10 | the box with names only |
| How a driver is named in a result | family name 4.30; three-letter code 4.10; full name 3.20 | family name |
| Footer sticker at any width | three slices 4.05; JS-measured path 3.95; one SVG stretched 3.65; CSS radius and clip 2.95 | three slices |
| Ticket shape | SVG path per height 4.35; CSS mask 3.00; fixed images 2.15 | SVG path |
| Counts in the week track | followed if any, else all 4.30; followed only 3.95; all 3.95 | followed if any, else all |
| Card shorter than its stub | minimum height 96, row centred 4.25; hide the month 3.10; smaller stub text 2.70 | minimum height |

### Still open

- The podium times and gaps need `valueLabel` in the result teaser (backend).
- The practice and sprint qualifying teasers have no team (OpenF1): their team bar is missing until the backend links the driver to a team.
- The `/api/v1/rounds` list now fetches result teasers: the first look at a finished week takes 2 to 3 seconds (backend cache is empty), and OpenF1 can answer 503 under load (shown as `Results unavailable`).
- Whether a finished row, a live row and the stub of a short card need designed versions.
- Whether `LIVE` should show while the status is only inferred from the clock.
- A week picker behind the range title; hover and pressed states; the standings carousel when a second series has standings.
