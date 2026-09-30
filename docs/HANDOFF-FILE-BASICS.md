# Agent Handoff

TASK: G7 — blank startup and Office-style New/Open/Save/Save As/Print lifecycle
AGENT/ROLE: Codex — implementation and QA
BRANCH: `fix/file-basics-clean-start-codex`
WORKTREE: `E:\VNOffice-codex-file-basics`
OBJECTIVE: Keep Writer, Sheet, and Slides documents clean at startup and preserve names, formats, content, and dirty state through file operations. Verify G9 printing and PDF export using the generated document, not the screen preview.

FINDINGS:

- Merged `main` into this branch at merge commit `9c7e4c0`; this branch has not been merged back into `main`.
- Conflict resolutions keep G9's print/save pipeline. Print and Export PDF use the current document Save pipeline and LibreOffice PDF conversion; there is no `window.print()` implementation in the app path.
- `main.py` retains both `_notify_document_open_progress` and `_notify_sheet_open_progress`, preserves G7 window close handling, and shuts down the persistent soffice worker when the app exits for update.
- The G7 desktop probe copies fixtures from `E:\VN OFice\file test`, drives pywebview without SendKeys, captures the G9 PDF outputs, and stores per-app JSON reports under `%TEMP%\vno-g7-final-report`.
- Print results: blank documents exported/printed as one page in all three apps. Writer `d03.docx` exported and printed as 3 pages, matching Word's 3-page count. Sheet `lan25.xlsx` exported and printed as 7 pages. Slides' 17-slide fixture exported and printed as 17 pages. The Sheet screen preview reported 6 pages; the G9 print model and both generated PDFs reported 7, and the screen-preview count was not used as the document page-count oracle.
- Save As passed in the desktop probes: Writer DOCX→ODT, Sheet XLSX→CSV and ODS, Slides PPTX→ODP; PDF Save As creates a copy without changing the open document. The Sheet probe adds a temporary second sheet and confirms the Vietnamese warning that CSV saves only the active sheet. Tab, title, window title, path, and clean state switch to the selected Office format.
- Windows Forms `SaveFileDialog.OverwritePrompt` default was checked as `True`. Unit tests cover accepted writes to existing targets and cancellation preserving an existing target across the five requested format cases. The native overwrite prompt itself was not driven with desktop UI automation.
- Writer and Slides Office COM marker checks passed. Excel COM was retried with 2s/4s backoff; the results remained mixed: replacement and dirty-close checks were blocked by Excel's unreadable-workbook/activation condition; in-place and new-document checks ran but reported marker-not-found although the XLSX package contained the marker. These are not counted as passes.

IMPLEMENTATION SUMMARY:

- Preserved the G7 clean-start, lifecycle, recent-file, and close handling while resolving the main merge in favor of G9 printing.
- Updated `scripts/test_g7_file_basics.py` to use G9 Print and Export PDF and count generated PDF pages. It compares Writer's fixture PDFs to Word's page count and verifies blank output is one page.
- Completed Save As format conversion, PDF-copy behavior, native filename stem/filter selection, CSV multi-sheet confirmation, and tab/title/path changes. Added tests for Writer DOCX→ODT/PDF, Sheet XLSX→ODS/CSV, Slides PPTX→ODP, and overwrite accept/cancel behavior.
- Added Vietnamese in-app Save As guidance for Writer, Sheet, and Slides.
- No LibreOffice Core patch, dependency, or build-system change was made.

FILES CHANGED:

- G7 direct changes: `main.py`, `scripts/test_g7_file_basics.py`, `tests/test_g7_save_as_dialog.py`, `tests/unit/blank-default.test.js`, `tests/unit/sheet-print-titles-grid-selection.test.js`, and the Writer/Sheet/Slides help entries.
- Merge-conflict resolutions include `adapters/libreoffice/common/uno-bridge.js`, `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/writer.css`, and the Writer/Slides print-preview unit tests. G9's shared print pipeline and associated main changes are included from the merge.
- Full merge/change inventory is available from `git show --stat HEAD` and the branch diff.

COMMANDS RUN:

- `git merge --no-edit main`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `python -m unittest discover -s tests -p test_g7_save_as_dialog.py`
- `python -m py_compile main.py scripts/test_g7_file_basics.py tests/test_g7_save_as_dialog.py`
- `python scripts/test_g7_file_basics.py --app writer`
- `python scripts/test_g7_file_basics.py --app sheet`
- `python scripts/test_g7_file_basics.py --app slides`
- Windows Forms `SaveFileDialog().OverwritePrompt` property check
- `git diff --check`

