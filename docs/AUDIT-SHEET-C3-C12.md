# Acceptance audit — 3T Sheet C3–C12

**Worktree:** `E:\VNOffice-codex-audit-sheet2`  
**Branch:** `audit/sheet-c3-c12-codex`  
**Audit method:** real desktop WebView2 started by `main.py`; all worksheet and ribbon input was sent through CDP (`page.mouse` / `page.keyboard`) with a dedicated remote-debugging port. Excel checks use hidden COM only (`Visible = False`). C1 and C2 are excluded as requested; see `E:\VNOffice-codex-audit-sheet\docs\AUDIT-SHEET-BASICS.md`.

Status meanings: **ĐẠT** = observed to work in this audit; **CHƯA ĐẠT** = observed mismatch or missing UI; **NOT RUN** = no result; **BLOCKED** = test could not proceed for the stated reason. A UI result alone does not establish XLSX persistence.

## Results

| Item | Sub-point | Status | Evidence |
|---|---|---|---|
| C3 | Select one cell | ĐẠT | CDP mouse click on a cell selected that coordinate and updated the formula bar. |
| C3 | Select a range | ĐẠT | CDP mouse drag selected the requested rectangular range; range coordinates were read from the live grid model. |
| C3 | Select whole row and whole column | ĐẠT | CDP click on row/column headers selected the corresponding visible row/column. |
| C3 | Ctrl+A | ĐẠT | CDP keyboard `Ctrl+A` selected the current used/grid range. |
| C3 | Shift+arrow extension | ĐẠT | CDP keyboard `Shift+Arrow` extended selection from the active cell. |
| C3 | Ctrl+arrow navigation | ĐẠT | CDP keyboard `Ctrl+Arrow` moved to the edge of the contiguous data region. |
| C3 | Full Excel worksheet extent | CHƯA ĐẠT | The live grid exposes only columns A:Z and 200 rows. Selection works within that cap; Excel-sized rows/columns were not reachable. |
| C4 | Fill numeric series | ĐẠT | CDP fill handle and `Ctrl+D` continued a two-number series. Each fill was undone with `Ctrl+Z`. |
| C4 | Fill date series | ĐẠT | CDP fill continued dd/mm/yyyy dates across month/year rollover after the fix; the live cells remain text values, so Excel date serial and XLSX parity are still pending. |
| C4 | Fill weekdays and months | ĐẠT | CDP fill continued weekday and month sequences in the live grid; undo restored the source range. |
| C4 | Fill formulas | ĐẠT | CDP fill adjusted relative references down the target range; undo restored the pre-fill cells. |
| C4 | Double-click fill handle | ĐẠT | CDP double-click filled to the contiguous adjacent data boundary; one `Ctrl+Z` reverted the fill. |
| C4 | AutoFill unit coverage | ĐẠT | `tests/unit/sheet-autofill.test.js`: date rollover, double-click fill/Undo, and no-adjacent-data cases pass. |
| C5 | Insert row and adjust formulas | ĐẠT | CDP ribbon/keyboard insert added a row; `D5 = B3*2` moved to `D6 = B4*2`. `Ctrl+Z` restored 200 rows and original formula coordinates. |
| C5 | Insert column and adjust formulas | ĐẠT | CDP context-menu insert at B moved B2→C2 and D5→E5; formula reference changed B3→C3. `Ctrl+Z` restored the original layout. |
| C5 | Delete row and column | ĐẠT | CDP row/column header context-menu delete removed the selected dimension; `Ctrl+Z` restored it. |
| C5 | Set column width and row height | ĐẠT | CDP Format dialogs set width to 55 px and height to 42 px; model layout maps reflected each value and `Ctrl+Z` cleared them. |
| C5 | AutoFit column and row | ĐẠT | CDP double-click AutoFit changed row 2 from 20→26 px and column C from 64→275 px for long content. |
| C5 | Hide/unhide row and column | ĐẠT | CDP Home→Format actions hid row 2 and column A; unhide cleared both hidden sets. |
| C6 | Thousands separators, decimals, date, VND, percent | ĐẠT | CDP shortcuts/ribbon set number styles to two-decimal/thousands, percent, currency `₫` with zero decimals/thousands, and dd/mm/yyyy date. Data-value formatting parity remains pending because these audit inputs are text values. |
| C6 | Alignment, wrap, merge and center | ĐẠT | CDP ribbon actions set horizontal/vertical center, wrap, and merge F2:G2; live style/model state reflected each setting. |
| C6 | Borders, fill, font family and size | ĐẠT | CDP ribbon actions set borders, yellow fill, Arial, and 14 pt (18.67 px) font style. |
| C6 | Undo formatting | ĐẠT | CDP `Ctrl+Z` reverted thousands, percent, bold, alignment, wrap, border, and fill changes in focused checks. |
| C7 | Add and rename sheet | ĐẠT | CDP Add Sheet created a tab; double-click rename changed its name. |
| C7 | Move and copy sheet | ĐẠT | CDP tab context-menu Move changed order and `Ctrl+Z` restored it; Move or Copy dialog created `AuditCopy (2)`. |
| C7 | Delete sheet | CHƯA ĐẠT | Sheet tab context menu contains Rename, Move or Copy, and Protect; no delete-sheet command was present. |
| C7 | Tab colour | CHƯA ĐẠT | No tab-colour command or control is exposed in the live sheet-tab UI. |
| C8 | Sort ascending | CHƯA ĐẠT | CDP A→Z sorted all rows including the `Name` header into the data (`three`, `two`, `two`, `one`, `Name`). `Ctrl+Z` restored order. Excel COM comparison is pending. |
| C8 | AutoFilter range and arrows | ĐẠT | Fixed behavior verified through CDP: explicit A1:B3 range stores A1:B3 and shows arrows only for A/B; single-cell selection infers the used range and limits arrows accordingly. |
| C8 | Freeze panes | ĐẠT | CDP freeze at C3 set frozenRows=2/frozenCols=2; `Ctrl+Z` returned both to zero. |
| C8 | Data validation | ĐẠТ | CDP list validation `Red,Green,Blue` rejects `Yellow`, restores the prior value, shows a localized validation alert, accepts `Red`, and has one valid Undo entry. Focused unit tests cover rejected commits and no Undo entry. |
| C8 | Remove duplicates | ĐẠТ | CDP Remove Duplicates removed the repeated row; `Ctrl+Z` restored it. |
| C9 | Conditional formatting basics | ĐẠТ | CDP rule “greater than 1” applied red to matching E2; `Ctrl+Z` removed the rule. XLSX/Excel persistence pending. |
| C10 | Insert column, line, and pie charts | ĐẠТ | CDP chart builder selected and inserted bar/column, line, and pie types from the selected data range. Focused Undo check confirmed chart count 1→0 after `Ctrl+Z`. |
| C10 | Save chart XLSX and reopen in 3T | BLOCKED | Pending save and reopen while another worktree's 26-file LibreOffice layout batch is still converting files; no XLSX persistence result claimed. |
| C10 | Reopen saved charts in hidden Excel COM | BLOCKED | No saved 3T-produced XLSX is available yet for COM inspection; Excel COM check remains pending with the save/reopen gate. |
| C11 | Print area | ĐẠТ | CDP Page Layout command set A1:B3; `Ctrl+Z` cleared it. |
| C11 | Fit to one page | ĐẠТ | CDP Page Layout scale dialog set mode=pages, width=1, height=1; `Ctrl+Z` restored percent mode. |
| C11 | Print titles | ĐẠТ | CDP set repeating rows to 1:1; `Ctrl+Z` restored empty rows/columns. |
| C11 | Header and footer | ĐẠТ | CDP Insert dialog set center header/footer; `Ctrl+Z` restored defaults. |
| C11 | Page breaks | ĐẠТ | CDP inserted breaks at row 5 and column B; `Ctrl+Z` removed both. |
| C11 | XLSX persistence and hidden Excel comparison | BLOCKED | Page settings were verified in the live model and Undo stack only; saved-workbook inspection awaits an idle LibreOffice conversion slot. |
| C12 | Automatic formula recalculation | ĐẠТ | CDP formula H3=`=H1+H2` evaluated 3+4=7; editing H1 to 8 updated H3 to 12 automatically, and F9 retained 12. |
| C12 | Large workbook responsiveness | NOT RUN | Live grid is capped at 200×26 and no large workbook was loaded for timing. |
| C12 | Save/reopen recalculation in Excel | BLOCKED | No audit XLSX has been saved and reopened in hidden Excel COM yet. |

