# Agent Handoff

TASK: Implement G10 Office/WPS PDF rendering for Print and Export PDF, preserve LibreOffice fallback, investigate Sheet fallback page counts.
AGENT/ROLE: Codex / implementation
BRANCH: fix/print-real-document-codex
WORKTREE: E:\VNOffice-codex-print
OBJECTIVE: Use registered Microsoft Office or WPS, when available, to render the native source produced by the existing Save pipeline; report the actual engine and keep fallback local.

FINDINGS:
- `git merge main` was run first and fast-forwarded the worktree to `6f26113`; no merge into `main` was made.
- The G9 LibreOffice baseline still differs from Excel/Word on d01/d16/d20 and lan05/lan11/lan28. G10 live page/text parity has not been measured yet.
- This machine has Word, Excel, and PowerPoint COM registrations; WPS is not registered.
- A direct Office export of original `d03.docx` succeeded with one page. Its first-page text can be extracted, but the required comparison against VN Print/Export PDFs is pending.
- The sister-project guide `docs/REFERENCE-3T-READER.md` was read. The requested UNC `office_com.py` path did not resolve from this machine. The restricted `??ng k? bq` folder was not opened.

IMPLEMENTATION SUMMARY:
- Added cached ProgID → CLSID → COM-server registry detection without activating Office.
- Added an ASCII PowerShell 5.1 `-STA` worker per PDF job. It opens the source-aware Save-pipeline `.docx`/`.xlsx`/`.pptx` read-only, disables application UI/alerts, retries busy COM calls five times with backoff, exports to PDF, and closes/quits in `finally`. A 300-second timeout kills the helper and only a new Office PID recorded as job-owned.
- Print preview/printing and Export PDF now use the native Save conversion before the selected Office/WPS export; any COM failure or empty PDF silently falls back to LibreOffice.
- The print dialog reports the actual PDF engine and shows a checked-by-default Microsoft Office/WPS option only when registered. Vietnamese Help instructions were updated for Writer, Sheet, and Slides.
- The page-audit script can audit `.pptx`, preserves the Print PDF for page-1 text comparison, and supports an isolated Office-absent fallback mode.

FILES CHANGED:
- `platform/print/office_com.py`
- `platform/print/print_pipeline.py`
- `platform/print/print-dialog.js`, `platform/print/print-dialog.css`
- `main.py`, `adapters/libreoffice/common/uno-bridge.js`
- `platform/help/entries-writer.js`, `platform/help/entries-sheet.js`, `platform/help/entries-slides.js`
- `scripts/layout-audit/_print_page_audit.py`
- `tests/test_print_office_com.py`, `tests/test_print_pipeline.py`, `tests/test_print_save_pipeline.py`
- `docs/HANDOFF-PRINT.md`

COMMANDS RUN:
- `git merge main` (fast-forward; performed before implementation)
- `node tests/run-tests.js` (final full run, PASS 2163/2163)
- `node --test tests/unit/print-dialog.test.js` (final focused run, PASS 4/4)
- `python -m unittest discover -s tests` (final full run, PASS 494 tests)
- `python -m unittest tests.test_print_pipeline tests.test_print_save_pipeline tests.test_print_office_com -v`
- `python -m unittest tests.test_print_office_com -v`
- `python -m py_compile main.py platform/print/office_com.py platform/print/print_pipeline.py scripts/layout-audit/_print_page_audit.py`
- `node --check platform/print/print-dialog.js`
- `git diff --check`
- Direct Office PDF export for original `d03.docx`; PDF first-page text extraction probe.

BUILD RESULT: NOT RUN; no build-system change was made.

TEST RESULTS:
- `node tests/run-tests.js`: PASS, 2163/2163 on the final implementation. FODS round-trip checks ran without another soffice worker at launch.
- `python -m unittest discover -s tests`: PASS, 494 tests in 316.318 seconds, including the timeout-ownership test.
- Focused current print/Office Python suite: PASS, 24/24.
- Focused current print dialog model suite: PASS, 4/4.
- Python compilation and `git diff --check`: PASS.
- Office-absent and COM-failure fallback: PASS in unit tests. Live fallback audit: NOT RUN.
- Required original-vs-VN page-count and page-1-text comparisons for d03/d12/d24/legacy `.doc`/lan05/PPTX and Office/Excel parity cases: NOT RUN.

KNOWN FAILURES:
- G9 LibreOffice baseline is still d01 19 vs 20, d16 8 vs 9, d20 3 vs 4; lan05 14 vs 3, lan11 965 vs 357, lan28 36 vs 35. G10 has not been measured against these baselines.
- lan05 source has one visible sheet, print area `A1:I1072`, and scale 56%; the converted source retains the print area, and restoring its original margins/page setup alone left the LibreOffice result at 3 pages.

RISKS:
- Do not claim G10 parity until original-file Office exports are compared against app Print and Export PDFs by both page count and normalized page-1 text.
- Active-sheet scope on lan11/lan28 still needs an Excel ActiveSheet oracle before changing fallback semantics. Current pre-G10 counts use workbook-level Excel ExportAsFixedFormat.
- WPS is not installed on this machine; only Microsoft Office can be exercised here.

DEPENDENCIES/BLOCKERS: No new runtime dependency. At handoff time, a separate Office oracle has a headless Word job active and an idle `EXCEL.EXE /automation` process remains from an earlier batch. The full Node and Python gates have now passed in isolated runs. The required G10 Office COM jobs and live LibreOffice fallback audit remain queued to preserve strict serialization.

CORE PATCH ID (if any): N/A; no LibreOffice Core changes.

NEXT ACTION: Once the external Office oracle releases Word/Excel/PowerPoint, perform the serial original and live-app PDF audits for the requested Writer/Sheet/Slides files, measure active-sheet Sheet counts, run the live LibreOffice-only fallback audit, update `docs/HANDOFF-PRINT.md` with before/after results, and commit the completed verification handoff on this branch.
