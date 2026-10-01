# Agent Handoff

TASK: Repair Writer print and Export PDF pagination by using the source-aware Save pipeline; audit Writer, Sheet, and Slides print parity.
## Current Task Plan — parity evidence, Sheet fallback, and preview counts

OBJECTIVE: Complete original/3T Office/LibreOffice evidence for d03, d12, d16, d24, d01, d20, a legacy `.doc`, lan05.xlsx, lan11.xlsx, lan28.xlsx, and one `.pptx`; investigate and correct the Sheet fallback pagination discrepancies without changing page counts artificially; make each app's print-preview page total come from the same PDF that its Print action sends.

CURRENT CAPABILITY: G10 selects Office/WPS COM when available and falls back to LibreOffice. The shared print dialog reads the page count from its generated PDF, and preview and Print use the same prepared PDF path. Sheet's print-only XLSX now keeps the active or saved grouped-tab selection visible and hides other visible tabs; the saved workbook stays unchanged. The pristine XLSX also retains its page setup, print areas, breaks, and hidden-row/column state. Fresh hidden Excel COM and desktop CDP measurements are now recorded in “Owner Excel and desktop verification — 2026-10-01” below. In this environment, 3T's default Office route matches Excel for active-sheet and whole-workbook page counts. LibreOffice fallback counts remain renderer-specific: lan05 3, lan11 232 active / 345 whole, lan28 2 active / 35 whole.

FILES/MODULES: `platform/print/print_pipeline.py` and `platform/print/print-dialog.js` own the shared PDF/count path; preview command bindings live in the Writer, Sheet, and Slides adapters; `main.py` applies print-only Sheet scope with helpers in `adapters/libreoffice/common/ooxml_zip_patch.py`; regression coverage is in `tests/test_print_pipeline.py`, `tests/test_print_save_pipeline.py`, and `tests/unit/sheet-print-preview.test.js`. Existing audit scripts under `scripts/layout-audit/**` and this handoff hold evidence.

DEPENDENCIES: No new dependencies. Reuse the Office COM worker, LibreOffice fallback, current document serializers, and PDF preview APIs. Office COM must run strictly serially; retry `RPC_E_CALL_REJECTED`; terminate only Office processes created by the current job.

RISK: LibreOffice fallback pagination still differs from Excel on these files, even though inspected page setup and scope are preserved. Do not synthesize page counts or claim fallback parity. Preview can become stale if a document changes after PDF generation; bind the displayed total and subsequent Print action to the same prepared PDF/session.

TEST PLAN: Collect original Office export page counts and page-1 text, then run 3T Office and Office-disabled LibreOffice app audits for the same sources. For Sheet, inspect workbook active/selected sheets, print area, scale/fit, manual breaks, print titles, hidden rows/columns, paper size, and orientation per sheet; record before/after counts and the reason for each change. Verify preview totals against the exact PDF generated for Writer, Sheet, and Slides. Run `node tests/run-tests.js`, then `python -m unittest discover -s tests`; if soffice contention causes the FODS→XLSX round-trip failures, rerun Python alone and record both runs. Run no tests beyond these requested gates unless needed to diagnose a specific change.

ROLLBACK: Revert only the implementation and focused regression changes from this task; retain the measured evidence and test truth in this handoff. Do not merge this branch into `main`.

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

## G10 current-turn follow-up — 2026-10-01

This follow-up supersedes earlier pending evidence where current-turn results differ. `git merge main` was run first and fast-forwarded this branch to `f9e1101`; this branch remains unmerged into `main`.

IMPLEMENTATION: The Sheet print copy now reflects Excel's saved active or grouped-selected tab scope while retaining other sheets in the package for formula dependencies. It preserves original workbook data and page setup, and a changed active tab prints by itself. Saved workbook bytes are unchanged. Preview and Print share the same prepared PDF session; focused tests assert the exact PDF path. No LibreOffice Core changes or dependencies were added.

### Page-count and page-1 text evidence — 2026-10-01

Page-1 text is extracted with PDFium, Unicode NFC normalization, and collapsed whitespace. Writer 3T Office PDFs are the earlier successful G10 app renders; the d12/d16 renders predate the pristine-DOCX restore and are historical only. Fresh Office app reruns, Excel active-sheet PDFs, and the PowerPoint Office PDF are blocked by shared Office COM processes. The old Excel 14/965/36 counts came from workbook-level exports and are not an active-sheet oracle.

| File | Original Office export | 3T Office engine | LibreOffice fallback after Sheet scope |
|---|---|---|---|
| d03.docx | 1 pages | 1 pages | 1 pages |
| d12.docx | 3 pages | HISTORICAL 3 pages; fresh Office output BLOCKED | 3 pages |
| d16.docx | 8 pages | HISTORICAL 8 pages; fresh Office output BLOCKED | 8 pages |
| d24.docx | 16 pages | 16 pages | 16 pages |
| d01.docx | 19 pages | 19 pages | 20 pages |
| d20.docx | 3 pages | 3 pages | 4 pages |
| legacy01.doc | 5 pages | 5 pages | 5 pages |
| lan05.xlsx | BLOCKED active-sheet PDF; earlier workbook export: 14 (all sheets) | BLOCKED: earlier app output used LibreOffice | 3 pages |
| lan11.xlsx | BLOCKED active-sheet PDF; earlier workbook export: 965 (all sheets) | BLOCKED: no successful Office render | 232 pages |
| lan28.xlsx | BLOCKED active-sheet PDF; earlier workbook export: 36 (all sheets) | BLOCKED: no successful Office render | 2 pages |
| sample-3.pptx | BLOCKED | BLOCKED | 10 pages |

### Extracted first-page text

