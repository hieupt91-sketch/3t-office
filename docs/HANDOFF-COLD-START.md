# G12 Cold Start Handoff

Date: 2026-10-01  
Branch: `fix/file-basics-clean-start-codex`  
Main merge: `f7caaebc` (`Merge main into cold-start worktree`)

## Outcome

The blank-document path now starts LibreOffice after the first trusted user input. Error reporting, update services, print integration, and optional app modules are deferred from the initial blank-document path. Launches with a file still start the LibreOffice worker alongside the window so file loading can begin immediately. The static UI server remains in the Python process.

The final installed-like source runs reached the first editor key in 1.89 s (3T Doc), 2.31 s (3T Sheet), and 2.29 s (3T Slide). The first staged-package measurement set missed 3 s for all apps; isolated repeats reached 2.48 s, 1.76 s, and 2.38 s respectively. The staged package result is **MIXED**: isolated runs pass, but the first set and one additional Sheet run failed, so the under-3-second result was not consistent across all package measurements.

First-file open remains much slower than a few-second Office launch for the available repository fixtures. The exact requested `d03.docx` and `lan25.xlsx` paths are absent. This work does not change the Writer or Sheet import parsers, per the task boundary.

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

The package-layout runs used the staged app payload at `E:\VNOffice-cold-start-build\coldstart-after`, with the bundled Python runtime and LibreOffice layout linked into the expected package paths. This is a staged package-payload layout, not a newly generated installer executable. Do not interpret it as an installer-build measurement.

Every time below is elapsed from process start in milliseconds. `R` is Python runtime start, `I` Python imports complete, `S` static server ready, `W` pywebview window created, `WV` WebView2 ready, `RI` ribbon interactive, `P` first blank-document paint, `E` editable surface ready, and `K` the first CDP key reaching the editor. `—` means the milestone was not emitted or captured in that run. The probe inserts and removes a temporary `x` through CDP only.

## Installed-like blank launch timeline

| App | R | I | S | W | WV | RI | P | E | K | Blank visible + editable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3T Doc | 346 | 460 | 475 | 478 | 1,663 | 1,814 | 1,822 | 1,825 | 1,891 | PASS |
| 3T Sheet | 222 | 299 | 311 | 313 | 1,812 | 2,128 | 2,206 | 2,217 | 2,311 | PASS |
| 3T Slide | 236 | 296 | 308 | 311 | 2,046 | 2,185 | 2,221 | 2,224 | 2,289 | PASS |

| App | UNO bridge ready | LO start requested | LO worker ready | Deferred services ready |
|---|---:|---:|---:|---:|
| 3T Doc | 1,840 | 2,124 | 24,070 | 1,964 |
| 3T Sheet | 2,292 | 2,552 | 22,017 | 2,318 |
| 3T Slide | 2,241 | 2,530 | 19,044 | 2,310 |

The blank UI became usable before the LibreOffice worker was ready in each run. File operations that need the worker start it on demand; an explicit file launch still starts it in parallel with the UI.

## Staged package-layout blank launch timeline

| App / first measurement | R | I | S | W | WV | RI | P | E | K | Target |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3T Doc | 6,627 | 7,067 | 7,114 | 7,117 | 12,292 | 12,740 | 12,766 | 12,777 | 12,886 | FAIL |
| 3T Sheet | 959 | 1,377 | 1,388 | 1,391 | 3,278 | 3,697 | 3,768 | 3,779 | 3,868 | FAIL |
| 3T Slide | 1,648 | 1,741 | 1,756 | 1,758 | 3,197 | 3,528 | 3,565 | 3,576 | 3,641 | FAIL |

The isolated repeats below used fresh app-data directories:

| App / repeat | R | I | S | W | WV | RI | P | E | K | LO worker ready | Target |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3T Doc | 327 | 438 | 462 | 467 | 2,068 | 2,322 | 2,337 | 2,361 | 2,479 | 26,316 | PASS |
| 3T Sheet | 244 | 305 | 321 | 324 | 1,372 | 1,598 | 1,667 | 1,674 | 1,757 | 16,779 | PASS |
| 3T Slide | 233 | 403 | 418 | 421 | 2,100 | 2,264 | 2,307 | 2,312 | 2,384 | 21,393 | PASS |

