# Sheet Open Phase 2 Integration Plan

**Status: proposed; requires owner approval before product implementation.** This task changes no product source. It prototypes a compact Sheet payload in `scripts/perf-proto/` and records measured evidence below.

## Objective

Add an opt-in path for opening `.xlsx` in VN Sheet that builds the model from a compact payload emitted during the existing final XF reoverlay pass. Keep the current complete FODS import as a recoverable fallback and preserve FODS-based save, export, and round-trip behavior. The launch flag is `SHEET_OPEN_PAYLOAD`; it must default to off. Do not change XLSX/FODS semantics or move LibreOffice implementation into UI code.

The product target remains two consecutive LAN14 opens below 60 seconds from file selection to first visible grid data, with no round-trip differences. **That target has not been achieved or measured end to end.**

## Current capability and evidence

The current `main.py` Sheet XLSX path makes hidden sheets visible for import, converts with soffice to FODS, reads the FODS, applies native overlays, optimizes the FODS, then re-applies XF indices. With `SHEET_OPEN_SKIP_INITIAL_XF=1`, the first redundant XF overlay is skipped. The normal bridge returns the full FODS in `content`; `SheetAdapter.loadFromFods()` parses it in WebView2.

The Phase 2 prototype runs the XF reoverlay and captures each transformed row XML record in that same final traversal. It does not write and reparse a completed FODS to create the payload. Payload version `vno.sheet.payload.v2` stores support XML, raw style blocks and deflate/base64 JSONL row-XML records. The prototype loader consumes those records using Adapter helpers and Edge's DOM parser for sheet support and rich-text cases. This is a scratch protocol, not a production API.

| Workbook/path | Run 1 | Run 2 |
|---|---:|---:|
| LAN14 existing Phase 1 Python pipeline | 98.913 s | 100.441 s |
| LAN14 fused XLSX → FODS + payload Python pipeline | 106.876 s | 109.341 s |
| LAN06 existing Phase 1 Python pipeline | 114.627 s | 115.229 s |

Phase 1 Python stage times (seconds; run 1 / run 2):

| Stage | LAN14 | LAN06 |
|---|---:|---:|
| Read XLSX | 0.106 / 0.003 | 0.125 / 0.004 |
| Make all sheets visible | 1.345 / 1.321 | 0.001 / 0.001 |
| soffice conversion | 14.968 / 15.108 | 14.601 / 14.590 |
| Read FODS | 0.252 / 0.303 | 0.153 / 0.141 |
| Native overlays | 32.771 / 33.863 | 51.245 / 51.410 |
| Optimize FODS | 22.474 / 22.767 | 30.487 / 30.773 |
| Final XF reoverlay | 26.877 / 26.982 | 17.956 / 18.252 |

On LAN14 the fused final XF-plus-capture stage took 33.473 / 33.379 s. Total Python time was 106.876 / 109.341 s, about 6.5–8.9 seconds above the legacy Phase 1 pipeline runs above, but 2.5–5.8 seconds below the earlier Phase 2 reference of roughly 112 seconds. That earlier reference and the earlier separate 43.842–43.875 second serializer were measured in the prior Phase 2 report; the fused pass removes that extra post-FODS serializer work. Payload size was 17,930,092 bytes (17.93 MB), against the 322.64 MB LAN14 FODS artifact in the earlier benchmark, a 94.4% reduction.

The largest remaining measured Python stage is native overlays on both LAN14 (32.8–33.9 s) and LAN06 (51.2–51.4 s). LAN14's fused XF-and-capture stage is now nearly as large (33.4–33.5 s). Optimize is the next largest stage on both files. The prototype's Edge model reconstruction took 36.051–36.454 s in separate parity runs; it is not a full application first-grid measurement. Current end-to-end time and peak process memory are **NOT MEASURED**. No performance estimate in this plan is represented as a measurement.

## S33p2c native overlay profile and updated projection

S33p2c profiled the native overlay on raw LibreOffice FODS and compared a scratch variant that changes only the existing Python overlay path. All cProfile durations below are diagnostic and inflated by profiling; use the separate foreground timings for performance comparison.

| Workbook | cProfile overlay duration | Metadata index build | FODS metadata rewrite | Other hot work |
|---|---:|---:|---:|---|
| LAN06 | 161.728 s | 63.471 s | 49.500 s in `apply_row` | layout overlay 42.268 s; `_xml_attrs` 24.943 s cumulative |
| LAN14 | 85.848 s | 33.432 s | 28.652 s in `apply_row` | `_xml_attrs` 13.537 s cumulative; string attr stamping 7.532 s |

Both profiles show repeated per-cell attribute parsing and map work. LAN06 made 3.53 million metadata-index cell visits and 2.47 million repeat/format stamp calls; LAN14 made 1.52 million cell visits. The Phase 1 path already fuses format, string, and XF application into one FODS traversal, but it still builds the XF coordinate map and immediately discards that map when `SHEET_OPEN_SKIP_INITIAL_XF=1`.

