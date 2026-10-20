# Agent Handoff

TASK: MAC-6 — CDP macOS infrastructure; prepare MAC-13
AGENT/ROLE: OpenCode / macOS CDP and QA
BRANCH: mac/cdp-1910
WORKTREE: /Users/hieupc/.codex/worktrees/mac-cdp-1910/3t-office
OBJECTIVE: Add a macOS QtWebEngine CDP launch path for the live test harness and make the audit session server use portable test profile paths.
FINDINGS: Existing session launcher only configured WebView2 and defaulted to `python`; the audit server hard-coded Windows profile/screenshot paths. The target machine is macOS arm64, but `/usr/bin/python3` cannot import `webview`, so the live Qt runtime is unavailable.
IMPLEMENTATION SUMMARY: Added host-aware Python selection, QtWebEngine remote-debugging environment, preservation of existing Chromium flags, rejection of persisted Windows paths on POSIX, isolated macOS HOME/data directories, and platform-aware audit session paths. `main.py` selects the Qt backend only for a test launch explicitly marked as Darwin. Cleanup removes only session-owned temporary profile roots and signals only the child PID created by this session.
FILES CHANGED: `main.py`; `tests/live/cdp/session.mjs`; `tests/live/cdp/session.test.mjs`; `scripts/audit-0610/app_session_server.mjs`; `docs/PLAN-MAC-CDP-1910.md`; `docs/HANDOFF-MAC-CDP-1910.md`.
COMMANDS RUN: `node --test tests/live/cdp/session.test.mjs`; `node --check tests/live/cdp/session.mjs`; `node --check scripts/audit-0610/app_session_server.mjs`; `python3 -m py_compile main.py`; live `launchApp("writer")` smoke, output captured at `/tmp/mac-cdp-smoke.log`.
BUILD RESULT: NOT RUN — no build system changes.
TEST RESULTS: PASS — focused contract 4/4, both Node syntax checks, Python compile. BLOCKED — native smoke exited before startup because `webview` is missing. MAC-6 live acceptance and seven MAC-13 scenarios are BLOCKED / NOT RUN for the same prerequisite; none is claimed PASS or FAIL.
KNOWN FAILURES: None observed in runnable focused checks. Native app startup is unavailable in this environment.
RISKS: QtWebEngine may require adapting the remote debugging environment to the exact installed Qt version; this cannot be checked until a project-approved macOS runtime is provisioned.
DEPENDENCIES/BLOCKERS: macOS Python environment with existing pywebview + approved Qt backend; installation/licensing choice remains with project owner.
CORE PATCH ID (if any): None.
NEXT ACTION: After the owner provisions an approved runtime, run the three MAC-6 suites and seven MAC-13 scripts via CDP, record each result, then push this branch for review.
