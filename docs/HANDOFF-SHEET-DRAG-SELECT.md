# Agent Handoff

TASK: VN Sheet mouse drag selection parity
AGENT/ROLE: Codex / Sheet app-layer implementation
BRANCH: `fix/sheet-mouse-drag-select-codex`
WORKTREE: `E:\VNOffice-codex-dragselect`
OBJECTIVE: Reproduce and fix selection behavior with real browser mouse input; add regression coverage and Vietnamese in-app Help; commit on this branch without merging.

## FINDINGS

The original grid already painted a normalized rectangular range during a basic drag, and that range survived mouseup. The active cell remained at the mouse-down anchor, however, so the status bar reported only that cell. Reverse drags had the same active-cell issue. Ctrl+click collapsed selection to one cell; row/column header drags were not implemented; edge scrolling stopped after a single fixed increment; and dragging from formula-bar edit mode committed the value but left the active cell at the starting point. A frozen-pane drag painted the range but also left the anchor active.

The baseline live test routes the browser to the original `HEAD:apps/sheet/sheet-grid.js` and uses actual Playwright mouse input. It failed 14 assertions before the implementation. The baseline did not show browser text selection, and the basic range itself remained selected after mouseup; those observations are preserved here rather than reported as new fixes.

| Workflow | Before (original grid) | After |
| --- | --- | --- |
| Drag B3 to E10 | Range/name box B3:E10, 32 cells painted; active B3, status only Count 1 / Average 1 / Sum 1 | Active E10; live status Count 32 / Average 16.5 / Sum 528; range persists after mouseup |
| Reverse E10 to B3 | Range normalized to B3:E10; active remained E10 | Anchor E10 retained, active endpoint B3 |
| Shift+click then Shift+Arrow | Range painted, but active remained at anchor and keyboard extension proceeded from the wrong point | Extends from the saved anchor; active endpoint is used by the next Shift+Arrow |
| Ctrl+click | Collapsed to E10 | Keeps separate areas `B3,E10`, highlights both, and aggregates each selected cell once |
| Row/column headers | Drag did not update selection | Selects whole rows/columns; Name Box displays Excel-style `3:10` and `B:E` |
| Hold at bottom-right edge for about one second | One fixed scroll increment; endpoint V32 | Continuous distance-based scrolling reaches column Z and at least row 60; final run reached Z70 |
| Format Painter drag | Applied the source format across B22:D22; values stayed unchanged | Same behavior, with the target range and endpoint retained |
| Drag from formula-bar edit | Value 777 committed, active cell remained B3 | Value 777 committed before the drag; E10 becomes active |
| Frozen-pane drag B20:E40 | Range painted, active remained B20 | Range crosses frozen-pane boundaries with E40 active |
| Native text selection | None observed in the baseline browser path | None observed; grid/cells explicitly disable text selection |

## IMPLEMENTATION SUMMARY

- Added directed anchor/active selection state, normalized range helpers, active-cell highlighting, and current Name Box/status updates during pointer movement.
- Added Ctrl+click/Ctrl+drag disjoint areas with deduplicated status and range operations, plus full-row/full-column header dragging and Excel-style Name Box labels.
- Replaced the fixed edge increment with a requestAnimationFrame loop whose horizontal and vertical scroll speed increases with distance beyond the viewport edge. The loop continues to update the active range while virtual rows and frozen panes move.
- Commits an active formula-bar edit before beginning a range drag. Format Painter continues to apply to the dragged area and now handles each selected area.
- Added shared Help entry `sheet.selection.range` in Vietnamese. It covers mouse and keyboard selection, whole rows/columns, multiarea selection, Name Box/status, edge scrolling/frozen panes, Format Painter, and edit commit. Open it from the app Help (`F1` / tab Trợ giúp) by searching for “chọn vùng”.
- No LibreOffice Adapter or Core changes and no new dependency.

## FILES CHANGED

- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet.css`
- `platform/help/entries-sheet.js`
- `tests/live/sheet-range-selection.playwright.mjs`
- `tests/run-tests.js`
- `tests/unit/sheet-range-selection.test.js`
- `tests/unit/sheet-editing-styles.test.js`
- `tests/unit/sheet-help.test.js`
- `tests/unit/sheet-keyboard-audit.test.js`
- `tests/unit/sheet-mouse-shortcuts.test.js`
- `tests/unit/sheet-status-bar-sum.test.js`
- `docs/HANDOFF-SHEET-DRAG-SELECT.md`

## COMMANDS RUN

- PowerShell: `$env:VNO_SHEET_SELECTION_BASELINE_REV = 'HEAD'; node tests/live/sheet-range-selection.playwright.mjs` (the test intentionally exercises the original grid source).
- `node tests/live/sheet-range-selection.playwright.mjs`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `git diff --check`

BUILD RESULT: NOT RUN — the change is confined to existing JavaScript/CSS app code; the requested live and repository test gates were run.

## TEST RESULTS

- Baseline live test against original `HEAD` grid: FAIL as expected before the fix, 14 selection assertions. The failures cover active endpoint/status aggregation, reverse/Shift continuation, Ctrl multi-area, row/column headers, continuous edge scrolling, edit-mode endpoint, and frozen-pane endpoint.
- Final live Playwright mouse workflow: PASS. Real mouse down/move/up checks covered the range preview, mouseup persistence, forward/reverse drag, Shift+click and subsequent Shift+Arrow, Ctrl+click, row/column header drags, Ctrl+Arrow/Ctrl+A regression checks, auto-scroll, Format Painter, formula-bar edit commit, frozen panes, and browser runtime errors.
- `node tests/run-tests.js`: PASS, 2123/2123.
- `python -m unittest discover -s tests`: PASS, 468 tests in 402.562 seconds. This run overlapped an existing soffice-backed print audit in another worktree; all tests passed, so an isolated rerun was not needed.
- `git diff --check`: PASS, no whitespace errors.

KNOWN FAILURES: None in the final requested test gates. The pre-fix live test is intentionally expected to fail.

RISKS: The Sheet controller now keeps directed selection endpoints separate from normalized rectangle bounds. Keyboard, fill, deletion, status, and format-painter paths that share selection state have regression coverage in the Node suite and live workflow.

DEPENDENCIES/BLOCKERS: None. Existing test-only Playwright/Edge installation reused; no production dependency added.

CORE PATCH ID (if any): None.

NEXT ACTION: Review this committed branch; do not merge to `main` as part of this task.
