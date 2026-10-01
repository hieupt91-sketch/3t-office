# Agent Handoff

TASK: CH-6.1 to CH-6.5 — shared desktop and document test harness
AGENT/ROLE: Codex / Shared test harness
BRANCH: feat/ch6-shared-test-harness-codex
WORKTREE: E:\VNOffice-codex-ch6
OBJECTIVE: Deliver shared WebView2 CDP desktop probes, one regression command, unified batch-audit dispatch, page-count comparison, and an OS-input safety guard.

FINDINGS:
- Merged `main` into this branch as requested (`263385ee`), keeping the CDP-based print audit and main's G10/spec updates.
- The Sheet runtime currently retains numeric, date, time, and percentage entries as strings; type detection reports this as FAIL.
- Slide Ctrl+C/X/V removes the selected text but the marker does not return on paste; this reports as FAIL.
- The Sheet page audit reports 2 Office pages versus 1 app print/PDF page.
- The CH-5 PPTX implementation module `_batch_pptx.py` is absent. The unified runner reports this dependency as BLOCKED.

IMPLEMENTATION SUMMARY:
- Added `tests/live/cdp/` shared client, action, lifecycle, and app-specific probe modules. The launcher uses a free WebView2 debug port, isolated `LOCALAPPDATA`, CDP readiness checks, and clean shutdown. Migrated the five supplied probes.
- Added the three-app desktop regression command with per-case PASS/FAIL/BLOCKED/N/A rows, plus print-page and round-trip CDP drivers.
- Routed the old XLSX and DOCX batch entry points through `batch_document_audit.py`; added the PPTX hook contract and kept compatibility wrappers. XLSX lint accepts self-closing rows and prefixed shared-string elements.
- Added a source/test scan that rejects OS-level input APIs and documented commands in Vietnamese.
- Updated the PowerPoint PDF oracle to retry `RPC_E_CALL_REJECTED` and two transient `E_FAIL` export responses; persistent failures remain failures.

FILES CHANGED:
- `tests/live/cdp/**`, `tests/unit/os-input-guard.test.js`, `tests/test_xlsx_lint.py`, `tests/test_print_page_audit.py`, `tests/run-tests.js`
- `scripts/layout-audit/batch_document_audit.py`, `_batch_audit.py`, `_batch_writer.py`, `_xlsx_lint.py`, `_print_page_audit.py`, and the Word/Excel/PowerPoint oracle scripts
- `docs/TESTING-DESKTOP.md`, `docs/AGENT-HANDOFF-CH6-TEST-HARNESS.md`

COMMANDS RUN:
- `git merge main` — completed; no merge into `main`.
- `node tests/run-tests.js` — run twice; both completed with one LibreOffice pivot conversion failure.
- Isolated `runSheetPivotSaveFodsTests()` — latest run PASS 2/2; an earlier isolated run hit a temporary-profile `EBUSY` cleanup error.
- `python -m unittest discover -s tests` — PASS 541/541 (full suite).
- `python -m unittest discover -s tests -p test_print_page_audit.py` — PASS 3/3.
- `python -m unittest discover -s tests -p test_xlsx_lint.py` — PASS 2/2.
- `node --check` for `tests/live/cdp/*.mjs` — PASS 11/11.
- `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs` — 24 PASS, 3 FAIL, 6 N/A; completed and printed all rows.
- `python scripts/layout-audit/_print_page_audit.py ...` on three repository fixtures — PASS 3/3 audit rows; Writer 1/1 pages, Sheet Office 2 vs app print/PDF 1, Slides 2/2 pages.
- PPTX batch-mode smoke check on a repository fixture — BLOCKED 1 row because CH-5 has not supplied `_batch_pptx.py`.
- `node tests/run-tests.js` safety guard — PASS, 0 OS-input violations.
- `git diff --check` — PASS.

BUILD RESULT: NOT RUN — no product build was requested or needed for the test-harness changes.

TEST RESULTS:
- Node full gate: FAIL, 2223/2224 PASS. The sole failing case was `Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS`; the same isolated test passed 2/2 on the latest rerun.
- Python full suite: PASS, 541/541.
- Desktop regression: 24 PASS / 3 FAIL / 6 N/A. Failing rows: Sheet startup typing (intermittent), Sheet type detection, and Slides Ctrl+C/X/V.
- Print page comparison: Writer Office/app print/PDF = 1/1/1 (delta 0); Sheet = 2/1/1 (delta -1); Slides = 2/2/2 (delta 0).
- Safety guard: PASS, 0 violations. CDP JavaScript syntax: PASS, 11/11 modules.
- PPTX hook smoke: BLOCKED, 1 row. This is the expected CH-5 dependency, not a passing PPTX audit.

KNOWN FAILURES:
- `node tests/run-tests.js` remains FAIL because the LibreOffice FODS-to-XLSX pivot conversion intermittently fails in the full suite, although the isolated test passed on its latest run.
- Desktop regression still exposes three app behaviors listed above; the overall desktop command exits nonzero when these are present.
- Sheet print output differs from Office by one page on `sample-sheet.xlsx`.

RISKS:
- Do not treat the Sheet print delta as parity; it remains visible in `print_page_comparison.md`.
- The PPTX unified mode cannot execute until CH-5 supplies its hook module.
- Runtime audit outputs and PDFs were written under the local temporary directory. No `file test/**` documents were committed, uploaded, or sent externally.

DEPENDENCIES/BLOCKERS: CH-5 must add `scripts/layout-audit/_batch_pptx.py` exposing `run_batch(root, input_dir, out_dir, names)`.
CORE PATCH ID (if any): None.
NEXT ACTION: CH-5 adds the PPTX hook; owners address the Sheet type/print gaps, Slides clipboard behavior, and investigate the intermittent full-suite LibreOffice conversion.
