# Agent Handoff

TASK: Implement G10 Office/WPS PDF rendering for Print and Export PDF, preserve the LibreOffice fallback, and investigate Sheet fallback page counts.
AGENT/ROLE: Codex / implementation
BRANCH: fix/print-real-document-codex
WORKTREE: E:\VNOffice-codex-print
OBJECTIVE: Use registered Microsoft Office or WPS to render the native source from the existing Save pipeline, report the actual engine, and keep the offline LibreOffice fallback.

FINDINGS:
- `git merge main` was performed first and fast-forwarded to `6f26113`. No merge into `main` was made.
- Microsoft Word, Excel, and PowerPoint COM registrations exist; WPS is not registered. Detection reads ProgID/CLSID registry keys without launching Office.
- Direct Word exports of original d03, d12, d24, d01, d16, d20, and legacy01.doc succeeded. Old app PDFs match page counts, but d12/d16 first-page text differed; those app audits predate the pristine Writer source restore.
- Two serial direct lan05 Excel exports failed at `ExportAsFixedFormat` with `RPC_E_CALL_REJECTED`, one after an 11-minute quiet period. WMI showed 17 pre-existing non-responding `/automation` Excel instances and an external Office-print PowerShell launcher. The job-owned process exited; no pre-existing Office process was terminated. Excel and PowerPoint live parity work is paused while those remain.
- Office-absent live fallback after the pristine XLSX restore: Print/Export both report LibreOffice and produce d03 1 page, lan05 3, lan11 345, lan28 35. lan11 improved from 357 to 345; lan05 and lan28 counts did not change. These remain different from prior workbook-level Excel counts 14/965/36.
- lan05's restored source SHA-256 matches the original exactly. Original lan11/lan28 source files were not available in the workspace for hash comparison.
- `docs/REFERENCE-3T-READER.md` was read. The specified UNC sister-project `office_com.py` could not be opened from this machine. The restricted `??ng k? bq` directory was not opened.

IMPLEMENTATION SUMMARY:
- Added cached Word/Excel/PowerPoint and WPS registration detection through ProgID → CLSID → COM server lookup.
- Each PDF job launches an isolated ASCII PowerShell 5.1 `-STA` worker. It opens the Save-pipeline `.docx`/`.xlsx`/`.pptx` read-only, hides the app and alerts, retries busy calls five times after the initial call with 1/2/4/8/16-second backoff, closes/quits in `finally`, and has a 300-second hard timeout. Cleanup only force-stops an Office PID positively marked as started by that job.
- Print and Export PDF use the existing Save conversions before Office/WPS rendering; any COM failure or empty result silently falls back to LibreOffice. The print dialog displays the actual engine and defaults the Office/WPS choice on when detected. Vietnamese Help entries were added for Writer, Sheet, and Slides.
- Untouched DOCX and XLSX sources are restored after the normal conversion/postprocess path. Edited docs/workbooks and legacy `.doc`/`.xls` continue through the conversion path.
- The print audit accepts PPTX and supports an Office-absent simulation.

FILES CHANGED:
- `platform/print/office_com.py`, `platform/print/print_pipeline.py`, `platform/print/print-dialog.js`, `platform/print/print-dialog.css`
- `main.py`, `adapters/libreoffice/common/uno-bridge.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet-adapter.js`
- `platform/help/entries-writer.js`, `platform/help/entries-sheet.js`, `platform/help/entries-slides.js`
- `scripts/layout-audit/_print_page_audit.py`
- `tests/test_print_office_com.py`, `tests/test_print_pipeline.py`, `tests/test_print_save_pipeline.py`, `tests/unit/sheet-pagesetup-real-file-import.test.js`
- `docs/HANDOFF-PRINT.md`, `docs/AGENT-HANDOFF-PRINT-G10.md`

COMMANDS RUN:
- `git merge main` (fast-forward to `6f26113`, before implementation)
- `node tests/run-tests.js`
- `node --test tests/unit/print-dialog.test.js`
- `python -m unittest tests.test_print_pipeline tests.test_print_save_pipeline tests.test_print_office_com -v`
- Focused Sheet page-setup/marker unit test (Node)
- Python compilation, Node syntax checks, PowerShell parser check, `git diff --check`
- Sequential direct Word original exports and Office-absent live Print/Export audits
- Serial direct Excel lan05 source export attempts (failed busy HRESULT); no PPTX COM audit due same Office process blocker

BUILD RESULT: NOT RUN. No build-system change was made.

TEST RESULTS:
- `node tests/run-tests.js`: PASS, 2164/2164 on current implementation HEAD.
- Focused print Python pipeline/save/COM suite: PASS, 30/30.
- Focused Sheet page-setup/marker checks: PASS, 8/8.
- `node --test tests/unit/print-dialog.test.js`: PASS, 4/4.
- Python compilation, JS syntax checks, PowerShell syntax parsing, and `git diff --check`: PASS.
- Office-absent live fallback audit after pristine XLSX restoration: PASS at application level; engine/counts recorded above.
- `python -m unittest discover -s tests`: PASS, 500 tests in 325.907s when rerun with no competing soffice process. The preceding concurrent run also ran 500 tests but failed two: the stale legacy `.doc` mock expectation for `pristine_docx_source=False` (fixed; focused regression passes) and a LibreOffice conversion of `sample-writer-footnotes.docx` (passed in the isolated rerun).
- Required Office original-vs-app page-count and first-page-text parity checks for all specified Writer/Sheet/Slides files: NOT RUN or incomplete due hung pre-existing Excel servers / external Office launcher. Overall parity is not PASS.

