# Agent Handoff — G7 File Basics

TASK: G7 — blank startup and Office-style New/Open/Save/Save As/Print lifecycle
AGENT/ROLE: Codex — implementation and QA
BRANCH: `fix/file-basics-clean-start-codex`
WORKTREE: `E:\VNOffice-codex-file-basics`
OBJECTIVE: Start Writer, Sheet, and Slides with true blank documents; preserve document names, content, dirty state, and formats through file operations; verify printing against the actual preview and generated PDF.

FINDINGS:

- `main` was merged first, as requested. Merge commit: `6dd235b` (`Merge branch 'main' into fix/file-basics-clean-start-codex`). This branch has not been merged into `main`.
- At the task baseline, Sheet started with three demo sheets and Slides stored placeholder prompts as real text. Writer already started with an empty A4 page.
- G7 desktop probes use pywebview plus `evaluate_js`, copied fixtures from `E:\VN OFice\file test`, native dialog argument capture, UI Automation, and Office COM. The probes do not use SendKeys and delete their temporary fixture/output directory when they finish.
- The current probes pass blank startup, New, Open, Save, Save As PDF-copy, bad-file handling, recent paths, and all three dirty-close choices at the application level for all three apps.
- Print preview totals are Writer 2, Sheet 6, and Slides 17. Edge's native print dialog reports 1 page for each app, even after waiting for the app-preview total. Selecting Microsoft Print to PDF, Copies, and a custom page range works, but clicking Print does not open the “Save Print Output As” dialog. No print PDF was produced.
- Sheet's current Excel COM probe is blocked: Excel returns no readable workbook, consistent with an activation/Office-busy condition. The saved XLSX package contains the expected marker; the latest new-document save COM check passed. Writer and Slides COM checks passed.

IMPLEMENTATION SUMMARY:

- Earlier G7 commits on this branch implement blank startup, Sheet1/A1 defaults, blank first slide, document numbering, lifecycle state handling, recent-file handling, and tests replacing old sample-sheet assumptions.
- Writer print now uses the app's paginated preview DOM, its current page dimensions, and an afterprint-scoped body class. Sheet and Slides print styles explicitly isolate their print-only DOM, clear fixed shell clipping, and set page breaks for Slides.
- `scripts/test_g7_file_basics.py` automates the lifecycle, Office COM marker checks, real-file Recent paths, printer/copies/range controls, native page count, and print-to-PDF result. It records print-media diagnostics and waits for the expected preview page count.
- The shortcut consistency test now recognizes the existing shared `Ctrl+Shift+S` binding instead of incorrectly requiring three app-only bindings.
- No LibreOffice Core patch, dependency, or build-system change was made.

FILES CHANGED IN THE FINAL INCREMENT:

- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/writer.css`
- `apps/sheet/sheet.css`
- `apps/slides/slides-canvas.js`
- `apps/slides/slides.css`
- `scripts/test_g7_file_basics.py`
- `tests/unit/help-shortcut-consistency.test.js`
- `tests/unit/writer-print-preview.test.js`
- `tests/unit/slides-print-preview.test.js`
- `docs/HANDOFF-FILE-BASICS.md`

COMMANDS RUN:

- `git merge main`
- `python scripts/test_g7_file_basics.py --app sheet`
- `python scripts/test_g7_file_basics.py --app writer`
- `python scripts/test_g7_file_basics.py --app slides`
- `node tests/run-tests.js`
- `python -m py_compile scripts/test_g7_file_basics.py`
- `python -m unittest discover -s tests` (full-suite result recorded below from the earlier continuation)
- `git diff --check`

BUILD RESULT: NOT RUN. No build-system changes were made.

TEST RESULTS:

| Check | Result | Evidence |
|---|---|---|
| `node tests/run-tests.js` | PASS | 2,114/2,114 tests after the final JS/CSS changes |
| `python -m unittest discover -s tests` | PASS | 478 tests; `Ran 478 tests ... OK` in the earlier continuation. No Python application modules changed afterward. |
| `python -m py_compile scripts/test_g7_file_basics.py` | PASS | Syntax check after the final G7 harness edits |
| `git diff --check` | PASS | No whitespace errors |
| G7 desktop probe — Writer | FAIL | Lifecycle and Word COM checks pass; native dialog says 1 page for a 2-page app preview; no print PDF |
| G7 desktop probe — Sheet | FAIL | Lifecycle checks pass; app preview says 6 pages, Excel COM is blocked, native dialog says 1 page; no print PDF |
| G7 desktop probe — Slides | FAIL | Lifecycle and PowerPoint COM checks pass; model/preview says 17 pages, native dialog says 1 page; no print PDF |

Acceptance status (before = task-baseline behavior or verification; after = measured result on this branch):

| Item | Writer | Sheet | Slides | Before | After |
|---|---|---|---|---|---|
| 1. Startup blank, correct name/title, clean close | PASS | PASS | PASS | Writer blank; Sheet had 3 seeded demo sheets; Slides had real placeholder text | Empty A4 paragraph; one `Sheet1` with A1 selected; one empty slide. Vietnamese names/titles start at 1, dirty=false, clean close asks nothing |
| 2. File > New / Ctrl+N | PASS | PASS | PASS | Independent-window and numbering behavior not live-verified | New empty document is number 2, prior document unchanged; number 3 Save path also exercised |
| 3. Open filters/cancel/dirty replacement/bad file | PASS | PASS | PASS | Full dialog/lifecycle behavior not live-verified | Required filter extensions captured; cancel keeps state; dirty open Save/Cancel works; invalid file shows Vietnamese error and retains current document |
| 4. Ctrl+S, same-format in-place save, reopen/content | PASS | BLOCKED (Office COM) | PASS | Same-format round-trip not verified by Office COM | App save/reopen retains marker and clears dirty; Word/PowerPoint COM pass. Excel COM is blocked on current host; package marker is present |
| 5. Save As, PDF export copy, overwrite/name switch | NOT RUN (overwrite/name switch) | NOT RUN (overwrite/name switch) | NOT RUN (overwrite/name switch) | Not verified | Current name/type/folder suggestion and PDF export-copy behavior pass. Choosing a new Office filename/format, overwrite confirmation, and tab/title switch are not covered |
| 6. Dirty close Save / Don't Save / Cancel | PASS (document close) | PASS (UI flow; saved-content COM blocked) | PASS (document close) | Prompt choices not live-verified | All three document-close choices work in UI. App quit path was not separately exercised |
| 7. Print preview, controls, PDF page count/content | FAIL | FAIL | FAIL | Correct native pagination/PDF output not verified | App preview totals are 2/6/17; native dialog reports 1 page each. Printer, copies, and range controls are selectable. No “Save Print Output As” dialog or PDF appears |
| 8. Recent files contain real files only | PASS | PASS | PASS | Unsaved-document entries were possible | Fresh-profile probes verify each recent path points to an existing file |

KNOWN FAILURES:

- G7 is **not complete**. Acceptance item 7 fails for all apps: native pagination disagrees with app preview, and Microsoft Print to PDF produces no output file.
- Excel COM verification is `BLOCKED` on this host for opened/in-place and dirty-close files; Office reports no readable workbook while the XLSX package contains the expected marker. New-document XLSX COM verification passed on the latest probe.
- Acceptance item 5 is only partially checked. Alternate Office-format Save As, overwrite confirmation, and tab/title switching were not exercised by the automated probe.
- Legacy `.doc`/`.xls`/`.ppt` same-format round-trips were not tested. Live COM checks used `.docx`/`.xlsx`/`.pptx` fixtures.
- The print diagnostic runs from `beforeprint`, before WebView reports `matchMedia('print') === true`, so it does not establish the final computed print styles.

RISKS:

- Do not mark G7 complete until native print pagination and actual PDF page/content checks pass for all three apps.
- Do not treat Excel COM `BLOCKED` as a save pass; rerun after the Office activation/busy condition is cleared.
- The desktop probe needs Windows, pywebview, Microsoft Print to PDF, and Office COM for independent saved-content verification.

DEPENDENCIES/BLOCKERS: Native WebView/print-to-PDF behavior remains unresolved; Excel COM is intermittently blocked by the Office host. No source dependency was added.

CORE PATCH ID (if any): None.

NEXT ACTION:

1. Diagnose why the WebView native print dialog sees one page when the app preview has 2/6/17; verify print CSS in the actual WebView print renderer and print each page.
2. Make Microsoft Print to PDF open its save dialog and verify PDF page count and marker content.
3. Add/execute native Save As overwrite and rename/format-switch coverage, then rerun the complete G7 desktop probe and both requested test gates.
