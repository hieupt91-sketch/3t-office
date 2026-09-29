TASK: S33p2c — profile and prototype the native Sheet metadata overlay; measure and verify byte parity.
AGENT/ROLE: Codex — Sheet performance prototype and handoff.
BRANCH: `perf/sheet-open-phase2-codex`
WORKTREE: `E:\VNOffice-codex-sheet-open-phase2`
OBJECTIVE: Find the remaining native overlay costs, prototype a faster equivalent under `scripts/perf-proto/`, pass byte-identity checks for LAN06/11/12/28/14 and five FODS fixtures, measure two foreground overlay runs before/after on LAN06/LAN14, and update the integration estimate. Product open paths remain unchanged pending owner approval.

FINDINGS:
- cProfile on LAN06: 303,117,972 calls / 161.728 s under profiling. `_xlsx_cells_with_metadata` used 63.471 s cumulative, `apply_row` 49.500 s cumulative, and layout overlay 42.268 s cumulative. `_xml_attrs` was 24.943 s cumulative; repeat/format stamping and per-cell dictionary work were also hot. cProfile durations are diagnostic and inflated, not foreground timings.
- cProfile on LAN14: 143,338,836 calls / 85.848 s under profiling. `_xlsx_cells_with_metadata` used 33.432 s cumulative and `apply_row` 28.652 s cumulative; `_xml_attrs` used 13.537 s cumulative. These results point to repeated cell attribute parsing and map work, not XML tree parsing.
- The scratch index builder skips collecting the XF map when the Phase 1 route immediately discards it, and uses a precompiled matcher for cell attributes `r`, `s`, and `t` instead of constructing the general attribute dictionary. The FODS traversal and metadata emission order remain the existing ones.
- Two foreground native overlay timings (baseline / optimized): LAN06 53.307 / 49.297 s vs 45.723 / 49.705 s; LAN14 33.145 / 33.315 s vs 33.485 / 32.878 s. Mean changes: LAN06 −3.588 s (−7.0%); LAN14 −0.049 s (−0.15%, effectively flat). These are overlay-only timings, with normal machine-load variance; they are not full app opens.
- LAN14 RAM before each reported run was at least 10.48 GB free; the minimum recorded during the cProfile run was 8.13 GB. No 120-second wait was needed. Process peak memory was NOT MEASURED.
- Updated projection: substitute the optimized LAN14 overlay timings into the Phase 2B fused Python totals to estimate 107.590 / 108.356 s (ESTIMATE). Updating the earlier assembled Python-pipeline/bridge-transport/Adapter-load estimate gives 262.9–264.9 s, rounded to about 263–265 s (ESTIMATE). This does not materially change the projection. End-to-end first-grid timing remains NOT MEASURED and <60 s is NOT ACHIEVED.
- Byte parity: PASS for LAN06, LAN11, LAN12, LAN28, LAN14 and fixtures `sample-sheet`, `sample-sheet-validation`, `sample-sheet-pivot`, `sample-sheet-formulas`, `sample-sheet-charts`. LAN06 SHA-256: `f714d7206fbfeb9bd30a9bcc19bb73aa97bf52a96b77f5676622466ebd755abe`; LAN14 SHA-256: `76c1841004b6e28b4dbad6636aebe48c39c8c80efcb9782f13797da932acc205`. Other pairs were directly compared by the scratch harness. Edge model fallback was not needed because byte identity passed.

IMPLEMENTATION SUMMARY:
- Added `native_overlay_profile.py` for stage instrumentation, cProfile output, foreground measurements, and the opt-in scratch metadata-index optimization.
- Added `compare_native_overlay.py` to compare current and prototype overlay output on identical XLSX/FODS inputs.
- Updated `PLAN-SHEET-OPEN-PHASE2-INTEGRATION.md` with profile findings, before/after timings, and the revised estimates.
- No product source, Adapter, or UI files were changed. No integration flag or product open-path change was made.
- A regex-based FODS cell scanner trial ran past twice the baseline duration and was stopped; it was discarded and is not in the final prototype.

FILES CHANGED:
- `scripts/perf-proto/native_overlay_profile.py`
- `scripts/perf-proto/compare_native_overlay.py`
- `docs/PLAN-SHEET-OPEN-PHASE2-INTEGRATION.md`
- `docs/HANDOFF-SHEET-OPEN-PHASE2C.md`

COMMANDS RUN:
- `python -m py_compile scripts/perf-proto/native_overlay_profile.py scripts/perf-proto/compare_native_overlay.py` — PASS.
- `python scripts/perf-proto/native_overlay_profile.py --prepare-raw ...` — PASS; produced raw FODS for LAN06, LAN11, LAN12, LAN14, and LAN28 outside the worktree.
- `python scripts/perf-proto/native_overlay_profile.py ... --mode baseline --profile ...` on LAN06 and LAN14 — PASS; diagnostic profiles saved outside the worktree.
- `python scripts/perf-proto/native_overlay_profile.py ... --mode baseline|optimized` — PASS; two foreground runs per mode for LAN06 and LAN14, with RAM checked before each LAN14 run.
- `python scripts/perf-proto/compare_native_overlay.py ...` — PASS; exact string equality for LAN11/12/28 and all five FODS fixtures.
- Chunked SHA-256 and size comparisons of current/candidate FODS artifacts — PASS for LAN06 and LAN14.
- Regex FODS cell scanner experiment — stopped after exceeding twice baseline time; excluded from results.
- Product build, product suite, 26-LAN audit, save/round-trip, full app first-grid timing, Edge comparator fallback, and process-peak memory profiling — NOT RUN.

BUILD RESULT: Product build NOT RUN; this task changed no product source.

TEST RESULTS:
- Prototype syntax check: PASS.
- Requested native overlay byte-parity set (five LAN files and five FODS fixtures): PASS.
- Two-run-per-file overlay measurements: PASS as measurements; LAN06 mean improved modestly, LAN14 total overlay remained effectively flat.
- Full application <60-second target: NOT ACHIEVED / NOT RUN end to end.
- Product build/tests, save/round-trip, and 26-LAN audit: NOT RUN.

KNOWN FAILURES:
- The regex cell-block scanner trial exceeded twice baseline duration and was terminated before producing an output; it was removed from the retained prototype.
- An early saved LAN06 baseline artifact had SHA-256 `f136368d085b1d2d2605902663a1dafdd812701afacfe4be8c96d61b65a99465`; later fresh current-overlay runs on the retained raw FODS produced `f714d7206fbfeb9bd30a9bcc19bb73aa97bf52a96b77f5676622466ebd755abe`. A fresh current baseline and the final candidate matched exactly at the latter hash. The older artifact was excluded from the parity gate and timing pair; its difference was not attributed to the prototype.

RISKS: LAN14 performance change is within run-to-run variance. The prototype has no production API or product integration coverage. Full app timing, peak memory, save/round-trip parity, and the 26-LAN audit remain NOT MEASURED / NOT RUN. Keep the plan approval-gated.

DEPENDENCIES/BLOCKERS: Owner approval of `docs/PLAN-SHEET-OPEN-PHASE2-INTEGRATION.md` is still required before product open-path implementation.

CORE PATCH ID (if any): None.

NEXT ACTION: Owner reviews the updated integration plan. If approved, implement the proposed opt-in path and run its Adapter parity, fallback, save/round-trip, memory, performance, and 26-LAN gates before considering any default-on change.
