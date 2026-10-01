# G12 Cold Start Handoff

Date: 2026-10-01  
Branch: `fix/file-basics-clean-start-codex`  
Main merged at `ca448272`; Sheet merge conflict resolved in `192826b8` (`Merge main into cold-start worktree`).

## Outcome

The blank-document path now starts LibreOffice after the first trusted user input. Error reporting, update services, print integration, and optional app modules are deferred from the initial blank-document path. Launches with a file still start the LibreOffice worker alongside the window so file loading can begin immediately. The static UI server remains in the Python process.

After merging `main`, source-layout runs reached the first editor key in 2.82 s (3T Doc), 1.90 s (3T Sheet), and 1.66 s (3T Slide). A fresh pilot package built from `192826b8` reached 6.58 s for its first 3T Doc launch, then 2.78 s on an isolated repeat; 3T Sheet and 3T Slide reached 1.59 s and 1.41 s. The packaged result remains **MIXED** because the first 3T Doc run missed the 3-second target.

First-file open remains slower than Word/Excel/PowerPoint for the available repository fixtures. Current source runs resolved the sample DOCX/XLSX/PPTX in 16.35/14.84/19.61 s; the fresh pilot payload took 23.73/20.40/22.29 s. The exact requested `d03.docx` and `lan25.xlsx` paths are absent. This work does not change the Writer or Sheet import parsers, per the task boundary.

## What changed

- `main.py` defers error-reporter and updater imports/services until after the first paint, lazily imports print and Office COM modules, and exposes `start_document_engine()` for first use. Closing a blank document no longer constructs the print pipeline.
- `index.html` schedules the document engine after the first trusted pointer, keyboard, paste, or drop event. It yields 250 ms so the initial input can complete first.
- The shared shell loads AI services, common dialogs, and the About dialog on first use. Voice recognition remains eagerly available so its browser permission request stays within the user gesture.
- Sheet and Slides no longer eagerly initialize optional document features at startup. Sheet charts, PivotTable tools, format/style dialogs, Slides charts, and date/symbol dialogs load on first use with a brief loading/error state.
- The CDP probe records startup milestones and checks editability with `Input.dispatchMouseEvent` and `Input.dispatchKeyEvent`. The single-instance harness waits for `document_open_complete` and closes through CDP `Runtime.evaluate`.
- No Writer or Sheet import parser was changed. No company documents were copied or committed. No runtime dependency was added.

Mail-merge and equation implementation files are not imported by the blank-document path. Print-preview rendering remains in the app controller modules; the Python print pipeline and Office COM integration are deferred until a print operation.

## Measurement method

The installed-like runs launched `pythonw -s -E main.py --app=<writer|sheet|slides>` with a fresh local app-data directory, a per-run `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>`, and `scripts/measure-cold-start.ps1`. Node 20 connected to WebView2 with `node --experimental-websocket`; all observed state and test input used CDP.

The merged-branch package-layout runs used the fresh pilot payload at `E:\VNOffice-cold-start-build\VNOffice-0.9.0-g12-192826b8`, built by `scripts/build-pilot.ps1` from commit `192826b8`, with bundled Python and LibreOffice. This is a pilot package payload, not a generated Setup.exe installer.

Every time below is elapsed from process start in milliseconds. R is the first Python startup trace point after core standard-library imports, I is Python imports complete (including pywebview), S is static server ready, W is pywebview window created, WV is WebView2 ready, RI is ribbon interactive, P is first blank-document paint, E is editable surface ready, and K is the first CDP key reaching the editor. The process_start to I interval includes Python runtime startup and imports. UNO, LO start requested, LO worker ready, and Deferred services record those respective milestones. The blank probe inserts and removes a temporary x through CDP only.

## Installed-like blank launch timeline

| App | R | I | S | W | WV | RI | P | E | K | Blank visible + editable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3T Doc | 841.5 | 1,088.5 | 1,108.1 | 1,110.2 | 2,408.2 | 2,685.2 | 2,699.0 | 2,703.0 | 2,823.7 | PASS |
| 3T Sheet | 194.0 | 256.8 | 269.9 | 272.6 | 1,499.0 | 1,786.9 | 1,807.5 | 1,810.4 | 1,895.9 | PASS |
| 3T Slide | 179.0 | 240.6 | 251.1 | 253.2 | 1,380.6 | 1,559.8 | 1,598.0 | 1,606.0 | 1,661.1 | PASS |

| App | UNO bridge ready | LO start requested | LO worker ready | Deferred services ready |
|---|---:|---:|---:|---:|
| 3T Doc | 2,736.9 | 3,055.6 | 19,375.1 | 2,890.9 |
| 3T Sheet | 1,831.4 | 2,114.7 | 19,215.9 | 1,925.1 |
| 3T Slide | 1,620.9 | 1,905.1 | 16,882.6 | 1,679.2 |

The blank UI became usable before the LibreOffice worker was ready in each run. File operations that need the worker start it on demand; an explicit file launch still starts it in parallel with the UI. All three source-layout launches met the 3-second first-key target.

## Fresh pilot package-layout blank launch timeline

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

