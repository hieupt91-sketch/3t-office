# Agent Handoff

TASK: Restore the macOS Qt native webview selection on the 0.9.11 integration branch.
AGENT/ROLE: Codex / macOS platform shell
BRANCH: agent/macos-qt-native-0911
WORKTREE: /Volumes/Data/Worktrees/macos-qt-native-0911
OBJECTIVE: Reuse the proven `mac/m1-qt-cdp` implementation so macOS selects pywebview's Qt/QtWebEngine backend through `OSServices`, without platform conditionals in shared UI code or changing Windows behavior.
FINDINGS: The 0.9.11 `main.py` did not pass a pywebview backend, so macOS used pywebview's platform default. Commit `ab5e182` already contained the minimal capability design. The project virtual environment contains PySide6 6.12.0 and `QtWebEngineWidgets`; the installed pywebview `start` API accepts the `gui` argument.
IMPLEMENTATION SUMMARY: Added optional `desktop_webview_gui` to the OS-service contract, set it to `qt` in the existing macOS backend, and passed the selected value to `webview.start`. Added a macOS contract test and a plan-gate document. No `sys.platform`/Darwin conditional was added to `main.py`.
FILES CHANGED: `main.py`; `platform/os_services/base.py`; `platform/os_services/macos.py`; `tests/test_os_services_contract.py`; `docs/PLAN-MACOS-QT-NATIVE-0.9.11.md`; `docs/HANDOFF-MACOS-QT-NATIVE-0.9.11.md`.
COMMANDS RUN: Python compile for the touched modules; focused OS-service/reveal/macOS updater tests; PySide6/QtWebEngine import and pywebview signature check; `git diff --check`.
BUILD RESULT: NOT RUN — the parent task owns the Xcode `.app` rebuild and native visual launch.
TEST RESULTS: PASS — 43 focused tests, 1 skipped; Python compilation passed; PySide6 6.12.0 and QtWebEngine imports passed; pywebview `gui` parameter assertion passed; diff whitespace check passed.
KNOWN FAILURES: An initial command referenced the nonexistent module `tests.test_macos_update_applier` and produced one loader error; rerunning with the actual modules `tests.macos.test_update_applier` and `tests.macos.test_update_service` passed. This was a command-path mistake, not a product/test failure.
RISKS: Packaged runtimes must include compatible PySide6/QtWebEngine. Qt/PySide6 LGPL approval remains a release decision documented in `docs/SPEC-MACOS-PORT.md`; this change does not claim that approval.
DEPENDENCIES/BLOCKERS: No coding blocker. Native `.app` validation depends on rebuilding the bundles with the updated source/runtime and is handed back to the parent task.
CORE PATCH ID (if any): None.
NEXT ACTION: Cherry-pick this commit into `platform/macos`, rebuild Doc/Sheet/Slide `.app`, then launch and inspect them natively; do not use `scripts/serve.js`.
