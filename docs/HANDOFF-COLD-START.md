# G12 Cold Start Handoff

Date: 2026-10-01  
Branch: `fix/file-basics-clean-start-codex`  
Main merged through `9a1e7ff95a6ebefc3777b396a25c88c40d06c2f5` (Writer equation feature included); the earlier Sheet conflict resolution is in `192826b8`.

## Outcome

The blank-document path now starts LibreOffice after the first trusted user input. Error reporting, update services, print integration, and optional app modules are deferred from the initial blank-document path. Launches with a file still start the LibreOffice worker alongside the window so file loading can begin immediately. The static UI server remains in the Python process.

The latest post-merge source-layout runs reached the first editor key in 2.582 s (3T Doc), 2.454 s (3T Sheet), and 2.071 s (3T Slide); all three were below the 3-second target. The pilot-package measurements below are historical: that payload was built from `192826b8`, before the current equation merge. Its result remains **MIXED** because the first 3T Doc run missed the target.

The earlier G12 source and pilot runs resolved the repository DOCX/XLSX/PPTX samples in 14.84–23.73 s, slower than the few-second Office comparison target. Those file-open times were not remeasured after the current merge. The exact requested `d03.docx` and `lan25.xlsx` paths are absent. The equation merge adds DOCX equation handling; it does not change the Writer or Sheet import parsers.

## What changed

- `main.py` defers error-reporter and updater imports/services until after the first paint, lazily imports print and Office COM modules, and exposes `start_document_engine()` for first use. Closing a blank document no longer constructs the print pipeline.
- `index.html` schedules the document engine after the first trusted pointer, keyboard, paste, or drop event. It yields 250 ms so the initial input can complete first.
- The shared shell loads AI services, common dialogs, and the About dialog on first use. Voice recognition remains eagerly available so its browser permission request stays within the user gesture.
- Sheet and Slides no longer eagerly initialize optional document features at startup. Sheet charts, PivotTable tools, format/style dialogs, Slides charts, and date/symbol dialogs load on first use with a brief loading/error state.
- Writer equation dialogs and the equation editor remain lazy-loaded. DOCX equation import produces MathML spans during the open pipeline, so existing equations render without loading the editor module.
- The CDP probe records startup milestones and checks editability with `Input.dispatchMouseEvent` and `Input.dispatchKeyEvent`. The single-instance harness waits for `document_open_complete` and closes through CDP `Runtime.evaluate`.
- No Writer or Sheet import parser was changed. No company documents were copied or committed. No runtime dependency was added.

Mail-merge and equation-editor implementation files are not imported by the blank-document path. Existing DOCX equations render from MathML produced during file open. Print-preview rendering remains in the app controller modules; the Python print pipeline and Office COM integration are deferred until a print operation.

## Measurement method

The installed-like runs launched `pythonw -s -E main.py --app=<writer|sheet|slides>` with a fresh local app-data directory, a per-run `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>`, and `scripts/measure-cold-start.ps1`. Node 20 connected to WebView2 with `node --experimental-websocket`; all observed state and test input used CDP.

The historical package-layout runs used the pilot payload at `E:\VNOffice-cold-start-build\VNOffice-0.9.0-g12-192826b8`, built by `scripts/build-pilot.ps1` from commit `192826b8`, with bundled Python and LibreOffice. It predates the current equation merge and is a pilot payload, not a generated Setup.exe installer.

Every time below is elapsed from process start in milliseconds. R is the first Python startup trace point after core standard-library imports, I is Python imports complete (including pywebview), S is static server ready, W is pywebview window created, WV is WebView2 ready, RI is ribbon interactive, P is first blank-document paint, E is editable surface ready, and K is the first CDP key reaching the editor. The process_start to I interval includes Python runtime startup and imports. UNO, LO start requested, LO worker ready, and Deferred services record those respective milestones. The blank probe inserts and removes a temporary x through CDP only.

## Installed-like blank launch timeline (remeasured after the equation merge)

| App | R | I | S | W | WV | RI | P | E | K | Blank visible + editable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3T Doc | 567.5 | 638.0 | 650.7 | 654.1 | 2,256.7 | 2,464.1 | 2,482.7 | 2,485.3 | 2,582.4 | PASS |
| 3T Sheet | 297.1 | 408.3 | 426.8 | 430.3 | 1,989.2 | 2,331.3 | 2,374.4 | 2,377.5 | 2,454.1 | PASS |
| 3T Slide | 250.5 | 336.2 | 349.7 | 353.2 | 1,736.1 | 1,965.5 | 2,001.7 | 2,007.8 | 2,071.3 | PASS |

