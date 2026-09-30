# Agent Handoff — Sheet Open Phase 2 Integration

## TASK

Integrate the compact Sheet XLSX open payload behind `SHEET_OPEN_PAYLOAD`, retain automatic legacy FODS fallback, and run the requested parity, audit, timing, and test gates.

## AGENT/ROLE

Codex — VN Sheet performance integration.

## BRANCH

`perf/sheet-open-phase2-codex`

## WORKTREE

`E:\VNOffice-codex-sheet-open-phase2`

## OBJECTIVE

Owner approval was given on 2026-09-29 at 23:00 Asia/Saigon. The integration is implemented and `SHEET_OPEN_PAYLOAD` remains **OFF by default**. The rollout gate did not pass: Excel COM rejected most audit opens, the full Node suite had LibreOffice conversion failures, and LAN06/LAN14 payload first-grid times exceeded 60 seconds.

## FINDINGS

- Merged `main` before implementation. Merge commit: `6d9a314`; no conflicts.
- The Python producer is owned by `adapters/libreoffice/sheet/sheet_open_payload.py`; it captures row XML during the final XF pass and returns the full final FODS plus compact payload without a second completed-FODS parse.
- The payload is transferred over the existing pywebview bridge. Python retains the complete FODS in a private, opaque-ID session for up to 10 minutes. The JavaScript bridge never receives a filesystem path.
- The WebView2 payload parser is owned by `adapters/libreoffice/sheet/sheet-payload-parser.js`. It builds an intermediate workbook and commits it through `SheetAdapter`; product source imports no module from `scripts/`.
- Payload build, transfer, validation, parse, or model-commit failure reports a generic error through the existing reporter and requests the retained FODS. The legacy path uses `loadFromFods()`. Tests verify failed payload parsing preserves the active grid and that FODS fallback updates document state only after success.
- Vietnamese status messages cover file selection, conversion, optimization, payload preparation, model construction, and fallback loading.
- Save, Save As, PDF export, and AutoRecover continue to serialize the in-memory workbook with `serializeToFods()`. Focused tests verify each path receives the payload-loaded cell.
- Exact test artifacts and audit reports are in `E:\Temp\vno-sheet-open-phase2-integration`; source LAN workbooks are in the ignored `file test/lan/` folder and were not staged.

### Model equality: legacy FODS `parseFods` vs payload model

Each entry below passed two Edge/WebView2 comparisons. `Build` is production parser model-build time; `Legacy parse` is `parseFods` time. Fixture payloads were created from their existing FODS files; LAN payloads were generated from the production fused open path and compared against the legacy final FODS.

| File | Payload bytes | Sheets / cells | Edge transfer ms (run 1 / 2) | Legacy parse ms (run 1 / 2) | Payload model build ms (run 1 / 2) | Equality |
|---|---:|---:|---:|---:|---:|---|
| sample-sheet.fods | 3,055 | 2 / 16 | 11 / 5 | 4 / 4 | 12 / 11 | PASS / PASS |
| sample-sheet-validation.fods | 4,797 | 1 / 12 | 11 / 5 | 4 / 3 | 11 / 11 | PASS / PASS |
| sample-sheet-pivot.fods | 5,140 | 2 / 55 | 13 / 5 | 5 / 4 | 12 / 12 | PASS / PASS |
| sample-sheet-formulas.fods | 2,118 | 2 / 33 | 11 / 5 | 4 / 5 | 10 / 11 | PASS / PASS |
| sample-sheet-charts.fods | 8,017 | 1 / 10 | 13 / 6 | 3 / 3 | 10 / 11 | PASS / PASS |
| lan06.xlsx | 2,215,681 | 4 / 28,457 | 120 / 95 | 601 / 632 | 557 / 590 | PASS / PASS |
| lan11.xlsx | 15,800,801 | 3 / 2,222 | 804 / 641 | 920 / 934 | 990 / 1,006 | PASS / PASS |
| lan12.xlsx | 21,827,737 | 11 / 2,700 | 1,159 / 936 | 1,155 / 1,163 | 1,412 / 1,399 | PASS / PASS |
| lan28.xlsx | 3,061,986 | 12 / 5,428 | 153 / 117 | 371 / 381 | 461 / 466 | PASS / PASS |
| lan14.xlsx | 17,930,076 | 10 / 1,490,828 | 1,106 / 1,177 | 60,753 / 74,101 | 35,577 / 36,958 | PASS / PASS |

LAN14 free physical RAM before its two parity runs was 9.48 GB and 10.50 GB. Its legacy FODS was 319,970,708 bytes; the payload was 17,930,076 bytes. Legacy and fused final FODS SHA-256 matched: `699382c8157e24e3c91b3c1ee800a4ad4d2bc0a592a739041835b98524b5c28d`.

