# Agent Handoff
TASK: FIX-S4 — Sheet lan14 save serialization/postprocess performance
AGENT/ROLE: Codex / Sheet integration
BRANCH: `perf/sheet-save-lan14-codex`
WORKTREE: `E:\VNOffice-codex-fs4`
OBJECTIVE: Measure each lan14 save phase, reduce redundant FODS cells/rows, and preserve the listed XLSX round-trip results.
FINDINGS:
- Available input is `E:\VN OFice\file test\lan\lan14.xlsx` (9,742,160 bytes). It has four workbook sheets plus external-link table data; the FODS contains 10 table blocks. This differs from the ticket's 7 MB/four-table description.
- The serialized FODS is 321,879,296 bytes versus the FIX-S3 329,536,087-byte measurement, a reduction of 7,656,791 bytes (2.3%). It is not one order of magnitude smaller.
- FODS inspection counted 1,491,648 explicit cell elements, 2,103,349 logical cell positions after repeats, and 1,284,663 populated cell positions. Existing column repeats account for 611,701 logical positions; there were 72,277 row elements and no completely empty rows in this input.
- A completed app save measured: Python FODS write 1,567 ms; soffice conversion 19,198 ms; OOXML postprocess 164,481 ms; atomic replace 12.5 ms; verify 0.1 ms. After optimizing the source-string indexing helper, direct postprocess measurement on the same FODS/XLSX was 146,727 ms.
- The app created a 7,229,406-byte XLSX with 0 cell diffs, clean lints, and Excel PASS. The CDP `Runtime.evaluate` did not return after the WebView2 renderer disappeared. The batch audit therefore remains FAIL; `serializeMs` and `sentContentWriteMs` were not captured in a completed CDP sidecar. File timestamps put FODS completion about 92 seconds after app launch and XLSX completion about 288 seconds after launch.
IMPLEMENTATION SUMMARY:
- FODS serialization now run-length encodes adjacent identical blank cells and consecutive empty rows with matching row layout.
- Added adapter regression tests for blank-cell styles, value/style boundaries, and row positions around repeated empty rows.
- Added opt-in save phase timings (`VNO_CDP_AUDIT_TIMINGS=1`) and a local `.save-timings.json` sidecar so Python timings survive a lost renderer. The CDP audit sidecar now records partial phase timings/errors and uses a longer timeout for large-file FODS chunk reads.
- Replaced generic full cell-attribute parsing in `_xlsx_cells_with_original_strings` with targeted cell type/reference parsing. Existing 10 residual tests pass; a direct postprocess run improved 164.5 s to 146.7 s.
FILES CHANGED:
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `main.py`
- `tests/live/cdp/roundtrip-file.mjs`
- `tests/unit/sheet-fods-repeat-expand.test.js`
- `docs/AGENT-HANDOFF-FIX-S4.md`
COMMANDS RUN:
- `node --input-type=module -e ... runSheetFodsRepeatExpandTests()` — 11 focused tests.
- `python -m unittest tests.test_sheet_residuals_r8` — 10 tests.
- `node --check tests/live/cdp/roundtrip-file.mjs`; `python -m py_compile main.py`.
- `python scripts/layout-audit/batch_document_audit.py xlsx . lan14.xlsx` with `VNO_APP_ROOT=E:\VNOffice-codex-fs4`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs4`, `VNO_AUDIT_MARK_DIRTY=1`, and a separately allocated CDP port. The output was independently checked: 0 diffs, clean lint, Excel PASS; overall audit FAIL because CDP did not return after renderer exit.
- `python scripts/layout-audit/batch_document_audit.py xlsx . lan01.xlsx lan02.xlsx lan04.xlsx lan06.xlsx lan09.xlsx lan11.xlsx lan22.xlsx --no-reuse-saved` with the same app root/profile/dirty settings, run three times during implementation; the final run was 7/7 PASS, saved=yes, 0 diffs, clean lint, Excel PASS.
- `npm test` — 3043/3043 PASS.
- `python -m unittest discover -s tests` — 824 tests, OK (445.398 s).
- Direct `postprocess_sheet_xlsx` timing on the measured FODS/XLSX after the helper optimization: 146,727 ms.
BUILD RESULT: NOT RUN (not requested by the ticket).
TEST RESULTS:
- PASS — focused JavaScript serializer tests (11).
- PASS — `npm test` (3043/3043).
- PASS — `python -m unittest tests.test_sheet_residuals_r8` (10 tests).
- PASS — `python -m unittest discover -s tests` (824 tests).
- PASS — final seven-file audit set: lan01/02/04/06/09/11/22 all saved, zero diffs, clean lint, Excel PASS.
- FAIL — lan14 batch audit's CDP completion status; output was saved and passed the independent content/lint/Excel checks, but the renderer disappeared before CDP returned.
KNOWN FAILURES:
- FIX-S4 performance targets are not met: FODS shrank by 2.3%, and app launch to completed save was about 288 seconds. Postprocessing remains the largest measured save stage at 146.7 seconds after optimization.
- The current lan14 attempt did not produce exact JavaScript serialize/write timings because CDP did not return; Python save timings are captured independently.
RISKS: Run-length encoding is limited to identical empty cell XML or empty rows with identical row attributes. The seven-file fidelity regression passed after the final serializer and postprocess changes.
DEPENDENCIES/BLOCKERS: No external dependency added. Further progress toward the two-minute/10x goals needs a broader pass over the multi-million-cell OOXML postprocess, beyond repeated blank-cell encoding.
CORE PATCH ID (if any): None.
NEXT ACTION: Profile and reduce repeated OOXML cell scans in `postprocess_sheet_xlsx`; re-run lan14 through CDP and report the timing target honestly.
