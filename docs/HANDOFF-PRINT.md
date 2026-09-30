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
- Each PDF job writes an ASCII PowerShell 5.1 worker to a private temporary directory and runs it in a dedicated `-STA` process. The worker creates Office through `New-Object -ComObject`, rejects a process that existed before the job, disables UI/alerts, opens the Save-pipeline `.docx`/`.xlsx`/`.pptx` read-only, retries busy COM calls up to five times, and closes/quits in `finally`. The 300-second parent timeout kills the worker and only the recorded new Office PID.
- Print preview/printing and Export PDF both build the native source through the existing source-aware Save path. The selected Office/WPS engine exports the PDF; exceptions and empty PDFs fall back silently to the existing LibreOffice converter. The dialog reports the renderer that actually produced its PDF and defaults the Office/WPS option on when registration is available.
- Vietnamese Help entries now describe where Print and Export PDF are accessed and the actual Office/WPS/LibreOffice behavior for Writer, Sheet, and Slides.
- The real-app page audit now accepts `.pptx`, preserves the Print PDF for page-1 comparison, and can simulate missing Office/WPS in an isolated worker with `VN_PRINT_USE_OFFICE=0`.

DEVELOPMENT VALIDATION:
- Full Node suite: PASS, 2163/2163 on the final dialog implementation. The FODS round-trip sections ran without another soffice worker at launch.
- Full Python discovery: PASS, 494 tests in 316.318 seconds. The full run started without another soffice worker and includes the timeout-ownership regression.
- `python -m unittest tests.test_print_office_com -v`: PASS, 8/8, including simulated Office-absent fallback and confirmation that timeout cleanup targets only a PID marked as owned by the job.
- `node --test tests/unit/print-dialog.test.js`: PASS, 4/4 after the option-visibility fix.
- `python -m py_compile scripts/layout-audit/_print_page_audit.py platform/print/office_com.py main.py`: PASS.
- Direct Office exports and PDFium page-1 text extraction were run for d03, d12, d24, d01, d16, d20, and legacy01.doc. The per-file parity results are in the G10 live-verification section below.
- Windows registry detection on this machine finds Microsoft Word, Excel, and PowerPoint; WPS is not registered.

LIVE VERIFICATION (IN PROGRESS): Office-backed Print and Export PDF both ran successfully for d03 (1 page), d12 (3), d24 (16), d01 (19), d16 (8), d20 (3), and legacy01.doc (5). Print and Export PDF page counts match direct Microsoft Word exports of the originals for all measured files. LibreOffice PDFium text extraction confirms page-1 text matches for d03, d24, d01, d20, and legacy01; d12 and d16 page-1 text differs because content crosses the first-page boundary differently after the shared Save conversion. A focused pristine-source OOXML restoration follow-up is planned below. lan05.xlsx fell back to LibreOffice after Excel COM returned RPC_E_CALL_REJECTED; direct Excel workbook export and lan11/lan28 active-sheet oracle checks remain pending a serial Office window. The real PPTX, simulated Office-absent app route, and live Sheet fallback audit are also pending.

SHEET FALLBACK INVESTIGATION:
- The G9 baseline remains lan05 14 Excel pages vs 3 LibreOffice pages, lan11 965 vs 357, and lan28 36 vs 35.
- The original lan05 workbook has one visible sheet, print area `A1:I1072`, and source page setup scale 56%. The converted source retains that print area; restoring its original page-setup/margins alone previously left the LibreOffice PDF at 3 pages. The discrepancy is therefore not caused by choosing the wrong active tab on lan05.
- lan11 has three sheets with `Reyee` active (zero-based `activeTab=1`); lan28 has twelve sheets with `Bảng Lương` active (`activeTab=6`). The existing Save route preserves active-sheet metadata and per-sheet print areas. No active-sheet-only change has been made because the Excel active-sheet export count has not yet been measured against the workbook-level `ExportAsFixedFormat` baseline, and Print and Export PDF must keep their intended sheet scope.
- Current LibreOffice fallback measurement: lan05 remains 3 pages (baseline Excel workbook export 14); lan11 and lan28 have not yet been re-audited in this G10 run. The G9 LibreOffice counts were 357 and 35 against workbook-level Excel counts 965 and 36. Further active-sheet and scaling comparison is pending the serial Excel oracle run.

REFERENCE ACCESS: `docs/REFERENCE-3T-READER.md` was read. The exact requested sibling-project `office_com.py` UNC path could not be opened from this machine (`\\192.168.1.8\d\PDF\3T_Reader_Phase1_Win\packages\document_core\office_com.py` did not resolve). The restricted `??ng k? bq` folder was not opened.

CURRENT GATE: Node and Python test gates PASS on the current implementation. G10 live verification is IN PROGRESS; d12/d16 first-page text and the required Sheet/Slides/fallback checks remain open. Do not mark the overall parity gate PASS yet.

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
