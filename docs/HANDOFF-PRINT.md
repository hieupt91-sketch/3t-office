# Agent Handoff

TASK: Repair Writer print and Export PDF pagination by using the source-aware Save pipeline; audit Writer, Sheet, and Slides print parity.
AGENT/ROLE: Codex / implementation
BRANCH: fix/print-real-document-codex
WORKTREE: E:\VNOffice-codex-print
OBJECTIVE: Print and Export PDF from the same source-aware native-document conversion used by Save, then measure Office-oracle, VN canvas, print PDF, and Export PDF page counts.

FINDINGS:
- The initial d03 defect is fixed. Its Word, VN canvas, print PDF, and Export PDF counts are all 1.
- The source-aware DOCX save path restores source page size, margins, half-point fonts, sections, headers/footers, and anchors before LibreOffice creates the PDF.
- Remaining renderer differences are confirmed on Writer d01, d16, d20 and Sheet lan05, lan11, lan28. Print and Export PDF match each other; they do not all match Word/Excel.
- Sheet and Slides print/export routes use the same serializer and native-format postprocess as Save. Sheet's saved page setup/layout still differs from Excel/LibreOffice expectations in the measured workbooks.

IMPLEMENTATION SUMMARY:
- Existing G9 print dialog and app routing are in WIP commit 9efda4a. The branch first merged `main` as requested in merge commit 6040e2b; no merge into `main` was made.
- Writer `_write_print_source` uses the shared Save source builder and `_convert_save_source_to_native`, with the original source path when available. Legacy `.doc` input passes through intermediate `.docx`; new documents use the same DOCX Save route without a source path. LibreOffice converts that native file to PDF.
- Sheet FODS and Slides FODP are converted and postprocessed to XLSX/PPTX through their Save routes before LibreOffice PDF conversion.
- Added a source-aware pristine-body restoration for unmatched empty paragraphs. This preserves source spacing/alignment when the marker-only carrier is stripped.
- The Writer regression test compares all DOCX package members between Save and print. ZIP timestamps vary between conversions, so the assertion deliberately compares member payloads instead of container bytes.

FILES CHANGED IN THIS FOLLOW-UP:
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/test_print_save_pipeline.py`
- `scripts/layout-audit/_print_page_audit.py`
- `scripts/layout-audit/_excel_oracle_print_pages.ps1`
- `docs/HANDOFF-PRINT.md`
- The original G9 implementation is in WIP commit 9efda4a; see its file list for the dialog, adapters, bridge, and HelpPanel changes.

COMMANDS RUN:
- `git merge main` (completed first; commit 6040e2b).
- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_print_save_pipeline -v`
- `python -m unittest tests.test_writer_section_headerfooter_postprocess.UnitPostprocessWriterDocxTests.test_pristine_document_restores_empty_paragraphs_by_lcs tests.test_print_save_pipeline -v`
- `python -m unittest tests.test_sheet_save_roundtrip -v`
- `python -m unittest tests.test_writer_save_roundtrip -v`
- Sequential real-app page audit with `scripts/layout-audit/_print_page_audit.py` for d01–d09, d11–d24, the three legacy `.doc` files, and Sheet lan05/lan11/lan28.
- Sequential Word COM page oracle with `scripts/layout-audit/_word_oracle3.ps1`; RPC_E_CALL_REJECTED operations were waited on and retried.
- Sequential Excel COM `Workbook.ExportAsFixedFormat` page oracle for lan05/lan11/lan28; RPC_E_CALL_REJECTED operations were waited on and retried.
- `git diff --check` (final result recorded below).

BUILD RESULT: NOT RUN. No separate production build was requested.

TEST RESULTS:
- `node tests/run-tests.js`: PASS, 2103/2103.
- Final `python -m unittest discover -s tests`: PASS, 484 tests in 325.139 seconds.
- `python -m unittest tests.test_print_save_pipeline -v`: PASS, 9/9.
- Focused pristine-empty-paragraph and print-pipeline run: PASS, 10/10.
- Isolated Sheet save round-trip: PASS, 2/2 in 82.662 seconds.
- Isolated Writer save round-trip: PASS, 3/3 in 114.679 seconds.
- `git diff --check`: PASS.
- An initial Python run exposed an unstable ZIP-container byte comparison and a real source-empty-paragraph restoration failure. Both were corrected; the final full and isolated suites pass.

