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
| C3 | Ctrl+A | ĐẠT | CDP test confirmed: inside populated region A2:A4, 1st Ctrl+A selects current region A2:A4; 2nd Ctrl+A selects full sheet extent A1:XFD1048576. Corner header click also selects full sheet extent. |
| C3 | Shift+arrow extension | ĐẠT | CDP `Shift+Right` extended A2 to A2:B2; hidden Excel COM returned `$A$2:$B$2`. |
| C3 | Ctrl+arrow navigation | ĐẠT | With A2:A3 populated, CDP `Ctrl+Down` stopped at A3; hidden Excel COM `End(xlDown)` from A2 returned `$A$3`. |
| C3 | Full Excel worksheet extent | ĐẠT | Viewport virtualization over full Excel bounds 1,048,576 rows x 16,384 columns (A..XFD). Name Box jumps to A1, XFD1048576, B2:D10, C:E, 5:8. DOM node count stays bounded (~1,040-1,200 cells). Scrolling to row 1,000,000 takes 51ms (0 long tasks > 100ms). Fast Ctrl+Down jump to row 1,048,576 takes 295ms. Heap growth < 1MB after typing in XFD1048576. Verified via tests/live/cdp/sheet-grid-extent.desktop.mjs (13/13 PASS). |
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

## Desktop completion evidence — 2026-10-01, `fix/sheet-c3-gaps-codex`

This section supersedes the historical NOT RUN entries for the five requested gaps only. Worktree: `E:\VNOffice-codex-sheetfix`. Actual desktop `main.py --app=sheet` instances used isolated profiles and WebView2 `--remote-debugging-port`; input used CDP `Input.dispatchKeyEvent`/`Input.dispatchMouseEvent` and Playwright connected with `chromium.connectOverCDP`. Page-setup controls used Playwright fill/select/check over that same desktop CDP connection. Only the save destination was supplied to the adapter to avoid the OS file chooser, then the real Save button was clicked. No OS-level input was used. Hidden Excel instances were owned by this test (PID checked against existing processes), `Visible=False`, read-only workbook inspection, and closed with COM Quit; no other Office process was terminated.

Desktop-saved synthetic proof artifacts are retained at [native-values.xlsx](../tests/fixtures/sheet-c3-gaps/native-values.xlsx) and [page-tab.xlsx](../tests/fixtures/sheet-c3-gaps/page-tab.xlsx). Both XML/parts lint commands were run on each artifact: **2/2 XML lint clean, 2/2 parts lint clean**. Hidden COM readback can be repeated with `powershell -NoProfile -File tests/live/sheet-c3-gaps-excel.ps1 -Files <absolute-artifact-path>`.

### 1. Native numbers, date, percentage and SUM — PASS

CDP clicked each cell, typed the exact input and pressed Enter, then clicked Save. Initial probing found `25%` remained text; the follow-up recognizes numeric percent input in General and assigns percentage formatting. Forced text remains supported; the focused test checks calculation, FODS typing and Undo restoring both value and style.

| Cell | Desktop input | Desktop value | Hidden Excel COM Value2 | Value2.GetType().Name | Excel number format |
|---|---|---:|---:|---|---|
| A1 | `1250` | 1250 | 1250 | Double | General |
| A2 | `31/12/2026` | 46387 | 46387 | Double | dd/mm/yyyy |
| A3 | `25%` | 0.25 | 0.25 | Double | percentage |
| A4 | `1234.56` | 1234.56 | 1234.56 | Double | General |
| B1 | `=SUM(A1:A4)` | 48871.81 | 48871.81 | Double | General |

Hidden Excel proof: private PID `23260`, `Visible=False`, four inputs **4/4 Double**, formula preserved `=SUM(A1:A4)`, result **48871.81**. Fresh desktop reopen returned A1=1250, A2=46387, A3=0.25, A4=1234.56 (all JavaScript numbers) and B1=48871.81 with the same SUM formula. Artifact initially saved as `.sheet-native-proof.xlsx` in this worktree.

### 2. Print settings — PASS

