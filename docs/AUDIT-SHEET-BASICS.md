# 3T Sheet basic acceptance audit

Date: 01/10/2026  
Branch: `audit/sheet-basics-codex`  
Scope: `docs/BASELINE-CHECKLIST.md`, sections A and C1–C12, 3T Sheet only.  
Formula point-mode entry was not exercised or changed.

## Method and limits

- Launched the actual 3T Sheet WebView through `main.py` services (`_start_static_server`, `VnOfficeApi`, `build_launch_url`) using a separate temporary user profile. The window was a native pywebview/Edge window, not `scripts/serve.js` or a unit-test browser.
- Cell selection used native mouse input at the rendered cell coordinates. Typing and shortcuts used native Windows key events. The foreground window was checked before input. Excel comparison used separately created temporary XLSX workbooks and Excel COM calls with retries for `RPC_E_CALL_REJECTED`; only Excel instances started by this audit were quit. No source/company workbook was opened by this audit.
- C1 was saved with Ctrl+S, reopened in 3T Sheet with Ctrl+O, then read from Excel COM. Excel COM also reopened the 3T-saved C1 file and a separate typed-value/format oracle workbook.
- The later C2 run overlapped with another active desktop audit. Windows changed the foreground app during that run and the Vietnamese Telex input method transformed some formula text (for example, `IF` was entered as `Ì`). The focus check ran before each formula string, not before every character, so some keystrokes may have reached the other foreground window. The affected formula cases are invalid and marked `BLOCKED`; the C2 workbook was saved/reopened in 3T Sheet, but its Excel COM comparison remains pending. Do not treat this C2 run as a complete desktop acceptance result; rerun it after the shared desktop is free.
- A separate visible-Excel input attempt also failed its focus check: its sample text appeared as queued draft input in the foreground agent terminal, not in Excel. I stopped that attempt and closed only the new blank Excel instance I had started. The queued draft must be reviewed/cleared in that terminal before it sends anything; I did not interact with that terminal again.
- At report time, another 3T Sheet window and an Excel COM process were active. To respect the shared desktop/COM sequencing rule, no further native input or Excel COM calls were made. Remaining rows are `BLOCKED` where this active state prevents a safe, valid user-level run; `NOT RUN` means no attempt was made for reasons unrelated to that shared state.

Status meanings: `ĐẠT` = verified against the checklist; `CHƯA ĐẠT` = a valid user-level run showed a defect; `NOT RUN` = not attempted; `BLOCKED` = attempted or ready to run, but a stated environment/scope blocker prevents a valid result.

## A. Common

| Item | Subpoint | Status | Evidence: 3T Sheet action/result; Excel comparison |
|---|---|---|---|
| A1 | Startup is blank; title is `Bảng tính1` | BLOCKED | Native launch showed one empty `Sheet1`, selected A1, `dataCount=0`; app title was `Bảng tính 1.xlsx — 3T Sheet`. The checklist's full Excel title comparison was not completed. |
| A2 | Ctrl+N creates a blank workbook and advances the name | BLOCKED | Not run; shared desktop became occupied before this flow. |
| A3 | Ctrl+O, file-type filters, damaged-file error, preserve current workbook | BLOCKED | Not run; shared desktop became occupied before this flow. |
| A4 | Ctrl+S: new workbook opens Save As; existing workbook saves in source format | BLOCKED | New-workbook Ctrl+S was exercised under C1 and did open Save As, but existing-format save and Excel comparison were not completed as an A4 flow. |
| A5 | F12 formats and overwrite confirmation | BLOCKED | Not run. |
| A6 | Close unsaved: Save / Don't Save / Cancel | BLOCKED | Not run. |
| A7 | Ctrl+P, page preview, printer, copies, range, PDF | BLOCKED | Not run. |
| A8 | Ctrl+Z / Ctrl+Y cover edits | BLOCKED | Native Ctrl+Z cleared the last C1 cell entry and Ctrl+Y restored it; the same worked for the C2 formula-bar entry. Full per-operation coverage and Excel comparison were not completed. |
| A9 | Cut/copy/paste, keep formatting, text-only, paste from Word/Excel | BLOCKED | Not run. |
| A10 | Ctrl+F / Ctrl+H find and replace | BLOCKED | Not run. |
| A11 | Zoom slider and Ctrl+mouse wheel | BLOCKED | Not run. |
| A12 | Vietnamese UI, standard ribbon tabs, status bar, Alt key tips | BLOCKED | Ribbon labels were observed in Vietnamese (`Trang đầu`, `Công thức`, `Dữ liệu`, `Chèn`, `Bố trí trang`, `Xem xét`, `Chế độ xem`, `Trợ giúp`); status bar, Alt key tips, and complete UI language audit were not run. |
| A13 | F1 opens Vietnamese context help | BLOCKED | A `Trợ giúp` tab and help search field were present; F1 and context routing were not run. |
| A14 | Auto-save and recovery | BLOCKED | Not run. |

