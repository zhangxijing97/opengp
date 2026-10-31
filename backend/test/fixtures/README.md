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
