# BÁO CÁO KIỂM TOÁN VÀ ĐỐI CHIẾU KIỂU BẢNG VÀ TÙY CHỌN KIỂU BẢNG (AGY-TABLESTYLE)

- **Mã phiếu**: `AGY-TABLESTYLE`
- **Worktree**: `E:\VNOffice-agy-tablestyle`
- **Nhánh**: `feat/sheet-tablestyle-agy`
- **Ngày thực hiện**: 16/10/2026
- **Đối tượng**: VN Sheet — Kiểu Bảng "sống" (Live Table Styles) và đủ 7 Tùy chọn kiểu bảng (Table Style Options) tương thích chuẩn Excel 2016.

---

## 1. Mục tiêu và Phạm vi
Xây dựng và nâng cấp hệ thống Kiểu Bảng (Table Styles) trong VN Sheet đạt mức độ tương đương (parity) với Excel 2016 (`Thiết kế Bảng > Tùy chọn kiểu bảng`):
1. **Mô hình & Hiển thị sống (Live Overlay)**:
   - Đủ 7 cờ tùy chọn kiểu bảng trong mô hình: `hasHeaders`, `showTotals`, `showRowStripes`, `showFirstColumn`, `showLastColumn`, `showColumnStripes`, `showAutoFilter`.
   - Hiển thị theo cơ chế lớp phủ động (live overlay) trong `_renderCellVisual`, không tô màu cứng đè lên thuộc tính ô người dùng đã định dạng riêng (`DisplayFormat` semantics). Khi chuyển bảng về vùng (`convertTableToRange` / unlist), nung (bake) màu visual vào ô để giữ nguyên giao diện như Excel.
2. **Ribbon & Lệnh điều khiển**:
   - Tab "Thiết kế Bảng" có nhóm "Tùy chọn kiểu bảng" với 7 hộp kiểm (3 cột chuẩn UX), đồng bộ trạng thái hai chiều với bảng đang chọn.
   - Thao tác bật/tắt tùy chọn và đổi kiểu bảng hỗ trợ Hoàn tác / Làm lại (Undo/Redo) chính xác trong 1 bước.
3. **Bộ sưu tập kiểu bảng (Gallery)**:
   - Đo đạc trực tiếp từ Excel 2016 COM bằng `Range.DisplayFormat`: trích xuất chính xác mã màu nền, màu chữ, font in đậm, và kiểu đường viền của đủ 21 kiểu bảng chính (Light 1–7, Medium 1–7, Dark 1–7) và bảo tồn 5 kiểu truyền thống (`tableBlue`, `tableGreen`, `tableDark`, `tableOrange`, `tablePurple`).
4. **Lưu trữ và Tương thích hai chiều (Round-trip Fidelity)**:
   - Lưu và đọc đầy đủ 7 cờ cùng tên kiểu bảng qua ODF `<table:database-range>` và OOXML `<tableStyleInfo showFirstColumn="1/0" showLastColumn="1/0" showRowStripes="1/0" showColumnStripes="1/0"/>`.
   - Excel 2016 COM mở tệp xuất bởi VN Sheet ở chế độ `ReadOnly=$true` không có thông báo sửa chữa (repair prompt), đọc được đầy đủ 7 cờ và tên kiểu bảng.
5. **Trợ giúp & Đa ngôn ngữ (i18n & Help)**:
   - Bài hướng dẫn sử dụng tiếng Việt chi tiết trong ứng dụng tại `platform/help/entries-sheet.js`.
   - Toàn bộ chuỗi i18n tiếng Việt và tiếng Anh không vi phạm bất kỳ từ khóa nhãn hiệu thương mại cấm nào.

---

## 2. Đo đạc Đối chiếu Excel 2016 COM thật

### 2.1. Đo đạc các thuộc tính ListObject
Bằng PowerShell script đo đạc COM trên Excel 2016 (`Application.Workbooks.Add()`):
- `ListObject.ShowHeaders`: Boolean (`$true`/`$false`). Khi `$false`, Excel ẩn hàng tiêu đề khỏi phạm vi hiển thị bảng.
- `ListObject.ShowTotals`: Boolean (`$true`/`$false`). Khi `$true`, dòng tổng xuất hiện ở cuối bảng với công thức `SUBTOTAL`.
- `ListObject.ShowTableStyleRowStripes`: Boolean (`$true`/`$false`). Bật/tắt dải màu so le hàng.
- `ListObject.ShowTableStyleColumnStripes`: Boolean (`$true`/`$false`). Bật/tắt dải màu so le cột.
- `ListObject.ShowTableStyleFirstColumn`: Boolean (`$true`/`$false`). Định dạng nổi bật cột đầu tiên (chữ đậm / màu riêng).
- `ListObject.ShowTableStyleLastColumn`: Boolean (`$true`/`$false`). Định dạng nổi bật cột cuối cùng (chữ đậm / màu riêng).
- `ListObject.ShowAutoFilter`: Boolean (`$true`/`$false`). Bật/tắt các nút lọc (filter dropdown arrows) tại hàng tiêu đề.

