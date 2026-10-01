# Agent Handoff

TASK: Acceptance audit of 3T Sheet C3–C12 against desktop Excel, with scoped fixes and audit report.
AGENT/ROLE: Codex — Sheet acceptance audit
BRANCH: `audit/sheet-c3-c12-codex`
WORKTREE: `E:\VNOffice-codex-audit-sheet2`
OBJECTIVE: Audit C3–C12 using 3T's WebView2 CDP and hidden Excel COM; fix small Sheet-layer defects, document failures and incomplete checks, and leave the work committed on this branch.
FINDINGS: Small Sheet-layer fixes address AutoFill date progression and double-click fill, AutoFilter scope, and rejected data-validation commits. C10 charts and most recorded C11 settings persist to Excel; 3T reopen resets fit-to-page, print-title, and header/footer state. Excel reads a formula input as text (`B2="30"`), so `SUM`/`COUNT` omit it; 3T reopen also shows a stale formula result. C7 delete/tab-colour UI is missing, C8 sort includes the header, and C3 is limited to 26 columns × 200 rows. The large-workbook check and the full per-sub-point mouse/keyboard + Excel COM + save/reopen matrix for C3–C9 remain incomplete.
IMPLEMENTATION SUMMARY: Merged `main` as requested with no conflicts. WIP code adds focused Sheet-layer fixes and unit tests. Updated `docs/AUDIT-SHEET-C3-C12.md` with CDP findings, hidden Excel COM chart/page/value readback, known failures, and precise follow-up tasks. No save pipeline or LibreOffice Core code was changed.
FILES CHANGED:
- `apps/sheet/sheet-grid.js`
- `tests/run-tests.js`
- `tests/unit/sheet-autofill.test.js`
- `tests/unit/sheet-data-tools.test.js`
- `docs/AUDIT-SHEET-C3-C12.md`
- `docs/AGENT-HANDOFF-SHEET-C3-C12.md`
COMMANDS RUN: `node tests/run-tests.js`; CDP desktop checks through the WebView2 remote-debugging port; hidden Excel COM, read-only for the saved audit workbook and on a separate copy for sort comparison; `git diff --check` (no whitespace errors; Git reported the existing LF-to-CRLF working-copy warning for the edited audit file).
BUILD RESULT: NOT RUN.
TEST RESULTS: `node tests/run-tests.js` PASS — 2228/2228, 0 failures. No build run.
KNOWN FAILURES: C3 worksheet extent (26×200); C7 delete-sheet/tab-colour controls absent; C8 ascending sort includes header; C11 fit-to-page, print titles, and header/footer reset after 3T reopen; C12 numeric text serialization and stale 3T formula result. Large-workbook responsiveness NOT RUN. Full C3–C9 input/parity/round-trip matrix NOT RUN.
RISKS: Numeric/date values may be treated as text in XLSX and yield incorrect formula results in Excel. Print layout values are not stable through a 3T reopen. Do not treat the observed UI-path passes as full Excel parity for C3–C9.
DEPENDENCIES/BLOCKERS: Finish the C3–C9 acceptance matrix and large-workbook check; implement or hand off the listed app gaps. Shared Excel processes may belong to other worktrees; only inspect hidden COM when no Excel process is active and do not attach to or kill another owner's process.
CORE PATCH ID (if any): None.
NEXT ACTION: Complete `C3-C9-SHEET-FULL-ACCEPTANCE-MATRIX`, then prioritize `C4/C6/C12-SHEET-NATIVE-VALUE-ROUNDTRIP`, `C11-SHEET-PAGE-SETUP-ROUNDTRIP`, and the C3/C7/C8 follow-up tasks. Add Vietnamese in-app instructions with each new feature per AGENTS.md.
