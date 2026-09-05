# Agent Handoff

TASK: VN Sheet Goal Seek (`sheet.data.goalSeek`)
AGENT/ROLE: Codex / Sheet implementation and verification
BRANCH: `feature/sheet-goal-seek`
WORKTREE: `E:\VNOffice-codex-sheet-goalseek`
OBJECTIVE: Add a real Goal Seek workflow to VN Sheet's Data tab, with numeric convergence, explicit confirmation, failure safety, and atomic Undo/Redo.
FINDINGS: `FormulaEngine` reads the active sheet Map; `setCellValue()` stores formulas in `formula`, raw calculated results in `val`, and triggers `_recalculateAllFormulas()`. Existing history type `cell` already provides the correct one-cell atomic Undo/Redo behavior. Indirect dependency order is not topologically sorted, so Goal Seek repeats formula evaluation enough times to settle the active-sheet chain during each trial.
IMPLEMENTATION SUMMARY: Added a Data Tools ribbon button with a dedicated SVG; bound `sheet.data.goalSeek` through `SheetAdapter`; added coordinate/type validation, secant search with expanding probes and bisection when a sign bracket is found, 100-iteration default and `0.001` tolerance; restored all trial mutations before returning; added a two-stage accessible dialog where preview does not mutate the workbook and OK commits the changing cell through one normal history action. Failure returns `Goal Seek không tìm được đáp án phù hợp.` and never commits a guessed value.
FILES CHANGED:
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet-ribbon.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/unit/sheet-goal-seek.test.js`
- `tests/live/sheet-goal-seek.playwright.mjs`
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-GOAL-SEEK.md`
COMMANDS RUN:
- `node --check apps/sheet/sheet-grid.js`
- `node --check apps/sheet/sheet-ribbon.js`
- `node --check adapters/libreoffice/sheet/sheet-adapter.js`
- Focused `runSheetGoalSeekTests()` and Sheet/Slides i18n suite
- `node tests/run-tests.js`
- `node tests/live/sheet-goal-seek.playwright.mjs`
- `git diff --check`
BUILD RESULT: PASS — repository has no separate production build command; syntax checks passed through the full runner.
TEST RESULTS: PASS — full runner `849/849 PASS | 0 FAIL` in `50.64s`; live Edge Playwright PASS on the running Sheet canvas for ribbon/dialog/preview/apply/cancel, without SendKeys. Unit coverage includes A1=5, A2=`=A1*2+10`, target A2=50 => A1=20; indirect dependency; constant non-convergence; validation; and one-step Undo/Redo.
KNOWN FAILURES: None.
RISKS: Goal Seek is a numeric one-variable solver, so discontinuous/non-numeric formulas or formulas without a reachable root correctly return failure. Trial dependency settling is limited to the active sheet; cross-sheet changing/target cells are not exposed by this dialog.
DEPENDENCIES/BLOCKERS: None. No paid library or new dependency added.
CORE PATCH ID (if any): N/A — no LibreOffice Core/upstream change.
NEXT ACTION: Review or cherry-pick commits `fc39e03` and `ae7e68c` plus this handoff commit from `feature/sheet-goal-seek`; do not merge automatically into `main`.