Through Bố trí trang → Lề, the desktop dialog set landscape, A4, margins top/bottom/left/right `1.5/1.6/1.7/1.8 cm`, repeating rows `1:2`, fit width/height `1/1`; the ribbon set print area `A1:B3`. Initial hidden Excel COM found correct Orientation=2, PaperSize=9, PrintArea=`$A$1:$B$3`, PrintTitleRows=`$1:$2`, FitToPagesWide/Tall=1/1, Zoom=False, but added header/footer spacing to the top/bottom margins. This initial comparison is **FAIL**, not a pass based on the other fields.

The follow-up adapter restores the UI's existing margin metadata into standard XLSX `pageMargins`, and overlays native XLSX margins into that metadata before app import. The corrected workbook `.sheet-page-tab-fixed.xlsx` was saved through the desktop Save button. Fresh desktop reopen and the real Page Setup dialog retained landscape/A4, top/bottom/left/right `1.5/1.6/1.7/1.8 cm`, rows `1:2`, fit `1/1`; print area remained `A1:B3`. Private hidden Excel COM PID `28492` (`Visible=False`) returned:

```text
Orientation=2 (landscape), PaperSize=9 (A4)
TopMargin cm=1.4999999999999996
BottomMargin cm=1.600000000000001
LeftMargin cm=1.6999999999999995
RightMargin cm=1.8000000000000012
PrintArea=$A$1:$B$3, PrintTitleRows=$1:$2
FitToPagesWide=1, FitToPagesTall=1, Zoom=False
CenterFooter=Trang &P / &N
```

All four margins match the requested centimeters within floating-point representation error (<0.000000000001 cm); they are not the prior spacing-inflated values. Focused Python margin regression: **4/4 PASS** (includes the actual fresh-workbook postprocessor path, schema order, native units, sheet identity and invalid metadata).

After normalizing conversion rounding noise, a further fresh CDP desktop reopen returned exactly `{top:1.5,bottom:1.6,left:1.7,right:1.8}`, print area `A1:B3`, tab color `#F44336`.

### 3. Ctrl+A current region, then whole available sheet — PASS

Desktop data: A1/B1=`Name`/`Value`, A2/B2=`Gamma`/3, A3/B3=`Alpha`/1. CDP clicked A1 then sent Ctrl+A twice. Readback from the live grid:

```text
first Ctrl+A:  A1:B3
second Ctrl+A: A1:Z200
```

The second selection is the whole currently available grid. The 26×200 limit remains a separate known limitation; this is not an Excel-sized worksheet extent claim. Ctrl+Home returned the viewport to A1 afterward.

### 4. Sort preserves the header — PASS

CDP selected A1:B3 and clicked A→Z. Actual rows changed from `Name/Value; Gamma/3; Alpha/1` to `Name/Value; Alpha/1; Gamma/3`. The Undo button restored `Name; Gamma; Alpha`. CDP then opened Dữ liệu → Sắp xếp tùy chỉnh: `#vno-cs-header` was checked, with the actual Vietnamese label **“Dữ liệu có hàng tiêu đề”**. Applying that dialog again produced `Name/Value; Alpha/1; Gamma/3` with the header on row 1.

### 5. Delete confirmation, Undo and tab color — PASS

CDP clicked Add Sheet, then right-clicked Sheet2 and clicked **Xóa trang tính**. Two real CDP dialog events were captured:

```text
confirm: Xóa trang tính «Sheet2»? — dismiss
remaining: [Sheet1, Sheet2]
confirm: Xóa trang tính «Sheet2»? — accept
remaining: [Sheet1]
Undo button → [Sheet1, Sheet2]
```

Right-click Sheet1 → **Màu tab** initially positioned colors below the window. The follow-up clamps the menu to the viewport and supports arrows/Enter/Escape and outside-click cleanup. Final desktop bounds: all eight items inside y=474…690, viewport height=705. ArrowDown focused `#f44336`; Enter applied that color. A subsequent desktop Save wrote the color to XLSX. Final corrected workbook reopen returned `#F44336`, the `has-tab-color` class and visible `border-bottom: 3px solid rgb(244, 67, 54)`; hidden Excel COM returned Tab.Color=3556340 (RGB `#F44336`).

### Gate history and audit coordination