WRITER PAGE COUNTS:

Word original counts came from Word COM. VN canvas, print PDF, and Export PDF were measured through the live app's adapter and production bridge routes. d10.docx is excluded because the file is corrupt.

| File | Word original | VN canvas | VN print PDF | VN Export PDF | Parity |
|---|---:|---:|---:|---:|---|
| d01.docx | 19 | 19 | 20 | 20 | FAIL |
| d02.docx | 11 | 11 | 11 | 11 | PASS |
| d03.docx | 1 | 1 | 1 | 1 | PASS |
| d04.docx | 5 | 5 | 5 | 5 | PASS |
| d05.docx | 2 | 2 | 2 | 2 | PASS |
| d06.docx | 3 | 3 | 3 | 3 | PASS |
| d07.docx | 23 | 23 | 23 | 23 | PASS |
| d08.docx | 1 | 1 | 1 | 1 | PASS |
| d09.docx | 14 | 14 | 14 | 14 | PASS |
| d11.docx | 5 | 5 | 5 | 5 | PASS |
| d12.docx | 3 | 3 | 3 | 3 | PASS |
| d13.docx | 10 | 10 | 10 | 10 | PASS |
| d14.docx | 3 | 3 | 3 | 3 | PASS |
| d15.docx | 10 | 10 | 10 | 10 | PASS |
| d16.docx | 8 | 8 | 9 | 9 | FAIL |
| d17.docx | 5 | 5 | 5 | 5 | PASS |
| d18.docx | 2 | 2 | 2 | 2 | PASS |
| d19.docx | 2 | 2 | 2 | 2 | PASS |
| d20.docx | 3 | 3 | 4 | 4 | FAIL |
| d21.docx | 9 | 9 | 9 | 9 | PASS |
| d22.docx | 5 | 5 | 5 | 5 | PASS |
| d23.docx | 1 | 1 | 1 | 1 | PASS |
| d24.docx | 16 | 16 | 16 | 16 | PASS |
| legacy01.doc | 5 | 5 | 5 | 5 | PASS |
| legacy02.doc | 4 | 4 | 4 | 4 | PASS |
| legacy03.doc | 4 | 4 | 4 | 4 | PASS |

The d01 extra PDF page contains only the header and page number; d16's extra page is blank. d20's fourth page contains actual table content and was not removed. The source DOCX generated for d01/d16/d20 opens in Word with the original count; the remaining page difference occurs during LibreOffice PDF rendering.

SHEET PAGE COUNTS:

| File | Excel original (`ExportAsFixedFormat`) | VN print PDF | VN Export PDF | Parity |
|---|---:|---:|---:|---|
| lan05.xlsx | 14 | 3 | 3 | FAIL |
| lan11.xlsx | 965 | 357 | 357 | FAIL |
| lan28.xlsx | 36 | 35 | 35 | FAIL |

Sheet Print/Export serializes the live model to FODS, runs the same FODS→XLSX Save conversion/postprocess, and converts the XLSX to PDF through LibreOffice. For lan05, the source print area reaches row 1072 while the LO PDF prints rows 1–51. LibreOffice and Excel still paginate these workbooks differently.

GATE SUMMARY: Node PASS; Python PASS; source-aware print-pipeline regression PASS. Page-parity gate FAIL for Writer d01/d16/d20 and Sheet lan05/lan11/lan28. Overall page-parity objective is FAIL, not PASS.

KNOWN FAILURES:
- Writer LibreOffice PDF page counts exceed Word on d01, d16, and d20.
- Sheet LibreOffice PDF page counts differ from Excel on lan05, lan11, and lan28.

RISKS:
- Exact Office page parity for the named workbooks/documents is unresolved. Removing the d20 page would discard real content. Changing production output to Word/Excel automation would introduce separate Office installation/licensing and architecture assumptions.
- Real app audit artifacts and generated PDFs are under git-ignored `file test/print-real/page-audit/` and `file test/print-real/page-audit-final/`.

DEPENDENCIES/BLOCKERS: No new runtime dependency. Production printing stays offline and LibreOffice-backed. Exact parity on the remaining cases needs a renderer/layout decision.