### 2.2. Đo đạc màu sắc hiển thị (Range.DisplayFormat)
Trích xuất 21 kiểu bảng Excel 2016:
- **TableStyleLight1..7**: Phong cách thanh lịch, viền ngang tinh tế, dải sọc nhạt.
- **TableStyleMedium1..7**: Tiêu đề có nền đậm (Theme color), viền đôi ở chân bảng, dải sọc luân phiên.
- **TableStyleDark1..7**: Tiêu đề nền đen/tối toàn phần, dải dữ liệu tương phản cao.
Tất cả giá trị RGB, Font.Bold và Borders đã được lưu tại `docs/excel_tablestyles_21.json` và cấu hình tại `apps/sheet/cell-style-presets.js`.

---

## 3. Bảng so sánh Hiện trạng (Trước vs Sau)

| Đặc tính / Tùy chọn | Excel 2016 Chuẩn | VN Sheet Trước | VN Sheet Sau |
| :--- | :--- | :--- | :--- |
| **Số tùy chọn kiểu bảng** | 7 hộp kiểm | 1 nút Hàng tổng, không có 6 tùy chọn còn lại | Đủ 7 hộp kiểm tương ứng 7 lệnh trên Ribbon |
| **Cơ chế tô màu bảng** | Sống (DisplayFormat overlay) | Tô tĩnh cứng vào `cellsData` | Sống động (`_computeTableCellStyle` trong `_renderCellVisual`) |
| **Định dạng riêng của ô** | Định dạng riêng của người dùng thắng kiểu bảng | Kiểu bảng đè lên hoặc bị mất khi format | Ô có định dạng riêng thắng, ô mặc định nhận kiểu bảng (`_fromTable: true`) |
| **Chuyển bảng về vùng (Unlist)** | Nung màu kiểu bảng vào ô, bỏ tính năng bảng | Giữ nguyên style đã tô tĩnh | Nung màu thị giác tính toán vào ô, dọn sạch cờ `_fromTable` |
| **Số kiểu bảng tích hợp** | 61 kiểu (Light, Medium, Dark) | 5 kiểu sơ khai (`tableBlue`, `tableGreen`, ...) | 21 kiểu chuẩn Excel 2016 COM + 5 kiểu truyền thống |
| **Xuất .xlsx (tableStyleInfo)** | Xuất đủ 4 cờ sọc và cột | Đặt cứng `showFirstColumn="0" showLastColumn="0" showColumnStripes="0"` | Xuất động chính xác 4 cờ từ model bảng |
| **Nhập .xlsx từ Excel** | Nhận đủ 7 cờ | Chỉ đọc `table-name` và `ref` | Đọc đủ 7 cờ và tên kiểu vào model bảng |
| **Undo / Redo** | 1 bước hoàn tác | Chưa có undo riêng cho tùy chọn kiểu bảng | 1 bước hoàn tác khôi phục trạng thái bảng và hiển thị |

---

## 4. Chi tiết các tệp đã triển khai

1. **`docs/excel_tablestyles_21.json`**:
   - Dữ liệu đo đạc 21 kiểu bảng gốc từ Excel 2016 COM.
2. **`apps/sheet/cell-style-presets.js`**:
   - Định nghĩa 21 presets `TableStyleLight1..7`, `TableStyleMedium1..7`, `TableStyleDark1..7` kèm màu `headerStyle`, `evenRowStyle`, `oddRowStyle`, `firstColumnStyle`, `lastColumnStyle`, `totalRowStyle`.
   - Bảo tồn 5 alias legacy (`tableBlue`, `tableGreen`, `tableDark`, `tableOrange`, `tablePurple`) với màu gốc.
   - Thêm `TABLE_STYLE_CATEGORIES` và hàm tìm kiếm `findTableStylePreset(id)`.
3. **`apps/sheet/sheet-grid.js`**:
   - Hàm `_computeTableCellStyle(table, col, row)`: tính toán style động theo 7 cờ tùy chọn.
   - Hàm `_renderCellVisual(cellCoord, cellElement)`: áp dụng dynamic table styling layer, tôn trọng explicit styling của người dùng.
   - Thêm các phương thức: `toggleTableHeaderRow`, `toggleTableBandedRows`, `toggleTableFirstColumn`, `toggleTableLastColumn`, `toggleTableBandedColumns`, `toggleTableFilterButton`, `setTableStyle`, `setTableOption`.
   - Cập nhật `_updateFilterButtons`: ẩn nút dropdown khi `showAutoFilter === false`.
   - Cập nhật `convertTableToRange`: nung visual table style vào cell style vĩnh viễn.
   - Cập nhật `_syncFormatToggleUI`: phát tín hiệu đồng bộ `checked` cho 7 checkbox trên Command Bus.
4. **`apps/sheet/sheet-ribbon.js`**:
   - Nhóm "Tùy chọn kiểu bảng" dạng lưới 3 cột gồm 7 checkbox:
     - Cột 1: Hàng tiêu đề (`toggleHeaderRow`), Hàng tổng (`toggleTotalRow`), Hàng sọc (`toggleBandedRows`).
     - Cột 2: Cột đầu (`toggleFirstColumn`), Cột cuối (`toggleLastColumn`), Cột sọc (`toggleBandedColumns`).
     - Cột 3: Nút lọc (`toggleFilterButton`).
   - Nút "Kiểu Bảng" mở hộp thoại Gallery.