An additional staged-package Sheet run timed out after 240 s before `renderer_entry`; CDP logged connection-refused requests for `formula-autocomplete.js`, `formula-entry.js`, and the dynamic `sheet-app.js` import. The isolated Sheet repeat above subsequently completed and accepted CDP input. The failure is retained; its cause was not established. The staged payload is not a generated installer build.

## Before and after file-open timings

The requested `test\\landocx\\d03.docx` and `test\\lan\\lan25.xlsx` are not present in this checkout (`Test-Path` returned false for both). Those exact measurements are **BLOCKED** by missing fixtures. The comparison below uses repository-owned fixtures only; the sample `.pptx` is `tests/fixtures/real-office-samples/sample-slides.pptx`. Current times are elapsed to `initial_file_open_resolved` (the DOCX value is the CDP-complete cold open from the live test).

| Type and fixture | Previous recorded baseline | Current installed-like source | Current staged package payload |
|---|---:|---:|---:|
| DOCX — `tests/fixtures/real-office-samples/sample-writer.docx` | 18,116 | 27,205 | 23,100 |
| XLSX — `tests/fixtures/real-office-samples/sample-sheet.xlsx` | 23,451 | 29,787 | 16,212 |
| PPTX — `tests/fixtures/real-office-samples/sample-slides.pptx` | 24,399 | 30,846 | 36,450 |

The prior baseline numbers come from earlier recorded runs and were not collected under a controlled, identical load/profile. Current cold file-open times are still 16–36 seconds, so the few-second Word/Excel/PowerPoint comparison target is **not met**. The cold LibreOffice worker accounted for most of the elapsed time (for the current source Sheet run, it became ready at 29,233 ms and the file resolved at 29,787 ms). The launch shows the window and blank canvas before the file finishes. The formal packaged installer executable was not built for this task.

## Test results

| Check | Result | Details |
|---|---|---|
| `node tests/run-tests.js` | **FAIL** | Two full runs both ended 2,232/2,235. Each reported two headless Edge Writer mount/switcher checks and the `sheet-format-dropdown.test.js` FODS→XLSX→FODS layout round-trip as failures. |
| Isolated `runHtmlSmokeTests()` | **PASS** | Final quiet rerun passed 21/21, including Writer mount and suite switcher. An earlier isolated run during load passed 19/21 with those same two checks failing. Sheet, Slides, print-preview, and track-changes checks passed in both. The actual WebView2 CDP probes also mounted Writer and verified the first editor key. |
| Isolated `runSheetFormatDropdownTests()` | **PASS** | 11/11 checks passed, including the FODS→XLSX→FODS layout round-trip. |
| `python -m unittest discover -s tests` | **PASS** | 528 tests in 402.129 seconds; completed alone. |
| `python scripts/test_single_instance_live.py` | **PASS** | CDP-driven open readiness and close; 3 windows in one process; killed-owner recovery passed. Cold fixture open 27,205 ms; warm opens 1,111/1,070 ms; recovered open 6,310 ms. |
| Target `d03.docx` / `lan25.xlsx` | **BLOCKED** | Neither path exists in this worktree. Repository fixtures were used for fallback measurements. |
| Formal packaged installer executable | **NOT RUN** | Staged package payload layout was measured; no installer build was generated. |

## Rollback and follow-up

This branch has not been merged into `main`. If a regression is found, revert only the G12 follow-up commit, preserving the required `main` merge and the committed WIP baseline. File-open parser optimization remains with the parallel open-speed work and was intentionally left untouched here.

The repository did not contain the specified `/09-templates/AGENT-HANDOFF.md` template when searched. This handoff follows the existing `docs/HANDOFF-*.md` format.