| File | Renderer | Pages | Page 1 text |
|---|---|---:|---|
| d03.docx | Original Office export | 1 | CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T -------------- Số: ……… CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc ---------------- Quảng Bình, ngày ….. tháng ….. năm 20…. QUYẾT ĐỊNH CỦA HỘI ĐỒNG THÀNH VIÊN CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T (V/v: Ban hành mẫu con dấu của doanh nghiệp) - Căn cứ luật Doanh nghiệp Việt Nam 2020 và các văn bản hướng dẫn thi hành; - Căn cứ Điều lệ Công ty; QUYẾT ĐỊNH Điều 1: Ban hành mẫu con dấu của doanh nghiệp như sau: Tên doanh nghiệp: CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Mã số doanh nghiệp: 1.Mẫu con dấu Nội dung và hình thức con dấu Ghi chú 2. Số lượng con dấu: ….. con dấu 3. Thời điểm có hiệu lực của mẫu con dấu: từ ngày …. tháng …..năm 20….. 4. Thời hạn sử dụng của con dấu: Đến khi doanh nghiệp chấm dứt tồn tại hoặc có quyết định của hội đồng thành viên về việc thay đổi con dấu hoặc quyết định hủy mẫu con dấu phù hợp với quy định của pháp luật. 5. Con dấu được sử dụng để đóng dấu vào các loại văn bản, giấy tờ của công ty theo quy định của pháp luật Điều 2: Giao cho ông PHẠM TRUNG HIẾU – Giám đốc công ty chịu trách nhiệm về việc quản lý và sử dụng con dấu theo quy định của pháp luật và điều lệ công ty. Điều 3: Giám đốc công ty và các thành viên công ty có trách nhiệm thực hiện quyết định này. Quyết định này có hiệu lực từ ngày ký./ CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN (Ký, ghi rõ Họ tên) |
| d03.docx | 3T Office engine | 1 | CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T -------------- Số: ……… CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc ---------------- Quảng Bình, ngày ….. tháng ….. năm 20…. QUYẾT ĐỊNH CỦA HỘI ĐỒNG THÀNH VIÊN CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T (V/v: Ban hành mẫu con dấu của doanh nghiệp) - Căn cứ luật Doanh nghiệp Việt Nam 2020 và các văn bản hướng dẫn thi hành; - Căn cứ Điều lệ Công ty; QUYẾT ĐỊNH Điều 1: Ban hành mẫu con dấu của doanh nghiệp như sau: Tên doanh nghiệp: CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Mã số doanh nghiệp: 1.Mẫu con dấu Nội dung và hình thức con dấu Ghi chú 2. Số lượng con dấu: ….. con dấu 3. Thời điểm có hiệu lực của mẫu con dấu: từ ngày …. tháng …..năm 20….. 4. Thời hạn sử dụng của con dấu: Đến khi doanh nghiệp chấm dứt tồn tại hoặc có quyết định của hội đồng thành viên về việc thay đổi con dấu hoặc quyết định hủy mẫu con dấu phù hợp với quy định của pháp luật. 5. Con dấu được sử dụng để đóng dấu vào các loại văn bản, giấy tờ của công ty theo quy định của pháp luật Điều 2: Giao cho ông PHẠM TRUNG HIẾU – Giám đốc công ty chịu trách nhiệm về việc quản lý và sử dụng con dấu theo quy định của pháp luật và điều lệ công ty. Điều 3: Giám đốc công ty và các thành viên công ty có trách nhiệm thực hiện quyết định này. Quyết định này có hiệu lực từ ngày ký./ CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN (Ký, ghi rõ Họ tên) |
| d03.docx | LibreOffice fallback | 1 | CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T -------------- Số: ……… CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc ---------------- Quảng Bình, ngày ….. tháng ….. năm 20…. QUYẾT ĐỊNH CỦA HỘI ĐỒNG THÀNH VIÊN CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T (V/v: Ban hành mẫu con dấu của doanh nghiệp) - Căn cứ luật Doanh nghiệp Việt Nam 2020 và các văn bản hướng dẫn thi hành; - Căn cứ Điều lệ Công ty; QUYẾT ĐỊNH Điều 1: Ban hành mẫu con dấu của doanh nghiệp như sau: Tên doanh nghiệp: CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Mã số doanh nghiệp: 1.Mẫu con dấu Nội dung và hình thức con dấu Ghi chú 2. Số lượng con dấu: ….. con dấu 3. Thời điểm có hiệu lực của mẫu con dấu: từ ngày …. tháng …..năm 20….. 4. Thời hạn sử dụng của con dấu: Đến khi doanh nghiệp chấm dứt tồn tại hoặc có quyết định của hội đồng thành viên về việc thay đổi con dấu hoặc quyết định hủy mẫu con dấu phù hợp với quy định của pháp luật. 5. Con dấu được sử dụng để đóng dấu vào các loại văn bản, giấy tờ của công ty theo quy định của pháp luật Điều 2: Giao cho ông PHẠM TRUNG HIẾU – Giám đốc công ty chịu trách nhiệm về việc quản lý và sử dụng con dấu theo quy định của pháp luật và điều lệ công ty. Điều 3: Giám đốc công ty và các thành viên công ty có trách nhiệm thực hiện quyết định này. Quyết định này có hiệu lực từ ngày ký./ CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN (Ký, ghi rõ Họ tên) |
| d12.docx | Original Office export | 3 | CỘNG HÒA XÃ HỘI CHỦNGHĨA VIỆT NAM Độc lập -Tựdo -Hạnh phúc …..., ngày 30 tháng 07 năm 2021 CÔNG TY CỔ PHẦN XI MĂNG SÔNG GIANH ĐƠN ĐẶT HÀNG Số: PO0000006488 - PO SAP No. (4111104165) Kính gửi: CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Địa chỉ: Số 362, Lý Thường Kiệt, Phường Bắc Lý, Thành phố Đồng Hới, Tỉnh Quảng Bình Điện thoại: 089669879 Mã số thuế: 3101075134 Số tài khoản: 5101195888999 - Ngân hàng TMCP Quân đội - Chi nhánh Quảng Bình. Đại diện: Ông Phạm Trung Hiếu Chức vụ : Giám đốc. Sau khi xem xét bản chào giá của quý Công ty, CÔNG TY CỔ PHẦN XI MĂNG SÔNG GIANH xác nhận đặt hàng của quý Công ty theo danh mục cụ thể dưới đây: Đơn vị tiền tệ: VND STT Mã vật tư Tên vật tư Quy cách Hãng SX/Xuất xứ ĐVT Số lượng Đơn giá Thành tiền Thời gian giao Địa điểm giao hàng 1 WV320000050051 RAM RAM laptop Kingston 4GB DDR3L￾PC3-12800 (bus 1600MHz) Đài Loan/Trung Quốc Cái 1 600,000.00 600,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 2 WV320000050051 RAM RAM laptop Kingston 4GB DDR4- 2400 (bus 2400MHz) Đài Loan/Trung Quốc Cái 2 1,150,000.00 2,300,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 3 WV320000050051 RAM RAM laptop Kingston 8GB DDR4- 2400 (bus 2400MHz) Đài Loan/Trung Quốc Cái 1 1,800,000.00 1,800,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh |
| d12.docx | 3T Office engine (historical; before pristine-DOCX restore) | 3 | CỘNG HÒA XÃ HỘI CHỦNGHĨA VIỆT NAM Độc lập -Tựdo -Hạnh phúc …..., ngày 30 tháng 07 năm 2021 CÔNG TY CỔ PHẦN XI MĂNG SÔNG GIANH ĐƠN ĐẶT HÀNG Số: PO0000006488 - PO SAP No. (4111104165) Kính gửi: CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Địa chỉ: Số 362, Lý Thường Kiệt, Phường Bắc Lý, Thành phố Đồng Hới, Tỉnh Quảng Bình Điện thoại: 089669879 Mã số thuế: 3101075134 Số tài khoản: 5101195888999 - Ngân hàng TMCP Quân đội - Chi nhánh Quảng Bình. Đại diện: Ông Phạm Trung Hiếu Chức vụ : Giám đốc. Sau khi xem xét bản chào giá của quý Công ty, CÔNG TY CỔ PHẦN XI MĂNG SÔNG GIANH xác nhận đặt hàng của quý Công ty theo danh mục cụ thể dưới đây: Đơn vị tiền tệ: VND STT Mã vật tư Tên vật tư Quy cách Hãng SX/Xuất xứ ĐVT Số lượng Đơn giá Thành tiền Thời gian giao Địa điểm giao hàng 1 WV320000050051 RAM RAM laptop Kingston 4GB DDR3L￾PC3-12800 (bus 1600MHz) Đài Loan/Trung Quốc Cái 1 600,000.00 600,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 2 WV320000050051 RAM RAM laptop Kingston 4GB DDR4- 2400 (bus 2400MHz) Đài Loan/Trung Quốc Cái 2 1,150,000.00 2,300,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 3 WV320000050051 RAM RAM laptop Kingston 8GB DDR4- 2400 (bus 2400MHz) Đài Loan/Trung Quốc Cái 1 1,800,000.00 1,800,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 4 WV320000050051 RAM RAM desktop Kingston 4GB DDR4- Đài Cái 1 760,000.00 760,000 Trong vòng 15-20 ngày kể từ Giao hàng tại kho Công ty Cổ |
| d12.docx | LibreOffice fallback | 3 | CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc …..., ngày 30 tháng 07 năm 2021 CÔNG TY CỔ PHẦN XI MĂNG SÔNG GIANH ĐƠN ĐẶT HÀNG Số: PO0000006488 - PO SAP No. (4111104165) Kính gửi: CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Địa chỉ: Số 362, Lý Thường Kiệt, Phường Bắc Lý, Thành phố Đồng Hới, Tỉnh Quảng Bình Điện thoại: 089669879 Mã số thuế: 3101075134 Số tài khoản: 5101195888999 - Ngân hàng TMCP Quân đội - Chi nhánh Quảng Bình. Đại diện: Ông Phạm Trung Hiếu Chức vụ : Giám đốc. Sau khi xem xét bản chào giá của quý Công ty, CÔNG TY CỔ PHẦN XI MĂNG SÔNG GIANH xác nhận đặt hàng của quý Công ty theo danh mục cụ thể dưới đây: Đơn vị tiền tệ: VND ST T Mã vật tư Tên vật tư Quy cách Hãng SX/Xuất xứ ĐV T Số lượn g Đơn giá Thành tiền Thời gian giao Địa điểm giao hàng 1 WV32000005005 1 RA M RAM laptop Kingston 4GB DDR3L￾PC3-12800 (bus 1600MHz) Đài Loan/Trun g Quốc Cái 1 600,000.00 600,000 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 2 WV32000005005 1 RA M RAM laptop Kingston 4GB DDR4- 2400 (bus 2400MHz) Đài Loan/Trun g Quốc Cái 2 1,150,000.0 0 2,300,00 0 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh 3 WV32000005005 1 RA M RAM laptop Kingston 8GB DDR4- 2400 (bus 2400MHz) Đài Loan/Trun g Quốc Cái 1 1,800,000.0 0 1,800,00 0 Trong vòng 15-20 ngày kể từ ngày ký kết đơn đặt hàng Giao hàng tại kho Công ty Cổ phần Xi măng Sông Gianh |
| d16.docx | Original Office export | 8 | CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T HỢP ĐỒNG CUNG CẤP DỊCH VỤ ĐIỆN THÔNG MINH HỆ THỐNG CAMERA GIÁM SÁT KHÓA THÔNG MINH HỆ THỐNG MẠNG LAN CHỦ ĐẦU TƯ:…………………………………………………………. ĐỊA CHỈ: ………………………………………………………………. |
| d16.docx | 3T Office engine (historical; before pristine-DOCX restore) | 8 | CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T HỢP ĐỒNG CUNG CẤP DỊCH VỤ ĐIỆN THÔNG MINH HỆ THỐNG CAMERA GIÁM SÁT KHÓA THÔNG MINH HỆ THỐNG MẠNG LAN |
| d16.docx | LibreOffice fallback | 8 | CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T HỢP ĐỒNG CUNG CẤP DỊCH VỤ ĐIỆN THÔNG MINH HỆ THỐNG CAMERA GIÁM SÁT KHÓA THÔNG MINH HỆ THỐNG MẠNG LAN CHỦ ĐẦU TƯ:…………………………………………………………. ĐỊA CHỈ: ………………………………………………………………. |
| d24.docx | Original Office export | 16 | CATALOG GIỚI THIỆU SẢN PHẨM |
| d24.docx | 3T Office engine | 16 | CATALOG GIỚI THIỆU SẢN PHẨM |
| d24.docx | LibreOffice fallback | 16 | GIỚI THIỆU SẢN PHẨM CATALOG |
| d01.docx | Original Office export | 19 | 1 CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc ---------------------- ĐIỀU LỆ CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Căn cứ Luật Doanh nghiệp số 59/2020/QH14 (năm 2020) và các quy định khác của pháp luật hiện hành. Chúng tôi, các thành viên CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T cam kết không thuộc đối tượng quy định tại khoản 2, 3 Điều 17 Luật Doanh nghiệp 2020, cùng nhau thống nhất ban hành điều lệ công ty với những chương, điều, khoản sau: Chương I. NHỮNG QUY ĐỊNH CHUNG Điều 1. Tên, địa chỉ công ty 1. Tên công ty viết bằng tiếng Việt: CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Tên công ty viết bằng tiếng nước ngoài: 3T INVESTMENT IN TECHNOLOGY AND CONSTRUCTION COMPANY LIMITED Tên công ty viết tắt: 2. Địa chỉ trụ sở chính: Số 70 Quang Trung, Phường Quảng Phong, Thị Xã Ba Đồn, Tỉnh Quảng Bình Điện thoại (nếu có): 0896698799 Fax (nếu có): Email (nếu có): Website (nếu có): Điều 2. Ngành, nghề kinh doanh 1. Ngành nghề kinh doanh của Công ty đăng ký là: STT Tên ngành Mã ngành Ngành, nghề kinh doanh chính 1. Sửa chữa máy móc, thiết bị 3312 2. Sửa chữa thiết bị điện tử và quang học 3313 3. Sửa chữa thiết bị điện 3314 4. Sửa chữa thiết bị khác 3319 5. Lắp đặt máy móc và thiết bị công nghiệp 3320 6. Sản xuất điện 3511 |
| d01.docx | 3T Office engine | 19 | 1 CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc ---------------------- ĐIỀU LỆ CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Căn cứ Luật Doanh nghiệp số 59/2020/QH14 (năm 2020) và các quy định khác của pháp luật hiện hành. Chúng tôi, các thành viên CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T cam kết không thuộc đối tượng quy định tại khoản 2, 3 Điều 17 Luật Doanh nghiệp 2020, cùng nhau thống nhất ban hành điều lệ công ty với những chương, điều, khoản sau: Chương I. NHỮNG QUY ĐỊNH CHUNG Điều 1. Tên, địa chỉ công ty 1. Tên công ty viết bằng tiếng Việt: CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Tên công ty viết bằng tiếng nước ngoài: 3T INVESTMENT IN TECHNOLOGY AND CONSTRUCTION COMPANY LIMITED Tên công ty viết tắt: 2. Địa chỉ trụ sở chính: Số 70 Quang Trung, Phường Quảng Phong, Thị Xã Ba Đồn, Tỉnh Quảng Bình Điện thoại (nếu có): 0896698799 Fax (nếu có): Email (nếu có): Website (nếu có): Điều 2. Ngành, nghề kinh doanh 1. Ngành nghề kinh doanh của Công ty đăng ký là: STT Tên ngành Mã ngành Ngành, nghề kinh doanh chính 1. Sửa chữa máy móc, thiết bị 3312 2. Sửa chữa thiết bị điện tử và quang học 3313 3. Sửa chữa thiết bị điện 3314 4. Sửa chữa thiết bị khác 3319 5. Lắp đặt máy móc và thiết bị công nghiệp 3320 6. Sản xuất điện 3511 |
| d01.docx | LibreOffice fallback | 20 | 1 CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập - Tự do - Hạnh phúc ---------------------- ĐIỀU LỆ CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Căn cứ Luật Doanh nghiệp số 59/2020/QH14 (năm 2020) và các quy định khác của pháp luật hiện hành. Chúng tôi, các thành viên CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T cam kết không thuộc đối tượng quy định tại khoản 2, 3 Điều 17 Luật Doanh nghiệp 2020, cùng nhau thống nhất ban hành điều lệ công ty với những chương, điều, khoản sau: Chương I. NHỮNG QUY ĐỊNH CHUNG Điều 1. Tên, địa chỉ công ty 1. Tên công ty viết bằng tiếng Việt: CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T Tên công ty viết bằng tiếng nước ngoài: 3T INVESTMENT IN TECHNOLOGY AND CONSTRUCTION COMPANY LIMITED Tên công ty viết tắt: 2. Địa chỉ trụ sở chính: Số 70 Quang Trung, Phường Quảng Phong, Thị Xã Ba Đồn, Tỉnh Quảng Bình Điện thoại (nếu có): 0896698799 Fax (nếu có): Email (nếu có): Website (nếu có): Điều 2. Ngành, nghề kinh doanh 1. Ngành nghề kinh doanh của Công ty đăng ký là: STT Tên ngành Mã ngành Ngành, nghề kinh doanh chính 1. Sửa chữa máy móc, thiết bị 3312 2. Sửa chữa thiết bị điện tử và quang học 3313 3. Sửa chữa thiết bị điện 3314 4. Sửa chữa thiết bị khác 3319 5. Lắp đặt máy móc và thiết bị công nghiệp 3320 6. Sản xuất điện 3511 |
| d20.docx | Original Office export | 3 | ISO 9001: 2008 26 Tôn Thất Đạm, Quận 1, Tp.HCM - ĐT: 84.8.38294180 - Fax: 84.8.38294185 – Email: baominh.com.vn – Website: www.baominh.com.vn BẢO MINH TỔNG CÔNG TY CỔ PHẦN BẢO MINH GIẤY YÊU CẦU BẢO HIỂM TÀU CÁ APPLICATION FORM FOR FISHING VESSEL Xinvuilòngtrảlờitấtcảcáccâuhỏidướiđâybằngcáchđiềnhoặcđánhdấuvàocác ô tươngứng/Please answer all the following questions by filling in or checking the appropriate boxes Các thông tin có dấu (*) là bắt buộc/Fields with (*) are compulsory. Hợp đồng mới Hợp đồng tái tục New Policy Renewal policy Số đơn BH cũ/Old Policy No: THÔNG TIN VỀ NGƯỜI ĐƯỢC BẢO HIỂM/POLICY HOLDER’S INFORMATION 1. Tên đầy đủ của Người được bảo hiểm/Chủ tàu-chữ IN HOA (*): NGUYỄN VĂN NGỌC 2. Full name of Assured/ Ship owner in CAPITAL LETTER 3. Số CMND/ĐKKD(*): ID number/BRN 4. Địachỉ (*): Quảng Phong, TX BA Đồn, tỉnh Quảng Bình Address 5. ĐT nhà: Home tel 6. ĐT di động: Mobile 7. ĐT cơquan: Office tel 8. Số fax: Fax No 9. Địachỉ email: E-mail address 10. Mãsốthuế(*): Tax code 11. Nghềnghiệp, ngànhnghề KD: Occupation, kind of business 12. Ngày sinh/thành lập Công ty: Date of birth/establishing company 13. Ngườithụhưởng/Địachỉ: Beneficiary/address THÔNG TIN VỀ TÀU ĐƯỢC BẢO HIỂM/INSURED VESSEL’S INFORMATION 14. Têntàu (*): Vessel name 15. Tên cũ: Ex name 16. Số đăngký (*): QB 98312- TS Registered No 17. Loạitàu (*): Đánh cá Vessel type 18. Nămđóng (*): 2015 Year of built 19. Nơi đóng (*): Quảng Bình Place of built 20. Cấp tàu (*): VIỆT NAM Classification 21. Vật liệu vỏtàu(*): GỖ Hull material 22. Trọng tải(Tấn): 25.00 23. Dung tích: 36.10 Grosstonage 24. Hãng SXmáychính (*): NHẬT BẢN Main Engine maker 25. Số serial máy chính: 0572 Main Engine Serial No 26. Nămsảnxuấtmáychính: Main engine manufacture year 27. Công suất máy chính (*):410 CV Main engine Horsepower 28. Phạm vi hoạtđộng (*):THEO QUY ĐỊNH CỦA ĐĂNG KIỂM Trading limit 29. Giátrịthựctế của tàu (*): 1.500.000. 000 đồng Trong đó (*):Vỏ (%):50 Máy móc (%):40 Trangthiếtbị (%):10 Actual ship value Whereof Hull Machinery Equipment Ghi chú: Các hạng mục chi tiết về máy móc và trang thiết bị được bảo hiểm của tàu sẽ căn cứ vào Sổ Đăng kiểm tàu cá Remark: The detailed list of machinery and equipment insured is according to the Classification Book 30. Giá trị thực tế của ngư lưới cụ, nếu yêu cầu BH (*): (theo danh mục đính kèm) Actual value of fishing apparatus, if applicable (as per the attached list) YÊU CẦU BẢO HIỂM/INSURANCEREQUEST Bảo hiểm Thântàu Hull & Machinery insurance 31. Số tiền BH thân tàu (*): 1000.000.000 đồng H&M sum insured 32. Số tiền BH ngư cụ: Fishing aparatus sum insured 33. Thời hạn bảo hiểm(*): từ 00h ngày 14/04/2024 đến 24 h ngày 13/04/2025 Period of insurancefrom to (both days inclusive) 34. Số kỳ thanh toán phí bảo hiểm: 1 Number of Premium instalments |
| d20.docx | 3T Office engine | 3 | ISO 9001: 2008 26 Tôn Thất Đạm, Quận 1, Tp.HCM - ĐT: 84.8.38294180 - Fax: 84.8.38294185 – Email: baominh.com.vn – Website: www.baominh.com.vn BẢO MINH TỔNG CÔNG TY CỔ PHẦN BẢO MINH GIẤY YÊU CẦU BẢO HIỂM TÀU CÁ APPLICATION FORM FOR FISHING VESSEL Xinvuilòngtrảlờitấtcảcáccâuhỏidướiđâybằngcáchđiềnhoặcđánhdấuvàocác ô tươngứng/Please answer all the following questions by filling in or checking the appropriate boxes Các thông tin có dấu (*) là bắt buộc/Fields with (*) are compulsory. Hợp đồng mới Hợp đồng tái tục New Policy Renewal policy Số đơn BH cũ/Old Policy No: THÔNG TIN VỀ NGƯỜI ĐƯỢC BẢO HIỂM/POLICY HOLDER’S INFORMATION 1. Tên đầy đủ của Người được bảo hiểm/Chủ tàu-chữ IN HOA (*): NGUYỄN VĂN NGỌC 2. Full name of Assured/ Ship owner in CAPITAL LETTER 3. Số CMND/ĐKKD(*): ID number/BRN 4. Địachỉ (*): Quảng Phong, TX BA Đồn, tỉnh Quảng Bình Address 5. ĐT nhà: Home tel 6. ĐT di động: Mobile 7. ĐT cơquan: Office tel 8. Số fax: Fax No 9. Địachỉ email: E-mail address 10. Mãsốthuế(*): Tax code 11. Nghềnghiệp, ngànhnghề KD: Occupation, kind of business 12. Ngày sinh/thành lập Công ty: Date of birth/establishing company 13. Ngườithụhưởng/Địachỉ: Beneficiary/address THÔNG TIN VỀ TÀU ĐƯỢC BẢO HIỂM/INSURED VESSEL’S INFORMATION 14. Têntàu (*): Vessel name 15. Tên cũ: Ex name 16. Số đăngký (*): QB 98312- TS Registered No 17. Loạitàu (*): Đánh cá Vessel type 18. Nămđóng (*): 2015 Year of built 19. Nơi đóng (*): Quảng Bình Place of built 20. Cấp tàu (*): VIỆT NAM Classification 21. Vật liệu vỏtàu(*): GỖ Hull material 22. Trọng tải(Tấn): 25.00 23. Dung tích: 36.10 Grosstonage 24. Hãng SXmáychính (*): NHẬT BẢN Main Engine maker 25. Số serial máy chính: 0572 Main Engine Serial No 26. Nămsảnxuấtmáychính: Main engine manufacture year 27. Công suất máy chính (*):410 CV Main engine Horsepower 28. Phạm vi hoạtđộng (*):THEO QUY ĐỊNH CỦA ĐĂNG KIỂM Trading limit 29. Giátrịthựctế của tàu (*): 1.500.000. 000 đồng Trong đó (*):Vỏ (%):50 Máy móc (%):40 Trangthiếtbị (%):10 Actual ship value Whereof Hull Machinery Equipment Ghi chú: Các hạng mục chi tiết về máy móc và trang thiết bị được bảo hiểm của tàu sẽ căn cứ vào Sổ Đăng kiểm tàu cá Remark: The detailed list of machinery and equipment insured is according to the Classification Book 30. Giá trị thực tế của ngư lưới cụ, nếu yêu cầu BH (*): (theo danh mục đính kèm) Actual value of fishing apparatus, if applicable (as per the attached list) YÊU CẦU BẢO HIỂM/INSURANCEREQUEST Bảo hiểm Thântàu Hull & Machinery insurance 31. Số tiền BH thân tàu (*): 1000.000.000 đồng H&M sum insured 32. Số tiền BH ngư cụ: Fishing aparatus sum insured 33. Thời hạn bảo hiểm(*): từ 00h ngày 14/04/2024 đến 24 h ngày 13/04/2025 Period of insurancefrom to (both days inclusive) 34. Số kỳ thanh toán phí bảo hiểm: 1 Number of Premium instalments |
| d20.docx | LibreOffice fallback | 4 | GIẤY YÊU CẦU BẢO HIỂM TÀU CÁ APPLICATION FORM FOR FISHING VESSEL Xinvuilòngtrảlờitấtcảcáccâuhỏidướiđâybằngcáchđiềnhoặcđánhdấuvàocác ô tươngứng/Please answer all the following questions by filling in or checking the appropriate boxes Các thông tin có dấu (*) là bắt buộc/Fields with (*) are compulsory. Hợp đồng mới Hợp đồng tái tục New Policy Renewal policy Số đơn BH cũ/Old Policy No: THÔNG TIN VỀ NGƯỜI ĐƯỢC BẢO HIỂM/POLICY HOLDER’S INFORMATION 1. Tên đầy đủ của Người được bảo hiểm/Chủ tàu-chữ IN HOA (*): NGUYỄN VĂN NGỌC 2. Full name of Assured/ Ship owner in CAPITAL LETTER 3. Số CMND/ĐKKD(*): ID number/BRN 4. Địachỉ (*): Quảng Phong, TX BA Đồn, tỉnh Quảng Bình Address 5. ĐT nhà: Home tel 6. ĐT di động: Mobile 7. ĐT cơquan: Office tel 8. Số fax: Fax No 9. Địachỉ email: E-mail address 10. Mãsốthuế(*): Tax code 11. Nghềnghiệp, ngànhnghề KD: Occupation, kind of business 12. Ngày sinh/thành lập Công ty: Date of birth/establishing company 13. Ngườithụhưởng/Địachỉ: Beneficiary/address THÔNG TIN VỀ TÀU ĐƯỢC BẢO HIỂM/INSURED VESSEL’S INFORMATION 1. Têntàu (*): Vessel name 2. Tên cũ: Ex name 3. Số đăngký (*): QB 98312- TS Registered No 4. Loạitàu (*): Đánh cá Vessel type 5. Nămđóng (*): 2015 Year of built 6. Nơi đóng (*): Quảng Bình Place of built 7. Cấp tàu (*): VIỆT NAM Classification 8. Vật liệu vỏtàu(*): GỖ Hull material 9. Trọng tải(Tấn): 25.00 10. Dung tích: 36.10 Grosstonage 11. Hãng SXmáychính (*): NHẬT BẢN Main Engine maker 12. Số serial máy chính: 0572 Main Engine Serial No 13. Nămsảnxuấtmáychính: Main engine manufacture year 14. Công suất máy chính (*):410 CV Main engine Horsepower 15. Phạm vi hoạtđộng (*):THEO QUY ĐỊNH CỦA ĐĂNG KIỂM Trading limit 16. Giátrịthựctế của tàu (*): 1.500.000. 000 đồng Trong đó (*):Vỏ (%):50 Máy móc (%):40 Trangthiếtbị (%):10 Actual ship value Whereof Hull Machinery Equipment Ghi chú: Các hạng mục chi tiết về máy móc và trang thiết bị được bảo hiểm của tàu sẽ căn cứ vào Sổ Đăng kiểm tàu cá Remark: The detailed list of machinery and equipment insured is according to the Classification Book 17. Giá trị thực tế của ngư lưới cụ, nếu yêu cầu BH (*): (theo danh mục đính kèm) Actual value of fishing apparatus, if applicable (as per the attached list) YÊU CẦU BẢO HIỂM/INSURANCEREQUEST Bảo hiểm Thântàu Hull & Machinery insurance 2. Số tiền BH thân tàu (*): 1000.000.000 đồng H&M sum insured 3. Số tiền BH ngư cụ: Fishing aparatus sum insured TỔNG CÔNG TY CỔ PHẦN BẢO MINH BẢO MINH ISO 9001: 2008 26 Tôn Thất Đạm, Quận 1, Tp.HCM - ĐT: 84.8.38294180 - Fax: 84.8.38294185 – Email: baominh.com.vn – Website: www.baominh.com.vn |
| legacy01.doc | Original Office export | 5 | CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập – Tự do – Hạnh phúc ———————- …, ngày…tháng…năm… HỢP ĐỒNG MUA BÁN MÁY TÍNH Số:…/HĐMB- – Căn cứ Bộ Luật Dân sự 2015; – Căn cứ vào thỏa thuận của các bên, Hôm nay, ngày…tháng…năm…tại địa chỉ……………………………………………., chúng tôi gồm: Bên bán (Bên A): TRUNG TÂM ĐIỆN TỬ TIN HỌC TRƯỜNG TỒN Ông/Bà: Trần Thị Ngọc Hà Chức vụ: cửa hàng trưởng Địa chỉ: 14 Phan Bội Châu,P.Ba Đồn, tx Ba Đồn , Quảng Bình Số điện thoại: 0965679111-0949550134 Tài khoản số: 3804205393254 Chủ tài khoản: Trần Thị Ngọc Hà Tại ngân hàng : nông nghiệp và phát triển nông thôn chi nhánh Quảng Trạch Mà số thuế: 3101089867 Bên mua (Bên B): CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Ông/Bà: Ông Phạm Trung Hiếu Sinh ngày:21/08/1991 Chứng minh nhân dân/Căn cước công dân số: 044091002401 Nơi cấp: cục trưởng cục cảnh sát ĐKQL cư trú và DLQG về dân cư cấp ngày07 tháng 06 năm 2018 Địa chỉ thường trú: Quảng Phong,tx Ba Đồn, Quảng Bình |
| legacy01.doc | 3T Office engine | 5 | CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập – Tự do – Hạnh phúc ———————- …, ngày…tháng…năm… HỢP ĐỒNG MUA BÁN MÁY TÍNH Số:…/HĐMB- – Căn cứ Bộ Luật Dân sự 2015; – Căn cứ vào thỏa thuận của các bên, Hôm nay, ngày…tháng…năm…tại địa chỉ……………………………………………., chúng tôi gồm: Bên bán (Bên A): TRUNG TÂM ĐIỆN TỬ TIN HỌC TRƯỜNG TỒN Ông/Bà: Trần Thị Ngọc Hà Chức vụ: cửa hàng trưởng Địa chỉ: 14 Phan Bội Châu,P.Ba Đồn, tx Ba Đồn , Quảng Bình Số điện thoại: 0965679111-0949550134 Tài khoản số: 3804205393254 Chủ tài khoản: Trần Thị Ngọc Hà Tại ngân hàng : nông nghiệp và phát triển nông thôn chi nhánh Quảng Trạch Mà số thuế: 3101089867 Bên mua (Bên B): CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Ông/Bà: Ông Phạm Trung Hiếu Sinh ngày:21/08/1991 Chứng minh nhân dân/Căn cước công dân số: 044091002401 Nơi cấp: cục trưởng cục cảnh sát ĐKQL cư trú và DLQG về dân cư cấp ngày07 tháng 06 năm 2018 Địa chỉ thường trú: Quảng Phong,tx Ba Đồn, Quảng Bình |
| legacy01.doc | LibreOffice fallback | 5 | CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM Độc lập – Tự do – Hạnh phúc ———————- …, ngày…tháng…năm… HỢP ĐỒNG MUA BÁN MÁY TÍNH Số:…/HĐMB- – Căn cứ Bộ Luật Dân sự 2015; – Căn cứ vào thỏa thuận của các bên, Hôm nay, ngày…tháng…năm…tại địa chỉ……………………………………………., chúng tôi gồm: Bên bán (Bên A): TRUNG TÂM ĐIỆN TỬ TIN HỌC TRƯỜNG TỒN Ông/Bà: Trần Thị Ngọc Hà Chức vụ: cửa hàng trưởng Địa chỉ: 14 Phan Bội Châu,P.Ba Đồn, tx Ba Đồn , Quảng Bình Số điện thoại: 0965679111-0949550134 Tài khoản số: 3804205393254 Chủ tài khoản: Trần Thị Ngọc Hà Tại ngân hàng : nông nghiệp và phát triển nông thôn chi nhánh Quảng Trạch Mà số thuế: 3101089867 Bên mua (Bên B): CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Ông/Bà: Ông Phạm Trung Hiếu Sinh ngày:21/08/1991 Chứng minh nhân dân/Căn cước công dân số: 044091002401 Nơi cấp: cục trưởng cục cảnh sát ĐKQL cư trú và DLQG về dân cư cấp ngày07 tháng 06 năm 2018 Địa chỉ thường trú: Quảng Phong,tx Ba Đồn, Quảng Bình |
| lan05.xlsx | Original Office export | BLOCKED | BLOCKED active-sheet Excel PDF; prior workbook-level export did not retain its PDF or page-1 text. |
| lan05.xlsx | 3T Office engine | BLOCKED | BLOCKED: no successful Excel-rendered 3T Sheet PDF was captured. |
| lan05.xlsx | LibreOffice fallback | 3 | BẢNG KÊ HOÁ ĐƠN, CHỨNG TỪ HÀNG HOÁ, DỊCH VỤ MUA VÀO Kỳ tính thuế: quý II năm 2021 Tên người nộp thCÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T Mã số thuế: 3101075134 STT Tên người bán Ghi chú 1. Hàng hóa, dịch vụ không chịu thuế giá trị gia tăng (GTGT): Tổng Cộng - 2. Hàng hoá, dịch vụ chịu thuế suất thuế GTGT 0%: 1 0000849 31/10/2021 3100383030 5,410,080 2 0135208 27/12/2021 0104264818 33,200,000 3 4 Tổng Cộng 38,610,080 - 3. Hàng hoá, dịch vụ chịu thuế suất thuế GTGT 5%: Tổng Cộng - - 4. Hàng hoá, dịch vụ chịu thuế suất thuế GTGT 10%: 1 0101961 01/10/2021 0104264818 6,763,636 676,364 7,440,000 2 0000426 03/10/2021 0105690657-017 13,577,273 1,357,727 14,935,000 3 0000680 05/10/2021 CÔNG TY TNHH HỆ THỐNG MẠNG 0101445044 3,040,000 304,000 3,344,000 4 0000775 11/10/2021 3100383030 48,960,056 4,896,006 53,856,062 5 0000799 16/10/2021 3100383030 209,091 20,909 230,000 6 0001366 18/10/2021 3100396449 6,375,600 637,560 7,013,160 7 0008796 19/10/2021 0302309845-076 16,846,364 1,684,636 18,531,000 8 0007511 20/10/2021 0101590267 21,264,000 2,126,400 23,390,400 9 0000199 21/10/2021 0106618276 5,545,000 554,500 6,099,500 10 0000489 21/10/2021 12,263,636 1,226,364 13,490,000 11 0000490 22/10/2021 12,263,636 1,226,364 13,490,000 12 0000824 22/10/2021 3100383030 939,409 93,941 1,033,350 Hóa đơn, chứng từ mua vào Mã số thuế người bán Giá trị hàng hóa dịch vụ mua vào chưa có thuế Thuế GTGT đủ điều kiện khấu trừ thuế Số hóa đơn Ngày, tháng, năm phát hành Công ty TNHH Công nghệ quốc tế ADT CÔNG TY TNHH PHÂN PHỐI SYNNEX FPT CÔNG TY TNHH PHÂN PHỐI SYNNEX FPT CHI NHÁNH CÔNG TY TNHH THƯƠNG MẠI VHC QUẢNG BÌNH CÔNG TY TNHH CÔNG NGHỆ QUỐC TẾ ADT CÔNG TY TNHH CÔNG NGHỆ QUỐC TẾ ADT CÔNG TY TNHH TỔNG HỢP CÔNG TÂM CHI NHÁNH CÔNG TY TNHH CAO PHONG TẠI QUẢNG BÌNH - SIÊU THỊ ĐIỆN MÁY NỘI THẤT CHỢ LỚN CÔNG TY TNHH CÔNG NGHỆ VIỆT THÁI DƯƠNG CÔNG TY TNHH PHÁT TRIỂN CÔNG NGHỆ LONG TIẾN HẢI CHI NHÁNH CÔNG TY TNHH THƯƠNG MẠI VHC QUẢNG BÌNH 0105690657-017 CHI NHÁNH CÔNG TY TNHH THƯƠNG MẠI VHC QUẢNG BÌNH 0105690657-017 CÔNG TY TNHH CÔNG NGHỆ QUỐC TẾ ADT |
| lan11.xlsx | Original Office export | BLOCKED | BLOCKED active-sheet Excel PDF; prior workbook-level export did not retain its PDF or page-1 text. |
| lan11.xlsx | 3T Office engine | BLOCKED | BLOCKED: no successful Excel-rendered 3T Sheet PDF was captured. |
| lan11.xlsx | LibreOffice fallback | 232 | BÁO GIÁ CÁC SẢN PHẨM REYEE Hình ảnh Switch Không Quản Lý |
| lan28.xlsx | Original Office export | BLOCKED | BLOCKED active-sheet Excel PDF; prior workbook-level export did not retain its PDF or page-1 text. |
| lan28.xlsx | 3T Office engine | BLOCKED | BLOCKED: no successful Excel-rendered 3T Sheet PDF was captured. |
| lan28.xlsx | LibreOffice fallback | 2 | Phiếu Lương & KPI Tháng Để xem lương gõ theo thứ tự số =>> 1. Thông Tin NV Họ Tên Nguyễn Thanh Tùng SĐT Chức Vụ Giám Đốc 2. Thông Tin Lương & KPI. HS LCB - Số Ngày TC/ tháng 27 Số ngày nghỉ 0 phép. - Số ngày nghỉ lễ - LCB trong tháng - DS Trong Tháng 82,747,000 KPI Hưởng 2,821,447 Thưởng khác(nếu có) - Tổng Lương 2,821,447 Phạt ( nếu có) - Đóng BHYT, BHXH - Tổng Thực Lĩnh 2,821,447 0833280691 Thông tin bảng lương mang tính chất tham khảo để nắm bắt được kết quả làm việc 1 tháng của cá nhân, mọi thắc mắc vui lòng liên hệ gửi về email nhansu3t@gmail.com or 0967,136,099 xin cảm ơn, vui lòng phản hồi trước 12h ngày 15 hàng tháng, |
| sample-3.pptx | Original Office export | BLOCKED | BLOCKED: PowerPoint COM export was not available. |
| sample-3.pptx | 3T Office engine | BLOCKED | BLOCKED: PowerPoint COM export was not available. |
| sample-3.pptx | LibreOffice fallback | 10 | WEST COAST ROAD TRIP Your Name • Sept 20XX |

