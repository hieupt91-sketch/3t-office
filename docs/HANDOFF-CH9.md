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
python -m unittest discover -s tests
```

BUILD RESULT: NOT RUN — no packaging/build change; requested gates are test commands and real source desktop execution.

TEST RESULTS (final evidence appended below):

- CH-2 updater: PASS, 15/15 tests, 0 failures, 0 skips.
- Previous-run Node gate: PASS, `KẾT QUẢ KIỂM THỬ: 2295/2295 PASS | 0 FAIL`. Resume final gate: FAIL, `KẾT QUẢ KIỂM THỬ: 2293/2295 PASS | 2 FAIL`; previous evidence does not override this result.
- Full Python discovery (resume): FAIL, 561 tests, 558 passed, 3 failures, 0 errors, 0 skips; 554.820 seconds.
- Desktop final harness (resume): PASS, 6/6 assertions, 0 failures. Normal close, startup orphan sweep and independent-user-session isolation all completed.
- CH-9.2 AutoRecover: NOT RUN in this task. Previous 6/6 Writer/Sheet/Slides proof is user-provided evidence, not a fresh run.
- CH-9.4/CH-9.5 Writer/Slides desktop repetitions: NOT RUN in this task; the requested small-XLSX proof uses Sheet and the shared services.

Updater output:

```text
Ran 15 tests in 7.748s
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

NEXT ACTION: NOT READY. Diagnose the five LibreOffice conversion failures on a machine with sufficient free RAM, then rerun the failed suites and required gates before merging. The requested resume checks are complete; no merge into main was performed.


## NEW EVIDENCE — resume completed 02/10/2026 (Asia/Saigon)

No production code changed during this resume. Merge resolution remains correct after review; CH-2 updater freshly passed 15/15. The desktop harness and test bootstrap were already committed in the WIP and were reused without redoing finished implementation. Full Node and Python gates were each run once in this resume. Neither failing assertions nor timeout settings were modified.

Resource gate: waited while another worktree ran a Python batch audit or free RAM was at most 3 GiB. All three VN Office launches were sequential; no OS input was used. The successful resource samples below precede sentinel setup and desktop starts. No other agent/process was terminated to free RAM.

```text
RAM_GATE	{"freeGB":9.784469604492188,"audits":0}
RAM_GATE	{"freeGB":8.70096206665039,"audits":0}
RAM_GATE	{"freeGB":7.463382720947266,"audits":0}
RAM_GATE	{"freeGB":4.539775848388672,"audits":0}
```

Desktop output (repetitive waiting samples omitted; all six assertions and isolation evidence retained):