### 26-file LAN audit: payload flag ON

Both official runs used only `SHEET_OPEN_PAYLOAD=1`; `SHEET_OPEN_SKIP_INITIAL_XF` was unset. Every file was saved, audited against its source, and linted in each run:

| Run | Saved | `TONG sai lech: 0` | XLSX + parts lint clean | Excel COM opens |
|---|---:|---:|---:|---:|
| 1 | 26/26 | 26/26 | 26/26 | 3/26 |
| 2 | 26/26 | 26/26 | 26/26 | 3/26 |

- Run 1 Excel COM passed: `lan07.xlsx`, `lan09.xlsx`, `lan21.xlsx`.
- Run 1 Excel COM failed with `RPC_E_CALL_REJECTED`: `lan01`, `lan02`, `lan03`, `lan04`, `lan05`, `lan08`, `lan10`, `lan11`, `lan12`, `lan13`, `lan15`, `lan16`, `lan17`, `lan18`, `lan19`, `lan20`, `lan22`, `lan23`, `lan24`, `lan25`, `lan26`, `lan27`, `lan28`.
- Run 2 Excel COM passed: `lan07.xlsx`, `lan21.xlsx`, `lan24.xlsx`.
- Run 2 Excel COM failed with `RPC_E_CALL_REJECTED`: `lan01`, `lan02`, `lan03`, `lan04`, `lan05`, `lan08`, `lan09`, `lan10`, `lan11`, `lan12`, `lan13`, `lan15`, `lan16`, `lan17`, `lan18`, `lan19`, `lan20`, `lan22`, `lan23`, `lan25`, `lan26`, `lan27`, `lan28`.

Run reports: `E:\Temp\vno-sheet-open-phase2-integration\batch-audit-on-run1.md` and `batch-audit-on-run2.md`.

### Full-app timing: file selection to first painted grid

The app measurement starts when the Python bridge receives the selected XLSX path. The grid timer stops after two animation frames following the first populated grid render. All measurements are milliseconds; each flag/workbook pair has two foreground app launches.

| File | Flag OFF run 1 | Flag OFF run 2 | Flag ON run 1 | Flag ON run 2 |
|---|---:|---:|---:|---:|
| lan06.xlsx | 156,685.3 | 133,746.2 | 125,682.6 | 137,807.3 |
| lan11.xlsx | 12,524.2 | 12,578.9 | 13,005.1 | 13,045.2 |
| lan12.xlsx | 14,664.8 | 14,680.8 | 15,655.2 | 15,715.8 |
| lan28.xlsx | 5,782.9 | 5,763.8 | 5,538.2 | 5,529.4 |
| lan14.xlsx | 217,627.6 | 220,349.4 | 156,543.0 | 158,171.8 |

LAN14 free physical RAM before its four timing runs was 10.51 GB, 11.03 GB, 11.42 GB, and 11.78 GB respectively. Payload mode improved LAN06 run 1 by 31.003 seconds and LAN14 by about 61–62 seconds, but both remained above the 60-second target. LAN11/LAN12 were slightly slower with payload; LAN28 was slightly faster.

## IMPLEMENTATION SUMMARY

- Added strict opt-in `SHEET_OPEN_PAYLOAD` handling in `main.py`; unset, empty, false, or off keeps the existing full-FODS bridge response.
- Fused row-XML capture into final XF traversal in the VN Sheet adapter module.
- Added payload schema validation, streaming inflate, workbook model reconstruction, and transactional commit at the Sheet Adapter boundary.
- Added private fallback sessions with opaque IDs, expiry cleanup, acknowledgement/release, and shutdown cleanup.
- Added automatic FODS fallback for bridge transfer, payload parse, and model failures, with generic existing error reports and no document content.
- Added Vietnamese open progress and opt-in `selection-to-first-grid` instrumentation.
- Added Python and JavaScript tests for the flag, fused output, fallback sessions, parser errors, prior-workbook preservation, in-memory serialization, Save/Save As/PDF, and AutoRecover.

## FILES CHANGED

- `main.py`
- `adapters/libreoffice/common/uno-bridge.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/sheet/sheet-payload-parser.js`
- `adapters/libreoffice/sheet/sheet_open_payload.py`
- `apps/sheet/sheet-app.js`
- `apps/sheet/sheet-grid.js`
- `scripts/perf-proto/webview_payload_probe.mjs` (test comparator now uses the production parser)
- `tests/run-tests.js`
- `tests/unit/sheet-open-payload.test.js`
- `tests/test_sheet_open_payload.py`
- `docs/PLAN-SHEET-OPEN-PHASE2-INTEGRATION.md`
- `docs/HANDOFF-SHEET-OPEN-PHASE2-INTEGRATION.md`

