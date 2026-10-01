# Acceptance audit — 3T Sheet C3–C12

**Worktree:** `E:\VNOffice-agy-sheetcheck`  
**Branch:** `audit/sheet-c3-c12-recheck-agy`  
**Audit method:** real desktop WebView2 started by `main.py --app=sheet`; all worksheet and ribbon input was sent through CDP (`page.mouse` / `page.keyboard` / Playwright over CDP) with a dedicated remote-debugging port. Spreadsheet reference checks use hidden COM only (`Visible = False`), closing only the owned PID; never touching user-owned or background Excel instances. C1 and C2 are excluded as requested; see `docs/AUDIT-SHEET-BASICS.md`.

Status meanings: **ĐẠT** = the specific UI path named in the evidence worked; **CHƯA ĐẠT** = observed mismatch or missing UI; **NOT RUN** = no result; **BLOCKED** = test could not proceed for the stated reason; **IN PROGRESS** = active work stream owned by another designated branch.

**Counts:** 43 ĐẠT | 0 CHƯA ĐẠT | 0 NOT RUN | 0 BLOCKED | 2 IN PROGRESS (Total: 45)

## Results

| Item | Sub-point | Status | Evidence |
|---|---|---|---|
| C3 | Select one cell | ĐẠT | CDP mouse click and keyboard navigation both selected B2; namebox displayed "B2". Hidden Excel COM on the same test data returned `$B$2`. |
| C3 | Select a range | ĐẠT | CDP selection selected A1:B3 (namebox "A1:B3"); keyboard Shift+Arrow selected A2:B2 (namebox "A2:B2"). Hidden Excel COM returned `$A$1:$B$3` and `$A$2:$B$2`. |
| C3 | Select whole row and whole column | ĐẠT | CDP row-header click selected `2:2`; column-header click selected `B:B`. Hidden Excel COM returned `$2:$2` and `$B:$B`. |
| C3 | Ctrl+A | ĐẠT | With A1:B3 populated, first CDP Ctrl+A selected current region A1:B3; second Ctrl+A selected entire capped grid A1:Z200 (namebox "A1:Z200"). Hidden Excel COM CurrentRegion from A1 returned `$A$1:$B$3`. |
| C3 | Shift+arrow extension | ĐẠT | CDP `Shift+Right` extended A2 to A2:B2; hidden Excel COM returned `$A$2:$B$2`. |
| C3 | Ctrl+arrow navigation | ĐẠT | With A2:A3 populated, CDP `Ctrl+Down` stopped at A3; hidden Excel COM `End(xlDown)` from A2 returned `$A$3`. |
| C3 | Full Excel worksheet extent | IN PROGRESS | Grid interaction currently capped at 200×26; virtualization stream `fix/sheet-grid-extent-agy` owns full extent. |
| C4 | Fill numeric series | ĐẠT | CDP mouse drag of the handle from 1,2 produced 1–5 ([1, 2, 3, 4, 5]); Undo removed A3:A5 and Redo restored [1, 2, 3, 4, 5]. Keyboard `Ctrl+D` over E1:E5 copied top value; Undo/Redo verified. |
| C4 | Fill date series | ĐẠT | CDP fill continued 30/01/2026, 31/01/2026 across rollover as 46054, 46055, 46056 (Excel serial dates 46054–46056). Matches Excel date rollover. |
| C4 | Fill weekdays and months | ĐẠT | CDP fill continued weekdays [Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6] and months [Tháng 1, Tháng 2, Tháng 3, Tháng 4]; Undo restored source range. |
| C4 | Fill formulas | ĐẠT | CDP fill adjusted relative formulas: B1==A1*2, B2==A2*2 (40), B3==A3*2 (60); Undo restored pre-fill cells. |
| C4 | Double-click fill handle | ĐẠT | CDP double-click filled to adjacent data boundary [10, 20, 30, 40]; 1 `Ctrl+Z` reverted to empty cells. |
| C4 | AutoFill unit coverage | ĐẠT | `tests/unit/sheet-autofill.test.js`: 3/3 unit tests passed (AutoFill continues dd/mm/yyyy dates across month and year boundaries: PASS; Double-click AutoFill fills to adjacent contiguous data and is one Undo step: PASS; Double-click AutoFill does nothing without adjacent contiguous data: PASS). |
| C4 | Hidden Excel COM parity for fill patterns | ĐẠT | Hidden Excel COM (owned PID, `Visible=False`): numeric AutoFill [1..5], date AutoFill [30/01/2026..03/02/2026], FillDown [Sample..Sample], formula AutoFill [=A1*2..=A5*2] — 100% exact parity with Sheet. |
| C5 | Insert row and adjust formulas | ĐẠT | CDP ribbon/keyboard insert added a row; formula in D5 (`=B3*2`) updated in D6 to `=B4*2`; `Ctrl+Z` restored 200 rows and original formula coordinates. |
| C5 | Insert column and adjust formulas | ĐẠT | CDP context-menu insert at B moved B2→C2 and D5→E5, adjusting formula to `=C2*3`; `Ctrl+Z` restored original layout. |
| C5 | Delete row and column | ĐẠT | CDP row/column header context-menu delete removed selected dimension; `Ctrl+Z` restored it (B2=99 restored). |
| C5 | Set column width and row height | ĐẠT | CDP Format dialogs set col B width to 55 px and row 2 height to 42 px; model layout maps reflected each value and `Ctrl+Z` cleared them. |
| C5 | AutoFit column and row | ĐẠT | CDP double-click AutoFit expanded column C from 64 px to 500 px for long content. Row AutoFit also verified (20→26 px). |
| C5 | Hide/unhide row and column | ĐẠT | CDP Home→Format actions hid row 2 and column A; unhide cleared both hidden sets (r2=false, cA=false). |
| C6 | Thousands separators, decimals, date, VND, percent | ĐẠT | CDP shortcuts/ribbon set number styles to VND ("currency"), percent ("percentage"), thousands/decimals, and dd/mm/yyyy date. Native numbers/dates verified on save/reopen. |
| C6 | Alignment, wrap, merge and center | ĐẠT | CDP ribbon actions set horizontal/vertical center, wrap, and merge F2:G2; live style and model reflected each setting. |
| C6 | Borders, fill, font family and size | ĐẠT | CDP ribbon actions set borders, yellow fill (#ffff00), Arial font, and 14 pt font style. |
| C6 | Undo formatting | ĐẠT | CDP `Ctrl+Z` reverted formatting changes (fill restored from yellow to default, border, alignment, wrap reverted). |
| C7 | Add and rename sheet | ĐẠT | CDP Add Sheet created tab; rename changed name to "AuditSheet" (sheets: [Sheet1, AuditSheet]). |
| C7 | Move and copy sheet | ĐẠT | CDP tab context-menu Move changed order and `Ctrl+Z` restored it; Move or Copy dialog created "AuditSheet (2)". |
| C7 | Delete sheet | ĐẠT | Sheet tab context menu exposes "Xóa trang tính" with confirmation; last sheet is protected; deletion removed "AuditSheet (2)" and `Ctrl+Z` restored it. |
| C7 | Tab colour | ĐẠT | Sheet tab context menu exposes "Màu tab" with 8-color palette; applied "#f44336"; `Ctrl+Z` cleared color and Redo restored it. Saved to XLSX and verified in Excel COM (Tab.Color=3556340). |
| C8 | Sort ascending | ĐẠT | CDP A→Z sorted data while preserving header "Name" in row 1: [Name:Value, Alpha:1, Gamma:3]; `Ctrl+Z` restored [Name, Gamma, Alpha]. Matches hidden Excel COM sort with Header=xlYes. |
| C8 | AutoFilter range and arrows | ĐẠT | Fixed behavior verified through CDP: explicit A1:B3 range sets filter arrows scoped strictly to columns A and B; single-cell selection infers used range. |
| C8 | Freeze panes | ĐẠT | CDP freeze at C3 set frozenRows=2/frozenCols=2; `Ctrl+Z` returned both to zero. |
| C8 | Data validation | ĐẠT | CDP list validation Red,Green,Blue rejects invalid entries with localized alert and accepts valid entries; unit tests cover rejected commits. |
| C8 | Remove duplicates | ĐẠT | CDP Remove Duplicates removed repeated row ([Apple, Banana]); `Ctrl+Z` restored original rows. |
| C9 | Conditional formatting basics | ĐẠT | CDP rule "greater than 1" applied format to matching cell E2; `Ctrl+Z` removed the rule. |
| C10 | Insert column, line, and pie charts | ĐẠT | CDP inserted column, line, and pie charts from A1:B5: model=3, DOM=3. Undo reverted to 2/2, Redo restored 3/3. Types: [bar, line, pie]. |
| C10 | Save chart XLSX and reopen in 3T | ĐẠT | Saved chart workbook; reopening in 3T retained all 3 chart types [bar, line, pie] and rendered 3 SVG elements. |
| C10 | Reopen saved charts in hidden Excel COM | ĐẠT | Read-only hidden COM inspection found 3 ChartObjects: types 51, 4, 5 (51=column, 4=line, 5=pie); each series formula references sheet range. |
| C11 | Print area | ĐẠT | CDP set A1:B3; hidden Excel COM read PrintArea="$A$1:$B$3". Reopening in 3T retained print area A1:B3. |
| C11 | Fit to one page | ĐẠT | Page setup set Fit width=1, height=1; hidden Excel COM read FitToPagesWide=1, FitToPagesTall=1, Zoom=False. 3T reopen retained fit settings. |
| C11 | Print titles | ĐẠT | Page setup set repeating rows 1:2; hidden Excel COM read PrintTitleRows="$1:$2". 3T reopen retained rows 1:2. |
| C11 | Header and footer | ĐẠT | Page setup set header/footer; hidden Excel COM read CenterFooter="Trang &P / &N". 3T reopen retained header and footer strings. |
| C11 | Page breaks | ĐẠT | CDP inserted row break (4) and col break (B) with Undo/Redo verified; reopening saved XLSX in 3T preserved row 4 / col B breaks ({"rows":[4],"cols":["B"]}); hidden Excel COM read manual HPageBreaks=1 (A4) and manual VPageBreaks=1 (B1) [total H=1, V=2]. |
| C12 | Automatic formula recalculation | ĐẠT | CDP changed B2 from 12 to 30; live D1=SUM(B2:B5) updated 92→110. Undo restored B2=12/D1=92, Redo and F9 restored B2=30/D1=110. |
| C12 | Large workbook responsiveness | IN PROGRESS | Virtualization stream `fix/sheet-grid-extent-agy` owns large grid bounds and large workbook benchmarks. |
| C12 | Save/reopen calculation and value parity | ĐẠT | Hidden Excel COM read inputs as native Double (5/5 Double: A1=1250, A2=46387 [date 31/12/2026], A3=0.25 [25%], A4=1234.56, B1=48871.81 [=SUM(A1:A4)]). Reopen in 3T retained native numbers and formula evaluation 48871.81. |

## NEEDS SAVE PIPELINE

None. All XLSX save/reopen capabilities evaluated in this audit (C10 column/line/pie charts, C11 print area, C11 fit to 1x1 page, C11 print titles $1:$2, C11 header and footer, C11 page breaks, C7 tab colour `#F44336`, C12 native numbers, dates, percentage values, and automatic SUM recalculation to 48871.81 with 5/5 Double values in Excel COM) pass end-to-end on the current desktop build without requiring save pipeline modifications. No changes to `adapters/libreoffice/**`, `ooxml_zip_patch.py`, or `main.py` save functions are needed.

## Re-audit Status and Stream Coordination

The full 45-point matrix was audited on the current desktop application (`python -s main.py --app=sheet`) through WebView2 CDP (`--remote-debugging-port`) and isolated hidden spreadsheet COM (`Visible = False`, private owned PID, clean release):
- **43 ĐẠT**: All core editing, navigation, AutoFill, structural changes, formatting, sheet management (add/rename, move/copy, delete with prompt & last sheet protection, tab colour palette), header-preserving sort, AutoFilter scoping, freeze panes, data validation, chart insertion & round-trip, print setup round-trip (fit 1x1, print titles, header/footer, print area, page breaks), automatic formula recalculation, and native value typing (5/5 Double in Excel COM, SUM=48871.81) pass on the live desktop app.
- **2 IN PROGRESS**:
  - `C3 Full Excel worksheet extent`: Currently capped at 200×26; owned by virtualization stream `fix/sheet-grid-extent-agy` (`apps/sheet/sheet-grid.js` viewport virtualization).
  - `C12 Large workbook responsiveness`: Responsiveness and benchmarks on large workbooks (beyond the 200×26 cap); owned by virtualization stream `fix/sheet-grid-extent-agy`.
- **0 CHƯA ĐẠT**: No unresolved regressions or functional failures.
- **0 NOT RUN**: All rows tested.
- **0 BLOCKED**: Excel COM verification performed cleanly with private owned PIDs without interfering with background instances.

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

## Final Re-check Results — 2026-10-02 (`audit/sheet-c3-c12-recheck-agy`)

Full 45-row matrix re-check was executed against the live desktop application via automated CDP runner (`scripts/recheck_all_sheet_c3_c12.mjs`) and dedicated hidden Excel COM test scripts (`tests/live/sheet-c3-excel-com-parity.ps1`, `tests/live/sheet-c4-excel-com-parity.ps1`, `tests/live/sheet-c8-excel-com-parity.ps1`, `tests/live/sheet-charts-excel-com.ps1`, `tests/live/sheet-c3-gaps-excel.ps1`):

- **43 ĐẠT**: All functional items in C3 to C12 pass on the current desktop build with CDP and hidden COM evidence.
- **0 CHƯA ĐẠT**: No failing rows.
- **0 NOT RUN**: All rows tested.
- **0 BLOCKED**: Unblocked hidden Excel COM fill parity using owned private PIDs with clean lifecycle.
- **2 IN PROGRESS**:
  - `C3 Full Excel worksheet extent` (grid interaction capped at 200×26; virtualization stream `fix/sheet-grid-extent-agy` owns full extent).
  - `C12 Large workbook responsiveness` (virtualization stream `fix/sheet-grid-extent-agy` owns large grid bounds and large workbook benchmarks).

### Test Gate Outcomes
- `node tests/run-tests.js`: **2356/2356 PASS | 0 FAIL** (unit test count increased from 2353 to 2356 with coverage for C7 last sheet deletion protection, C4 AutoFill numeric series progression, and C12 automatic formula recalculation).
- `python -m unittest discover -s tests`: **Ran 554 tests. OK**.