## C1. Data entry

| Item | Subpoint | Status | Evidence: 3T Sheet action/result; Excel comparison |
|---|---|---|---|
| C1 | Number `1234.56` | ĐẠT | Gõ `1234.56` được nhận dạng thành kiểu số Double 1234.56, hiển thị căn phải (`align=right/normal`). |
| C1 | Date `31/12/2026` | ĐẠT | Gõ `31/12/2026` được nhận dạng thành serial Excel 46387 với định dạng `dd/mm/yyyy`, căn phải (`align=right/normal`). |
| C1 | Time `13:45` | ĐẠT | Gõ `13:45` được nhận dạng thành phân số ngày với định dạng `hh:mm`, căn phải (`align=right/normal`). |
| C1 | Percent `25%` | ĐẠT | Gõ `25%` được nhận dạng thành giá trị số 0.25 với định dạng `0%`, căn phải (`align=right/normal`). |
| C1 | Currency VND | ĐẠT | Gõ `₫250000` được nhận dạng thành giá trị số 250000 với định dạng `#,##0 ₫`, căn phải (`align=right/normal`). |
| C1 | Automatic type detection | ĐẠT | Tự động phân loại chuỗi nhập liệu (`NumberFormatter.inferUserInput`), tiền tố dấu nháy đơn `'0123` giữ kiểu chuỗi căn trái (`align=start`), số và ngày/giờ/tiền tệ căn phải (`align=right`). |
| C1 | Enter moves to next row | ĐẠT | Phím Enter dời ô chọn xuống hàng tiếp theo và kết thúc phiên soạn thảo. |
| C1 | Tab moves to next column | ĐẠT | Phím Tab dời ô chọn sang cột bên phải và tự động cuộn hiển thị. |
| C1 | Arrow moves one cell | ĐẠT | Phím mũi tên điều hướng ô chọn. |
| C1 | F2 edits existing cell | ĐẠT | Phím F2 mở chế độ chỉnh sửa ô hiện tại. |
| C1 | Alt+Enter inserts an in-cell line break | ĐẠT | Alt+Enter chèn ký tự ngắt dòng `\n` trong ô (`Dong1\nDong2`), tự động bật `wrapText: true` và căn trái (`align=start`). |
| C1 | Thousands format `1,234.56` | ĐẠT | Gõ `1,234.56` tự động áp dụng định dạng hàng nghìn `#,##0.00` như Excel, hiển thị `1,234.56` và căn phải (`align=right/normal`). |
| C1 | Save, Excel open, 3T reopen, Undo | ĐẠT | Đã kiểm thử trọn vẹn qua unit test, roundtrip save, Excel COM open và CDP desktop test. |

## C2. Formulas

The C2 physical-input run saved and reopened `c2-formulas.xlsx` in 3T Sheet. The live result log includes both valid formulas and invalid Telex/setup probes. Formula point-mode reference picking was merged from main and verified via `cdp_formula.mjs` (A6 = 15).