## COMMANDS RUN

- `git merge main` — **PASS**, merged cleanly; merge commit `6d9a314`.
- Copy `lan01.xlsx`–`lan28.xlsx` from `E:\VN OFice\file test\lan` into `file test/lan/` — **PASS**; destination is git-ignored.
- Payload parity: fixture payloads were generated from existing FODS inputs using the phase-2 test producer (fixtures have no paired XLSX input); LAN payloads were generated by the production fused builder. `python scripts/perf-proto/webview_payload_probe.py <payload.json> <legacy.fods>` ran twice per entry using the production parser — **PASS** for all 10 entries.
- `SHEET_OPEN_PAYLOAD=1 python scripts/layout-audit/_batch_audit.py <worktree> <26 LAN names>` — **FAIL gate**, run twice; exact outcomes above.
- App timing harness in `E:\Temp\vno-sheet-open-phase2-integration\app_open_timing.py` with `VNO_PERF_DEBUG=1`, flag OFF/ON — **PASS measurement**, two runs for each of five workbooks; target not met for LAN06/LAN14.
- `node tests/run-tests.js` — **FAIL**, run 1: 2,044/2,047 PASS; run 2: 2,043/2,047 PASS. The failures were LibreOffice FODS→XLSX conversions; one additional run-2 orientation case reported `EBUSY` on unlink.
- Isolated Node suites — CF/validation conversion **FAIL**; DataPilot conversion **FAIL**; row/column layout conversion **FAIL**; text-rotation conversion **PASS** when run alone.
- `python -m unittest discover -s tests` — **PASS**, run 1: 433 tests in 307.875 s; run 2: 433 tests in 310.653 s.
- Focused `tests/unit/sheet-open-payload.test.js` — **PASS**, 6/6; includes Save, Save As, PDF export, AutoRecover, parse fallback, and grid-preservation checks.
- Focused `python -m unittest discover -s tests -p test_sheet_open_payload.py` — **PASS**, 4/4.
- `python -m py_compile main.py adapters/libreoffice/sheet/sheet_open_payload.py` — **PASS**.
- Product build/package — **NOT RUN**.

## BUILD RESULT

**NOT RUN.** No build-system change was made, and no build command was requested.

## TEST RESULTS

- Edge model equality: **PASS**, two runs for all five FODS fixtures and LAN06, LAN11, LAN12, LAN28, LAN14.
- 26-file payload-on audit: **FAIL**, twice. Saved, zero diff, and lint requirements passed for all 52 file-runs; Excel COM passed 3/26 in each run and returned `RPC_E_CALL_REJECTED` for the rest.
- Full-app timings: **PASS measurement**, two runs per flag state and file. LAN06/ON: 125,682.6 and 137,807.3 ms. LAN14/ON: 156,543.0 and 158,171.8 ms. The 60-second LAN14 target is **NOT MET**.
- Node suite: **FAIL**, twice because of existing soffice conversion errors. The full Python suite passed twice (433/433 each).
- Payload focused tests: **PASS**; serialization remains based on the committed in-memory model.
- Default flag: **OFF**, as not all rollout gates passed.

## KNOWN FAILURES

- Excel COM rejects most audited output opens with `RPC_E_CALL_REJECTED` in both official 26-file runs, despite `saved=yes`, zero audit diffs, and clean lint.
- Full Node suite reported 3 and 4 LibreOffice conversion failures on its two runs. CF/validation, Pivot DataPilot, and row/column layout conversion suites still failed when isolated; text rotation passed when isolated.
- LAN06 and LAN14 remain over 60 seconds even with the payload path.
- pywebview printed a non-blocking `WinError 5` when deleting Edge Crashpad temp data after LAN14 parity; both model comparisons exited successfully with equality true.

## RISKS

- Keep `SHEET_OPEN_PAYLOAD` opt-in until the Excel COM audit passes, the unstable soffice tests are resolved, and the performance objective is met or explicitly revised by the owner.
- Full-app measured improvement is material on LAN14, but payload generation and model construction still dominate the remaining open time.
- Product build/package and process peak memory were not measured.

## DEPENDENCIES/BLOCKERS

- Rollout is blocked by the failed Excel COM audit and unmet LAN14 <60-second target. The implemented path remains available for explicit opt-in testing.
- External LAN workbooks are ignored test data only; none are to be committed.

## CORE PATCH ID (if any)

None.

## NEXT ACTION

Keep `SHEET_OPEN_PAYLOAD` OFF by default. Investigate the Excel COM/soffice test environment and remaining LAN06/LAN14 pipeline cost, then rerun the failed gates before considering a default-on change.