### Current Sheet source settings and before/after

| File | Excel workbook export baseline (all sheets) | Fallback before scope fix | Fallback after scope fix | Original active/selected sheet and first PDF text | Print / Export PDF |
|---|---:|---:|---:|---|---|
| lan05.xlsx | 14 (active-sheet oracle BLOCKED) | 3 | 3 | ExportData; “BẢNG KÊ HOÁ ĐƠN…” | 3 / 3 |
| lan11.xlsx | 965 (active-sheet oracle BLOCKED) | 345 | 232 | Reyee; “BÁO GIÁ CÁC SẢN PHẨM REYEE…” | 232 / 232 |
| lan28.xlsx | 36 (active-sheet oracle BLOCKED) | 35 | 2 | Bảng Lương; “Phiếu Lương & KPI…” | 2 / 2 |

### Sheet-by-sheet source layout inventory

The sheet names and explicit OOXML properties below are from the pristine source files. “Not stored” means Excel has no per-sheet value in OOXML; the parenthetical is the setting resolved by the current LibreOffice import when observed. The files have no manual row/column breaks or print titles except where stated.

| Workbook / sheet | Selected | Paper and orientation | Scale / fit | Print area | Hidden rows / columns |
|---|---|---|---|---|---|
| lan05 — ExportData | Yes | Paper size is not explicit in OOXML; current import resolves Letter, portrait | 56%; no fit-to-page / fit width / fit height | A1:I1072 | None |
| lan11 — Giới thiệu | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan11 — Reyee | Yes | A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan11 — Ruijie | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — Tổng Hợp Bán Hàng | No | Paper size not explicit; source marks portrait; current import resolves Letter | Not stored; current import 100%, 1 page wide, unlimited height | None | 135 rows |
| lan28 — KPI Toàn | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | 6 rows |
| lan28 — KPI Tùng | No | A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | 32 rows |
| lan28 — KPI Hiếu | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — KPI LY | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | Column G |
| lan28 — Thống Kê KPI | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — Bảng Lương | Yes | A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | Column C |
| lan28 — KPI NV 2< | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — TTNV | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — Tính ngày công trong năm | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — Giá cost1 | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |
| lan28 — Hàm cơ bàn | No | Not stored; current import A4 portrait | Not stored; current import 100%, 1 page wide, unlimited height | None | None |

