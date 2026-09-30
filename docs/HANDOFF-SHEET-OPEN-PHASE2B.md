# Agent Handoff — Sheet Open Phase 2B (S33p2b)

## TASK

Prototype fused Sheet payload emission, measure remaining Python open stages with the Phase 1 flag enabled, verify Edge model parity, and prepare the Phase 2 integration plan. Prototype only; no product source edits in this task.

## AGENT/ROLE

Codex — Sheet performance prototype and handoff.

## BRANCH

`perf/sheet-open-phase2-codex`

## WORKTREE

`E:\VNOffice-codex-sheet-open-phase2`

## OBJECTIVE

Remove the separate post-FODS payload serialization pass by emitting payload row records in the same traversal as final XF reoverlay; measure Phase 1 pipeline stages on LAN06/LAN14; pass the requested fixture/LAN Edge model comparator gate; document a concrete, flag-off-by-default product integration plan.

## FINDINGS

- Merged `perf/sheet-open-phase1-claude` first. The merge had one add/add conflict at `scripts/perf-proto/compare_parsefods_models.mjs`; resolved by retaining this branch's Phase 2 payload-aware comparator. Merge commit: `c2e8d8a`.
- With `SHEET_OPEN_SKIP_INITIAL_XF=1`, LAN14 Phase 1 pipeline took 98.913 / 100.441 seconds; LAN06 took 114.627 / 115.229 seconds.
- Fused LAN14 XLSX → FODS + payload took 106.876 / 109.341 seconds, with 17,930,092-byte (17.93 MB) payload. The earlier separate serializer took 43.842 / 43.875 seconds after the FODS already existed; the fused route removes that extra pass. The fused final XF/capture stage itself took 33.473 / 33.379 seconds.
- Largest remaining stage: native overlays for both files (LAN14 32.771 / 33.863 s; LAN06 51.245 / 51.410 s). LAN14 fused final XF/capture is nearly tied; optimize is next largest.
- Edge comparator model equality: five fixtures (`sample-sheet`, `sample-sheet-validation`, `sample-sheet-pivot`, `sample-sheet-formulas`, `sample-sheet-charts`) and LAN06, LAN11, LAN12, LAN28, LAN14 existing FODS artifacts. LAN14 also passed against fused pipeline FODS output. Comparator reported no model diffs.
- LAN14 free physical RAM before gated pipeline/capture/parity operations ranged from 10.44 to 12.07 GB, above the required 7 GB threshold. No waiting was needed. Process peak memory is **NOT MEASURED**.
- LAN14 Edge model build was 36.051–36.454 seconds in separate prototype comparisons. Full application time from file selection to first visible grid is **NOT MEASURED**. The under-60-second target is **NOT ACHIEVED**.
- WebView2/Edge comparison processes exited 0 with equality true. pywebview printed a non-blocking `WinError 5 Access denied` while cleaning up a temporary Edge Crashpad file.

## IMPLEMENTATION SUMMARY

- Added a scratch Python runner that fuses the final XF transform with row-XML payload capture and reports named stages. It retains/writes the FODS artifact for comparisons; artifact write time is excluded from pipeline timing.
- Updated the scratch WebView2 loader for the v2 row-XML representation and the rich-text normalization required for LAN12 parity.
- Added the proposed product integration plan, including `SHEET_OPEN_PAYLOAD` default-off, full-FODS fallback/session lifecycle, Adapter/UI ownership, tests, 26-LAN audit gate, memory protocol, and rollback.
- Product source files were not changed by this task. Phase 1 source changes are present only because the required Phase 1 branch merge preceded the prototype work.

## FILES CHANGED

- `scripts/perf-proto/phase2_stream_open.py` — new fused-pass prototype.
- `scripts/perf-proto/sheet-payload-loader.mjs` — scratch loader accepts v2 and uses Adapter DOM rich-text parsing where needed.
- `docs/PLAN-SHEET-OPEN-PHASE2-INTEGRATION.md` — implementation plan for owner review.
- `docs/HANDOFF-SHEET-OPEN-PHASE2B.md` — this handoff.

## COMMANDS RUN

- `git merge --no-edit perf/sheet-open-phase1-claude` — **PASS**, resolved one add/add conflict as described above.
- `python scripts/perf-proto/phase2_stream_open.py ...` with `SHEET_OPEN_SKIP_INITIAL_XF=1` — **PASS**, two foreground Phase 1 runs each for LAN06 and LAN14 and two fused full-pipeline LAN14 runs. LAN14 was gated by a PowerShell free-RAM check before each run.
- `python scripts/perf-proto/phase2_stream_open.py --existing-fods ...` and Edge/pywebview comparator commands — **PASS** for requested five fixtures and five LAN artifacts. RAM was checked before LAN14 operations.
- `python -m py_compile scripts/perf-proto/phase2_stream_open.py` — **PASS**.
- `node --check scripts/perf-proto/sheet-payload-loader.mjs` — **PASS**.
- 14 GB Node comparator — **NOT RUN**, as directed.
- Product build, product test suite, 26-LAN save/round-trip audit, and process-peak memory profiling — **NOT RUN**.

## BUILD RESULT

Product build: **NOT RUN**. No product source changes were made in this task; the required Phase 1 merge was already integrated on this branch.

## TEST RESULTS

- Python and Node syntax checks: **PASS**.
- Edge/WebView2 model parity for five fixtures and LAN06/LAN11/LAN12/LAN28/LAN14: **PASS**.
- Fused LAN14 pipeline measured twice: **PASS** as a prototype measurement; 106.876 s and 109.341 s.
- LAN14 <60 s first-grid acceptance: **NOT ACHIEVED / NOT RUN end to end**.
- 26-LAN audit and save/round-trip parity: **NOT RUN**.
- Product tests/build: **NOT RUN**.

## KNOWN FAILURES

- No comparator model-equality failures remain in the requested set. LAN12 initially exposed rich-text mismatches; the scratch loader was corrected to use the existing Adapter DOM rich-text extractor for span-bearing rows, then LAN12 and the full requested comparator set passed.
- pywebview emitted a temporary Edge Crashpad cleanup `WinError 5` after LAN14 comparison; comparator exit status was 0 and equality was true.

## RISKS

- The v2 representation and loader remain prototype-only and use private Adapter parsing helpers; production needs an owned, validated Adapter API.
- Payload transfer/model build, complete fallback lifecycle, process peak memory, app-level first-grid time, and round-trip behavior need integration testing.
- LAN14 remains above the 60-second target on Python pipeline alone; the separate Edge model build is also material.

## DEPENDENCIES/BLOCKERS

- Owner approval of `docs/PLAN-SHEET-OPEN-PHASE2-INTEGRATION.md` before product integration.
- External LAN corpus remains outside the repository; no source workbooks or generated artifacts were added to Git.

## CORE PATCH ID (if any)

None.

## NEXT ACTION

Owner reviews the integration plan. If approved, implement behind `SHEET_OPEN_PAYLOAD=0` by default, add a bounded Python-side FODS fallback session, then run Adapter parity, payload-failure fallback, save/round-trip, memory, and 26-LAN audit gates before any default-on decision.
