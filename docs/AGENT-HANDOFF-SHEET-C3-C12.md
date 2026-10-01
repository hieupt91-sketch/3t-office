# Agent Handoff

TASK: Finish the five Sheet gaps and desktop acceptance proof requested on 2026-10-01.
AGENT/ROLE: Codex — Sheet fixes and acceptance verification.
BRANCH: `fix/sheet-c3-gaps-codex`
WORKTREE: `E:\VNOffice-codex-sheetfix`
OBJECTIVE: Desktop CDP + hidden Excel COM proof for native values, print setup, Ctrl+A, header-preserving sort, delete/Undo and tab color; final JavaScript/Python gates and the prescribed LAN audit; commit without merging main.
FINDINGS: Desktop acceptance verified all five requested behaviors. General `25%` input initially remained text, tab-color menu overflowed the viewport, and LibreOffice added header/footer spacing to saved margins. Follow-up fixes address those defects. Ctrl+A second press selects A1:Z200, the current available grid; Excel-sized worksheet extent remains out of scope.
IMPLEMENTATION SUMMARY: Reused Sheet formatter/history and the existing OOXML adapter postprocessor/import overlay. Native percentage entry remains numeric with its display format; tab-color menu stays inside the viewport with keyboard navigation and cleanup; native XLSX pageMargins retain exact user values on save/reopen. Vietnamese Help covers percentage entry and tab-color keyboard use. Full desktop/COM values are pasted in the audit report. No Core change, merge into main, OS-level input or document upload.
FILES CHANGED:
- `apps/sheet/sheet-grid.js`
- `platform/help/entries-sheet.js` (Sheet-owned existing entries)
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/unit/sheet-native-cell-values.test.js`
- `tests/test_sheet_page_margins_roundtrip.py`
- `tests/live/sheet-c3-gaps-excel.ps1`
- `tests/fixtures/sheet-c3-gaps/` (two synthetic desktop-saved XLSX proof artifacts)
- `docs/PLAN-SHEET-C3-GAPS-DESKTOP.md`
- `docs/AUDIT-SHEET-C3-C12.md`
- this handoff.
COMMANDS RUN: Desktop main.py via WebView2 remote-debugging-port + CDP; hidden Excel COM ownership/readback script; node tests/run-tests.js; python -m unittest discover -s tests; focused native-value and margin tests; node scripts/check-syntax.js; both XLSX lints on the two synthetic artifacts; git diff --check. Required LAN command is pending audit coordination.
BUILD RESULT: NOT RUN (no build-system changes).
TEST RESULTS: Five desktop behavior proofs PASS; four input Value2 types are Double; SUM=48871.81; exact page setup matches app reopen and Excel. Focused native-value tests 5/5 PASS; focused Python margin tests 4/4 PASS. Syntax 127/127 PASS, 0 errors. Synthetic artifact XML/parts lints 2/2 clean each. Full gates currently FAIL: JavaScript first 2307/2309 then 2306/2309; Python 550 run, 1 failure + 1 error. Final sequential reruns pending.
KNOWN FAILURES: Current full-gate failures involve LibreOffice conversions/profile locks, same-profile single-instance routing, and updater temp cleanup (details in audit). Do not infer a clean full suite from focused passes. LAN 28-file audit NOT RUN yet. The grid extent remains 26×200; broader historical C3–C12 acceptance gaps remain out of scope.
RISKS: Save pipeline touched: require all 28 LAN files TONG 0 with clean lint before READY TO MERGE. Other agents run large workbook audits and share RAM.
DEPENDENCIES/BLOCKERS: Wait for the claude-types lan14 investigation/audit to finish and all competing Python batch audits to stop; free RAM must exceed 3 GB before heavy work. Never stop another owner's Office/audit processes.
CORE PATCH ID (if any): None.
NEXT ACTION: Finish resource-safe sequential gates and the exact requested 28-file LAN audit, record exact outcomes, commit and report READY TO MERGE only if all required gates pass.
