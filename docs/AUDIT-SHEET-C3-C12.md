# Acceptance audit — 3T Sheet C3–C12

**Worktree:** `E:\VNOffice-codex-audit-sheet2`  
**Branch:** `audit/sheet-c3-c12-codex`  
**Audit method:** real desktop WebView2 started by `main.py`; all worksheet and ribbon input was sent through CDP (`page.mouse` / `page.keyboard`) with a dedicated remote-debugging port. Excel checks use hidden COM only (`Visible = False`). C1 and C2 are excluded as requested; see `E:\VNOffice-codex-audit-sheet\docs\AUDIT-SHEET-BASICS.md`.

Status meanings: **ĐẠT** = the specific UI path named in the evidence worked; **CHƯA ĐẠT** = observed mismatch or missing UI; **NOT RUN** = no result; **BLOCKED** = test could not proceed for the stated reason. A UI result alone does not establish keyboard/mouse parity or XLSX persistence.

## Results

| Item | Sub-point | Status | Evidence |
|---|---|---|---|
| C3 | Select one cell | ĐẠT | CDP mouse click and keyboard navigation both selected B2; hidden Excel COM on the same test data returned `$B$2`. |
| C3 | Select a range | ĐẠT | CDP mouse drag selected A1:B3; keyboard Shift+Arrow selected A2:B2. Hidden Excel COM returned the matching range addresses. |
| C3 | Select whole row and whole column | ĐẠT | CDP row-header click and `Shift+Space` both selected `2:2`; column-header click and `Ctrl+Space` both selected `B:B`. Excel COM returned `$2:$2` and `$B:$B`. |
| C3 | Ctrl+A | CHƯA ĐẠT | With A1:B3 populated, 3T `Ctrl+A` selected the capped grid A1:Z200. Hidden Excel COM `CurrentRegion` (Ctrl+A once inside the same data) selected A1:B3. The 3T top-left corner also selects A1:Z200. |
| C3 | Shift+arrow extension | ĐẠT | CDP `Shift+Right` extended A2 to A2:B2; hidden Excel COM returned `$A$2:$B$2`. |
| C3 | Ctrl+arrow navigation | ĐẠT | With A2:A3 populated, CDP `Ctrl+Down` stopped at A3; hidden Excel COM `End(xlDown)` from A2 returned `$A$3`. |
| C3 | Full Excel worksheet extent | CHƯA ĐẠT | The live grid exposes only columns A:Z and 200 rows. Selection works within that cap; Excel-sized rows/columns were not reachable. |
| C4 | Fill numeric series | ĐẠT | CDP mouse drag of the handle from 1,2 produced 1–5; Undo/Redo removed/restored D3:D5. Keyboard `Ctrl+D` over E1:E5 copied the first value into all cells; Undo restored the prior values and Redo restored the fill. Hidden Excel COM parity for the fill commands remains pending. |
| C4 | Fill date series | ĐẠT | CDP mouse drag continued 30/01/2026, 31/01/2026 across rollover as 01/02/2026, 02/02/2026, 03/02/2026. The live cells remain text values, so Excel date serial and XLSX parity are still pending. |
| C4 | Fill weekdays and months | ĐẠT | CDP fill continued weekday and month sequences in the live grid; undo restored the source range. |
| C4 | Fill formulas | ĐẠT | CDP fill adjusted relative references down the target range; undo restored the pre-fill cells. |
| C4 | Double-click fill handle | ĐẠT | CDP double-click filled to the contiguous adjacent data boundary; one `Ctrl+Z` reverted the fill. |
| C4 | AutoFill unit coverage | ĐẠT | `tests/unit/sheet-autofill.test.js`: date rollover, double-click fill/Undo, and no-adjacent-data cases pass. |
| C4 | Hidden Excel COM parity for fill patterns | BLOCKED | An Excel process was active and its owner could not be established. No COM attachment or process termination was attempted. |
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
- C3 selection comparison used a separate copy, `VNOffice-Sheet-C3-C12-excel-c3-copy.xlsx`: with A1:B3 populated, hidden Excel COM returned `$B$2`, `$A$1:$B$3`, `$2:$2`, `$B:$B`, current region `$A$1:$B$3`, Shift+Arrow range `$A$2:$B$2`, and Ctrl+Down target `$A$3`. CDP verified mouse and keyboard paths using the on-screen name box. Excel copy was saved; selection state itself is transient and was not expected to survive a reopen.
- C4 CDP follow-up on the separate live Sheet session: mouse AutoFill continued a numeric pair and a date pair; keyboard `Ctrl+D` copied the top value. The numeric/date series were not saved into the chart/page-layout audit workbook. Hidden Excel COM parity was BLOCKED because an Excel process of unknown ownership was active.
- 3T reopen readback: all chart types and page breaks remained; fit settings, print titles, and header/footer did not. D1 showed 92 while B2 showed 30.
- Full C3–C9 matrix coverage is incomplete: C3 mouse/keyboard and Excel selection parity are recorded, but there is no saved-workbook reopen result for transient selection state. C4 mouse/keyboard UI paths are recorded; Excel COM fill parity is BLOCKED because an Excel process of unknown ownership was active. For C5–C9, the report captures the tested UI path but not both input modes, hidden Excel comparison, and XLSX save/reopen result for every sub-point. Undo is recorded where explicitly checked in the result rows.

## Verification record

## Follow-up fixes completed on `fix/sheet-c3-gaps-codex`

The continuation work is committed as separate item commits:

- `2652f6f9` — native numeric/date entry and save-path typing. Numeric input, external pasted numbers, fill results, and dd/mm/yyyy dates are emitted as native numeric/date cells; date styles remain attached. The focused unit suite covers FODS native value types. Desktop CDP + hidden Excel COM acceptance proof is still required before calling the end-to-end item PASS.
- `2153a7c4` — print setup round-trip. XLSX `_xlnm.Print_Titles` is restored before FODS parsing, and standard FODS page metadata restores paper, orientation, margins, fit-to-pages, print area, and header/footer. Focused JavaScript and Python tests pass. Desktop CDP + hidden Excel COM PageSetup comparison is still NOT RUN in this continuation.
- `0f2e9aae` — C3/C7/C8 Sheet-layer gaps. Ctrl+A now selects the contiguous current region first and the whole available sheet on the second press; tab context menu now exposes `Xóa trang tính` and `Màu tab` with last-sheet protection and undo; simple sort detects a text header and leaves it out of the sorted rows. Focused unit tests pass. Desktop CDP proof is still NOT RUN in this continuation.

The 26-column × 200-row interaction cap remains out of scope for this patch and is reported separately as NOT DONE; it is not used as the first Ctrl+A selection boundary anymore when a populated contiguous region exists.

- `node tests/run-tests.js`: PASS (2228/2228, 0 failures, including the FODS→XLSX round-trip tests).
- Saved chart and print-setting workbook: reopened in 3T and hidden Excel COM; outcomes are recorded above.
- Large-workbook responsiveness: NOT RUN. C3–C9 per-sub-point save/reopen coverage is NOT RUN. C4 fill parity is BLOCKED; C5–C9 hidden-Excel parity and mouse/keyboard dual-path coverage beyond the recorded checks are NOT RUN. Undo results are likewise recorded only where explicitly stated.
- Save pipeline was not modified, so `scripts/layout-audit/_batch_audit.py` was not run.
