# Agent Handoff

TASK: Resume lan14 merged-branch save investigation (02/10/2026).
AGENT/ROLE: Codex / Sheet import-export investigation and QA.
BRANCH: merge/sheet-types-claude
WORKTREE: E:\VNOffice-claude-types
OBJECTIVE: Identify the regression with phase evidence, preserve user-entry type detection, save lan14 alone under 600 s, run legacy 28-file LAN and final Node/Python gates. Do not merge main.

FINDINGS:
- Starting commits: d9a3963b (WIP), 88b03386 (clean merge), 4919c607 (merge's main parent).
- NEW EVIDENCE supplied by Claude: main b45684ff saved lan14 with TONG 0, clean lint, Excel OK in 484 s; clean merge 88b03386 timed out three times at 1200 s, including with 9–10 GB free RAM. Original type-detection branch previously saved in 449 s. These are supplied results, not reruns in this resumed session.
- The local snapshots from the previous run are main b45684ff, original 527a6ce6, merge 88b03386. Their main.py files contain appended measurement wrappers, executed only when run as __main__. Importing them through the CDP Save As harness uses their original API implementation.
- Existing main/original perf logs ended after hydration: they do not prove completed saves.
- inferUserInput is called only from setCellValue with userInput=true. The FODS load path builds cell maps directly; inference is not visibly added to its per-cell loop. Runtime counts are required before excluding it.
- Main b45684ff is newer than merge's main parent 4919c607; record revisions explicitly in any bisect conclusion.

IMPLEMENTATION SUMMARY:
- Existing WIP releases temporary per-row XML after model construction; retains values/styles, repeated rows, formulas and local named ranges.
- Added harness-only timing for hydration, inference call count/time, serialization size/time, and Save As. Existing Python perf hooks time conversion/overlay/optimization.
- Save deadlines and pass criteria remain unchanged. Desktop input is CDP only; Office is hidden COM with private-process ownership checks.

FILES CHANGED: scripts/layout-audit/roundtrip-save-sheet.mjs; this handoff. Existing WIP files remain under review.
COMMANDS RUN: git log -3; git diff main --stat; git status; focused source/history reads; RAM/process gates; git diff --check; merge-tree read-only experiment for main4919 + 3e395744 (conflicts in grid/CSS, no branch/index changes).
BUILD RESULT: NOT RUN.
TEST RESULTS: NOT RUN in this resumed session. A resource-gated WIP lan14 desktop measurement is queued.
KNOWN FAILURES: clean merge lan14 timeout and CH-6 lan01/03/04/05 save failures are supplied evidence, pending resumed verification.
RISKS: no measured root cause yet; do not claim the XML-release WIP solves the regression.
DEPENDENCIES/BLOCKERS: another Python LAN batch in E:\VNOffice-agy-clipboard currently prevents heavy audits. The queued command checks for zero competing Python batch processes and >3 GB free RAM before launch.
CORE PATCH ID (if any): None.
NEXT ACTION: complete phase runs and bisect; smallest justified fix; legacy full 28-file audit; CH-6 failure explanation; one final full Node/Python gate; commit and report readiness.

## NEW EVIDENCE — 03/10/2026 10:27 (Asia/Saigon)

- Merged current `main` (`0b9a3dad`, including CH-4/CH-7.2/CH-8.1/grid/0.9.7/time input) as merge commit `db23fb7d`. Conflicts retained both feature sets; `tests/run-tests.js` has suites 1–228 with no duplicate or missing suite number.
- Supplied baselines remain: main `b45684ff` saved lan14 in 484 s; original type branch `527a6ce6` saved in 449 s; clean combined merge `88b03386` timed out at 1200 s three times. These three baseline values were not rerun in this continuation.
- Measured current branch with the required legacy command: `lan14.xlsx saved total 0 ... lint clean seconds 436.0`. A direct phase run completed in 289.764 s: initial soffice 28.632 s; native overlay 42.105 s; optimize FODS 25.946 s; `parseFods` 54.582 s (DOM 9.775 s, model 29.659 s); hydration 231.762 s; serialize 11.693 s / 327,633,110 chars; write source 4.083 s; native conversion/postprocess 18.962 s; save phase 46.473 s.
- The hydrated model contains 1,490,828 cells and used about 2.522 GB JS heap. Runtime instrumentation recorded `inferUserInput` calls=0/time=0 during import, disproving the suspected per-cell type-inference path. The clean merge retained all parsed row/cell DOM subtrees; the focused fix releases each row subtree immediately after the model owns its data. The desktop regression proves `retainedXmlCells=0` while repeated cells, text, formulas, cached values and local names remain intact (7/7 PASS). This removes the extra DOM graph before the 327 MB save string is allocated and is the root-cause fix for the combined-branch peak-memory stall.
- CH-6 `batch_document_audit.py` now saves lan01/03/04/05: all four have TỔNG 0 and lint clean. Its earlier “not saved” symptom is fixed by the WIP CDP chunking/in-page bridge. The remaining Office gate is external: even the original lan01 opens behind a modal `Microsoft Office Activation Wizard`; COM then returns sheet count 0 / `RPC_E_CALL_REJECTED`. OS input is forbidden, so this cannot be dismissed automatically. The Excel oracle now keeps COM objects in the caller scope, rejects count 0, prints close failures, appends Office output to the unified report, and kills only the exact Excel PID it created if COM Quit leaves it behind.
- Targeted results: native value tests 5/5 PASS; Python type-detection XLSX 1/1 PASS; repeat/undo/format combined 51/52 with the lone isolated Ctrl+1 test depending on full-run ShortcutManager initialization; XML-release desktop test 7/7 PASS. Full 28-file legacy audit and one final Node/Python gate remain pending.

## BLOCKING EVIDENCE — full legacy batch 03/10/2026 10:30–11:03

- Resource gate before launch: 10.31 GB free RAM, zero competing `_batch_audit` / `batch_document_audit` Python processes, exactly 28 LAN XLSX inputs. The batch used a fresh parent `LOCALAPPDATA`; each desktop launch also used the harness's private profile.
- lan01–lan13 each produced a saved `_rt_lanNN.xlsx`; all 13 corresponding audit files report `TONG sai lech: 0`. The batch advanced normally between files, including the large lan06.
- The in-batch lan14 child started at 10:48:32. After 15 minutes it still had no `_rt_lan14.xlsx`. Free RAM had recovered to 10.39 GB, but its renderer did not answer an independent read-only CDP evaluation. This differs from the two successful same-branch standalone results above (legacy 436.0 s and direct phase 289.764 s), so the focused DOM-release fix is necessary but the sequential 28-file harness/run remains nondeterministic.
- Per the owner's 15-minute rule, the owned batch PTY was interrupted with Ctrl+C. Its lan14 Python/Node/WebView child PIDs exited; no process was stopped by name and no unrelated PID was stopped. The buffered batch log did not flush and the legacy report therefore remains the prior standalone lan14 report.
- Full legacy result: **FAIL / incomplete — 13/28 saved and TỔNG 0 were observed; lan14 stalled; lan15–lan28 NOT RUN.** Excel-open verification is additionally BLOCKED by the Office Activation Wizard documented above.
- Final full Node gate: **NOT RUN**. Final full Python gate: **NOT RUN**. They were intentionally not started after the mandatory stop condition.
- Status: **NOT READY TO MERGE**. Next run should first make the legacy save driver queue the save asynchronously and poll file/save state (as current main's direct CDP driver does), while preserving the 1200 s pass criterion; then rerun lan14 after lan01–lan13 before restarting the full 28-file gate. Do not rerun the already-proven standalone baseline first.
