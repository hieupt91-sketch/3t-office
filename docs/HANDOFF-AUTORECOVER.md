# AutoRecover — Implementation Plan

## Objective
Add one shared, local-only AutoRecover service for Writer, Sheet, and Slides. Every configured interval (default five minutes), it will atomically retain the current dirty document in the same intermediate format already passed through Save (Writer HTML, Sheet FODS, Slides FODP), offer snapshots left by an unclean exit at next start, and route recovery copies through Save As.

## Current capability
- The three adapters expose `isDirty` and their existing Save serialization: Writer `_contentForExport()`, Sheet `serializeToFods()`, and Slides `serializeToFodp()`.
- `main.py` owns the pywebview API, local app-data directory, and process/window lifecycle. It currently exits with `os._exit`, so normal-close cleanup must happen in its close callback.
- The platform Help panel is shared by all three apps. There is no shared settings/options screen; AutoRecover controls will be added there.
- Error reporting has a dedicated reports queue and explicitly selected current-file attachments; recovery storage must remain outside those paths and be excluded defensively.

## Files/modules
- `platform/autorecover/`: shared controller, recovery dialog, styles, and settings UI.
- `platform/help/`: shared Vietnamese help entry; register it for Writer, Sheet, and Slides.
- `apps/writer/writer-app.js`, `apps/sheet/sheet-app.js`, `apps/slides/slides-app.js`: connect each adapter to the shared controller and restore its existing in-memory serialization.
- `adapters/libreoffice/common/uno-bridge.js`, `main.py`: shared local API, per-session storage, atomic writes, limits, startup discovery, deletion on Save, and normal close cleanup.
- `adapters/error_reporting/reporter.py`: prevent recovery paths and recovery manifest/content from entering queue records or attachments.
- `tests/unit/`, `tests/`: JS behavior and Python persistence/crash tests; register them with existing runners.

## Dependency
- No new third-party dependency. Use Python/JS standard facilities already in the project and the existing Help panel.

## Risk
- Large synchronous serializers may delay editing. Run serialization from idle time, use one snapshot per session/document with global count/byte limits, and benchmark the provided `lan06.xlsx` locally without committing it.
- A corrupt recovery document must remain on disk after a clear error. Normal-save and clean-close deletion must be scoped to recovery paths only.
- Reporter exclusions must cover both queue metadata and attachment reads so local recovery content cannot leave the device.

## Test plan
- Python `unittest`: atomic snapshot replacement, per-document/global size and count limits, Save/session cleanup, leftover discovery, reporter exclusion, and a child process terminated without cleanup whose snapshot appears to a new process.
- JavaScript unit tests: dirty gating, interval scheduling/settings, dialog actions/focus/error behavior, and recovery-copy Save As state; keep Help coverage green.
- Benchmark the provided `E:\VN OFice\file test\lan\lan06.xlsx` from a temporary worktree copy and report its serialize/write duration and size.
- Run `node tests/run-tests.js` and `python -m unittest discover -s tests`; rerun any failing soffice-based test alone and report both outcomes.

## Rollback
- Revert the AutoRecover feature commit(s) on this branch. Existing user documents are never modified; if necessary, disable AutoRecover from Help and remove only `%LOCALAPPDATA%/VNOffice/recovery` after confirming the user no longer needs those recovery copies.

## Agent Handoff