Across lan11 and lan28 there are no defined print areas or print titles. Each listed sheet has zero manual row and column breaks. For lan05, the defined print area includes 1,072 rows while data ends at row 84. This can explain why LibreOffice emits only content-bearing pages, but it does not establish why the previous Excel export reported 14 pages; that comparison remains blocked without an Excel PDF from the same active-sheet scope.

The per-sheet facts are preserved from each pristine source in the temporary print workbook. lan05: one visible/selected sheet, `ExportData`; print area `A1:I1072`; Letter portrait; 56% scale; margins 0.75in left/right and 1in top/bottom; no manual row/column breaks, print titles, or hidden rows/columns. The XLSX has 1,072 row elements and 8,664 cell records (8,235 style-only), with populated records through row 84. The 3-page LibreOffice PDF contains only the populated table content. This points to a blank formatted print-range pagination difference, but the Excel active-sheet PDF needed to prove parity is blocked.
lan11: three visible sheets; only `Reyee` is active/selected. No print areas, manual breaks, print titles, or hidden rows/columns. `Reyee` has explicit A4 portrait setup; other sheets use default A4 setup in the live model. All sheets are 100% scale with default 1 page wide / unlimited tall. The new print copy keeps all three sheets and formulas in the package but hides `Giới thiệu` and `Ruijie` for rendering.
lan28: twelve visible sheets; only `Bảng Lương` is active/selected. No print areas, manual breaks, or print titles. The active sheet is A4 portrait at 100% and has hidden column C. Hidden rows are retained on `Tổng Hợp Bán Hàng` (135), `KPI Toàn` (6), and `KPI Tùng` (32); `KPI LY` also hides column G. Other page setup values remain as recorded by the existing live-app audit: first sheet uses Letter portrait; remaining sheets A4 portrait.