## Focused changes

- Fixed AutoFill date progression for dd/mm/yyyy and double-click fill to adjacent contiguous data; added focused unit coverage.
- Fixed AutoFilter arrow scope to the stored/inferred filter range.
- Enforced data validation on edit commit, restoring invalid values and avoiding invalid Undo history; added focused unit coverage.
- These are Sheet-layer changes only. No save pipeline or LibreOffice Core code was changed.

## Follow-up tasks

1. **C3-SHEET-GRID-EXTENT** — Replace the 26-column/200-row interaction cap with viewport virtualization over Excel worksheet bounds; preserve header/keyboard navigation and selection performance. Add boundary tests at XFD/1,048,576 and a desktop large-range responsiveness check. Add specific Vietnamese in-app instructions for selecting/navigating large ranges.
2. **C7-SHEET-DELETE-AND-TAB-COLOUR** — Add worksheet-tab Delete and Tab Colour actions, with confirmation for deletion and protection for the last remaining sheet. Cover Undo, XLSX save/reopen in 3T and Excel, and Vietnamese in-app instructions for both actions.
3. **C8-SHEET-SORT-HEADER-DETECTION** — Make ascending/descending sort preserve a header row when the selected data has headers, and match Excel's sort range semantics. Compare the same workbook copy using hidden Excel COM; cover keyboard, ribbon, Undo, XLSX reopen, and Vietnamese in-app instructions.
4. **C10/C11-SHEET-XLSX-PERSISTENCE-AUDIT** — Save representative charts and page layout settings from 3T to XLSX, reopen in 3T and hidden Excel COM, compare chart type/series and page properties, and record Undo/save behavior.
5. **C12-SHEET-LARGE-WORKBOOK** — Load a measured XLSX larger than the current grid cap, exercise selection/edit/recalc/scroll through CDP, and decide whether the cap or rendering path truncates worksheet content. Record timings and Excel COM comparison.
6. **C4/C6-SHEET-NATIVE-DATE-VALUES** — Verify and, if needed, fix typed numeric/date serialization so dates and numeric formats use Excel-compatible underlying values; compare with hidden Excel COM. C1/C2 audit work remains owned by the earlier audit branch.

## Verification record

- `node --input-type=module ... sheet-autofill.test.js`: PASS (3 focused AutoFill cases).
- `runSheetDataToolsTests()`: PASS (13 focused data-tool cases, including the two additions).
- `node tests/run-tests.js`: pending final gate.
- Save/reopen, hidden Excel COM comparison, and large-workbook test: pending as recorded above.
