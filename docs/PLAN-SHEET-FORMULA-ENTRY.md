# Plan: 3T Sheet Excel-Style Formula Entry

## Objective

Keep a formula edit alive while the user accepts a function suggestion and points to cells or ranges. Match Excel-style keyboard and mouse behavior in the formula editor/formula bar, including argument hints, reference highlighting, cross-sheet references, cancel/commit, and array entry.

## Current capability

- `apps/sheet/formula-engine.js` has a function catalog, prefix matching, formula-context parsing, and argument syntax formatting.
- `apps/sheet/formula-autocomplete.js` and shared UI-kit popups display suggestions and syntax hints, currently wired to the formula bar input.
- `apps/sheet/sheet-grid.js` keeps an original cell value for Escape, supports Ctrl+Shift+Enter, and has normal drag selection. Its range-selection start commits an active formula-bar edit, which causes the reported point-mode loss.
- Sheet Help already uses `platform/help/entries-sheet.js`; localization strings live under `platform/i18n/`.
- No LibreOffice/Core or new dependency is needed; formula evaluation stays in the existing Sheet engine.

## Files/modules

- `apps/sheet/formula-engine.js`: expose/filter the catalog against functions actually dispatched by the evaluator; extend pure parsing helpers only as needed.
- `apps/sheet/formula-entry.js` (new): pure editing-state helpers for point eligibility, reference insertion, range extension, sheet-qualified references, and F4 absolute-reference cycling.
- `apps/sheet/sheet-grid.js`: centralize edit state for the shared formula input/cell editor; handle Enter/Esc/F2, point-mode pointer and sheet-tab selection, live drag range updates, reference borders, status mode, commit/cancel, and array-enter compatibility.
- `apps/sheet/formula-autocomplete.js`: keep suggestion acceptance and argument context synchronized with the active editor/caret; retain popup-only Escape behavior.
- `apps/sheet/sheet.css` and, if required for reusable popup presentation, `platform/ui-kit/ui-kit.css`: editor reference colors/borders and argument/status affordances.
- `platform/help/entries-sheet.js`: add Vietnamese steps naming the 3T Sheet formula bar and grid interactions.
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`: add labels/status strings for Nhập / Sửa / Trỏ and point-mode messaging.
- `tests/unit/sheet-formula-entry.test.js`, `tests/unit/formula-autocomplete.test.js`, `tests/run-tests.js`: cover pure edit behavior and controller filtering/insertion/context.
- `tests/live/sheet-formula-entry.playwright.mjs`: browser-level acceptance check for `=SUM`, Tab, drag A1:A5, `)`, Enter, and result.
- `docs/HANDOFF-SHEET-FORMULA-ENTRY.md`: required outcome, test truth, risk, and commit handoff.

## Dependencies

- Reuse existing Sheet engine, autocomplete UI-kit, Help panel, i18n, and Playwright test server conventions.
- No external dependency, shared-platform API, build-system, file-format, adapter, or Core change planned.
- The current worktree/branch was supplied by the owner; all changes and commit remain on `fix/sheet-formula-entry-codex`.

## Risks and mitigations

- Pointer gestures currently mean ordinary range selection. Gate point-mode behavior strictly on active formula editing and a syntactically valid reference insertion position; retain the existing selection path otherwise.
- Formula bar blur/clicks can lose caret state. Capture the input selection before pointer interaction, prevent the grid press from taking focus, and restore the active editor after inserting references.
- Dragging and modifier clicks can produce malformed references. Keep insertion/replacement ranges explicit, update the in-progress range on every pointer move, and unit-test the string transformations.
- Vietnamese IME must not be interrupted. Avoid composition events and printable key interception while `isComposing`/composition is active; only handle formula navigation shortcuts outside composition.
- Reference highlighting must not change formula text. Keep rendering state separate from the formula value and refresh after edits, sheet changes, commit, and cancel.
- Supported autocomplete names must come from evaluator dispatch, not catalog presence alone.

## Test plan

- Unit tests for supported-function filtering, prefix matching and insertion; tooltip argument index; click/drag/Shift/Ctrl point insertion; cross-sheet references; F4 cycles; Escape restore; and Enter parenthesis completion.
- Add a Playwright live test for typing `=SUM`, accepting with Tab, dragging `A1:A5`, typing `)`, pressing Enter, and checking the calculated result.
- Run the owner-required `node tests/run-tests.js` and report PASS/FAIL/NOT RUN/BLOCKED truthfully. No Python files are planned to change; run Python unittest only if implementation expands into Python.
- Run syntax checks only as part of implementation review where useful; do not claim them as the requested test suite.

## Rollback

Keep the change isolated to the files above and the supplied branch. If review finds a regression, revert the feature commit on this branch after recording the failing scenario; do not reset or rewrite shared Git history.