CORE PATCH ID (if any): N/A; no LibreOffice Core changes.

NEXT ACTION: Decide whether exact Word/Excel pagination is a release gate that warrants a separate Office-renderer design, or whether the measured LibreOffice differences are acceptable. Do not claim full page parity until a chosen approach is implemented and verified.

## G10 — Office/WPS PDF renderer

STATUS: IMPLEMENTED; LIVE PARITY VERIFICATION PENDING. The G9 page counts above remain the LibreOffice baseline. They are not evidence of G10 results.

IMPLEMENTATION:
- `platform/print/office_com.py` detects Word/Excel/PowerPoint and WPS COM classes through the ProgID → CLSID → COM-server registry chain. The registry result is cached for the app process; detection does not activate an Office application.
- Each PDF job writes an ASCII PowerShell 5.1 worker to a private temporary directory and runs it in a dedicated `-STA` process. The worker creates Office through `New-Object -ComObject`, rejects a process that existed before the job, disables UI/alerts, opens the Save-pipeline `.docx`/`.xlsx`/`.pptx` read-only, retries busy COM calls up to five times (initial call plus five retries, 1/2/4/8/16-second backoff), and closes/quits in `finally`. The 300-second parent timeout kills the worker and only the recorded new Office PID.
- Print preview/printing and Export PDF both build the native source through the existing source-aware Save path. The selected Office/WPS engine exports the PDF; exceptions and empty PDFs fall back silently to the existing LibreOffice converter. The dialog reports the renderer that actually produced its PDF and defaults the Office/WPS option on when registration is available.
- Vietnamese Help entries now describe where Print and Export PDF are accessed and the actual Office/WPS/LibreOffice behavior for Writer, Sheet, and Slides.
- The real-app page audit now accepts `.pptx`, preserves the Print PDF for page-1 comparison, and can simulate missing Office/WPS in an isolated worker with `VN_PRINT_USE_OFFICE=0`.

DEVELOPMENT VALIDATION:
- Full Node suite: PASS, 2163/2163 before the Writer pristine-source and Excel retry follow-ups; it must be rerun after those changes.
- Full Python discovery: PASS, 494 tests before the Writer pristine-source and Excel retry follow-ups; it must be rerun after those changes.
- Current focused print pipeline/save/Office Python suite: PASS, 27/27 before the explicit edited-marker regression and final Excel retry-window change. `tests.test_print_save_pipeline` now separately passes 12/12; `tests.test_print_office_com` passes 9/9 after the retry-window change.
- `node --test tests/unit/print-dialog.test.js`: PASS, 4/4.
- Python compilation, PowerShell parser syntax validation, and `git diff --check`: PASS.
- Direct Microsoft Word original exports succeeded for d03, d12, d24, d01, d16, d20, and legacy01.doc. The earlier app PDFs are compared against those exports below; d12/d16 need a fresh app run after the pristine-source fix.
- Windows registry detection on this machine finds Microsoft Word, Excel, and PowerPoint; WPS is not registered.

LIVE VERIFICATION (IN PROGRESS): Direct Microsoft Word exports of the originals succeeded for d03 (1 page), d12 (3), d24 (16), d01 (19), d16 (8), d20 (3), and legacy01.doc (5). Previously generated app Print/Export PDFs match page counts for every file; page-1 text matches for d03, d24, d01, d20, and legacy01, but not d12/d16. Those app PDFs predate the pristine-source fix and need a fresh app run. Two serial direct lan05 Excel source exports (one with the longer 31-second busy retry schedule, one after an 11-minute quiet period) failed at `Excel.ExportAsFixedFormat` with `RPC_E_CALL_REJECTED`; no source PDF was produced. WMI showed 17 pre-existing `EXCEL.EXE /automation` processes with no responding state. The current job's own Excel process exited; all pre-existing processes were left untouched. The external Office-print launcher is still active, so further Excel/PowerPoint COM audits are paused. The simulated Office-absent app audit passes through LibreOffice for d03 (1 page) and lan05/lan11/lan28 (3/357/35 pages) in both Print and Export PDF before the pristine-XLSX restore change. After that change, fallback Print and Export both report LibreOffice: d03 1 page, lan05 3, lan11 345, lan28 35. The lan11 result improved by 12 pages; lan05 and lan28 counts did not change. The real PPTX, fresh d12/d16 app text comparisons, and lan11/lan28 active-sheet oracle remain pending.