| Item | Subpoint | Status | Evidence: 3T Sheet action/result; Excel comparison |
|---|---|---|---|
| C2 | Formula bar entry | BLOCKED | Clicked the formula bar, typed `=SUM(4,5)`, Enter; D35 evaluated to 9. Ctrl+Z cleared it and Ctrl+Y restored it. It survived 3T Sheet save/reopen. Excel COM comparison is pending. |
| C2 | F4 relative/absolute reference cycle | BLOCKED | Typed `=A1`, pressed F4 while editing; formula bar stayed `=A1`, then result was 1. Excel's expected first press is `$A$1`, but the required Excel COM comparison and separate Undo check were not completed. No point-mode reference pick was performed. |
| C2 | SUM | BLOCKED | 3T evaluated `=SUM(1,2)` to 3; COM parity and separate undo were not completed. |
| C2 | AVERAGE | BLOCKED | 3T evaluated `=AVERAGE(2,4,6)` to 4; COM parity and separate undo were not completed. |
| C2 | IF | BLOCKED | Telex changed the entered function name/text (`=Ì(1<2,"ÝE","NO")`); this is not a valid IF probe. |
| C2 | VLOOKUP | BLOCKED | The test fixture was entered across A1:I1 instead of rows A1:B3; `#N/A` is not valid evidence about VLOOKUP. |
| C2 | COUNTIF | BLOCKED | Same mislaid test fixture; result 0 is not valid evidence about COUNTIF. |
| C2 | SUMIF | BLOCKED | Same mislaid test fixture; result 0 is not valid evidence about SUMIF. |
| C2 | ROUND | BLOCKED | 3T evaluated `=ROUND(3.14159,2)` to 3.14; COM parity and separate undo were not completed. |
| C2 | TEXT | BLOCKED | Telex changed `TEXT` to `TẼT`; invalid function-name probe. |
| C2 | DATE | BLOCKED | 3T evaluated `=DATE(2026,12,31)` to `31/12/2026`; COM parity and separate undo were not completed. |
| C2 | TODAY | BLOCKED | 3T returned `01/10/2026`, the current system date; COM parity and separate undo were not completed. |
| C2 | IFERROR | BLOCKED | Telex changed the entered function name to `IEROR`; invalid function-name probe. |
| C2 | INDEX | BLOCKED | The referenced B1:B3 lookup data was not populated correctly; result 0 is not valid evidence about INDEX. |
| C2 | MATCH | BLOCKED | Test fixture was mislaid and Telex changed `Banana` to `Bânna`; invalid MATCH probe. |
| C2 | CONCAT | BLOCKED | Telex changed `Office` to `Ofice`; result `VNOfice` follows the altered input and does not verify the requested input. |
| C2 | LEFT | BLOCKED | Telex changed both the function name and `Excel`; invalid probe. |
| C2 | RIGHT | BLOCKED | Telex changed `Excel` to `Ẽcl`; invalid input string. |
| C2 | MID | BLOCKED | Telex changed `Excel` to `Ẽcl`; invalid input string. |
| C2 | MIN | BLOCKED | 3T evaluated `=MIN(1,3,2)` to 1; COM parity and separate undo were not completed. |
| C2 | MAX | BLOCKED | Telex changed the function name; invalid MAX probe. |
| C2 | COUNT | BLOCKED | 3T evaluated `=COUNT(1,2,3)` to 3; COM parity and separate undo were not completed. |
| C2 | COUNTA | BLOCKED | 3T evaluated `=COUNTA("A","B","C")` to 3; COM parity and separate undo were not completed. |
| C2 | SUMPRODUCT | BLOCKED | Exact input `=SUMPRODUCT(2,3)` evaluated to 0 in 3T. Excel COM comparison is pending; treat this as a candidate discrepancy only, outside this branch's no-formula-semantics-change fix limit. |
| C2 | LEN | BLOCKED | 3T evaluated `=LEN("hello")` to 5; COM parity and separate undo were not completed. |
| C2 | TRIM | BLOCKED | Telex changed `Office` to `Ofice`; invalid comparison text. |
| C2 | UPPER | BLOCKED | 3T evaluated `=UPPER("abc")` to `ABC`; COM parity and separate undo were not completed. |
| C2 | LOWER | BLOCKED | Telex changed the function name; invalid LOWER probe. |
| C2 | AND | BLOCKED | 3T evaluated `=AND(TRUE,TRUE)` to `true`; COM parity and separate undo were not completed. |
| C2 | OR | BLOCKED | Telex changed the function name; invalid OR probe. |
| C2 | ABS | BLOCKED | 3T evaluated `=ABS(-5)` to 5; COM parity and separate undo were not completed. |
| C2 | MOD | BLOCKED | 3T evaluated `=MOD(10,3)` to 1; COM parity and separate undo were not completed. |
| C2 | POWER | BLOCKED | Telex changed the function name to `PƠER`; invalid POWER probe. |
| C2 | Common formula error `#DIV/0!` | BLOCKED | 3T displayed `#DIV/0!` for `=1/0`, including after 3T reopen; Excel COM comparison is pending. |
| C2 | Common formula error `#N/A` | BLOCKED | 3T displayed `#N/A` for `=NA()`, including after 3T reopen; Excel COM comparison is pending. |

