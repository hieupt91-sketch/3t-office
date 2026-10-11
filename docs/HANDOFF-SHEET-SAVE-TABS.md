# Bàn giao: VN Sheet — Lưu XLSX: tabColor, tabSelected (tránh [Group]) & khôi phục ảnh ô gộp

## 1. Bối cảnh & Mục tiêu

Theo `TASK-BRIEF-SHEET-SAVE-TABS.md`, khi mở và lưu lại file XLSX nhiều sheet có định dạng phức tạp (như `file test/KHOACUA.xlsx`):
1. **Màu tab sheet bị mất hoàn toàn** (`tabColor 0` thay vì `6`): Khi lưu ra file XLSX, người dùng mở bằng Excel không thấy màu trên các tab sheet.
2. **Không sheet nào có `tabSelected`** (`tabSelected 0` thay vì `1`): Excel mở file lên hiển thị tiêu đề `[Group]` (do trạng thái chọn sheet không nhất quán giữa `workbook.xml` và `worksheetN.xml`).
3. **Thiếu ảnh trong XLSX lưu ra** (56 `xdr:pic` thay vì 60 `xdr:pic`): 4 sheet (KHÓA BIỆT THỰ, KHÓA THÔNG MINH, KHÓA NHÔM KÍNH, KHÓA KÍNH) mỗi sheet bị mất đúng 1 ảnh.

Mục tiêu bắt buộc tuân thủ thứ tự: (1) Màu tab sheet -> (2) tabSelected -> (3) Khôi phục ảnh thiếu. Đo lường bằng ứng dụng thật qua `_roundtrip_save_sheet.py` và `_xlsx_tabs.py`.

---

## 2. Nguyên nhân gốc rễ & Kiến trúc giải pháp

### 2.1 Tab Color Export (Màu tab sheet sống sót qua round-trip XLSX)
- **Nguyên nhân gốc**:
  - `sheet-adapter.js` trước đây chỉ ghi `vno:tab-color` (namespace riêng của VN Office) trực tiếp trên thẻ `<table:table>`. Khi chuyển đổi headless từ FODS sang XLSX, LibreOffice Calc hoàn toàn bỏ qua các thuộc tính thuộc namespace lạ này.
- **Giải pháp**:
  - Khai báo namespace chuẩn LibreOffice ODF: `xmlns:tableooo="http://openoffice.org/2009/table"` trên thẻ root `<office:document>`.
  - Trong `serializeToFods()` (`adapters/libreoffice/sheet/sheet-adapter.js`), bổ sung `table:tab-color="${tabColor}" tableooo:tab-color="${tabColor}"` vào `<style:table-properties>` thuộc automatic styles của từng bảng/sheet (`ta*`). Khi có thuộc tính này, LibreOffice Calc hiểu và tự động ánh xạ sang `<sheetPr><tabColor rgb="FFRRGGBB"/></sheetPr>` trong OOXML worksheet.
  - Cập nhật `parseFods()` (cả nhánh DOM và nhánh regex) để đọc màu tab từ style `ta*` (`table:tab-color`/`tableooo:tab-color`) cũng như thuộc tính trực tiếp.
  - **Hàng rào bảo vệ OOXML Post-process** (`adapters/libreoffice/common/ooxml_zip_patch.py`): Bổ sung `parse_tab_colors_from_fods()` và `apply_tab_color_to_worksheet()`. Trong trường hợp soffice không tự xuất, post-process sẽ phân giải ánh xạ worksheet và chèn thẻ `<sheetPr><tabColor rgb="FFRRGGBB"/></sheetPr>` theo đúng thứ tự schema CT_Worksheet (đứng trước `dimension`, `sheetViews`, `sheetData`).

### 2.2 tabSelected & Tiêu đề Excel `[Group]`
- **Nguyên nhân gốc**:
  - LibreOffice Calc khi convert FODS sang XLSX thường xuất `tabSelected="false"` hoặc bỏ qua `tabSelected` trên sheet view.
  - Hàm regex cũ chỉ tìm kiếm dạng số nguyên `tabSelected="0"`, không nhận diện được chuỗi boolean `"false"`. Khi đó, không sheet nào có `tabSelected="1"`, khiến Excel mở file ở chế độ sheet group ambiguous (`[Group]`).
- **Giải pháp**:
  - Trong `adapters/libreoffice/common/ooxml_zip_patch.py`, hàm `apply_sheet_view_selection()`:
    - Sử dụng regex linh hoạt `\btabSelected\s*=\s*(["'])[^"']*\1` để bắt cả giá trị chuỗi boolean (`"false"`, `"true"`) lẫn giá trị số (`"0"`, `"1"`).
    - **Sheet active**: cập nhật `tabSelected="1"` trên `<sheetView>` đầu tiên (nếu chưa có `<sheetViews>`, tự tạo thẻ `<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>` theo đúng schema).
    - **Sheet inactive**: xóa hoàn toàn thuộc tính `tabSelected` khỏi `<sheetView>`.
  - Trong `postprocess_sheet_xlsx()`: đọc `ActiveTable` từ FODS nguồn, ánh xạ sang index trong `xl/workbook.xml` để ghi `activeTab="N"`, đồng thời đồng bộ trạng thái `is_active` cho từng file `worksheetN.xml`.