BUILD RESULT: NOT RUN. No build-system changes were made.

TEST RESULTS:

| Check | Result | Evidence |
|---|---|---|
| `node tests/run-tests.js` | PASS | 2,177/2,177 tests; 0 failures. |
| `python -m unittest discover -s tests` | PASS | 497 tests; `OK`. Updater end-to-end checks passed. FODS→XLSX round-trip tests passed in this serial run. |
| Focused G7 Save As unit tests | PASS | 11 tests after the final overwrite-target assertion. |
| Python syntax check | PASS | `main.py`, G7 probe, and Save As tests compiled. |
| G7 desktop probe — Writer | PASS | All lifecycle/Save As checks passed; Word and generated PDFs report 3 fixture pages, blank output is 1 page. |
| G7 desktop probe — Sheet | FAIL | App lifecycle and Save As checks passed. Excel COM had two marker-not-found results and two blocked results; see Findings. Print/export PDFs both have 7 pages; blank output is 1. |
| G7 desktop probe — Slides | PASS | All lifecycle/Save As checks and PowerPoint COM passed; generated PDFs have 17 pages, blank output is 1. |
| `git diff --check` | PASS | No whitespace errors. |

ACCEPTANCE STATUS:

| Item | Writer | Sheet | Slides | Evidence |
|---|---|---|---|---|
| 1. Blank startup, correct name/title, clean close | PASS | PASS | PASS | Empty Writer page, one clean Sheet1/A1, and one empty slide; clean close asks no save question. |
| 2. File > New / Ctrl+N | PASS | PASS | PASS | New document opens cleanly and Save As creates a numbered file. |
| 3. Open filters/cancel/dirty replacement/bad file | PASS | PASS | PASS | Supported filters captured; cancel and dirty-open choices preserve the expected state; bad-file error keeps the open document. |
| 4. Ctrl+S, in-place save, reopen/content | PASS | FAIL | PASS | Writer and Slides markers verified by Office COM. Sheet app round-trip and package markers exist, but Excel COM returned marker-not-found on in-place/new saves and was blocked on replacement. |
| 5. Save As, PDF copy, overwrite/name/type switch | PASS | PASS | PASS | Alternate formats, PDF-copy behavior, naming/title/path switch, existing-target accept/cancel handling, and multi-sheet CSV warning verified. |
| 6. Dirty close Save / Don't Save / Cancel | PASS | BLOCKED | PASS | UI choices passed. Writer/Slides saved content verified; Excel COM could not independently verify the Sheet dirty-close target after retries. |
| 7. Print preview controls and generated PDF page count | PASS | PASS | PASS | Blank PDFs are 1 page; Writer `d03.docx` PDFs are 3 pages, equal to Word; Sheet PDFs are 7 pages; Slides PDFs are 17 pages. Print and export use G9's generated document. |
| 8. Recent files contain real paths | PASS | PASS | PASS | Probe checks recent entries point to existing files. |

KNOWN FAILURES:

- Sheet's desktop probe exits FAIL due to mixed Excel COM results: replacement save is BLOCKED, in-place save is FAIL (`COM_FAIL marker not found`), dirty-close save is BLOCKED, and new-document save is FAIL (`COM_FAIL marker not found`). For the marker-not-found cases, the XLSX package's `xl/sharedStrings.xml` contains the marker. Do not treat these Office COM results as a save pass.
- Sheet's screen preview displayed 6 pages while the G9 document print model and the generated Print/Export PDFs reported 7. G7 item 7 measures the G9 generated-document/PDF count, not the screen preview.
- The native overwrite dialog was not driven end-to-end; its WinForms default is enabled and accept/cancel branches are covered by unit tests.

RISKS:

- Excel COM must be rerun after the Office activation/busy condition clears. The desktop app's Sheet Save/reopen checks and package markers passed, but independent Office COM verification remains incomplete.
- No build was run.

DEPENDENCIES/BLOCKERS: Excel COM is intermittent on this Windows host. No source dependency was added.

CORE PATCH ID (if any): None.

NEXT ACTION: Rerun Excel COM verification when the Office host is available without competing Office clients. Keep this branch unmerged until that independent verification is resolved or explicitly accepted as blocked.
