# Agent Handoff
TASK: FIX-S7 — Sheet parity audit against Excel COM
AGENT/ROLE: Codex / VN Sheet and Adapter integration
BRANCH: `audit/sheet-office-parity-2-codex`
WORKTREE: `E:\VNOffice-codex-fs7`
OBJECTIVE: Audit the remaining Sheet groups against Excel using real app XLSX output and read-only Excel COM; fix reproduced mismatches and commit after each group.
FINDINGS: The previous harness targeted a missing `sheet.format.thousands` command and hardcoded another agent's profile. The existing command is `sheet.format.standard` (“Phân cách hàng nghìn”, Ctrl+Shift+1). With the supplied fixture, the correct numeric cell is C2. Excel COM readback for the saved app file reports Text=`1,234.50`, NumberFormat=`#,##0.00`, matching Excel Comma Style.
IMPLEMENTATION SUMMARY: Updated the Sheet desktop audit harness to use `VNO_APP_ROOT`, required `VNO_CDP_LOCALAPPDATA`, the shared dynamic-port CDP launcher, and the checked-in Sheet fixture; ribbon activation now uses CDP mouse input. Aligned fixture cell coordinates and COM reader mappings. Added Sheet/Excel read-only run instructions to the audit README. Other S7 groups remain to be audited.
FILES CHANGED: `scripts/audit-0610/word_parallel/README.md`; `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`; `scripts/audit-0610/word_parallel/excel-read.ps1`; this handoff.
COMMANDS RUN: Sheet `standard` desktop operation and Excel COM read-only readback with `VNO_APP_ROOT=E:\VNOffice-codex-fs7`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs7`, `VNO_AUDIT_MARK_DIRTY=1`; `node --check scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`; `git diff --check`; `node tests/unit/sheet-format-cells.test.js`; `npm test`; `python -m unittest discover -s tests`; isolated reruns of two Writer DOCX round-trip tests.
BUILD RESULT: NOT RUN (not requested by the ticket).
TEST RESULTS: `npm test` PASS, 3058/3058. `python -m unittest discover -s tests` FAIL, 832 tests with 11 failures and 1 error, all in Writer DOCX/LibreOffice conversion round-trips; two representative failures passed when rerun individually. Sheet format unit test and syntax/diff checks completed without reported failures. Excel COM was read-only.
KNOWN FAILURES: The full Python suite failed intermittently on Writer DOCX open/convert operations with `Không chuyển đổi được tài liệu`; the isolated half-point paragraph and pristine DOCX round-trip tests each passed. Do not report the full Python suite as PASS.
RISKS: Ticket groups beyond the Comma Style command have not yet received the Excel COM comparison in this handoff revision.
DEPENDENCIES/BLOCKERS: Excel desktop is required only for read-only workbook verification. No external blockers identified.
CORE PATCH ID (if any): None.
NEXT ACTION: Continue FIX-S7 groups in ticket order, compare saved XLSX files through Excel COM read-only, fix verified differences, add results, and commit after each group.
