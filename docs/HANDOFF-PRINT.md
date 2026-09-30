# Agent Handoff

TASK: Fix A7 printing from the real in-memory Writer, Sheet, and Slides documents
AGENT/ROLE: Codex / implementation
BRANCH: fix/print-real-document-codex
WORKTREE: E:\VNOffice-codex-print
OBJECTIVE: Replace WebView printing with an offline LibreOffice-backed print dialog and pipeline shared by all three apps.

FINDINGS:
- The former print routes called `window.print()` on the live WebView DOM. Those routes are removed; `rg "window\\.print\\s*\\(" platform apps adapters` returned no matches.
- The current print serialization goes through the same LibreOffice conversion and native export postprocessing used by PDF export.
- The shared HelpPanel already provides searchable, app-specific guidance. Updated Writer, Sheet, and Slides help entries describe Ctrl+P, the dialog controls, and the page preview.
- The app queries Windows printers through built-in PowerShell/WMI and uses LibreOffice UNO to count/render PDF pages and send printer options.

IMPLEMENTATION SUMMARY:
- Added `platform/print/print-dialog.js`, `print-dialog.css`, and `print-model.js` for the keyboard-usable Vietnamese dialog, page range validation, printer default selection, navigation, progress, and error states.
- Added `platform/print/print_pipeline.py` and small `main.py` bridge methods for temporary PDF sessions, Windows printer discovery, LibreOffice preview page rendering, and printing.
- Added LibreOffice UNO worker operations for PDF inspection, PNG preview rendering, and printing. Read-only operations retry once after a dropped UNO bridge; print jobs are never retried.
- Writer, Sheet, and Slides adapters serialize their current in-memory model into the print session. `common.file.print`, Ctrl+P, ribbon print, and Backstage print now route to those adapters.
- Microsoft Print to PDF all-pages/one-copy jobs use headless LibreOffice `--print-to-file` after the app's Save PDF picker, avoiding the printer driver's extra filename prompt.
- Added Vietnamese print guidance to each app's existing HelpPanel entries.

FILES CHANGED:
- `platform/print/**`, `main.py`, `adapters/libreoffice/common/{soffice_uno_worker.py,uno-bridge.js}`
- `adapters/libreoffice/{writer/writer-adapter.js,sheet/sheet-adapter.js,slides/slides-adapter.js}`
- `apps/{writer/writer.css,sheet/sheet-grid.js,sheet/sheet.css,slides/slides-canvas.js,slides/slides.css}`
- `platform/shell/{app-shell.js,shell.css}`, `index.html`
- `platform/help/entries-{writer,sheet,slides}.js`
- `tests/unit/{print-dialog.test.js,writer-print-preview.test.js,sheet-print-preview.test.js,slides-print-preview.test.js,backstage-print-thumbnail.test.js}`
- `tests/test_print_pipeline.py`, `tests/test_persistent_soffice_operations.py`
- `docs/HANDOFF-PRINT.md`

COMMANDS RUN:
- `node tests/run-tests.js`
- Standalone Node runs for `sheet-format-dropdown.test.js` and `sheet-pivot-save-fods.test.js`
- `node --test tests/unit/print-dialog.test.js`
- Focused print routing suites (Writer, Sheet, Slides, Backstage)
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_print_pipeline -v`
- `python -m unittest discover -s tests -p 'test_persistent_soffice_operations.py' -v`
- Real adapter serialization and Microsoft Print to PDF runs for d03, d12, d24, lan05, and sample-3; preview images rendered through LibreOffice Draw and visually inspected.
- Word/Excel `ExportAsFixedFormat` oracle attempts; details below.

BUILD RESULT: NOT RUN. The requested Node and Python gates were run; no separate production build was requested.

TEST RESULTS:
- `node tests/run-tests.js`: FAIL, 2055/2057 PASS. The two failing cases are the existing Sheet Pivot/DataPilot FODS→XLSX→FODS round-trip and FODS row/column height/width/visibility round-trip.
- Standalone reruns: the two LibreOffice suites passed 13/13 once. Subsequent isolated reruns reproduced each conversion failure (Pivot 1/2 in its suite; FODS dimensions 10/11 in its suite). These cases fail during `soffice --convert-to xlsx` and are unrelated to print routing.
- Focused print routing suites after the final adapter bindings: PASS, 43/43.
- `node --test tests/unit/print-dialog.test.js`: PASS, 4/4.
- `python -m unittest discover -s tests`: PASS, 453 tests in 406.240 seconds.
- `python -m unittest tests.test_print_pipeline -v`: PASS, 5/5.
- `python -m unittest discover -s tests -p 'test_persistent_soffice_operations.py' -v`: PASS, 2/2.
- `git diff --check`: PASS. No product `window.print()` calls remain.

REAL PRINT CHECKS:

| File | App | LibreOffice preview pages | Microsoft Print to PDF pages | Oracle / page-one review |
|---|---|---:|---:|---|
| d03.docx | Writer | 2 | 2 | Word COM blocked; page one shows the decision document, no app UI text visible |
| d12.docx | Writer | 3 | 3 | Word COM blocked; page one shows the order document and table, no app UI text visible |
| d24.docx | Writer | 16 | 16 | Word COM blocked; page one shows the Aqara cover artwork/text, no app UI text visible |
| lan05.xlsx | Sheet | 3 | 3 | Excel COM blocked; page one shows the purchase ledger and rows, no app UI text visible |
| sample-3.pptx | Slides | 10 | 10 | 10 current slides; page one shows slide artwork/title, no app UI text visible |

The adapter-backed PDFs and PNG previews are under the git-ignored `file test/print-real/` directory. Word automation hung while opening d03.docx. Excel `ExportAsFixedFormat` returned `RPC_E_CALL_REJECTED` during workbook open/export, so the requested Word/Excel oracle comparison is BLOCKED on this host. The counts above compare the LibreOffice print preview PDF to the actual Microsoft Print to PDF output.

KNOWN FAILURES:
- The full Node gate has the two LibreOffice round-trip failures listed above; both are reproducible when their individual suites run alone on this host.
- Word/Excel COM oracle counts are BLOCKED by Office automation behavior, not by the print pipeline.

RISKS:
- Page-count parity with Microsoft Word/Excel COM could not be independently confirmed here. The current print and preview PDFs match each other for all five real files.
- Page-one UI-text verification was visual inspection of the LibreOffice-rendered PNGs; no OCR/text-extraction tool was available in the environment.

DEPENDENCIES/BLOCKERS: No new runtime dependency. Offline printing uses the installed LibreOffice engine and Windows printer queues. Independent Word/Excel COM oracle validation needs a responsive Office automation environment.

CORE PATCH ID (if any): N/A; no LibreOffice Core changes.

NEXT ACTION: Review the print dialog and handoff. Re-run the Word/Excel COM page-count oracle in a responsive Office environment and investigate the two existing LibreOffice round-trip tests separately.