The scratch optimization in `scripts/perf-proto/native_overlay_profile.py` avoids building that discarded XF map and replaces the general per-cell XML attribute dictionary with a precompiled matcher for the three attributes this index needs (`r`, `s`, and `t`). It leaves the FODS cell scanner and metadata emission order unchanged. Its output was byte-identical to the current overlay for the requested set. A regex replacement for the FODS cell scanner was tried and abandoned after it exceeded twice the baseline time without completing; it is not part of the retained prototype.

Two foreground native-overlay runs per workbook (seconds):

| Workbook | Current overlay | Scratch optimization | Mean change |
|---|---:|---:|---:|
| LAN06 | 53.307 / 49.297 | 45.723 / 49.705 | −3.588 s (−7.0%) |
| LAN14 | 33.145 / 33.315 | 33.485 / 32.878 | −0.049 s (−0.15%) |

The LAN06 pair shows a modest gain with visible run-to-run variance; the LAN14 full overlay is effectively unchanged. The LAN14 metadata substage averaged 23.11 s on the current path and 22.02 s on the scratch path, but the other overlay stages varied enough that the total stage showed no material improvement. These are overlay-only measurements, not full application opens.

**Updated LAN14 projection (ESTIMATE, not a fresh full-pipeline measurement):** replacing the Phase 2B native overlay times in its fused Python totals (106.876 / 109.341 s) with the S33p2c optimized overlay measurements projects 107.590 / 108.356 s for XLSX → FODS + payload Python work. Applying the measured 0.136 s mean overlay-stage reduction to the earlier separately assembled Python pipeline + bridge transport + Adapter-load estimate updates it from 263–265 s to **262.9–264.9 s, or about 263–265 s**. The estimate does not change materially. App-level first-grid time and peak memory remain **NOT MEASURED**; the under-60-second objective remains **NOT ACHIEVED**.

Byte parity passed for LAN06, LAN11, LAN12, LAN28, LAN14 and the five FODS fixtures. LAN06 and LAN14 each had matching current/candidate artifact sizes and SHA-256 hashes; the other eight pairs were compared directly in the prototype harness. No Edge comparator fallback was needed because byte identity passed.

The scratch Edge comparator reported deep model equality for fixtures `sample-sheet`, `sample-sheet-validation`, `sample-sheet-pivot`, `sample-sheet-formulas`, `sample-sheet-charts`, and existing LAN FODS artifacts LAN06, LAN11, LAN12, LAN28, LAN14. LAN14 had both an existing-artifact comparison and a comparison against the fused pipeline's own FODS output. The fixture/LAN parity result validates the prototype comparator only; it is not a save/round-trip or 26-LAN audit.

## Proposed implementation and files

Keep implementation within the existing layers:

1. **`main.py`**
   - Add `_sheet_open_payload_enabled()` reading `SHEET_OPEN_PAYLOAD`; unset/empty/false means off. Apply only to Sheet `.xlsx` opens.
   - Integrate payload capture into the last existing FODS transform (currently optimize, then final `reoverlay_sheet_xf_indices`; capture must be fused with that final XF pass). Reuse the current OOXML/FODS patcher through a VN-side function. Do not introduce a separate completed-FODS serializer pass.
   - Keep the complete final FODS available as a fallback without returning it in the same successful WebView response as the compact payload. Returning both at once would transfer the large FODS anyway. Proposed flow: store the final FODS in a short-lived, app-private open session addressed by an opaque random `openId`; return `sheetPayload` plus `openId`. Add bridge methods to acknowledge/release a successful open or fetch the retained FODS for fallback. Bound session lifetime, clean up on success, failure, app shutdown, and expiry, and avoid exposing arbitrary filesystem paths to JavaScript.
   - Any payload emission, encoding, or validation error must return the current legacy response with full `content` and no partial payload. If client-side payload loading fails, it must fetch that session's FODS and invoke the legacy Adapter loader. Fallback failure should surface through the existing open error UI; it must not leave a half-loaded workbook.
   - Keep the legacy API response unchanged when the flag is off or the source is not `.xlsx`.

2. **`adapters/libreoffice/sheet/sheet-adapter.js`**
   - Add a supported `loadFromPayload(payload, ooxmlWorkbookXml)` API alongside `loadFromFods()`. The production payload schema and validation belong to this Adapter boundary; do not expose scratch private helpers as the API.
   - Reuse shared workbook initialization/metadata handling where practical. Validate format/version, sheet counts, row records, and required support XML before mutating the live grid. Build into an intermediate workbook state; commit only after successful parse. On failure, throw/return a clear failure so the caller can request legacy FODS.
   - Keep `serializeToFods()` as the full-model serializer. `save()`, `saveAs()`, and `exportPdf()` continue to serialize the complete model to FODS and call the current bridge methods. The open payload is not a save representation. The FODS fallback is loaded by `loadFromFods()` exactly as today.