The 3T print scope change explains why lan11 and lan28 page counts dropped: prior LibreOffice output began on the first visible worksheet and included every visible sheet, while the saved Excel state selects `Reyee` or `Bảng Lương`. The historical Excel 965/36 values are workbook-wide exports, so the post-fix active-sheet counts 232/2 cannot be directly compared to them. lan05 has one sheet, so scope has no effect; its 14-vs-3 workbook-level difference remains unresolved and no page count was forced.

The print preview count and subsequent Print action use the same prepared PDF/session. `tests/test_print_pipeline.py` asserts that page-preview rendering receives the exact PDF path later sent to the printer; `tests/unit/sheet-print-preview.test.js` covers Sheet ribbon and UNO preview commands reaching the shared PDF flow.


### Verification and remaining limits

- `node tests/run-tests.js`: PASS, 2187/2187.
- `python -m unittest discover -s tests`: a concurrent run first failed 3/516 (one stale G7 test mock, fixed; two FODS→XLSX temp-file locks during concurrent LibreOffice use). A second run failed 1/516 on that stale mock. The corrected third run passed 516/516 in 321.125 seconds, but overlapped the Sheet audit. The isolated rerun started after a process snapshot showed no running LibreOffice process and passed 516/516 in 324.007 seconds.
- Focused Sheet source-scope regression: PASS, 1 test. Focused G7 Save As regression after updating the mock to return `(path, engine)`: PASS. Python compile check and `git diff --check`: PASS. The PowerShell audit parser check passed; the Office active-sheet audit itself did not.
- Fresh Office COM source/app parity is BLOCKED. The active-sheet Excel audit failed because the shared Excel automation returned a null `ActiveSheet`. Excel PID 17028 remained with ambiguous ownership; no Office process was killed, and no further COM call was made. Fresh 3T Office output for d12/d16 is blocked; historical PDFs predate restoration of pristine DOCX sources. PowerPoint source/app Office export and Excel active-sheet oracle PDFs/text were not captured. All blocked cells remain marked in the evidence table; historical workbook-wide 965/36 counts are not active-sheet oracles.
- Sheet cause/status: selection of all visible sheets explained lan11's 345 and lan28's 35 fallback totals; current saved selection now renders 232 and 2. Their corresponding Excel active-sheet counts remain blocked. lan05 has one sheet, and its count remains 3 against a historical Excel workbook export of 14. Its source uses print area `A1:I1072`, Letter portrait, 56% scale, no fit-to-page, manual breaks, print titles, or hidden rows/columns. Only rows through 84 contain values; LibreOffice omits the blank formatted tail. This establishes the remaining semantic difference to investigate, but Excel's active-sheet PDF is unavailable to prove its precise page mapping. No page count was forced. Before/after counts and all inspected setup facts are recorded above.
- Writer/Slides runtime preview totals were not separately exercised against a physical printer. The shared print-session tests verify the exact PDF that preview displays is the one Print sends; Sheet ribbon and UNO preview commands are separately covered.
- Build: NOT RUN. No build-system change was made.