5. **`apps/sheet/cell-styles.js`**:
   - Gallery hiển thị nhóm kiểu Light, Medium, Dark. Bấm vào kiểu lập tức áp dụng ngay cho bảng đang chọn.
6. **`platform/commands/command-definitions.js`**:
   - Khai báo 8 lệnh bảng: `sheet.table.toggleHeaderRow`, `sheet.table.toggleTotalRow`, `sheet.table.toggleBandedRows`, `sheet.table.toggleFirstColumn`, `sheet.table.toggleLastColumn`, `sheet.table.toggleBandedColumns`, `sheet.table.toggleFilterButton`, `sheet.table.styles`.
7. **`platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`**:
   - Dịch đầy đủ tên lệnh, nhóm ribbon, từ điển kiểu bảng, 0 vi phạm từ cấm thương mại.
8. **`platform/help/entries-sheet.js`**:
   - Thêm bài hướng dẫn `sheet.table.styleOptions` và `sheet.table.stylesGallery` bằng tiếng Việt cụ thể.
9. **`adapters/libreoffice/sheet/sheet-adapter.js`**:
   - Serialize/deserialize đầy đủ `vno:table-column-stripes`, `vno:table-first-column`, `vno:table-last-column`, `vno:table-row-stripes`, `vno:table-headers`, `vno:table-show-autofilter`, `vno:table-totals`.
10. **`adapters/libreoffice/common/ooxml_zip_patch.py`**:
    - Trích xuất động `showFirstColumn`, `showLastColumn`, `showRowStripes`, `showColumnStripes` vào thẻ `<tableStyleInfo>` trong `xl/tables/table*.xml`.
11. **`scripts/audit-0610/structural_oracle.mjs` & `structural_oracle.ps1`**:
    - Hỗ trợ thao tác cấu trúc mới `setTableStyle` và `setTableStyleOptions`.
12. **`tests/functions/structural-cases-14.json`**:
    - Bộ 5 kịch bản kiểm thử cấu trúc kiểu bảng và tùy chọn kiểu bảng đối chiếu trực tiếp với Excel 2016 COM.
13. **`tests/unit/sheet-tablestyle.test.js`**:
    - Bộ 13 unit tests kiểm tra toàn diện logic, palette, precedence, undo/redo, round-trip ODF/OOXML, i18n, help.
14. **`tests/unit/help-coverage.test.js` & `tests/run-tests.js`**:
    - Cập nhật số lệnh Sheet (199 lệnh) và đăng ký suite 3b2b.

---

## 5. Kết quả Kiểm thử và Nghiệm thu

### 5.1. Unit Tests Suite (`npm test`)
- **Kết quả**: **3531/3531 PASS** (100%), **0 FAIL**.
- Suite `sheet-tablestyle.test.js` (suite 3b2b): **13/13 PASS**.

### 5.2. Structural Oracle (Excel 2016 COM)
- `tests/functions/structural-cases-14.json`: **5/5 kịch bản PASS**, **49/49 ô khớp tuyệt đối**.
- `tests/functions/structural-cases-8.json` (hồi quy): **26/26 kịch bản PASS**, **189/189 ô khớp tuyệt đối**.

### 5.3. Formula vs Cache Regression
- `lan04.xlsx`: **100.00%** (49/49 ô khớp cache).
- `lan28.xlsx`: **98.55%** (271/275 ô khớp cache, vượt ngưỡng yêu cầu >= 98.18%).

### 5.4. LAN Batch Document Roundtrip Layout Audit (10 tệp)
Lệnh: `$env:VNO_AUDIT_MARK_DIRTY='1'; python scripts/layout-audit/batch_document_audit.py xlsx E:\VNOffice-agy-tablestyle lan01 lan02 lan04 lan06 lan09 lan11 lan22 lan26 lan13 lan19`
- `lan01.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan02.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan04.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan06.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan09.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan11.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan22.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan26.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan13.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
- `lan19.xlsx`: PASS, diffs=0, lint=clean, excel=PASS
=> **10/10 tệp PASS với diffs=0, lint sạch và Excel COM mở không lỗi**.

### 5.5. Excel 2016 COM ReadOnly Verification
- Kiểm tra quy trình khép kín: Tạo bảng có 7 cờ bằng Excel COM -> VN Sheet mở đọc đúng 7 cờ -> VN Sheet đổi kiểu `TableStyleDark3` và đổi cờ -> Lưu tệp -> Excel 2016 COM mở ở chế độ `ReadOnly=$true` thành công 100%, đọc được đầy đủ kiểu mới và các cờ cập nhật.

---

## 6. Kết luận
Toàn bộ yêu cầu của phiếu `AGY-TABLESTYLE` đã hoàn thành trọn vẹn, tuân thủ tất cả luật cứng và ranh giới kiến trúc của dự án VN Office.