### 2.3 Khôi phục ảnh thiếu trong ô gộp (Covered-table-cell)
- **Nguyên nhân gốc**:
  - Diff giữa FODS soffice tạo từ `KHOACUA.xlsx` gốc và FODS VN Office serialize cho thấy: ở 4 sheet bị thiếu ảnh, ảnh `image8.jpg` được neo tại các ô bị che phủ bởi vùng gộp (ví dụ ô C2 gộp sang F2, ảnh neo tại ô phủ).
  - Trong ODF, các ô này là `<table:covered-table-cell>`.
  - Cả hai nhánh DOM và regex của `parseFods()` trong `sheet-adapter.js` đều có điều kiện chặn `if (!isCovered)` khi đọc ảnh, khiến ảnh nhúng trong ô covered bị bỏ qua hoàn toàn.
  - Tương tự, `serializeToFods()` khi gặp ô thuộc `coveredCells` chỉ xuất `<table:covered-table-cell/>` rỗng mà không kiểm tra ảnh neo tại ô đó.
- **Giải pháp**:
  - Trong `parseFods()`, gỡ bỏ rào cản `!isCovered` đối với embedded image parsing.
  - Trong `serializeToFods()`, kiểm tra `imagesByAnchor.get(coordinate)` cho các ô trong `coveredCells` và xuất `<table:covered-table-cell>${cellImageXml}</table:covered-table-cell>`.
  - Kết quả: Số lượng frame ảnh trong FODS đạt 8, 19, 10, 3, 17, 3 (khớp 100% với FODS soffice gốc), và file XLSX lưu ra có đủ 60 `xdr:pic`.

---

## 3. Đo lường thực tế trên file `KHOACUA.xlsx`

Chạy đo lường vòng đời ứng dụng thật qua Node.js DOM mock + LibreOffice headless + `postprocess_sheet_xlsx`:

| Chỉ số đo | File gốc (`test/KHOACUA.xlsx`) | Lưu ra trước sửa (main) | Lưu ra sau sửa (`fix/sheet-save-tabs`) |
|---|---|---|---|
| **Số sheet** | 6 | 6 | 6 |
| **Số sheet có tabColor** | **6** | **0** | **6** (100% khớp) |
| **Số sheet có tabSelected** | **1** | **0** (hiện `[Group]`) | **1** (hết `[Group]`) |
| **Tổng số ảnh (`xdr:pic`)** | **60** | **56** (mất 4 ảnh) | **60** (100% khớp) |
| - KHÓA BIỆT THỰ | 8 pics | 7 pics | 8 pics |
| - KHÓA THÔNG MINH | 19 pics | 18 pics | 19 pics |
| - KHÓA NHÔM KÍNH | 10 pics | 9 pics | 10 pics |
| - KHÓA KÍNH | 3 pics | 2 pics | 3 pics |
| - KHÓA KHÁCH SẠN | 17 pics | 17 pics | 17 pics |
| - KHÓA CỬA CỔNG | 3 pics | 3 pics | 3 pics |

Lệnh kiểm tra:
```bash
python _roundtrip_save_sheet.py "file test/KHOACUA.xlsx" "$env:TEMP/saved_KHOACUA.xlsx"
python _xlsx_tabs.py "file test/KHOACUA.xlsx" "$env:TEMP/saved_KHOACUA.xlsx"
```
Kết quả in ra:
```
file test/KHOACUA.xlsx  sheets 6  tabColor 6  tabSelected 1
C:\Users\...\saved_KHOACUA.xlsx  sheets 6  tabColor 6  tabSelected 1
```

---

## 4. Kiểm thử tự động (Unit & Integration Tests)

1. **Python Unit & Integration Tests** (`tests/test_sheet_borders_activetab.py`):
   - `TestParseTabColorsFromFods`: parse màu tab từ `<style:table-properties>` và trực tiếp từ `<table:table>`.
   - `TestApplyTabColorToWorksheet`: áp dụng `<sheetPr><tabColor rgb="..."/>` vào CT_Worksheet theo đúng thứ tự schema.
   - `TestApplySheetViewSelection`: kiểm tra sheet active nhận `tabSelected="1"`, sheet inactive bị xóa `tabSelected`.
   - `TestPostprocessSheetXlsxTabsIntegration`: kiểm tra tích hợp toàn diện quy trình `postprocess_sheet_xlsx` với nhiều sheet.
   - Kết quả: **18/18 PASS**.

2. **JavaScript Unit Tests** (`tests/unit/sheet-image-import-export.test.js` - Suite 130):
   - Kiểm tra `parseFods` đọc ảnh nhúng trong `<table:covered-table-cell>`.
   - Kiểm tra `serializeToFods` giữ lại `<draw:frame>` trong `<table:covered-table-cell>`.
   - Kiểm tra round-trip `serializeToFods` và `parseFods` với `tableooo:tab-color`.
   - Kết quả: **14/14 PASS**.

3. **Cú pháp JavaScript** (`scripts/check-syntax.js`):
   - **92/92 PASS | 0 lỗi cú pháp**.

---

## 5. Tệp tin thay đổi

- `adapters/libreoffice/sheet/sheet-adapter.js`:
  - Khai báo `xmlns:tableooo` trên `<office:document>`.
  - Xuất `table:tab-color` và `tableooo:tab-color` trong style `ta*` khi serialize FODS.
  - Phục hồi ảnh nhúng trong ô gộp (`covered-table-cell`) cả ở chiều parse và serialize.
- `adapters/libreoffice/common/ooxml_zip_patch.py`:
  - Bổ sung `parse_tab_colors_from_fods()` và `apply_tab_color_to_worksheet()`.
  - Nâng cấp `apply_sheet_view_selection()` xử lý triệt để regex boolean `tabSelected`.
  - Tích hợp xử lý màu tab và chọn sheet trong `postprocess_sheet_xlsx()`.
- `tests/test_sheet_borders_activetab.py`:
  - Bổ sung các test case cho `tabColor`, `tabSelected` và tích hợp `postprocess_sheet_xlsx`.
- `tests/unit/sheet-image-import-export.test.js`:
  - Bổ sung các unit test cho covered-table-cell images và tab color ODF styles.
