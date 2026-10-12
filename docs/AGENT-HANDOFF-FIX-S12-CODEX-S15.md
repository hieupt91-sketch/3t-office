# Agent Handoff
TASK: Continue `docs/tickets-0710/FIX-S12.md`
AGENT/ROLE: Codex / Sheet ribbon audit
BRANCH: `audit/sheet-s15-codex`
WORKTREE: `E:\VNOffice-codex-fs15`
OBJECTIVE: Audit the 43 remaining Sheet ribbon commands using the existing CDP runner, read-only Excel COM reader, and matrix generator; fix reproducible app mismatches with VI Help/i18n and commit each group.
FINDINGS: Matrix remains 94 KHỚP EXCEL / 1 LỆCH ĐÃ BIẾT / 43 CHƯA ĐỐI CHIẾU. PivotChart is confirmed to export as a regular chart without a Pivot link; it remains a documented known gap pending an owner decision on XLSX semantics. The first native-select probe exposed a harness focus issue; it is now guarded and reports `SELECT_NOT_FOCUSED` without sending keys.
IMPLEMENTATION SUMMARY: Committed the CDP harness null-safe collapsed-control geometry and focus guard (`3bd8b65c`). No Sheet product code changed. No evidence from unsuccessful select probes was added to the matrix.
FILES CHANGED: `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`; `docs/tickets-0710/FIX-S12-RESULTS.md`; this handoff.
COMMANDS RUN: `npm test`; `python -m unittest discover -s tests`; focused retries for the failing Sheet type-detection, Sheet round-trip, and Writer review tests with isolated `LOCALAPPDATA`; dirty-save structure and numFmt batches for `lan01,02,04,06,09,11,22,26`; `excel-read.ps1` on the eight saved structure outputs (ReadOnly, sequential); runner syntax check and CDP font-select probe.
BUILD RESULT: NOT RUN.
TEST RESULTS: PASS `npm test` 3092/3092. FAIL full Python discovery, 887 tests with 5 failures + 1 error during concurrent use of the shared LibreOffice profile; each Sheet/Writer method listed above passed alone with a private profile. Structure batch 7/8 PASS, with `lan11` conditionalFormatting L2 diff. NumFmt batch 8/8 PASS, all values/types/formats retained. Excel COM ReadOnly opened all eight structure outputs sequentially.
KNOWN FAILURES: Full Python suite was not clean. `lan11.xlsx` reports an L2 conditionalFormatting structural difference; numFmt remains intact. The attempted native-select probes did not focus the control and are not evidence of product behavior.
RISKS: 43 commands remain unchecked. Do not mark them matched without actual UI operation and Excel readback. A real PivotChart fix would change XLSX semantics and remains gated. Excel COM stays ReadOnly and one workbook at a time.
DEPENDENCIES/BLOCKERS: Continue remaining safe commands; isolate Python `LOCALAPPDATA` to avoid LibreOffice profile collisions. Do not run clipboard-dependent commands against ambient clipboard or execute AI commands that may transmit document data without explicit approval.
CORE PATCH ID (if any): None.
NEXT ACTION: Resume S12 at the Trang đầu controls, repair the automation hit/focus path before probing selects, then continue the remaining safe command groups, update matrix evidence only after Excel readback, and commit each group. Rerun requested full verification after product-code changes.