SHEET FALLBACK INVESTIGATION:
- The G9 baseline remains lan05 14 Excel pages vs 3 LibreOffice pages, lan11 965 vs 357, and lan28 36 vs 35.
- The original lan05 workbook has one visible sheet, print area `A1:I1072`, and source page setup scale 56%. The converted source retains that print area; restoring its original page-setup/margins alone previously left the LibreOffice PDF at 3 pages. The discrepancy is therefore not caused by choosing the wrong active tab on lan05. The direct Excel source export also returned `RPC_E_CALL_REJECTED` after the longer retry window amid a possible concurrent Office queue.
- lan11 has three sheets with `Reyee` active (zero-based `activeTab=1`); lan28 has twelve sheets with `Bảng Lương` active (`activeTab=6`). The existing Save route preserves active-sheet metadata and per-sheet print areas. No active-sheet-only change has been made because the Excel active-sheet export count has not yet been measured against the workbook-level `ExportAsFixedFormat` baseline, and Print and Export PDF must keep their intended sheet scope.
- Before pristine-XLSX restoration, the live Office-absent LibreOffice fallback was 3/357/35 pages for lan05/lan11/lan28. After restoration, Print and Export both produce 3/345/35 pages. The source workbooks' earlier workbook-level Excel exports were 14/965/36 pages respectively; fresh Excel source exports were blocked by the Office queue.
- The audit recorded active sheets `ExportData`, `Reyee`, and `Bảng Lương`, with 1/3/12 visible sheets. lan05's source print area `A1:I1072` and 56% scale are preserved in the Save-pipeline XLSX, so its remaining 14-vs-3 difference is not caused by an omitted print area, wrong active tab, or lost scale value.
- lan11 has no defined print areas. Its original workbook contains 25,974 cells (almost all style-only) on `Giới thiệu` and 10,049 on `Ruijie`; the current Save-pipeline XLSX contains 13 and 1,574 cells respectively after Sheet's existing FODS optimization. This shrinkage is a plausible contributor to the 965-vs-357 workbook-export difference, but needs an isolated Excel active-sheet/per-sheet oracle before changing preservation or print scope. The app retains all three sheets and their active-tab metadata.
- lan28 has no defined print areas; all twelve visible sheets remain in the print source and the active tab remains `Bảng Lương`. Its fallback is one page below the workbook-level Excel baseline. No active-sheet-only behavior or page-scope change has been made because that would change the workbook export scope and still would not explain lan05's single-sheet mismatch.
- Commit `d783433` adds a pristine-only Sheet restore after the existing FODS → XLSX Save conversion. The serialized FODS marker is emitted only for an unchanged `.xlsx`; an edited workbook or legacy `.xls` stays on the selective postprocess route. Focused tests prove Save and Print restore the same original package bytes. For lan05, the restored print source SHA-256 exactly matches the original; the live lan11 count moved 357→345, while lan05 stayed 3 and lan28 stayed 35. Their remaining LibreOffice-vs-Excel differences are unresolved. No source hashes for lan11/lan28 were available in the workspace to independently compare.

REFERENCE ACCESS: `docs/REFERENCE-3T-READER.md` was read. The exact requested sibling-project `office_com.py` UNC path could not be opened from this machine (`\\192.168.1.8\d\PDF\3T_Reader_Phase1_Win\packages\document_core\office_com.py` did not resolve). The restricted `??ng k? bq` folder was not opened.

CURRENT GATE: `node tests/run-tests.js` passes 2164/2164 on the current HEAD. `python -m unittest discover -s tests` passes 500 tests in 325.907 seconds when run without a competing soffice process. An earlier 500-test run under concurrent soffice had two failures: a stale mock assertion for the added `pristine_docx_source=False` argument (fixed and focused test passes), and a LibreOffice conversion failure for `sample-writer-footnotes.docx`; the latter passed in the isolated rerun. Focused print Python suite passes 30/30; focused Sheet page-setup/marker checks pass 8/8; print-dialog Node suite passes 4/4. The post-restore Office-absent fallback audit ran successfully. G10 Office parity remains IN PROGRESS: d12/d16 page-1 text needs a fresh app audit and required Excel/Slides original parity checks remain open. Excel COM is blocked by 17 non-responding pre-existing Office servers and an external Office-print launcher. Do not mark overall parity PASS.

