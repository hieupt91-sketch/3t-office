# Agent Handoff

**TASK:** Excel-style formula entry in 3T Sheet, including autocomplete acceptance, point mode, reference highlighting, commit/cancel, and live browser coverage.

**AGENT/ROLE:** Codex — VN Sheet owner

**BRANCH:** `fix/sheet-formula-entry-codex`

**WORKTREE:** `E:\VNOffice-codex-formulaentry`

**OBJECTIVE:** Keep formula editing alive in the formula bar while users accept function suggestions and point to cells or ranges. Provide the same formula entry behavior from the cell grid.

## FINDINGS

- The existing formula bar was the shared editor for grid entry, but beginning a range selection committed the active formula. That caused the reported loss after accepting a suggestion and clicking the grid.
- Existing formula autocomplete, syntax tooltip, formula engine, Help panel, and i18n were reused. No new dependency, LibreOffice Core change, adapter change, or production server was needed.
- Autocomplete suggestions now use the functions with evaluator implementations; the function catalog itself remains unchanged at 97 entries.

## IMPLEMENTATION SUMMARY

- Added `FormulaEntrySession` helpers for suggestion insertion, argument/reference caret handling, point-mode click/drag/modifier selection, sheet-qualified references, reference scanning, F4 absolute-reference cycling, Enter parenthesis completion, and Escape restore.
- Kept one edit session active through formula-bar/grid point selection, live range dragging, cross-sheet selection, and status updates. Added colored reference text and matching grid borders. Preserved ordinary range selection outside formula point mode, IME composition input, fill handle behavior, and Ctrl+Shift+Enter array entry.
- Added Vietnamese autocomplete descriptions, current-argument tooltip highlighting, `Nhập` / `Sửa` / `Trỏ` status labels, and a detailed Vietnamese Help entry under **Công thức → Hàm tính toán**.
- Added unit tests and a Playwright live scenario for grid and formula-bar entry. The implementation plan is in `docs/PLAN-SHEET-FORMULA-ENTRY.md`.

## FILES CHANGED

- `apps/sheet/formula-entry.js`
- `apps/sheet/formula-engine.js`
- `apps/sheet/formula-autocomplete.js`
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet-app.js`
- `apps/sheet/sheet.css`
- `platform/ui-kit/components.js`
- `platform/ui-kit/ui-kit.css`
- `platform/help/entries-sheet.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `tests/unit/sheet-formula-entry.test.js`
- `tests/live/sheet-formula-entry.playwright.mjs`
- `tests/run-tests.js`
- `docs/PLAN-SHEET-FORMULA-ENTRY.md`
- `docs/HANDOFF-SHEET-FORMULA-ENTRY.md`

## TEST RESULTS

- **PASS** — `node tests/run-tests.js`: 2202/2202 PASS, 0 FAIL.
- **PASS** — Playwright live grid flow: type `=SUM`, press Tab, drag `A1:A5`, type `)`, press Enter; calculated result is 15.
- **PASS** — Playwright live formula-bar flow: point to `Sheet2!A1:A2`, return to Sheet1 on Enter, and calculate result 30.
- **PASS** — `git diff --check`.
- **NOT RUN** — `python -m unittest discover -s tests`; no Python files were changed.
- **NOT RUN** — separate build; no build-system changes were made or requested.

The full suite initially had one transient headless Edge single-app mount failure. A direct Edge check passed, and a subsequent complete suite run passed all 2202 tests.

## KNOWN LIMITATIONS / RISKS

- Supported autocomplete names are the functions with branches in the current formula evaluator. This does not claim full Excel function coverage.
- Cross-sheet formulas use the engine's current `Sheet2!A1` syntax and current evaluator semantics.
- No Python or LibreOffice Core changes were required.

## DEPENDENCIES / BLOCKERS

- No new dependencies or blockers.
- Python test suite: **NOT RUN**, because Python sources were untouched.

## CORE PATCH

None.

## NEXT ACTION

Review and merge this branch when approved. This task does not merge into `main`.