KNOWN FAILURE / NEXT ACTION: lan05 fallback still differs from the historical Excel count; its active-sheet Office PDF is BLOCKED, so do not claim full parity. Commit this branch only after final diff and status review. Do not merge it into `main`.

## Owner Excel and desktop verification — 2026-10-01

This is the latest Sheet evidence and supersedes the earlier “Excel active-sheet oracle BLOCKED” entries and the table above for lan05/lan11/lan28. Those entries accurately record the earlier COM attempts, before a clean sequential retry succeeded. `git merge main` was completed first; current branch HEAD at this verification was merge commit `0c692761`. This branch has not been merged into `main`.

### Excel COM oracle and 3T desktop page counts

Each original was copied to a separate audit copy, SHA-256 checked, and opened `ReadOnly=True` in a newly created hidden Excel process. Calls ran sequentially. `ActiveSheet.ExportAsFixedFormat(0, pdf)` measured Excel's saved active-sheet default; `Workbook.ExportAsFixedFormat(0, pdf)` measured all sheets. `ActiveWindow.SelectedSheets.Count` returned zero in the hidden sessions, so the workbook's saved `activeTab` and each worksheet's `tabSelected` OOXML markers were independently read to confirm one saved selected tab in each source. Active sheets were non-null. The counts below are from the two PDF exports, not estimates based on used ranges.