## G10 Follow-up Plan — untouched Writer OOXML fidelity

OBJECTIVE: Make Office-rendered Print/Export PDF from an untouched `.docx` match the original file's page-1 text while retaining the shared Save conversion path.

CURRENT CAPABILITY: Writer emits the `vno-pristine-document` marker when its opened document has no edits. `postprocess_writer_docx` already uses that marker for selected source restores, but the measured untouched d12 and d16 outputs still place different text on page 1. The intermediate is generated by the same HTML → DOCX → source-aware OOXML Save postprocess used by Save.

FILES/MODULES: `main.py` will pass whether the restoration source is a real `.docx` (legacy `.doc` conversion must not be treated as an original OOXML package); `adapters/libreoffice/common/ooxml_zip_patch.py` will extend the existing pristine-only source restore; focused tests will cover pristine DOCX, edited DOCX, and legacy `.doc`; this handoff records results.

DEPENDENCIES: None. Reuse the existing LibreOffice conversion and OOXML ZIP patcher.

RISK: A pristine marker must remain limited to the unchanged editor state and source `.docx` path; edited documents and legacy binary `.doc` must continue through the current surgical conversion/postprocess. Read-only source access follows the existing Save restore behavior.

TEST PLAN: Add a regression proving a pristine `.docx` still runs through HTML → DOCX conversion and then restores source OOXML; prove edited content is not replaced by the source package; prove legacy `.doc` stays on its intermediate DOCX path. Rerun serial Office d12/d16 Print and Export comparisons, then the requested full Node and Python gates when no competing soffice worker is active.

ROLLBACK: Revert the follow-up implementation commit; no data migration or generated-file cleanup is required.

## G10 Follow-up Plan — Excel busy-call cleanup

OBJECTIVE: Keep an Excel COM job from falling back on a short startup/busy window, and ensure a failed `Quit` cannot leave that job's own Excel process behind.

CURRENT CAPABILITY: The worker retries `RPC_E_CALL_REJECTED` five times, with a total backoff below four seconds. A live lan05 app attempt and a direct source export returned that busy HRESULT. The product fallback remained available; the source export did not produce a PDF.

FILES/MODULES: `platform/print/office_com.py` will label the COM operation in errors, lengthen the existing five-attempt backoff, and force-stop only the PID the worker positively recorded as newly started if its final `Quit` retries fail. `tests/test_print_office_com.py` will verify the retry and ownership boundaries; this handoff records serial live results.

DEPENDENCIES: None. Continue using the isolated PowerShell 5.1 STA worker.

RISK: A hung owned Excel process may be force-stopped after `Close(False)`/`Quit` fail; pre-existing Office PIDs remain excluded and untouched.

TEST PLAN: Unit-test the five attempts, error stage, graceful `Quit`, and owned-PID-only cleanup. Then, with no competing Office client, rerun direct exports and app Print/Export for lan05, lan11, and lan28, followed by the active-sheet oracle.

ROLLBACK: Revert the Excel worker hardening commit; Office failures will continue to use the existing silent LibreOffice fallback.

## G10 Follow-up Plan — Excel export retry window

OBJECTIVE: Let Excel finish a busy workbook PDF export before the COM job falls back to LibreOffice.

CURRENT CAPABILITY: The worker labels the COM operation and makes an initial call plus five retries with a 1/2/4/8/16-second schedule. Two lan05 source exports still returned `RPC_E_CALL_REJECTED` at `Excel.ExportAsFixedFormat`, including one begun after an 11-minute quiet period. Windows currently has 17 pre-existing non-responding `EXCEL.EXE /automation` processes; the worker's own Excel process exited, and none of the pre-existing processes were killed. A clean Office queue is required before another COM run.

FILES/MODULES: `platform/print/office_com.py` and `tests/test_print_office_com.py` contain the retry schedule and regression coverage. Live serial source exports and app Print/Export audits will determine whether this clears the failure.