3. **`apps/sheet/sheet-app.js`**
   - `SheetApp.init()` constructs and attaches the Adapter. File-open commands currently dispatch through `SheetAdapter.handleDispatch("common.file.open")` to `SheetAdapter.open()`; `sheet-app.js` remains responsible for lifecycle/UI ownership, not LibreOffice calls.
   - In the open orchestration path, detect the response form: call `loadFromPayload()` for a valid payload, acknowledge its `openId` only after the grid/model is committed, and update source name/path/dirty state and document chrome only after load succeeds. If payload parsing or commit fails, request the retained FODS and use `loadFromFods()`. Preserve cancellation, error states, and the currently open workbook if both attempts fail.
   - Keep non-XLSX and flag-off opens on the existing `loadFromFods()` route.

## Tests and acceptance gates

Add focused tests before enabling the flag beyond opt-in:

- Payload schema/version validation, corrupt/truncated records, rich text, style blocks, multiple sheets, names, merges, filters, validation, charts, pivots, formulas/cached values, protection, dimensions, hidden sheets, and active-sheet state.
- Deep model comparison between `loadFromPayload()` and `loadFromFods()` for the five existing fixtures plus LAN06, LAN11, LAN12, LAN28, and LAN14 artifacts. Retain the existing FODS parser as the oracle.
- Fallback tests for Python serialization failure, payload validation failure, Adapter throw, bridge/session expiry, and fallback retrieval failure. Assert a failed payload load leaves no partial workbook or dirty-state change.
- UI/open state tests for cancel, successful payload load, legacy FODS load, source title/path updates, error dialogs, and preservation of the prior document on total failure.
- Save, Save As, PDF export, and XLSX round-trip tests after both load routes. The saved workbook must come from the full Adapter model via `serializeToFods()`, not from payload rows.
- Legacy-path regression tests with `SHEET_OPEN_PAYLOAD` unset/off and for ODS/CSV and non-Sheet opens.

Then stage these 26 source workbooks from the external corpus without committing them: `lan01.xlsx`–`lan05.xlsx`, `lan07.xlsx`–`lan13.xlsx`, and `lan15.xlsx`–`lan28.xlsx`. Run `python scripts/layout-audit/_batch_audit.py <worktree> <lanNN.xlsx...>` on each set. For every file require `saved=yes`, Excel COM opens, clean XLSX and parts lint, and `TONG sai lech: 0`. Run LAN06 and LAN14 round-trip/auditor/Excel COM separately as `docs/PLAN-SHEET-OPEN-PERF.md` specifies. Any discrepancy blocks rollout. Run the same audit once on the legacy flag-off route and once on the payload route so results can be compared.

For performance, require two foreground LAN14 runs with the app-level timer from selection to first visible grid data below 60 seconds each, plus the full model/save gates. Report separately: Python stages, bridge transfer, Adapter parse/build, first grid render, total elapsed, and payload/FODS byte sizes. Repeat stage attribution on LAN06 to identify regressions. The measured Edge model builds of 36.051–36.454 seconds are prototype timings, not an app-level target result.

For memory, use the 16 GB machine only when available physical RAM is at least 7 GB before each LAN14 run; if below, poll with `Start-Sleep 120` for up to 30 minutes, then stop that run and report blocked. Record pre/post available physical memory and sampled peak working sets for the VN Office Python process and WebView2/Edge process tree; report their combined peak as an estimate if sampling misses transient peaks. Existing prototype pre-run free-RAM observations were 10.44–12.07 GB. Process peak memory was **NOT MEASURED**. Do not run the 14 GB Node comparator.

## Risks, rollback, and decision points

- Row XML parsing and rich-text behavior must have an owned Adapter API; the prototype relies on private helpers and does not establish long-term schema compatibility.
- Keeping fallback FODS alive across the bridge requires a bounded session store and reliable cleanup. Session expiry must trigger a clear failure rather than silently losing the legacy fallback.
- Both payload construction and model reconstruction still take substantial time. LAN14 end-to-end <60 seconds is **NOT ACHIEVED**; overlays, optimize, fused capture, and Edge model construction remain significant measured stages.
- Peak memory and 26-LAN payload round-trip are **NOT MEASURED**. These are release gates, not assumed wins.

Rollback is immediate: leave `SHEET_OPEN_PAYLOAD` unset/off, which preserves the legacy `content` + `loadFromFods()` path. Keep the payload branch opt-in until all parity, fallback, round-trip, memory, and timing gates pass. If any issue appears, disable the flag; do not remove the FODS loader or saved fallback artifacts until the owner separately approves a later change.

## Prototype artifacts

- `scripts/perf-proto/phase2_stream_open.py`
- `scripts/perf-proto/sheet-payload-loader.mjs`
- `scripts/perf-proto/native_overlay_profile.py`
- `scripts/perf-proto/compare_native_overlay.py`
- `docs/HANDOFF-SHEET-OPEN-PHASE2B.md`
- `docs/HANDOFF-SHEET-OPEN-PHASE2C.md`
