# Agent Handoff
TASK: Sheet lưu XLSX — độ rộng cột hiển thị trong Excel bị hẹp hơn gốc (font Normal + đơn vị ký tự)
AGENT/ROLE: Sheet Integration/Core owner
BRANCH: fix/sheet-save-colwidth-normal-font
WORKTREE: E:\VNOffice-opencode-sheet-colwidth
OBJECTIVE: Khi lưu file XLSX từ VN Sheet, khôi phục font Normal (Arial 11) và viết lại độ rộng cột theo đơn vị ký tự của font gốc để Excel hiển thị đúng chiều rộng như file gốc.
FINDINGS:
- Vấn đề gốc: LibreOffice chuyển FODS→XLSX dùng font mặc định Arial 10 (max digit width 7px) để quy đổi px→char, trong khi file gốc dùng Arial 11 (mdw 8px). Dẫn đến cột hẹp hơn ~18% khi mở trong Excel.
- Chiều MỞ (`_overlay_sheet_layout_from_xlsx`) đã có overlay `vno:xlsx-layout` với px = width × digit_width + 5 từ font gốc → app hiển thị đúng.
- Chiều LƯU (`postprocess_sheet_xlsx`) chưa xử lý font Normal / đơn vị độ rộng → LibreOffice ghi fonts[0]=Arial 10, col width sai lệch.
- Auditor nhóm `columnWidth: 12` mỗi sheet (px expected 229 vs actual 251.89 cho cột B, …).
- Excel chụp `_excel_orig_ktm.png` vs `_excel_saved_ktm.png`: mọi cột bản lưu HẸP hơn gốc (cột B ~187px so với ~223px; các cột A..K gốc kết thúc ở x≈1150, bản lưu ở x≈1085).

IMPLEMENTATION SUMMARY:
1. Thêm hàm `_extract_normal_font_from_xlsx()`: trích xuất font Normal đầy đủ (name, size, color theme/tint/rgb, scheme, bold, italic, underline, strike) từ fonts[0] và cellStyleXfs[0] của xl/styles.xml gốc.
2. Thêm hàm `_extract_sheet_format_pr_from_xlsx()`: trích xuất sheetFormatPr (defaultColWidth, defaultRowHeight, customHeight) cho từng sheet từ xl/worksheets/sheetN.xml gốc.
3. Thêm hàm `_calculate_digit_width()`: tính max digit width (mdw) từ tên font + cỡ chữ (Arial≥11→8px, Calibri≥12→8px, Times≥12→8px, còn lại 7px).
4. Sửa `_extract_default_font_digit_width()` dùng hàm chung `_calculate_digit_width()`.
5. Thêm hàm `_get_fods_column_widths_by_letter()`: đọc `style:column-width` (cm) từ FODS nguồn (.sent.fods) và map sang chữ cái cột (A, B, C...), xử lý đúng `table:number-columns-repeated`.
6. Thêm hàm `_extract_fods_row_heights_cm()`: đọc `style:row-height` (cm) từ FODS nguồn.
7. Thêm hàm `_restore_normal_font_and_layout()`: trong `postprocess_sheet_xlsx` khi có `source_xlsx_bytes`:
   - Khôi phục font Normal vào xl/styles.xml (fonts[0] + cellStyleXfs[0] fontId=0), không đụng các xf khác.
   - Với mỗi sheet: chuyển width_cm → px = width_cm × 96/2.54 → chars = trunc((px−5)/mdw×100+0.5)/100 (công thức Excel), ghi lại `<col width="...">` cho mọi cột (kể cả repeat).
   - Khôi phục sheetFormatPr (defaultColWidth/defaultRowHeight/customHeight) cho sheet chưa đổi mặc định.
   - Khôi phục row height: height_cm → pt = height_cm × 72/2.54, ghi `ht` + `customHeight="1"`.
8. Mở rộng `postprocess_sheet_xlsx()` nhận tham số `source_xlsx_bytes: bytes | None = None`.
9. Cập nhật `main.py:_apply_native_export_postprocess()` đọc file XLSX gốc từ `source_path` và truyền vào `postprocess_sheet_xlsx()`.
10. Cập nhật `postprocess_sheet_xlsx_file()` CLI hỗ trợ `source_xlsx_path`.

FILES CHANGED:
- adapters/libreoffice/common/ooxml_zip_patch.py: +650 dòng (hàm mới + logic restore)
- main.py: +10 dòng (đọc source_xlsx_bytes)

COMMANDS RUN:
- node scripts/check-syntax.js → 92/92 PASS
- python -m unittest discover -s tests -p "test_sheet*.py" → 103/103 OK
- node tests/run-tests.js → 1741/1741 PASS

BUILD RESULT: PASS
TEST RESULTS:
- 103 Python sheet tests PASS
- 1741 JS unit tests PASS
- Auditor `columnWidth` group: cần chạy với file thực tế khi có LibreOffice (môi trường CI)
- Excel visual parity: cần chụp màn hình so sánh khi có LibreOffice + Excel

KNOWN FAILURES: Không (all tests pass)

RISKS:
- Regex-based XML parsing có thể fragile nếu LibreOffice đổi format styles.xml/worksheet.xml.
- FODS column width extraction phụ thuộc vào `style:column-width` trong automatic-styles; nếu LO không ghi ra thì fallback không hoạt động.
- Row height restoration giả định FODS có `style:row-height`; nếu LO không ghi thì không khôi phục được.

DEPENDENCIES/BLOCKERS: Cần LibreOffice soffice + Excel thật để đo end-to-end (roundtrip + auditor + chụp màn hình).

CORE PATCH ID (if any): N/A (chỉ patch adapter, không sửa LibreOffice core)

NEXT ACTION:
1. Triển khai CI/CD có LibreOffice + Excel để chạy `_roundtrip_save_sheet.py` + auditor + `_excel_capture_sheet.ps1` tự động.
2. Thêm unit test chuyên biệt cho `_restore_normal_font_and_layout()` với fixture KHOACUA.xlsx.
3. Review và merge branch `fix/sheet-save-colwidth-normal-font` vào main.