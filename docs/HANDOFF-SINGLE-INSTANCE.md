# Agent Handoff

TASK: G11 — single instance per app kind, with independent document windows.
AGENT/ROLE: Codex / implementation
BRANCH: fix/file-basics-clean-start-codex
WORKTREE: E:\VNOffice-codex-file-basics
OBJECTIVE: Route later Writer, Sheet, and Slides launches to their existing app-kind process, open each request in a separate window, recover from stale IPC owners, and stop the shared LibreOffice worker after the last window closes.

## FINDINGS

- `main.py` already creates a fresh `VnOfficeApi` for each pywebview window. Each API has its own current file, open-session state, AutoRecover store session, and window title/close lifecycle. Error reporting and updating are process-shared.
- `Ctrl+N` and Tệp > Mới already call the new-window API. Desktop file-association launches were still starting another Python/WebView/LibreOffice stack.
- `docs/REFERENCE-3T-READER.md` identifies the sister project's `packages/platform/single_instance.py` for reuse. The supplied UNC path was unavailable from this worktree (`packages/platform` did not exist at that path), so the implementation uses the same standard-library-only approach without importing that source.
- The requested `d03.docx` and `d12.docx` files were not present in this checkout. Live timings below use the repository's real Writer fixtures and are identified as fixture measurements.

## IMPLEMENTATION SUMMARY

- Added `platform/single_instance.py`: one owner lock and authenticated IPC endpoint per user and app kind. The listener binds only to `127.0.0.1` on an ephemeral port. A 256-bit random token is stored in endpoint metadata under the app data directory. IPC forwards only a file path or a new-document action, never document contents.
- `main.py` performs a lightweight early forward before importing pywebview and LibreOffice integrations, so normal secondary launches exit after the owner queues and creates the requested window. Requests wait in a queue until pywebview's GUI loop is ready; window creation is serialized.
- An endpoint takeover uses a short election lock after an authenticated router-health check fails. The old process is fenced by its session ID and exits after preserving its AutoRecover snapshots. Normal last-window shutdown first stops IPC acceptance, then shuts down LibreOffice, then releases the owner lock. A missing endpoint is eligible for takeover only after an 8-second grace interval while the owner lock remains held.
- Each routed open or blank-document request gets its own `VnOfficeApi`. Existing `Ctrl+N` and Tệp > Mới behavior remains a new window. Writer, Sheet, and Slides File help now explains Ctrl+N/Tệp > Mới, opening another file from Explorer, relaunching the app shortcut, and per-window save/close behavior.
- Added a Windows-only live smoke script at `scripts/test_single_instance_live.py`; it is intentionally separate from the regular test suites.

## COMMANDS RUN

- `git merge main` — fast-forward to `f9e1101` before edits; no merge into `main`.
- `python -m unittest discover -s tests -p test_single_instance.py`
- `python -m unittest discover -s tests -p test_desktop_launch.py`
- `python -m unittest tests.test_g7_save_as_dialog.SaveAsAlternateFormatTests.test_save_as_converts_each_supported_alternate_format -v`
- `python scripts/test_single_instance_live.py`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `git diff --check`

## TEST RESULTS

- `tests/test_single_instance.py`: PASS, 9 tests, including forwarding open/new requests, token rejection, concurrent owner election, stale endpoint replacement while an owner lock remains held, router ping, delayed lock release during shutdown, and takeover after the missing-endpoint grace period.
- `tests/test_desktop_launch.py`: PASS, 6 tests, including separate per-window API/AutoRecover state and shared reporter/updater references.
- Desktop Launch Context JS tests: PASS, 6 cases, including AppShell document-name and dirty-state isolation.
- `node tests/run-tests.js`: PASS, 2,187/2,187.
- `python -m unittest discover -s tests`: FAIL, 525 tests run, 1 failure. `test_g7_save_as_dialog.SaveAsAlternateFormatTests.test_save_as_converts_each_supported_alternate_format` fails only for Writer PDF. The test mocks `_export_content_to_pdf` as a path string, while the current production call passes `return_engine=True` and unpacks `(output_path, engine)`. The isolated rerun reproduces that test-fixture mismatch. No FODS → XLSX round-trip failed, so no isolated FODS rerun was needed. The unrelated test was left unchanged.
- `python scripts/test_single_instance_live.py`: PASS. The app displayed three documents in one owner process, both secondary launchers exited, windows closed one at a time, the process exited after the last window, and a new launch recovered after force-killing an owner. The script cleaned its isolated app-data directory.
- Build: NOT RUN.
- Requested d03/d12 timing: NOT RUN because those files were unavailable. Fixture proxy measurements below use the time until the document filename appeared in its native window title.

## LIVE FIXTURE MEASUREMENTS

| Measure | Result |
|---|---:|
| Cold `sample-writer.docx` open | 17,977 ms |
| Warm `sample-writer-trackchanges.docx` open in the same process | 273 ms |
| Warm `sample-writer-tables.docx` open in the same process | 378 ms |
| Three windows hosted by one Writer process | PASS |
| Close windows individually; final close exits process | PASS |
| Force-kill owner; next launch recovers | PASS, 5,284 ms to visible filename title |

These timing values use the native filename title as the visible-open marker; they are not measurements for d03.docx or d12.docx.

## FILES CHANGED

- `main.py`
- `platform/single_instance.py`
- `platform/help/entries-writer.js`
- `platform/help/entries-sheet.js`
- `platform/help/entries-slides.js`
- `tests/test_single_instance.py`
- `tests/test_desktop_launch.py`
- `tests/unit/desktop-launch-context.test.js`
- `scripts/test_single_instance_live.py`
- `docs/HANDOFF-SINGLE-INSTANCE.md`

## STATUS

Implementation and live lifecycle check: PASS. Node suite: PASS. Full Python suite: FAIL for the unrelated Writer PDF test fixture mismatch described above. The requested d03/d12 benchmark remains NOT RUN because the files were unavailable. No changes were merged into `main`.