| App | UNO bridge ready | LO start requested | LO worker ready | Deferred services ready |
|---|---:|---:|---:|---:|
| 3T Doc | 2,549.6 | 2,799.4 | 28,452.8 | 2,605.6 |
| 3T Sheet | 2,395.0 | 2,691.6 | 23,753.4 | 2,456.8 |
| 3T Slide | 2,020.1 | 2,326.7 | 23,320.2 | 2,088.1 |

The blank UI became usable before the LibreOffice worker was ready in all three runs. File operations that need the worker start it on demand; an explicit file launch still starts it in parallel with the UI. All three remeasured source-layout launches met the 3-second first-key target.

## Historical pilot package-layout blank launch timeline (built from `192826b8`, before the equation merge)

| App / first measurement | R | I | S | W | WV | RI | P | E | K | Target |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3T Doc | 3,130.1 | 3,769.5 | 3,817.5 | 3,819.5 | 6,121.1 | 6,495.2 | 6,504.1 | 6,505.7 | 6,582.1 | FAIL |
| 3T Sheet | 136.4 | 187.3 | 199.2 | 201.2 | 1,153.5 | 1,521.9 | 1,540.3 | 1,541.0 | 1,594.8 | PASS |
| 3T Slide | 141.3 | 192.0 | 200.9 | 202.7 | 1,148.2 | 1,330.9 | 1,356.3 | 1,356.9 | 1,409.1 | PASS |

An isolated repeat of packaged 3T Doc used another fresh app-data directory and reached the first editor key at 2,779.5 ms (R/I/S/W/WV/RI/P/E = 454.5/511.1/521.7/524.6/2,428.5/2,621.6/2,641.7/2,653.1 ms); its LibreOffice worker was ready at 22,386.3 ms. This repeat passed, but the first fresh-payload 3T Doc run failed the 3-second target, so the package result remains mixed.

| App | UNO bridge ready | LO start requested | LO worker ready | Deferred services ready |
|---|---:|---:|---:|---:|
| 3T Doc | 6,521.1 | 6,860.7 | 37,691.2 | 6,981.3 |
| 3T Sheet | 1,553.0 | 1,831.3 | 15,474.8 | 1,621.9 |
| 3T Slide | 1,368.7 | 1,652.9 | 16,247.0 | 1,426.2 |

The earlier WIP package runs are historical and used a payload built before this merge; they are not substituted for these fresh-payload results. One old staged-payload Sheet run timed out before `renderer_entry`; the cause was not established.

## Before and after file-open timings

These are prior G12 measurements; file-open timings were not rerun after the current merge.

The requested `test\landocx\d03.docx` and `test\lan\lan25.xlsx` are not present in this checkout (`Test-Path` returned false for both). Those exact measurements are BLOCKED by missing fixtures. The comparison uses repository-owned fixtures only, including `tests/fixtures/real-office-samples/sample-slides.pptx`. Prior times are elapsed to `initial_file_open_resolved`; all six prior source/pilot measurements used the CDP startup probe.

| Type and repository fixture | Prior WIP baseline | Prior staged payload | Prior source | Pre-merge pilot payload |
|---|---:|---:|---:|
| DOCX — `tests/fixtures/real-office-samples/sample-writer.docx` | 18,116 | 23,100 | 16,354.9 | 23,730.7 |
| XLSX — `tests/fixtures/real-office-samples/sample-sheet.xlsx` | 23,451 | 16,212 | 14,839.0 | 20,402.5 |
| PPTX — `tests/fixtures/real-office-samples/sample-slides.pptx` | 24,399 | 36,450 | 19,612.5 | 22,290.7 |

Prior WIP timings were not collected under a controlled, identical load/profile. Historical sample-file opens took 14.84–23.73 seconds, so the few-second Word/Excel/PowerPoint comparison target was not met in those runs. The UI paints before file resolution; the LibreOffice worker starts alongside the window for an explicit file launch. Import-parser changes remain with the separate open-speed work. The pre-merge pilot payload was built, but a formal installer executable was not.

## Test results