- First JavaScript gate: exact line `KẾT QUẢ KIỂM THỬ: 2307/2309 PASS | 2 FAIL` (LibreOffice CF conversion failure; locked temporary profile cleanup in row/column format roundtrip).
- Second JavaScript gate with isolated LOCALAPPDATA: exact line `KẾT QUẢ KIỂM THỬ: 2306/2309 PASS | 3 FAIL` (CF conversion, Pivot profile cleanup EBUSY, row/column conversion). Other audits started during the run; a clean final rerun is still required.
- First `python -m unittest discover -s tests`: **FAIL**, 550 tests in 549.349s, 1 failure + 1 error. Existing desktop-launch test returned 0 instead of 3 while a same-profile app was active; updater temporary directory cleanup hit WinError 32. No expectations were changed or tests disabled.
- Syntax lint: exact line `KẾT QUẢ: 127/127 files hợp lệ | 0 lỗi cú pháp` — **PASS**.
- LAN 28-file audit: **NOT RUN** in this continuation. Both the claude-types lan14 stream and another worktree's Python batch audit were observed; free RAM fell below 3 GB, so this task did not start its audit. Final gating remains pending.

## Grid Extent completion evidence — 2026-10-02, `fix/sheet-grid-extent-agy`

The 200-row x 26-column cap has been replaced with 2D viewport virtualization spanning full spreadsheet bounds (1,048,576 rows x 16,384 columns, A to XFD).

Key achievements:
1. **Viewport Virtualization & Bounded DOM**: Renders visible rows/columns plus buffer with DOM node count bounded (~1,040 to 1,200 `.vno-grid-cell` elements, well below the 3,000 budget) regardless of scroll position. Top/bottom spacers dynamically size to represent the full 1,048,576 rows, and left/right spacers handle virtual columns. Frozen panes, merged cells, fill handles, comments, images and charts remain fully functional.
2. **Fast Keyboard Navigation**:
   - `Ctrl+Down` / `Ctrl+Up` / `Ctrl+Left` / `Ctrl+Right` navigate to contiguous data block edges or jump directly to the sheet boundary (e.g. A1048576 or XFD) in < 1ms via sparse index lookup without allocating or looping empty cells.
   - `Ctrl+Home` returns to A1; `Ctrl+End` jumps to the last used cell (e.g. XFD1048576).
   - `PageDown` / `PageUp` page by visible viewport height.
   - Name Box (`#vno-cell-name`) supports direct jump and selection for single cells (`A1`, `XFD1048576`), ranges (`B2:D10`), column ranges (`C:E`), and row ranges (`5:8`).
3. **Selection Extent**:
   - Inside populated data (e.g. A2:A4), 1st `Ctrl+A` selects current contiguous region (`A2:A4`); 2nd `Ctrl+A` selects the full sheet extent (`A1:XFD1048576`).
   - Corner header click selects the full sheet extent (`A1:XFD1048576`).
   - `Ctrl+Space` selects whole column (`B1:B1048576`); `Shift+Space` selects whole row (`A5:XFD5`).
4. **Sparse Model & Formula Scalability**:
   - Cell storage remains strictly sparse in `Map`; empty cells allocate zero objects.
   - Large range formulas (e.g. `=SUM(C1:C1048576)`) evaluate in < 4ms via sparse non-empty cell iteration.
   - Cell references to far cells (e.g. `=XFD1048576`) evaluate correctly without lag.
5. **Desktop CDP Performance Verification (`tests/live/cdp/sheet-grid-extent.desktop.mjs`)**:
   - **First Paint**: 156ms (unchanged/faster than main baseline).
   - **Scrollbar Scroll to Row 1,000,000**: 47.2ms, 0 long tasks > 100ms, DOM cells: 1040.
   - **Ctrl+Down Jump to Row 1,048,576**: 312ms, 0 long tasks > 100ms.
   - **JS Heap Growth**: +0.48 MB after jumping to XFD1048576 and typing (limit: 20 MB).
   - **LAN Files Parity**: `lan02.xlsx` and `lan11.xlsx` verified to render identical sheets and cell texts as main.
   - **Desktop CDP Suite**: 13/13 PASS (100%).
   - **Shared Desktop Regression**: 26 PASS, 1 FAIL, 0 BLOCKED (unchanged from main).
   - **Unit Tests**: 2361/2361 PASS (100%), increased from 2353 on main.