# Agent Handoff
TASK: Shared AutoRecover for VN Writer, VN Sheet, and VN Slides
AGENT/ROLE: Codex — shared platform integration
BRANCH: feature/autorecover-codex
WORKTREE: E:\VNOffice-codex-autorecover
OBJECTIVE: Keep bounded local snapshots of dirty in-memory documents, recover snapshots left by an unclean exit, and open recovered copies as unsaved documents.
FINDINGS:
- Existing Save serializers are Writer `_contentForExport()` HTML, Sheet `serializeToFods()` FODS, and Slides `serializeToFodp()` FODP.
- `main.py` provides the existing Python/pywebview API and normal close callback. The shared Help panel is the existing options surface.
- The desktop package copies the complete `platform/` tree and `main.py`; no packaging manifest change is needed.
IMPLEMENTATION SUMMARY:
- Added a shared Python store under the local user data directory, UUID-scoped sessions/documents, atomic replacement, metadata manifests, configurable 1–60 minute interval (default 5), per-file/total/count bounds, process-safe storage locking, leftover discovery, and Save/normal-close cleanup.
- Added one shared JavaScript timer/controller and keyboard-usable Vietnamese recovery dialog. Each app registers its existing in-memory serializer and restore path; recovered copies are dirty and route Ctrl+S/Save to Save As.
- Added concrete Vietnamese Help guidance and Help-panel settings for all three apps. Reporter queue and attachment paths reject recovery files.
- Scoped DOM mocks to their test suites and restored `document`/`MutationObserver` between Node suites so the complete runner can report individual results rather than crash on a leaked mock.
- Large-sheet data-only benchmark: 5,069 nonempty cells; FODS serialization 69.2 ms / 970,461 bytes; atomic store write 58.56 ms. This measurement did not cover style fidelity or the full desktop XLSX import path.
FILES CHANGED:
- `platform/autorecover/store.py`, `platform/autorecover/auto-recover.js`, `platform/autorecover/recovery-dialog.js`
- `platform/help/entries-autorecover.js`, `platform/help/help-catalog.js`, `platform/help/help.css`
- `main.py`, `index.html`, `adapters/libreoffice/common/uno-bridge.js`
- `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/slides/slides-adapter.js`
- `apps/writer/writer-app.js`, `apps/sheet/sheet-app.js`, `apps/sheet/sheet-grid.js`, `apps/slides/slides-app.js`, `apps/slides/slides-canvas.js`
- `adapters/error_reporting/reporter.py`
- `tests/test_autorecover.py`, `tests/unit/autorecover.test.js`, `tests/unit/help-coverage.test.js`, `tests/run-tests.js`
- Test-isolation updates: `tests/unit/sheet-fods-repeat-expand.test.js`, `tests/unit/sheet-load-fods-blank.test.js`, `tests/unit/sheet-protect-workbook.test.js`, `tests/unit/sheet-rename-move-protect.test.js`
- `docs/HANDOFF-AUTORECOVER.md`
COMMANDS RUN:
- `node tests/run-tests.js`
- `node --input-type=module -e "import { runAutoRecoverTests } from './tests/unit/autorecover.test.js'; ..."`
- `node --input-type=module -e "import { runSheetSlidesViewTabTests } from './tests/unit/sheet-slides-view-tab.test.js'; ..."`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_autorecover -v`
- `python -m py_compile main.py platform/autorecover/store.py adapters/error_reporting/reporter.py tests/test_autorecover.py`
- `git diff --check`
BUILD RESULT: NOT RUN — no package build was requested.
TEST RESULTS:
- PASS — `python -m unittest discover -s tests`: `Ran 429 tests in 281.838s`, `OK`.
- PASS — `python -m unittest tests.test_autorecover -v`: `Ran 10 tests in 0.185s`, `OK`.
- PASS — focused AutoRecover JavaScript suite: all 6 cases passed.
- FAIL — `node tests/run-tests.js`: `KẾT QUẢ KIỂM THỬ: 1929/1930 PASS | 1 FAIL`.
- FAIL — the sole Node failure reproduced when run alone; details below.
- PASS — Python compile and `git diff --check`.
KNOWN FAILURES:
- `VN Slides Show/Hide: Thước kẻ, Lưới căn chỉnh 20px và Đường gióng` fails with `rulerHEl thiếu SVG ticks`; the `sheet-slides-view-tab` suite also fails alone with the same assertion. It is not a soffice-based failure.
RISKS:
- Snapshots are limited to 64 MiB each, 20 total, and 256 MiB in total; the oldest snapshots are pruned when limits are reached.
- Full desktop/manual interaction and package build were not run. The supplied XLSX timing used a data-only model because styling fidelity was outside that benchmark path.
DEPENDENCIES/BLOCKERS: No new third-party dependency. BLOCKED — environment review rejected deleting the temporary `test/lan/lan06.xlsx` benchmark copy and generated files; they remain untracked and excluded from commits.
CORE PATCH ID (if any): N/A — no LibreOffice Core changes.
NEXT ACTION: Review the commits on this branch and run the packaged desktop pilot smoke test; no merge to `main` was performed.