| Check | Result | Details |
|---|---|---|
| `node tests/run-tests.js` | **FAIL (2 known LibreOffice cases)** | Latest run: 2,246/2,248 PASS. Failures: Sheet Pivot save, DataPilot through FODS -> XLSX -> FODS; FODS -> XLSX -> FODS preserving row/column height, width, and visibility. The third known FODS -> XLSX case passed. The final full run had no headless failures. |
| Isolated HTML/headless smoke | **PASS** | 21/21, including Writer mount and suite switcher. Two earlier full-suite runs had transient headless timing failures; the isolated run and latest full run passed those checks. |
| `python -m unittest discover -s tests` | **PASS** | 539 tests in 535.761 seconds; exit code 0. |
| `python scripts/test_single_instance_live.py` | **PASS** | Three Writer document windows shared one process and closed through CDP; killed-owner recovery passed. Cold open 18,901 ms; warm opens 774/973 ms; recovery open 5,848 ms. |
| Writer/Sheet editing CDP checks | **PASS** | Writer Enter/Tab/Ctrl+X/Ctrl+V and Tab-character checks passed. Sheet keyboard entry, A1-to-D1 cut/paste, formula result A6=15, and point-mode formula `=A1+A2` (B1=3) passed. |
| Equation CDP checks | **PASS** | On a fresh 3T Doc, Alt+= opened the lazy editor and Insert created visible MathML. On another fresh 3T Doc, Insert > Equation opened on first use and inserted visible MathML. A DOCX containing a fraction and a square-root equation opened as two visible MathML objects. |
| Source blank launches after merge | **PASS** | First editor key: 2,582.4 ms (3T Doc), 2,454.1 ms (3T Sheet), 2,071.3 ms (3T Slide). |
| Historical pilot package blank launches | **MIXED** | The pre-merge pilot's first 3T Doc run was 6,582.1 ms; its repeat was 2,779.5 ms, Sheet 1,594.8 ms, and Slide 1,409.1 ms. The pilot was not rebuilt after this merge. |
| Historical repository sample DOCX/XLSX/PPTX opens | **NOT RERUN** | Earlier timings were 14.84–23.73 seconds; current merge validation did not repeat the file-open timing comparison. |
| Target `d03.docx` / `lan25.xlsx` | **BLOCKED** | Neither path exists in this worktree. |
| Formal packaged installer executable | **NOT RUN** | No Setup.exe installer was generated for this merge. |

## Rollback and follow-up

This branch has not been merged into `main`. If a regression is found, preserve the merge ancestry and pre-existing WIP baseline when reverting G12 changes. File-open parser optimization remains with the separate open-speed work and was intentionally left untouched here.


## Agent handoff

- **TASK:** G12 — cold start and merge with Writer equation support
- **AGENT/ROLE:** Codex, primary coding agent
- **BRANCH:** `fix/file-basics-clean-start-codex`
- **WORKTREE:** `E:\VNOffice-codex-file-basics`
- **OBJECTIVE:** Preserve deferred startup while merging `main` and keep Writer equation editing and DOCX rendering functional.
- **FINDINGS:** Latest source first-key times were 2,582.4 ms (Writer), 2,454.1 ms (Sheet), and 2,071.3 ms (Slides). Alt+= and Insert > Equation both worked on first use in fresh documents. Imported DOCX fraction/root equations rendered as MathML.
- **IMPLEMENTATION SUMMARY:** Resolved `writer-adapter.js` and `insert-dialogs.js` to keep lazy startup and lazy-load the equation editor/dialogs. DOCX equation conversion and OMML save support from `main` remain present. No LibreOffice Core patch was made.
- **FILES CHANGED:** The `main` merge includes `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/insert-dialogs.js`, equation implementation/OOXML files, help/i18n, and equation tests. `docs/HANDOFF-COLD-START.md` records latest validation.
- **COMMANDS RUN:** `git merge main`; `node tests/run-tests.js`; isolated `runHtmlSmokeTests()`; `python -m unittest discover -s tests`; `python scripts/test_single_instance_live.py`; supplied Writer/Sheet CDP scripts; equation insertion/import CDP checks; `scripts/measure-cold-start.ps1` for Writer, Sheet, and Slides.
- **TEST RESULTS:** Node **FAIL** (2,246/2,248; only the two named LibreOffice FODS -> XLSX cases failed); isolated HTML smoke 21/21 PASS; Python 539 PASS; live single-instance PASS; requested CDP checks PASS.
- **KNOWN LIMITATIONS:** The earlier G12 pilot-package timing is from a payload built before this merge. Target files `d03.docx` and `lan25.xlsx` are absent, and the installer was not rebuilt.
- **RISKS:** LibreOffice conversion tests can fail under machine load/profile contention. The final full Node run had only the two FODS conversion failures; transient headless failures from earlier full runs passed in isolation and on the final run.
- **DEPENDENCIES/BLOCKERS:** No external dependency was added. The target file-open fixtures remain unavailable.
- **CORE PATCH ID (if any):** N/A.
- **NEXT ACTION:** Keep this branch unmerged into `main` pending review; rebuild the pilot package if post-merge package timing is required.
