# Test fixtures — provenance and licensing

These fixtures are **minimized, hand-written** objects that follow the
documented response shapes of the upstream APIs. They are **not captured raw
responses** and are not a source of truth for real-world schedules.

| Marker | Meaning |
| --- | --- |
| W02-V | Identifier verified in OpenGP W02 research (`docs/f1-data-providers.md` §5.1): 2025 Chinese GP = Jolpica `(2025, round 2)`, circuit `shanghai` ↔ OpenF1 `circuit_key=49`, meeting `1255`, sessions FP1 `9988`, SQ `9989`, Sprint `9993`, Qualifying `9994`, Race `9998`. |
| believed accurate | Values transcribed from public schedules from memory; re-verify against a live capture before using them as verification evidence. |
| SYNTHETIC | Invented for a test scenario. All OpenF1 keys `>= 900000` are synthetic. Planned `date_end` values are illustrative. |

Upstream data licences: Jolpica API data is published under CC BY-NC-SA 4.0;
OpenF1 cites CC BY-NC-SA 4.0. Fixture values are factual identifiers/times
used for testing a non-commercial project; keep attribution in product UI and
do not add images, logos or media to fixtures.

Before marking any behaviour **Verified**, capture real responses in a
separate, reviewed task and record URL, retrieval time and SHA-256.

## Result and standings fixtures (2026-11)

| File | Content |
| --- | --- |
| `jolpica-results.fixtures.ts` | 2025 Chinese GP race / sprint / qualifying rows. W02-V outcomes: Piastri won; Leclerc and Hamilton disqualified (Gasly omitted for brevity); Alonso retired; Hamilton won the Sprint with 19 laps and 8 points. Lap times, gaps, the 2021 Belgian "12.5" row, the 2024 Brazil "W" row and all standings tables are **SYNTHETIC**. |
| `openf1-results.fixtures.ts` | 2025 Chinese GP FP1 (9988) and Sprint Qualifying (9989). W02-V: Norris P1 in FP1 with 23 laps and 91.504 s; Hadjar P15 with `dnf=true` and `[92.171, null, null]` in SQ. Other rows **SYNTHETIC**. |
| `jolpica.fixtures.ts` → `JOLPICA_2026_LAS_VEGAS` | Race instant as published by Jolpica (2026-11-22T04:00Z = Saturday evening local); practice and qualifying times **SYNTHETIC**. |
