# Agent Handoff — CH-9 stability proof after CH-2 merge

TASK: Review merge resolution; prove CH-9.4 cleanup and CH-9.5 performance logging; run gates; commit without merging main.

AGENT/ROLE: Codex / CH-9 stability verification.

BRANCH: `feat/ch9-stability-codex`

WORKTREE: `E:\VNOffice-codex-ch9` (no edits in `E:\VN OFice`).

OBJECTIVE: Preserve CH-2 update save/restart behavior and verify local process cleanup and opt-in performance logging on the real offline desktop.

FINDINGS:

- Reviewed merge `08d4cfc0` in `main.py`. Kept the resolution unchanged: request/acknowledgement, save cancellation, apply-helper launch and restore-document collection precede graceful window destruction; print sessions, persistent LibreOffice and tracked children are cleaned before destroying the app windows. No `os._exit` was reintroduced.
- `_initialize_process_tracker()` runs after launch argument validation and before restore-document parsing/document startup. It sweeps only ledger identities whose recorded owner is gone, publishes owner context for child workers and registers exit cleanup. An already-live owner is retained; there is no name-wide Office/LibreOffice termination.
- The updater helper remains outside the document-worker ledger, so document cleanup does not terminate the helper that must apply/relaunch the update.
- Desktop services are still hosted by Python `main.py`; no Node static server is used for these proofs.

IMPLEMENTATION SUMMARY:

- Added a separate Sheet-only WebView2/CDP harness and a test-only Python bootstrap. They reuse the existing adapter, document API, print pipeline, process tracker and logger. No production implementation or dependency changed.
- Supplies a synthetic small XLSX file choice through a test API, opens it through the actual Sheet adapter, clicks the actual performance option checkbox, saves through the real API and prints to PDF with the real hidden Office COM pipeline.
- Observes the WebView close event, waits 5 seconds, then checks all recorded PID/creation identities. No forced fallback is accepted as a successful normal close.
- For the crash proof, pauses a real COM worker for 120 seconds **after Office is hidden and its PID identity is recorded**, then uses `taskkill /F /PID <main>` without `/T`. The next app launch must clear the recorded orphans while preserving the unrecorded hidden Excel and separate LibreOffice profile.
- Sentinel LibreOffice identities are captured only after its UNO accept socket is ready. Assertions check the same identities before/after normal cleanup and startup sweep, and verify they never appear in the app ledger. Arbitrary processes from other agents are observations, not fixtures guaranteed to remain open.
- Rotation fills only the isolated test log with valid duplicate JSONL records to the production 5 MiB boundary, then performs real saves three times. Assertions require exactly three files, each at most 5,242,880 bytes.
- Every desktop start waits until no Python `_batch_audit`/`batch_document_audit` process exists and free RAM is greater than 3 GiB. VN Office instances run sequentially. Shared-machine waits are not counted as completed tests.

FILES CHANGED:

- `tests/live/ch9-cleanup-performance.desktop.playwright.mjs`
- `tests/live/ch9-proof-bootstrap.py`
- `docs/HANDOFF-CH9.md`

COMMANDS RUN:

```text
python -m unittest tests.test_updater
node tests/run-tests.js
node tests/live/ch9-cleanup-performance.desktop.playwright.mjs
```

BUILD RESULT: NOT RUN — no packaging/build change; requested gates are test commands and real source desktop execution.

TEST RESULTS (final evidence appended below):

- CH-2 updater: PASS, 15/15 tests, 0 failures, 0 skips.
- Node gate: PASS, `KẾT QUẢ KIỂM THỬ: 2295/2295 PASS | 0 FAIL`.
- Full Python discovery: NOT RUN yet; pending completion of the sequential desktop proof/RAM gate.
- Desktop final harness: in progress; no final PASS claim until orphan sweep and isolation assertions finish.
- CH-9.2 AutoRecover: NOT RUN in this task. Previous 6/6 Writer/Sheet/Slides proof is user-provided evidence, not a fresh run.
- CH-9.4/CH-9.5 Writer/Slides desktop repetitions: NOT RUN in this task; the requested small-XLSX proof uses Sheet and the shared services.

Updater output:

```text
Ran 15 tests in 5.942s
OK
END-TO-END 0.9.5 -> 0.9.6 apply=OK health_marker=OK relaunch=OK path-with-spaces=OK
END-TO-END 0.9.7 health-failure=detected rollback=OK relaunch_old=OK
END-TO-END tampered_manifest=refused blobs_downloaded=0
END-TO-END 0.9.1 downloaded_bytes=48 package_bytes=20260
```

KNOWN FAILURES / earlier harness attempts:

| Attempt | Recorded result | Cause and correction |
| --- | --- | --- |
| Initial helper inspection | 0 PASS, 1 FAIL; cleanup also errored | Referenced non-exported `main.process_tree`/`process_identity`; switched to the loaded tracker module. Replaced the cleanup path match with creation-identity cleanup. |
| Help readiness | 0 PASS, 1 FAIL | Adapter existed before background Help initialization; now waits for the actual option control to mount. |
| Idle crash | 5 PASS, 1 FAIL | UNO exited on stdin EOF after main-only kill, leaving zero orphans; moved the crash into a deterministically paused real COM job. |
| All-machine snapshot | 5 PASS, 1 FAIL | Expected every unrelated process observed initially to stay open on a shared machine (5/10 remained); now only controlled sentinels are asserted, other snapshots are reported. |
| Early LibreOffice identity snapshot | 5 PASS, 1 FAIL | An early `soffice.bin` identity disappeared while its launcher and Excel survived (2/3 sentinel identities remained); now waits for UNO readiness before capturing immutable identities and checks them at every cleanup boundary. |

These failures were not disabled or counted as PASS. They required rerunning the desktop harness. No production test expectation was changed and no production exception was swallowed to obtain green results.

RISKS:

- The crash is fault-injected into a real hidden COM job; the 120-second hold exists only in the test bootstrap. It is not an application behavior change.
- Rotation reaches the real production limit through synthetic local log filling, rather than hours of user activity. The logger/save/rotation implementations are real.
- The isolation fixture covers one independent hidden Excel process and an independent LibreOffice session; it does not establish that every external process on a concurrently used machine remains open indefinitely.

DEPENDENCIES/BLOCKERS: Existing Python/pywebview/WebView2, LibreOffice, Office COM, OpenPyXL fixture generator and existing Playwright Core installation. Shared RAM/audit gate can delay execution. No added production dependencies or cloud/document data flow.

CORE PATCH ID (if any): None.

NEXT ACTION: Complete remaining proof and full Python gate, record exact output, commit on the feature branch. Do not merge main.
