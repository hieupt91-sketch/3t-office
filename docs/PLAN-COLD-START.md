# G12 Cold Start Plan

## Objective

Reduce the cold-start path for 3T Doc, 3T Sheet, and 3T Slide so a blank document is visible and accepts its first editor input in under 3 seconds on this machine. Opening a named file should show the window promptly and resolve the file as soon as its content is ready, without waiting for unrelated startup services. Measure the installed-like Python launch and the packaged directory layout, and publish the lifecycle measurements and truthful test results in `docs/HANDOFF-COLD-START.md`.

## Current capability

The committed G12 WIP already:

- Starts the static UI server inside `main.py` and records process, import, server, window, WebView2, renderer, ribbon, first-paint, editable-surface, UNO, LibreOffice worker, and deferred-service milestones.
- Starts the document worker alongside WebView2 for a launch with a file, while a blank launch requests deferred work after the first paint and editable surface.
- Defers several Writer, Sheet, and Slides features behind dynamic imports and provides a shared first-use progress event.
- Includes `scripts/measure-cold-start.ps1` and `scripts/cdp-cold-start-probe.mjs`; the probe drives and reads the app using WebView2 CDP.

This plan was revalidated after merging local main at commit 192826b8. Source first-editor-key timings were 2.82 s (3T Doc), 1.90 s (3T Sheet), and 1.66 s (3T Slide). The fresh pilot payload result was mixed: the first packaged 3T Doc launch took 6.58 s, an isolated repeat took 2.78 s, and packaged 3T Sheet/Slide took 1.59/1.41 s. The exact d03.docx and lan25.xlsx fixtures are absent; the formal installer was not built.

## Files and modules in scope

- `main.py`: startup timing, embedded server, deferred background services, and launch-with-file worker scheduling. Do not change Writer or Sheet import parsers.
- `index.html`, `platform/bootstrap.js`, `platform/startup/lazy-feature.js`, and `platform/shell/app-shell.js`: renderer milestones, shared lazy-feature progress, and first-use loading of the AI service, about dialog, and common dialogs. Voice recognition stays eagerly available so its browser permission request remains inside the user gesture.
- `platform/ui-kit/lazy-dialogs.js`, `platform/ui-kit/datetime-format.js`, and `apps/sheet/cell-style-presets.js`: keep shared dialog code and app dialog code off the initial import path while retaining lightweight formatting/preset data.
- `apps/writer/**`, `apps/sheet/**`, and `apps/slides/**`: only existing app startup imports and feature modules that can be loaded on first use, including chart, pivot, format-cell, cell-style, date/time, and symbol dialogs.
- `scripts/measure-cold-start.ps1` and `scripts/cdp-cold-start-probe.mjs`: process launch and CDP-only observation/input for measurements. No OS-level input APIs or automation.
- `docs/HANDOFF-COLD-START.md`: app-by-app lifecycle table, source/package and file-open timings, and test truth.
- `docs/PLAN-COLD-START.md`: this plan and rollback record.

## Dependencies

Use existing Python, pywebview/WebView2, the Python standard-library `http.server`, and Node 20's built-in WebSocket client with `--experimental-websocket`. Do not add a runtime dependency or use `scripts/serve.js` for production.

## Risks and controls

- A feature moved behind a dynamic import can fail the first time it is used. Keep imports in the existing command path, show the shared progress state while loading, and run the requested app suites.
- Starting LibreOffice in the background can compete for CPU during the first paint. Ensure it never blocks the blank document or first input; retain overlapping startup for an explicit file launch.
- Packaged paths, Python runtime layout, and WebView2 startup may differ from the repository launch. Run measurements against both layouts and mark unavailable layouts BLOCKED with the exact reason.
- The blank-document probe types one temporary character and removes it through CDP, then inspects focus and editor state. It must only target the blank-document launch; file-open timing probes do not inject input.
- Fixture files are test assets. Do not package, commit, or otherwise copy company documents.

## Test and measurement plan

1. **DONE** — Re-ran source-layout CDP timelines for 3T Doc, 3T Sheet, and 3T Slide. All three accepted the first editor key under 3 seconds; LibreOffice workers became ready later in the background.
2. **DONE WITH LIMITS** — Built and measured a fresh pilot payload. First packaged 3T Doc missed the target at 6.58 s, its isolated repeat passed at 2.78 s, and packaged Sheet/Slide passed at 1.59/1.41 s. Exact target DOCX/XLSX fixtures and a formal installer were unavailable.
3. **PASS** — `node tests/run-tests.js` passed 2,242/2,242; `python -m unittest discover -s tests` passed 536 tests in 436.519 s when run alone; `python scripts/test_single_instance_live.py` passed using CDP.
4. **DONE WITH LIMITS** — Recorded fresh sample-file timings and all PASS/FAIL/BLOCKED/NOT RUN statuses in the handoff. Sample opens remain 14.84–23.73 s; import parsers were left untouched.

## Rollback

If a startup change regresses launch or first-use behavior, revert only the new G12 follow-up commit(s) with `git revert`; preserve the required `main` merge and the already committed WIP baseline. Do not reset or rewrite branch history.
