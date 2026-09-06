# Handoff — VN Sheet Custom Sort (multi-level)

**Branch:** `feature/sheet-custom-sort`
**Worktree:** `E:\VNOffice-claude-sheet-custom-sort`
**Author:** Claude (Lead Agent), done directly while Grok's API balance was exhausted
**Base:** `main` @ `862bb3d` — `node tests/run-tests.js` 1318/1318 PASS before starting.

## Objective

Real gap flagged during the Sheet Ribbon-parity-with-Excel audit
(docs/HANDOFF-SHEET-RIBBON-PARITY-ROUND1.md): VN Sheet only had
single-column Sort A-Z / Z-A. Excel's real Data > Sort dialog lets a
user sort by several columns in priority order ("Sort by Column X,
Then by Column Y, Then by Column Z"), each with its own direction.
This adds that as a real feature (data model + dialog + ribbon
command), not a placeholder.

## Design decisions

- New engine method lives on `SheetDataTools` (apps/sheet/data-tools.js),
  matching where `removeDuplicates`/`subtotal`/`textToColumns` already
  live, not as a one-off on the grid controller. `SheetGridController`
  gets a one-line delegate (`sortMultiLevel(options)`), the same
  pattern already used for `removeDuplicates`/`createSubtotal`.
- Number/text comparison reuses the exact rule from the existing
  single-column `sort()` (strip `.` as a thousands separator, then
  non-digit characters, compare numerically if both sides parse;
  otherwise `localeCompare` with `vi-VN`) so multi-level and
  single-column sort behave identically on the same data - no second,
  slightly different comparison rule to maintain.
- Up to 4 levels; a level whose column isn't inside the selected range
  is silently dropped rather than causing an error (covers, e.g., a
  narrower re-selection after opening the dialog). Sorting is a stable
  sort (JS `Array.prototype.sort`), so ties at an earlier level keep
  their relative order and are decided by the next level - this is
  what makes multi-level sort meaningful at all.
- Header row handling matches `removeDuplicates`/`subtotal`: `hasHeader`
  shifts the first sortable row down by one and that row is never
  touched.
- Undo/redo is free: `snapshotMutation()` (already used by every other
  SheetDataTools method) records a single `grid-structure` history
  entry around the whole operation.
- Dialog UI (`showCustomSortDialog` in sheet-grid.js) follows the exact
  `_createSheetDialog` convention every other Sheet dialog uses (same
  focus trap, Escape/Enter, ARIA already built into that helper) -
  levels are rendered from a small in-closure array and re-rendered on
  Add/Remove Level; column `<option>` labels show the header-row
  preview text the same way `showRemoveDuplicatesDialog`/
  `showSubtotalDialog` already do.
- New ribbon button (`sheet.data.customSort`) added as a small
  icon-only button in the existing Sort & Filter group on the Data tab,
  next to the pre-existing large Sort A-Z/Z-A/Filter buttons - not a
  new group, to minimize ribbon-width risk.
- New UNO mapping `.uno:DataSort` (the real LibreOffice/Excel command
  for opening the Sort dialog) added to command-dispatch-mapper.js
  alongside the existing `.uno:Sortup`/`.uno:Sortdown`/
  `.uno:DataFilterAutoFilter` entries.

## Files changed

- `apps/sheet/data-tools.js` — `sortMultiLevel()`.
- `apps/sheet/sheet-grid.js` — `sortMultiLevel()` delegate,
  `showCustomSortDialog()`.
- `platform/commands/command-definitions.js` — `sheet.data.customSort`.
- `adapters/libreoffice/common/command-dispatch-mapper.js` — UNO
  mapping.
- `adapters/libreoffice/sheet/sheet-adapter.js` — dispatch case.
- `apps/sheet/sheet-ribbon.js` — ribbon button.
- `platform/ui-kit/icons.js` — `sortCustom` icon.
- `platform/i18n/strings-vi.js` / `strings-en.js` — command label/
  tooltip entry, plus dialog-string entries (title, Add/Delete Level,
  Sort by/Then by, column/order labels).
- `platform/help/entries-sheet.js` — extended the existing
  `sheet.data.sortFilter` help entry (commandIds, summary, keywords,
  a new step) rather than creating a duplicate entry for the same
  ribbon group.
- `tests/unit/sheet-data-tools.test.js` — 5 new tests: command mapping/
  dispatch, a real 2-level sort with header and undo/redo, a
  no-header single-column case, an out-of-range-level-is-dropped case,
  and two distinct boundary cases (an empty valid-levels list returns
  false; a single remaining data row returns a harmless no-op with
  sorted: 0 rather than being treated as an error).
- `tests/live/sheet-custom-sort.playwright.mjs` — new, real
  browser end-to-end test: types real data into cells, opens the
  ribbon Data tab, clicks the real Custom Sort button, sets both
  levels' column/order through the real dialog controls, clicks Apply,
  and asserts the real post-sort cell values (not a mocked call) -
  plus confirms Ctrl+Z-equivalent undo() restores the original order.

## Test results

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1323/1323 PASS (1318 baseline + 5 new).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 104/104 PASS,
  0px overflow anywhere (the new icon-only button did not push the
  Data tab past 1280px in either language).
- `node tests/live/sheet-custom-sort.playwright.mjs`: PASS - the real
  dialog, real column/order selects, real Apply click, and real
  resulting cell values were all exercised, not mocked.

## Known limitations (honest, not hidden)

- No sort-by-cell-color/font-color/icon criteria (Excel's "Sort On"
  dropdown beyond Values) - VN Sheet has no such per-cell metadata to
  sort by yet.
- No "Copy Level" button (Add/Delete only) - a minor convenience gap,
  not a correctness one.
- Column `<option>` labels always show the header-row preview text
  regardless of whether "My data has headers" is checked, matching
  the exact same (pre-existing) behavior in
  `showRemoveDuplicatesDialog`/`showSubtotalDialog` - not a new
  inconsistency introduced here.

## Rollback

Revert the branch; nothing outside `feature/sheet-custom-sort` was
touched.