The requested `test\landocx\d03.docx` and `test\lan\lan25.xlsx` are not present in this checkout (`Test-Path` returned false for both). Those exact measurements are BLOCKED by missing fixtures. The comparison uses repository-owned fixtures only, including `tests/fixtures/real-office-samples/sample-slides.pptx`. Current times are elapsed to `initial_file_open_resolved`; all six current source/package measurements used the CDP startup probe.

| Type and repository fixture | Prior WIP baseline | Prior staged payload | Current source | Fresh pilot payload |
|---|---:|---:|---:|
| DOCX — `tests/fixtures/real-office-samples/sample-writer.docx` | 18,116 | 23,100 | 16,354.9 | 23,730.7 |
| XLSX — `tests/fixtures/real-office-samples/sample-sheet.xlsx` | 23,451 | 16,212 | 14,839.0 | 20,402.5 |
| PPTX — `tests/fixtures/real-office-samples/sample-slides.pptx` | 24,399 | 36,450 | 19,612.5 | 22,290.7 |

Prior WIP timings were not collected under a controlled, identical load/profile. Current sample-file opens take 14.84–23.73 seconds, so the few-second Word/Excel/PowerPoint comparison target is not met. The UI paints before file resolution; the LibreOffice worker starts alongside the window for an explicit file launch. Import-parser changes remain with the separate open-speed work. The fresh pilot payload was built, but a formal installer executable was not.

## Test results

| Check | Result | Details |
|---|---|---|
| `node tests/run-tests.js` | **PASS** | 2,242/2,242. FODS→XLSX round-trip passed in this run. |
| `python -m unittest discover -s tests` | **PASS** | 536 tests in 436.519 seconds; completed alone with no concurrent LibreOffice probes. |
| `python scripts/test_single_instance_live.py` | **PASS** | CDP open/close; three document windows in one process; killed-owner recovery passed. Cold open 21,973 ms; warm opens 949/1,056 ms; recovered open 6,501 ms. |
| Merged-branch source blank launches | **PASS** | First CDP editor input: 2,823.7 ms (3T Doc), 1,895.9 ms (3T Sheet), 1,661.1 ms (3T Slide). |
| Fresh pilot blank launches | **MIXED** | First 3T Doc run 6,582.1 ms (**FAIL**); isolated repeat 2,779.5 ms (**PASS**); 3T Sheet 1,594.8 ms (**PASS**); 3T Slide 1,409.1 ms (**PASS**). |
| Repository sample DOCX/XLSX/PPTX opens | **FAIL** | Probes completed in 14.84–23.73 seconds, missing the few-second Office comparison target. |
| Target `d03.docx` / `lan25.xlsx` | **BLOCKED** | Neither path exists in this worktree. Repository samples were used for fallback measurements. |
| Formal packaged installer executable | **NOT RUN** | Fresh pilot payload was built and measured; no Setup.exe installer was generated. |

## Rollback and follow-up

This branch has not been merged into `main`. If a regression is found, revert only the G12 follow-up commit, preserving the required `main` merge and the committed WIP baseline. File-open parser optimization remains with the parallel open-speed work and was intentionally left untouched here.


## Agent handoff

- **TASK:** G12 — cold start
- **AGENT/ROLE:** Codex, primary coding agent
- **BRANCH:** `fix/file-basics-clean-start-codex`
- **WORKTREE:** `E:\VNOffice-codex-file-basics`
- **OBJECTIVE:** Reduce blank-document startup time and record source/pilot-package and file-open timings.
- **FINDINGS:** Source blank launches passed the 3-second target. The first fresh-package 3T Doc launch missed it, while its isolated repeat and package Sheet/Slide passed. Requested `d03.docx` and `lan25.xlsx` fixtures are absent.
- **IMPLEMENTATION SUMMARY:** Deferred document engine and unrelated services, lazy-loaded optional UI features, and CDP-only live probes are present in the WIP commits; `main` was merged at `192826b8`. No Writer/Sheet import parser was changed.
- **FILES CHANGED:** G12 WIP commits `05c54927` and `d46eadc4`; merge resolution in `apps/sheet/sheet-app.js`; measurements and test truth in this handoff.
- **COMMANDS RUN:** `node tests/run-tests.js`; `python -m unittest discover -s tests`; `python scripts/test_single_instance_live.py`; source and pilot-payload CDP cold-start/file-open probes.
- **BUILD RESULT:** Pilot payload built successfully at `E:\VNOffice-cold-start-build\VNOffice-0.9.0-g12-192826b8` (1,593 MB); Setup.exe not built.
- **TEST RESULTS:** Node 2,242/2,242 PASS; Python 536 PASS; live single-instance PASS.
- **KNOWN FAILURES:** First fresh-payload 3T Doc blank run 6,582.1 ms; sample-file opens remain 14.84–23.73 s.
- **RISKS:** Cold package first-run performance varies; first DOCX/XLSX/PPTX conversion remains dominated by LibreOffice startup and import work assigned to the separate open-speed task.
- **DEPENDENCIES/BLOCKERS:** Exact DOCX/XLSX target fixtures missing; no Git remote is configured, but the local `main` branch was merged.
- **CORE PATCH ID (if any):** N/A.
- **NEXT ACTION:** Continue package cold-start tuning and measure `d03.docx`/`lan25.xlsx` when those fixtures are available.
