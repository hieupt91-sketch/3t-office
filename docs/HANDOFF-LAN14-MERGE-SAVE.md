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