```text
SENTINELS_READY	[{"created_at":"134353629495044411","pid":24228},{"pid":9096,"created_at":"134353629509138867"},{"pid":32204,"created_at":"134353629576591713"}]
PASS	CH-9.5 UI opt-in	{"defaultEnabled":false,"enabled":true}
PASS	CH-9.4/9.5 XLSX open/save/print PDF	{"savedStatus":"ok","prepared":{"status":"ok","sessionId":"c41e62b1dccc45e2b5cf6b364365dcb8","pageCount":1,"engine":"Microsoft Office"},"printed":{"status":"ok","message":"Đã gửi đến máy in.","printer":"Microsoft Print to PDF","engine":"Microsoft Office","path":"C:\\Users\\3TCOMP~1\\AppData\\Local\\Temp\\ch9-desktop-MlcJ6b\\proof.pdf"},"bytes":193598}
PASS	CH-9.5 JSONL operations	[{"timestamp":"2026-10-01T21:16:30.496+00:00","event":"soffice_start","operation":"soffice_start","app":"sheet","duration_ms":17863.8,"outcome":"ok","memory_bytes":101822464},{"timestamp":"2026-10-01T21:16:30.659+00:00","event":"operation","operation":"open","app":"sheet","duration_ms":18031,"outcome":"ok","memory_bytes":102326272},{"timestamp":"2026-10-01T21:16:37.072+00:00","event":"operation","operation":"save","app":"sheet","duration_ms":6265,"outcome":"ok","memory_bytes":102563840},{"timestamp":"2026-10-01T21:17:06.498+00:00","event":"soffice_start","operation":"soffice_start","app":"sheet","duration_ms":3559.2,"outcome":"ok","memory_bytes":102096896},{"timestamp":"2026-10-01T21:17:07.197+00:00","event":"operation","operation":"print_prepare","app":"sheet","duration_ms":30109,"outcome":"ok","memory_bytes":102100992},{"timestamp":"2026-10-01T21:17:14.356+00:00","event":"operation","operation":"print","app":"sheet","duration_ms":7157,"outcome":"ok","memory_bytes":102264832}]
PASS	CH-9.5 rotation 5MB x 3	[{"file":"performance.jsonl","bytes":160},{"file":"performance.1.jsonl","bytes":5242794},{"file":"performance.2.jsonl","bytes":5242794}]
PASS	CH-9.4 normal close + 5s	{"recorded":8,"alive":0,"identities":[{"pid":13268,"created_at":"134353629726351295","role":"uno-worker","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":31828,"recorded_at":1790889372.6418037},{"pid":20744,"created_at":"134353629728640940","role":"soffice","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":31828,"recorded_at":1790889390.4050262},{"pid":980,"created_at":"134353629799721136","role":"soffice-child","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":20744,"recorded_at":1790889390.4529245},{"pid":26268,"created_at":"134353630008760119","role":"office-com-worker","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":31828,"recorded_at":1790889400.8849401},{"pid":27748,"created_at":"134353630011687984","role":"office-com","owner_pid":"31828","owner_created_at":"134353629695734883","parent_pid":26268,"recorded_at":1790889401.711},{"pid":1920,"created_at":"134353630229402078","role":"uno-worker","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":31828,"recorded_at":1790889422.9443176},{"pid":6484,"created_at":"134353630230840169","role":"soffice","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":31828,"recorded_at":1790889426.4349995},{"pid":11988,"created_at":"134353630230960414","role":"soffice-child","owner_pid":31828,"owner_created_at":"134353629695734883","parent_pid":6484,"recorded_at":1790889426.4748917}]}
ISOLATION_EVIDENCE	{"expected":[{"created_at":"134353629495044411","pid":24228},{"pid":9096,"created_at":"134353629509138867"},{"pid":32204,"created_at":"134353629576591713"}],"actual":[{"created_at":"134353629495044411","pid":24228},{"pid":9096,"created_at":"134353629509138867"},{"pid":32204,"created_at":"134353629576591713"}],"otherProcessesObservedBefore":5,"otherProcessesStillAlive":3}
PASS	CH-9.4 next launch orphan sweep + user isolation	{"mainKilled":18788,"faultInjection":"120s pause in real COM worker after hidden activation/identity registration","liveBeforeKill":2,"orphansBeforeRestart":2,"aliveAfterRestart":0,"protectedBefore":3,"protectedAfter":3,"sweepTrace":["{\"stage\": \"orphan_processes_swept\", \"stopped\": 2, \"retained\": 0, \"removed\": 5}"],"orphanIdentities":[{"pid":37928,"created_at":"134353630642689633","role":"office-com-worker","owner_pid":18788,"owner_created_at":"134353630527526129","parent_pid":18788,"recorded_at":1790889464.276909},{"pid":18956,"created_at":"134353630645047117","role":"office-com","owner_pid":"18788","owner_created_at":"134353630527526129","parent_pid":37928,"recorded_at":1790889465.037}],"protectedIdentities":[{"created_at":"134353629495044411","pid":24228},{"pid":9096,"created_at":"134353629509138867"},{"pid":32204,"created_at":"134353629576591713"}]}
KET QUA CH9 DESKTOP: 6 PASS, 0 FAIL; scratch=C:\Users\3TCOMP~1\AppData\Local\Temp\ch9-desktop-MlcJ6b
```

Actual JSONL records before the isolated rotation fill (one record per line):

```jsonl
{"timestamp":"2026-10-01T21:16:30.496+00:00","event":"soffice_start","operation":"soffice_start","app":"sheet","duration_ms":17863.8,"outcome":"ok","memory_bytes":101822464}
{"timestamp":"2026-10-01T21:16:30.659+00:00","event":"operation","operation":"open","app":"sheet","duration_ms":18031,"outcome":"ok","memory_bytes":102326272}
{"timestamp":"2026-10-01T21:16:37.072+00:00","event":"operation","operation":"save","app":"sheet","duration_ms":6265,"outcome":"ok","memory_bytes":102563840}
{"timestamp":"2026-10-01T21:17:06.498+00:00","event":"soffice_start","operation":"soffice_start","app":"sheet","duration_ms":3559.2,"outcome":"ok","memory_bytes":102096896}
{"timestamp":"2026-10-01T21:17:07.197+00:00","event":"operation","operation":"print_prepare","app":"sheet","duration_ms":30109,"outcome":"ok","memory_bytes":102100992}
{"timestamp":"2026-10-01T21:17:14.356+00:00","event":"operation","operation":"print","app":"sheet","duration_ms":7157,"outcome":"ok","memory_bytes":102264832}
```

Rotation produced `performance.jsonl` = 160 bytes and `.1` / `.2` = 5,242,794 bytes each, with exactly 3 files and each below 5,242,880 bytes. PDF output was 193,598 bytes and began with `%PDF-`. Normal close left 0 live recorded identities after 5 seconds. Main-only `taskkill /F /PID 18788` left 2 recorded orphans; startup stopped 2, retained 0 and removed 5 ledger entries (including already-dead children). All 3 protected creation identities survived. The 5 unrelated processes observed initially were only observations; their 3 survivors were not counted as controlled isolation fixtures.