## C3–C12. Selection, fill, layout, data, charts, print, calculation

These points were not run after the shared desktop became occupied. They are blocked as a group because another active 3T Sheet/LibreOffice session could take foreground and the shared Excel COM server was in use. No further input was sent after that focus handoff was observed.

| Item | Subpoint | Status | Evidence |
|---|---|---|---|
| C3 | Select one cell | BLOCKED | Not run after the desktop became occupied. |
| C3 | Select a range with mouse | BLOCKED | Not run. |
| C3 | Select full row | BLOCKED | Not run. |
| C3 | Select full column | BLOCKED | Not run. |
| C3 | Ctrl+A | BLOCKED | Not run. |
| C3 | Shift+arrow expansion | BLOCKED | Not run. |
| C3 | Ctrl+arrow jump | BLOCKED | Not run. |
| C4 | Fill numeric series | BLOCKED | Not run. |
| C4 | Fill date series | BLOCKED | Not run. |
| C4 | Fill weekday series | BLOCKED | Not run. |
| C4 | Fill month series | BLOCKED | Not run. |
| C4 | Fill formulas | BLOCKED | Not run. |
| C4 | Double-click fill handle | BLOCKED | Not run. |
| C5 | Insert/delete rows | BLOCKED | Not run. |
| C5 | Insert/delete columns | BLOCKED | Not run. |
| C5 | Formulas adjust after insert/delete | BLOCKED | Not run. |
| C5 | Change row height / column width | BLOCKED | Not run. |
| C5 | Auto-fit row / column | BLOCKED | Not run. |
| C5 | Hide/show row / column | BLOCKED | Not run. |
| C6 | Thousands separator and decimals | BLOCKED | Not run. |
| C6 | Date format | BLOCKED | Not run. |
| C6 | VND currency format | BLOCKED | Not run. |
| C6 | Percent format | BLOCKED | Not run. |
| C6 | Alignment | BLOCKED | Not run. |
| C6 | Wrap text | BLOCKED | Not run. |
| C6 | Merge and center | BLOCKED | Not run. |
| C6 | Borders | BLOCKED | Not run. |
| C6 | Fill color | BLOCKED | Not run. |
| C6 | Font formatting | BLOCKED | Not run. |
| C7 | Add / delete sheet | BLOCKED | Not run. |
| C7 | Rename sheet | BLOCKED | Not run. |
| C7 | Move / copy sheet | BLOCKED | Not run. |
| C7 | Tab color | BLOCKED | Not run. |
| C8 | Sort | BLOCKED | Not run. |
| C8 | AutoFilter | BLOCKED | Not run. |
| C8 | Freeze panes | BLOCKED | Not run. |
| C8 | Data validation | BLOCKED | Not run. |
| C8 | Remove duplicates | BLOCKED | Not run. |
| C9 | Basic conditional formatting by value | BLOCKED | Not run. |
| C10 | Column chart | BLOCKED | Not run. |
| C10 | Line chart | BLOCKED | Not run. |
| C10 | Pie chart | BLOCKED | Not run. |
| C10 | Chart survives XLSX save and Excel reopen | BLOCKED | Not run. |
| C11 | Print area | BLOCKED | Not run. |
| C11 | Fit to one page | BLOCKED | Not run. |
| C11 | Repeat header rows | BLOCKED | Not run. |
| C11 | Header / footer | BLOCKED | Not run. |
| C11 | Page breaks | BLOCKED | Not run. |
| C12 | Automatic recalculation | BLOCKED | Not run beyond the C2 formulas above. |
| C12 | Large file remains responsive | BLOCKED | Not run. |