KNOWN FAILURES:
- LibreOffice fallback counts remain lan05 3 vs Excel 14, lan11 345 vs Excel 965, and lan28 35 vs Excel 36.
- Fresh d12/d16 first-page text comparison after the Writer pristine restore remains pending.
- Required live PPTX and Office-rendered Excel app audits remain pending.

RISKS:
- Office/WPS page parity has not been demonstrated for G10. Do not label parity PASS.
- lan11 active-sheet/per-sheet Excel oracle remains unknown; changing print scope could alter existing workbook export semantics.
- WPS is not installed. This machine cannot currently validate its COM route.

DEPENDENCIES/BLOCKERS: No new runtime dependency. Office COM work is paused because 17 existing Excel `/automation` instances are non-responsive and an external Office-print launcher remains present. Do not terminate those processes; retry only after the external Office queue clears. LibreOffice fallback remains available offline.

CORE PATCH ID (if any): N/A; no LibreOffice Core modifications.

NEXT ACTION: Rerun the full Python suite when no competing soffice job is active. After the external Office queue clears, run the fresh Writer comparisons, then the Office source/app Print and Export audits for lan05/lan11/lan28 and one real PPTX strictly one COM job at a time. Update this handoff and `docs/HANDOFF-PRINT.md` with exact results before claiming G10 complete.

## G10 Current-Turn Handoff — 2026-10-01

TASK: Complete G10 print parity evidence, correct Sheet print scope, and align preview page counts with the PDF used by Print.
AGENT/ROLE: Codex / implementation
BRANCH: fix/print-real-document-codex
WORKTREE: E:\VNOffice-codex-print
OBJECTIVE: Record original Office, 3T Office, and LibreOffice page counts/page-1 text for the requested documents; follow Excel active/selected sheet behavior in fallback output; make preview and Print share one generated PDF.
FINDINGS:
- `git merge main` was run first; it fast-forwarded to `f9e1101`. This branch has not been merged into main.
- Sheet print-only source now renders the saved active or grouped-selected tabs. In-scope fallback counts are lan05 3→3, lan11 345→232, lan28 35→2. lan11/lan28 previous counts included every visible sheet, while current counts honor the stored active selection. Excel active-sheet oracle evidence is BLOCKED.
- lan05 has one selected sheet, print area A1:I1072, Letter portrait, 56% scale, no fit-to-page, breaks, print titles, or hidden rows/columns. Populated data ends at row 84 and LibreOffice omits the blank formatted tail; Excel active-sheet PDF is unavailable, so the 14-vs-3 difference is unresolved and no page count was forced.
- Full page-count/page-1 evidence, including BLOCKED cells and extracted text, is in `docs/HANDOFF-PRINT.md` under G10 current-turn follow-up.
IMPLEMENTATION SUMMARY:
- Added OOXML helpers to read visible selected tabs and create a print-only scoped XLSX without editing saved workbook bytes.
- Applied the scope after source-aware Sheet save conversion. If active tab changed since load, it prints alone; untouched selected groups stay selected.
- Shared print preview and Print tests assert they use the same prepared PDF path; Sheet ribbon and UNO preview tests cover shared PDF flow.
FILES CHANGED:
- `main.py`, `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/test_print_pipeline.py`, `tests/test_print_save_pipeline.py`, `tests/test_g7_save_as_dialog.py`, `tests/unit/sheet-print-preview.test.js`
- `docs/HANDOFF-PRINT.md`, `docs/AGENT-HANDOFF-PRINT-G10.md`
COMMANDS RUN:
- `git merge main`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests` (multiple contention/fix/recovery runs; final isolated run PASS 516/516 in 324.007s)
- Focused Python Sheet-scope and Save As tests; Python compile; `git diff --check`
- Sequential LibreOffice live Sheet fallback audit and PDFium page-1 extraction
- Office COM attempt for Excel active-sheet PDF; failed on null `ActiveSheet`; no shared Office process was terminated and no further COM attempts were made
BUILD RESULT: NOT RUN.
TEST RESULTS:
- Node full gate: PASS 2187/2187.
- Python full gate: concurrent failures were 3/516 (two soffice file locks and one stale mock), then 1/516 (stale mock). After fixing the mock, 516/516 passed in 321.125 seconds, but this run overlapped the fallback audit. The isolated run started after a zero-soffice process snapshot and passed 516/516 in 324.007 seconds.
- Focused Sheet scope test PASS 1/1; focused Save As regression PASS; compile and diff checks PASS.
- Preview path tests PASS as part of Node gate; build NOT RUN.
KNOWN FAILURES:
- lan05 fallback page count remains 3 vs earlier workbook export 14. Required Excel active-sheet PDF and fresh 3T Office render are BLOCKED, so root-cause parity is not proven.
- Fresh Excel active-sheet exports for lan11/lan28, fresh Office reruns for d12/d16, and PowerPoint source/app Office parity remain BLOCKED by shared Office automation state.
RISKS: Do not compare all-sheet historical counts 965/36 with new active-sheet output 232/2. Do not label Office parity complete. The saved workbook stays byte-identical in the Sheet scope regression; active/selected scope is applied only to a temporary print workbook.
DEPENDENCIES/BLOCKERS: No new dependencies. Office COM is shared: sequential calls only, retry `RPC_E_CALL_REJECTED`, and terminate no process unless positively known to have been started by this job. This task made no further Office calls after the failed Excel attempt.
CORE PATCH ID (if any): N/A; no LibreOffice Core modification.
NEXT ACTION: Run final diff/status review, then commit on `fix/print-real-document-codex`; do not merge into main.