Final Node gate: exit code 1. Exact summary and both failing outputs:

```text
[FAIL] Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS
↳ Chi tiết: soffice --convert-to xlsx:Calc MS Excel 2007 XML failed: convert C:\Users\3T Computer\AppData\Local\Temp\vno-pivot-save-rf8NMP\pivot.fods as a Calc document -> C:\Users\3TCOMP~1\AppData\Local\Temp\vno-pivot-save-rf8NMP\xlsx\pivot.xlsx using filter : Calc MS Excel 2007 XML
[FAIL] FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility
↳ Chi tiết: soffice --convert-to xlsx:Calc MS Excel 2007 XML failed:
KẾT QUẢ KIỂM THỬ: 2293/2295 PASS | 2 FAIL
```

Final Python discovery: exit code 1. Complete failure details and summary (progress dots omitted):

```text
======================================================================
FAIL: test_continuous_break_and_unedited_section_properties_round_trip_unchanged (test_writer_sections_roundtrip.TestWriterSectionsRoundtrip.test_continuous_break_and_unedited_section_properties_round_trip_unchanged)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "E:\VNOffice-codex-ch9\tests\test_writer_sections_roundtrip.py", line 237, in test_continuous_break_and_unedited_section_properties_round_trip_unchanged
    self.assertEqual(saved.get("status"), "ok", repr(saved))
AssertionError: 'error' != 'ok'
- error
+ ok
 : {'status': 'error', 'message': 'LibreOffice báo lỗi khi chuyển đổi: không rõ nguyên nhân'}

======================================================================
FAIL: test_open_and_save_as_keeps_two_section_orientations_and_headers (test_writer_sections_roundtrip.TestWriterSectionsRoundtrip.test_open_and_save_as_keeps_two_section_orientations_and_headers)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "E:\VNOffice-codex-ch9\tests\test_writer_sections_roundtrip.py", line 289, in test_open_and_save_as_keeps_two_section_orientations_and_headers
    self.assertEqual(saved.get("status"), "ok", repr(saved))
AssertionError: 'error' != 'ok'
- error
+ ok
 : {'status': 'error', 'message': 'LibreOffice báo lỗi khi chuyển đổi: không rõ nguyên nhân'}

======================================================================
FAIL: test_open_document_dialog_forwards_ooxml_with_html (test_writer_trackchanges_import.WriterTrackChangesImportTests.test_open_document_dialog_forwards_ooxml_with_html)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "E:\VNOffice-codex-ch9\tests\test_writer_trackchanges_import.py", line 40, in test_open_document_dialog_forwards_ooxml_with_html
    self.assertEqual(result.get("status"), "ok")
AssertionError: 'error' != 'ok'
- error
+ ok


----------------------------------------------------------------------
Ran 561 tests in 554.820s

FAILED (failures=3)
END-TO-END 0.9.5 -> 0.9.6 apply=OK health_marker=OK relaunch=OK path-with-spaces=OK
END-TO-END 0.9.7 health-failure=detected rollback=OK relaunch_old=OK
END-TO-END tampered_manifest=refused blobs_downloaded=0
END-TO-END 0.9.1 downloaded_bytes=48 package_bytes=20260
```

At Node gate start the resource check reported 0 audits and 4.5982704162597656 GiB free. At Python gate start: 0 audits and 10.709854125976563 GiB free. After Python discovery: 0 audits and 0.85390090942382813 GiB free. Shared memory changed during execution. The two Node tests explicitly use 20-second conversion timeouts, but the runner does not expose the subprocess error code; timeout is unconfirmed. The three Python failures report conversion errors. RAM pressure is an observation, not an established root cause. No isolated rerun was started below the RAM threshold; the five failures remain unresolved and block readiness.

Build/packaging: NOT RUN. CH-9.2 fresh desktop repetition: NOT RUN (previous 6/6 user-provided evidence retained). Writer/Slides CH-9.4/9.5 desktop repetitions: NOT RUN; requested small-XLSX proof exercised Sheet and shared services.

Raw resume command outputs are retained in the desktop scratch directory below; the handoff includes all acceptance outputs, JSONL lines, rotation sizes, gate summaries and failure traces.

`C:\Users\3TCOMP~1\AppData\Local\Temp\ch9-desktop-MlcJ6b`

Final status: **NOT READY** — desktop 6/6 and updater 15/15 passed, but final Node 2293/2295 and Python 558/561 failed. Commit on `feat/ch9-stability-codex`; do not merge main.