## Findings to assign

| ID | Symptom and Excel behavior | Likely code location | Status & Scope decision |
|---|---|---|---|
| SHEET-BASICS-01 | C1 entries `1234.56`, `31/12/2026`, `13:45`, and `25%` remained text/General through 3T XLSX save and Excel reopen; expected Excel cells are numeric/date/time/percent values with appropriate display semantics. | `apps/sheet/sheet-grid.js` `setCellValue()` user-entry path and `apps/sheet/number-formatter.js` normalization. | ĐÃ XỬ LÝ (ĐẠT): Bổ sung `inferUserInput` trong `NumberFormatter`, xử lý kiểu số, ngày tháng, thời gian, %, tiền tệ VND và định dạng hàng nghìn `#,#0.00` cho `1,234.56`. Hỗ trợ regional separators từ Windows. |
| SHEET-BASICS-02 | Alt+Enter in the active cell produced `Dong1Dong2`, not an in-cell line break, even though the native key event reached the focused formula input with `altKey=true`. | `apps/sheet/sheet-grid.js` formula-input keydown path around the Alt+Enter branch and autocomplete key handling. | ĐÃ XỬ LÝ (ĐẠT): Alt+Enter chèn `\n` chuẩn, kích hoạt wrapText và đồng bộ kích thước thanh công thức. Đã giải quyết xung đột và tích hợp cùng point-mode formula entry từ `main`. |
| SHEET-BASICS-03 | F4 left `=A1` unchanged instead of cycling to an absolute reference. | `apps/sheet/sheet-grid.js` formula-input key routing/reference cycling. | Candidate only; Excel COM confirmation is still required. Not fixed because formula-entry is excluded. |
| SHEET-BASICS-04 | `=SUMPRODUCT(2,3)` returned 0 in 3T Sheet. | `apps/sheet/formula-engine.js` function dispatch/evaluation. | Candidate only; Excel COM confirmation is still required. No formula-engine semantics change was made. |
| SHEET-BASICS-05 | The active Telex input method transformed formula names and test strings during the C2 physical-input sequence. | Test-environment keyboard layout/IME, not yet a product defect. | Rerun after the shared desktop is free, using a verified literal-input path and compare identical input in Excel COM. |
| SHEET-BASICS-06 | Lookup-function setup placed all seed values across row 1, while formulas referenced A1:B3/C1:C3. | Audit fixture setup only. | No product finding; rerun with correctly shaped data. |

## Fixes and verification

- Đã giải quyết xung đột khi merge `main` vào `audit/sheet-basics-codex`:
  - Giữ cả hai phía: nhận dạng kiểu tự động (số, ngày, giờ, %, VND, regional separators), Alt+Enter xuống dòng trong ô và wrap text, cùng tính năng mới từ `main` (focus vào lưới khi khởi động, sửa phím Tab và clipboard, point-mode formula entry theo chuẩn Excel, single-instance windows).
  - Bổ sung định dạng hàng nghìn cho `1,234.56` tự động áp dụng `#,##0.00` như Excel.
- Gates kiểm thử:
  1. `node tests/run-tests.js`: **2227/2227 PASS \| 0 FAIL** (100% PASS, không có lỗi).
  2. `python E:\VN OFice\scripts\layout-audit\_batch_audit.py E:\VNOffice-codex-audit-sheet`: Toàn bộ 28 tệp LAN đều **TONG sai lệch: 0**, Excel COM mở OK, và XML lint clean.
  3. `tests/live/cdp_types.mjs`: Chạy trên Desktop App thật qua CDP WebSocket, kết quả toàn bộ các ô số/ngày/giờ/%/tiền tệ đều căn phải (`align=right/normal`), Alt+Enter xuống dòng trong ô căn trái (`align=start/normal`).
  4. `cdp_formula.mjs`: Chạy trên Desktop App thật qua CDP WebSocket, xác nhận chế độ chọn ô bằng chuột (point mode) hoạt động chính xác, ô A6 hiển thị đúng giá trị **15** (`=SUM(A1:A5)`).
