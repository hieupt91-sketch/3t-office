# Acceptance audit — 3T Sheet C3–C12

**Worktree:** `E:\VNOffice-codex-audit-sheet2`  
**Branch:** `audit/sheet-c3-c12-codex`  
**Audit method:** real desktop WebView2 started by `main.py`; all worksheet and ribbon input was sent through CDP (`page.mouse` / `page.keyboard`) with a dedicated remote-debugging port. Excel checks use hidden COM only (`Visible = False`). C1 and C2 are excluded as requested; see `E:\VNOffice-codex-audit-sheet\docs\AUDIT-SHEET-BASICS.md`.

Status meanings: **ĐẠT** = the specific UI path named in the evidence worked; **CHƯA ĐẠT** = observed mismatch or missing UI; **NOT RUN** = no result; **BLOCKED** = test could not proceed for the stated reason. A UI result alone does not establish keyboard/mouse parity or XLSX persistence.

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
| C8 | Sort ascending | CHƯA ĐẠT | CDP A→Z sorted all rows including the `Name` header into the data; `Ctrl+Z` restored order. On a copy, hidden Excel COM sorted `Name / Alpha / Beta / Gamma / Delta` as `Name / Alpha / Beta / Delta / Gamma`, preserving the header. |
| C8 | AutoFilter range and arrows | ĐẠT | Fixed behavior verified through CDP: explicit A1:B3 range stores A1:B3 and shows arrows only for A/B; single-cell selection infers the used range and limits arrows accordingly. |
| C8 | Freeze panes | ĐẠT | CDP freeze at C3 set frozenRows=2/frozenCols=2; `Ctrl+Z` returned both to zero. |
| C8 | Data validation | ĐẠT | CDP list validation `Red,Green,Blue` rejects `Yellow`, restores the prior value, shows a localized validation alert, accepts `Red`, and has one valid Undo entry. Focused unit tests cover rejected commits and no Undo entry. |
| C8 | Remove duplicates | ĐẠT | CDP Remove Duplicates removed the repeated row; `Ctrl+Z` restored it. |
| C9 | Conditional formatting basics | ĐẠT | CDP rule “greater than 1” applied red to matching E2; `Ctrl+Z` removed the rule. XLSX/Excel persistence was not separately compared. |
| C10 | Insert column, line, and pie charts | ĐẠT | CDP inserted column, line, and pie charts from A1:B5. Chart count Undo/Redo was checked (3→2→3). |
| C10 | Save chart XLSX and reopen in 3T | ĐẠT | Saved `VNOffice-Sheet-C3-C12-audit-ddccc66d38014b5eb1f3df07760a5de5.xlsx`; reopening in 3T retained all three chart SVG types (`bar`, `line`, `pie`) and their source data. |
| C10 | Reopen saved charts in hidden Excel COM | ĐẠT | Read-only hidden COM inspection found 3 ChartObjects / 3 Shapes: chart types 51 (column), 4 (line), and 5 (pie); each has one series with category range A2:A5 and value range B2:B5. |
| C11 | Print area | ĐẠT | CDP set A1:B5 and checked Undo/Redo. Hidden Excel COM read `PrintArea=$A$1:$B$5`. The 3T reopen value was not independently captured. |
| C11 | Fit to one page | CHƯA ĐẠT | CDP set width=1 and height=1 and checked Undo/Redo. Hidden Excel COM read `FitToPagesWide=1`, `FitToPagesTall=1`, `Zoom=False`; reopening in 3T reset to percent mode (width=1, height=0). |
| C11 | Print titles | CHƯA ĐẠT | CDP set repeating row 1 and checked Undo/Redo. Hidden Excel COM read `PrintTitleRows=$1:$1`; reopening in 3T showed blank repeating rows. |
| C11 | Header and footer | CHƯA ĐẠT | CDP set center header `VN Sheet Audit` and center footer `Audit &P / &N`, with Undo/Redo. Hidden Excel COM read both exact strings; reopening in 3T reset the header and restored its default footer `Trang &P / &N`. |
| C11 | Page breaks | ĐẠT | CDP inserted row 5 and column B breaks and checked Undo/Redo. Reopening in 3T retained both; hidden Excel COM found one horizontal and one vertical break. |
| C12 | Automatic formula recalculation | ĐẠT | CDP changed B2 from 12 to 30; live `D1=SUM(B2:B5)` updated 92→110. Undo restored 12/92, Redo and F9 restored 30/110. |
| C12 | Large workbook responsiveness | NOT RUN | Live grid is capped at 200×26 and no large workbook was loaded for timing. |
| C12 | Save/reopen calculation and value parity | CHƯA ĐẠT | On 3T reopen, B2=30 but D1 showed stale 92. Hidden Excel COM read B2 as text, B3:B5 as numbers, `D1=SUM(B2:B5)` as 80 and `D2=COUNT(B2:B5)` as 3; expected numeric-input results are 110 and 4. This isolates a numeric value serialization/cache mismatch, not a live formula-engine failure. |

## Focused changes