DEPENDENCIES: None. Keep the PowerShell 5.1 STA worker and existing 300-second process timeout.

RISK: Busy Excel calls can extend a job by up to 31 seconds before fallback. A call that does not return remains bounded by the 300-second helper timeout; cleanup still only force-stops a job-owned Office PID when Quit retries fail.

TEST PLAN: Run focused COM-worker tests and PowerShell syntax parsing. With the Office queue clear, repeat direct Excel exports for lan05, lan11, and lan28 one at a time, then run the app route and record actual engine and PDF parity.

ROLLBACK: Revert the retry-window implementation; Excel failures continue to use the existing LibreOffice fallback.

## G10 Follow-up Plan — pristine Sheet workbook restoration

OBJECTIVE: Keep the exact original `.xlsx` OOXML package as the final source of Print/Export PDF for an untouched workbook, after the normal FODS → XLSX Save conversion has run.

CURRENT CAPABILITY: Sheet serializes editable values, print setup, active tab, and selected OOXML properties, but its existing FODS optimization trims style-only blank cells. In the live fallback audit, lan11's original `Giới thiệu` sheet has 25,974 cell records (25,961 style-only) while the Save-pipeline XLSX has 13; original `Ruijie` has 10,049 (9,475 style-only) while the Save-pipeline XLSX has 1,574. The workbook-level Excel baseline is 965 pages and the current LibreOffice result is 357. This is a plausible cause, not a proven page-count attribution, because the active Office queue prevented a clean Excel oracle.

FILES/MODULES: `adapters/libreoffice/sheet/sheet-adapter.js` will mark the FODS serialization only when the source is an unchanged `.xlsx`; `main.py` will restore the original XLSX bytes as the final post-conversion artifact only when that marker and a real `.xlsx` source are both present; `tests/test_print_save_pipeline.py` and Sheet serialization tests will cover pristine, edited, and non-XLSX paths. The restore must run after the existing Save conversion, matching the Writer source-restore design.

DEPENDENCIES: None. Reuse the current LibreOffice conversion, the original source bytes already read by `main.py`, and the existing dirty state.

RISK: A stale pristine marker could discard edits. Gate it on `isDirty === false` at serialization time and a real source `.xlsx` path; prove edited and `.xls` sources stay on the normal postprocess path. No format semantics or LibreOffice Core code changes.

TEST PLAN: Test the FODS marker only for an unchanged `.xlsx`; assert Save and Print still execute FODS → XLSX then restore the exact original package; assert edited `.xlsx`, `.xls`, and new workbooks are not source-restored. After the external Office queue clears, rerun direct Excel workbook/active-sheet exports and app Office/LibreOffice audits for lan05, lan11, and lan28. Run the final Node and Python gates without a concurrent soffice worker.

ROLLBACK: Revert the Sheet marker and source-restoration follow-up; Print/Save returns to its current selective OOXML postprocess behavior.

## G10 Follow-up Results

- Writer pristine-source restoration is implemented in `a9123db`; the legacy `.doc` route regression expectation was updated to include `pristine_docx_source=False`. That focused regression passes. Fresh d12/d16 app page-1 text audits remain pending because the Office-print queue is still active.
- Excel COM busy-call cleanup and the longer initial-plus-five retry schedule are implemented in `3dbaa58` and `f2f0ca8`. Unit tests pass; two direct lan05 exports still ended in `RPC_E_CALL_REJECTED`, including one after an 11-minute quiet period.
- Pristine XLSX source restoration is implemented in `d783433`. The post-restore Office-absent audit confirms lan11 fell from 357 to 345 pages, while lan05 stayed at 3 and lan28 at 35. All three still differ from the earlier workbook-level Excel counts 14/965/36. The source-copy hash comparison is verified for lan05 only.
- Full Node gate: PASS, 2164/2164. Full Python gate: PASS, 500 tests, 325.907 seconds on isolated rerun. The first concurrent-soffice Python run had two failures and is described in CURRENT GATE above. Build: NOT RUN.
- Office/WPS original-to-app parity for d03, d12, d24, legacy `.doc`, lan05, and PPTX is still NOT RUN or incomplete. Office/WPS detection, fallback path, implementation unit tests, and live Office-absent fallback do not establish page parity.