| File | Saved active/selected tab | Excel (a) active sheets | Excel (b) whole workbook | 3T default active (Office) | 3T whole workbook (Office) | LO before scope fix (all visible) | LO after: active | LO after: whole |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| lan05.xlsx | ExportData | 14 | 14 | 14 | 14 | 3 | 3 | 3 |
| lan11.xlsx | Reyee | 306 | 965 | 306 | 965 | 345 | 232 | 345 |
| lan28.xlsx | Bảng Lương | 2 | 36 | 2 | 36 | 35 | 2 | 35 |

The 3T columns are live desktop results. The print dialog's default scope was “In các trang tính hiện hoạt”; switching to “In toàn bộ sổ làm việc” produced the whole-workbook totals above. The default PDF engine was Microsoft Office, matching Excel's native renderer. “In vùng chọn” was present in the dialog and enabled when a range was selected in lan05. PDF page totals were read through WebView2 CDP; no OS-level keyboard or mouse input was used. The app was started with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>` on isolated ports 9333–9336.

Audit copies and own Excel process IDs:

| File | Audit-copy SHA-256 | Excel PID |
|---|---|---:|
| lan05.xlsx | `03E47D2AFD3FBE415966F9EE912674C483B6CBA81721B3A0A8FD509472D15AE7` | 14916 |
| lan11.xlsx | `86B77146368271C0A35E4908958301EA6921A6816E056F7E58743FF5F1FCD8BE` | 20736 |
| lan28.xlsx | `4C45197145522DDB8C72B7D3BAD818661712EC5F430BE66D799168CD31463D3D` | 20912 |

The new Office default and whole-workbook results match Excel for all three files. LibreOffice remains an offline fallback and still paginates differently: the active-scope deltas are 11 pages for lan05, 74 for lan11, and 0 for lan28; whole-workbook deltas are 11, 620, and 1. No page totals were forced.

### Layout comparison

No source layout value was found to be lost or mismatched in the inspected print source. Therefore the Office path needed no scale, paper, orientation, print-area, break, or hidden-row/column correction for these measured files. The remaining LibreOffice differences are renderer pagination differences, not a measured source setting discrepancy.

- lan05 has one visible and selected sheet, `ExportData`; print area `$A$1:$I$1072`; Letter portrait; 56% scale; margins 0.75 in left/right and 1 in top/bottom; no manual page breaks, print titles, or hidden rows/columns. Data ends at row 84 although the print area spans 1,072 rows. LibreOffice emits 3 content pages, while Excel emits 14; that blank formatted tail is a plausible factor, not a proven full root-cause explanation.
- lan11 has three visible sheets, with only `Reyee` selected and active (`activeTab=1`); the active sheet uses A4 portrait, 100% scale, 1 page wide and unlimited height, with no print area, manual breaks, print titles, or hidden rows/columns. The whole-workbook output includes all three sheets.
- lan28 has twelve visible sheets, with only `Bảng Lương` selected and active (`activeTab=6`); it uses A4 portrait, 100% scale, no print area/manual breaks/print titles, and hidden column C. Other sheets retain their original hidden rows/columns: 135 rows on `Tổng Hợp Bán Hàng`, 6 on `KPI Toàn`, 32 on `KPI Tùng`, and column G on `KPI LY`. `Tổng Hợp Bán Hàng` uses Letter; the other sheets use A4 in the inspected live model.

### Updated state

- The three Excel active-sheet oracles and the 3T desktop default/whole-workbook comparisons are complete and match.
- LibreOffice fallback parity is still FAIL for lan05 and lan11 (active and whole-workbook scopes) and for lan28 whole-workbook scope; lan28 active scope matches at 2 pages. These are recorded as known engine differences.
- Earlier “BLOCKED”/“unknown” statements in this document describe the previous attempt only. They are superseded by this section for the three Excel files and 3T desktop print counts.
- The in-app Vietnamese Sheet help now gives the exact Tệp > In / Ctrl+P entry point and the three scope choices and basic steps in `platform/help/entries-sheet.js`.
- `node tests/run-tests.js`: PASS, 2223/2223 on this resumed worktree.
- `python -m unittest discover -s tests`: PASS, 536 tests in 386.632 seconds on an isolated run; no concurrent test/soffice command was running.
- `git diff --check`: PASS after the documentation/help changes. Build: NOT RUN.