- Fixed AutoFill date progression for dd/mm/yyyy and double-click fill to adjacent contiguous data; added focused unit coverage.
- Fixed AutoFilter arrow scope to the stored/inferred filter range.
- Enforced data validation on edit commit, restoring invalid values and avoiding invalid Undo history; added focused unit coverage.
- These are Sheet-layer changes only. No save pipeline or LibreOffice Core code was changed.

## Follow-up tasks

1. **C3-SHEET-GRID-EXTENT** — Replace the 26-column/200-row interaction cap with viewport virtualization over Excel worksheet bounds; preserve header/keyboard navigation and selection performance. Add boundary tests at XFD/1,048,576 and a desktop large-range responsiveness check. Add specific Vietnamese in-app instructions for selecting/navigating large ranges.
2. **C7-SHEET-DELETE-AND-TAB-COLOUR** — Add worksheet-tab Delete and Tab Colour actions, with confirmation for deletion and protection for the last remaining sheet. Cover Undo, XLSX save/reopen in 3T and Excel, and Vietnamese in-app instructions for both actions.
3. **C8-SHEET-SORT-HEADER-DETECTION** — Make ascending/descending sort preserve a header row when the selected data has headers, and match Excel's sort range semantics. Compare the same workbook copy using hidden Excel COM; cover keyboard, ribbon, Undo, XLSX reopen, and Vietnamese in-app instructions.
4. **C11-SHEET-PAGE-SETUP-ROUNDTRIP** — Keep print area, fit-to-one-page, print titles, header/footer, and page breaks consistent after XLSX save/reopen in 3T. Current COM evidence shows the XLSX contains all settings, but 3T reopen resets fit mode, print titles, and header/footer. Add round-trip tests and Vietnamese in-app help for print layout settings.
5. **C12-SHEET-LARGE-WORKBOOK** — Load a measured XLSX larger than the current grid cap, exercise selection/edit/recalc/scroll through CDP, and decide whether the cap or rendering path truncates worksheet content. Record timings and Excel COM comparison.
6. **C4/C6/C12-SHEET-NATIVE-VALUE-ROUNDTRIP** — Serialize numeric and date input as Excel numeric/date cells rather than text. Current COM evidence: B2 displays `30` but `ISTEXT(B2)=TRUE`, causing `SUM`/`COUNT` to omit it. Cover numeric formats, date serials, formula recalc, XLSX reopen in 3T and hidden Excel COM, and Undo. C1/C2 remain owned by the earlier audit branch.
7. **C3-C9-SHEET-FULL-ACCEPTANCE-MATRIX** — For every listed sub-point, exercise both available mouse and keyboard paths through CDP, capture an Undo/Redo result, compare equivalent behavior in hidden Excel COM on a copy, save the 3T workbook, and reopen it in 3T and hidden Excel. The present report records the observed UI path per row; requested dual-path, per-sub-point Excel parity and round-trip evidence is incomplete outside the C8 sort comparison.

## Saved-workbook inspection

- Test artifact: `C:\Users\3TCOMP~1\AppData\Local\Temp\VNOffice-Sheet-C3-C12-audit-ddccc66d38014b5eb1f3df07760a5de5.xlsx` (14,786 bytes; outside the repository).
- Hidden Excel COM was used with `Visible=False`; the workbook was opened read-only. COM was started only when no Excel process was active, and no Office process was killed.
- Excel page setup readback: print area `$A$1:$B$5`; fit width/height `1/1`; print titles `$1:$1`; header `VN Sheet Audit`; footer `Audit &P / &N`; one horizontal and one vertical page break.
- Excel chart readback: 3 charts, types 51/4/5, one series each, all referencing A2:A5 and B2:B5.
- Excel value/formula readback: B2 is a string; B3:B5 are numeric. Formulas remained `=SUM(B2:B5)` / `=COUNT(B2:B5)` and evaluated to 80/3 in Excel.
- C8 sort comparison used a separate copy, `VNOffice-Sheet-C3-C12-excel-sort-copy.xlsx`: Excel `SortFields` with `Header=xlYes` retained `Name` and sorted the rows Alpha, Beta, Delta, Gamma. The 3T A→Z action included its header row.
- 3T reopen readback: all chart types and page breaks remained; fit settings, print titles, and header/footer did not. D1 showed 92 while B2 showed 30.
- Full C3–C9 matrix coverage is incomplete: the report captures the tested input path for each observed UI action, but not both input modes, a hidden Excel comparison, and an XLSX save/reopen result for every sub-point. Undo is recorded where explicitly checked in the result rows.

## Verification record

- `node tests/run-tests.js`: PASS (2228/2228, 0 failures, including the FODS→XLSX round-trip tests).
- Saved chart and print-setting workbook: reopened in 3T and hidden Excel COM; outcomes are recorded above.
- Large-workbook responsiveness: NOT RUN. C3–C9 per-sub-point hidden-Excel parity, save/reopen, and mouse/keyboard dual-path coverage beyond the recorded C8 sort comparison: NOT RUN. Undo results are likewise recorded only where explicitly stated.
- Save pipeline was not modified, so `scripts/layout-audit/_batch_audit.py` was not run.
