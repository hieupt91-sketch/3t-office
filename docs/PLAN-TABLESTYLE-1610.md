# KẾ HOẠCH — Kiểu Bảng "Sống" + 7 Tùy Chọn Kiểu Bảng VN Sheet Khớp Excel 2016 (AGY-TABLESTYLE)

## 1. Mục tiêu
Nâng cấp toàn diện tính năng bảng (Table / ListObject) trong VN Sheet đạt mức độ tương thích cao với chuẩn Excel 2016:
1. **Mô hình + hiển thị sống**: Mở rộng model bảng có đủ 7 cờ (`hasHeaders`, `showTotals`, `showRowStripes`, `showColumnStripes`, `showFirstColumn`, `showLastColumn`, `showAutoFilter`). Áp dụng kiểu bảng dạng lớp phủ sống (live styling overlay) trong luồng hiển thị `_renderCellVisual` thay vì ghi đè tĩnh vào dữ liệu ô; ô có định dạng riêng của người dùng luôn thắng kiểu bảng. Giữ nguyên tương thích với bảng đã có.
2. **Ribbon Thiết kế Bảng > Tùy chọn kiểu bảng**: Cung cấp đầy đủ 7 hộp kiểm (checkboxes) với nhãn tiếng Việt chuẩn: Hàng tiêu đề, Hàng tổng, Hàng sọc, Cột đầu, Cột cuối, Cột sọc, Nút lọc. Tự động đồng bộ trạng thái theo bảng đang chọn, hỗ trợ bàn phím/phím tắt, hoàn tác/làm lại (Undo/Redo) nguyên vẹn trong 1 bước.
3. **Gallery kiểu bảng phong phú chuẩn Excel 2016**: Mở rộng từ 5 preset cũ thành ít nhất 21 preset chuẩn đo trực tiếp từ Excel 2016 qua COM `DisplayFormat`: Light 1–7, Medium 1–7, Dark 1–7; giữ alias tương thích ngược với các ID cũ (`tableBlue`, `tableGreen`, `tableDark`, `tableOrange`, `tablePurple`).
4. **Lưu & Mở lại .xlsx / FODS 100% trung thực**:
   - Khi lưu: ghi nhận đầy đủ 7 cờ trong FODS database-ranges và sinh ra phần tử `<tableStyleInfo name="..." showFirstColumn="1/0" showLastColumn="1/0" showRowStripes="1/0" showColumnStripes="1/0"/>` cùng các thuộc tính `headerRowCount`, `totalsRowCount`, thẻ `<autoFilter>` chuẩn OpenXML.
   - Khi mở lại: khôi phục nguyên vẹn 7 cờ và tên kiểu từ `tableStyleInfo` và cấu trúc bảng của file .xlsx do Excel hoặc VN Sheet tạo; hiển thị trực quan đúng các dải màu, cột đầu, cột cuối.
5. **Tài liệu & Trợ giúp**: Bài viết Trợ giúp tiếng Việt chi tiết (F1 / tab Trợ giúp), chuỗi i18n VI/EN chuẩn, tài liệu kiểm toán `docs/AUDIT-TABLESTYLE-1610.md`, kịch bản cấu trúc `tests/functions/structural-cases-14.json` đối chiếu trực tiếp với Excel 2016 COM thật.

---

## 2. Hiện trạng & Bằng chứng thực tế
- **apps/sheet/sheet-grid.js**:
  - `formatAsTable` (~dòng 12163): kiểu bảng được tô tĩnh trực tiếp vào `cell.style` của từng ô (`preset.headerStyle`, `preset.evenRowStyle`, `preset.oddRowStyle`). Khi người dùng đổi kiểu hoặc đổi tùy chọn (như tắt sọc), các ô không đổi màu sống.
  - Model bảng hiện tại (`tablesBySheet`): chỉ chứa `name`, `ref`, `hasHeaders`, `style`, `excelStyle`, `showAutoFilter`, `showRowStripes` (đặt cứng `true`). Chưa có `showFirstColumn`, `showLastColumn`, `showColumnStripes`, `showTotals`.
  - Ribbon tab ngữ cảnh `tableDesign`: nhóm `tableStyleOptions` chỉ có duy nhất nút `sheet.table.toggleTotalRow`, thiếu 6 tùy chọn còn lại.
- **apps/sheet/cell-style-presets.js**:
  - Chỉ có 5 kiểu: `tableBlue`, `tableGreen`, `tableDark`, `tableOrange`, `tablePurple`.
  - Chưa phân họ Light / Medium / Dark và thiếu tên kiểu chuẩn `TableStyleLight*`, `TableStyleMedium*`, `TableStyleDark*` của Excel.
- **adapters/libreoffice/common/ooxml_zip_patch.py**:
  - Dòng 2718: `style_xml` ghi cứng `showFirstColumn="0" showLastColumn="0" showColumnStripes="0"`.
  - Dòng 14820: `_parse_xlsx_tables` khi đọc XLSX chỉ lấy `showRowStripes`, hoàn toàn bỏ qua `showFirstColumn`, `showLastColumn`, `showColumnStripes`.
  - Dòng 14769: `overlay_sheet_xlsx_tables` không truyền các cờ này vào `<table:database-range>`.
- **adapters/libreoffice/sheet/sheet-adapter.js**:
  - `_attachImportedTables` (dòng 3154) và `_serializeDatabaseRanges` (dòng 3220) chỉ ghi nhận `vno:table-headers`, `vno:table-show-autofilter`, `vno:table-row-stripes`, `vno:table-totals`. Chưa có các thuộc tính cột và dải cột.

---

## 3. Thiết kế kỹ thuật chi tiết

### A. Mô hình dữ liệu Table Model
Mỗi đối tượng `table` trong `grid.tablesBySheet[sheetName]` có cấu trúc:
```javascript
{
  name: "Table1",
  ref: "A1:D6",
  hasHeaders: true,          // Hàng tiêu đề (ShowHeaders / headerRowCount)
  showTotals: false,         // Hàng tổng (ShowTotals / totalsRowCount)
  showRowStripes: true,      // Hàng sọc (ShowTableStyleRowStripes / showRowStripes)
  showColumnStripes: false,  // Cột sọc (ShowTableStyleColumnStripes / showColumnStripes)
  showFirstColumn: false,    // Cột đầu (ShowTableStyleFirstColumn / showFirstColumn)
  showLastColumn: false,     // Cột cuối (ShowTableStyleLastColumn / showLastColumn)
  showAutoFilter: true,      // Nút lọc (ShowAutoFilter / <autoFilter>)
  style: "TableStyleMedium2",// ID kiểu bảng
  excelStyle: "TableStyleMedium2" // Tên kiểu Excel tương ứng
}
```

### B. Cơ chế hiển thị sống (Live Styling Overlay)
Trong `_renderCellVisual(td, itm, col, row)`:
1. Vẽ nền và kiểu ô cơ bản từ `itm.style` (nếu có).
2. Kiểm tra xem tọa độ `(col, row)` có nằm trong bảng nào thuộc `this.tablesBySheet[this.activeSheet]` không:
   - Nếu có, tính toán kiểu bảng (`tableStyle`):
     - **Hàng tiêu đề**: Nếu `table.hasHeaders !== false` và `row === bounds.start.r`: áp dụng `headerStyle` (chữ đậm, màu nền tiêu đề, màu chữ, viền dưới tiêu đề).
     - **Hàng tổng**: Nếu `table.showTotals` và `row === bounds.end.r`: áp dụng `totalStyle` (chữ đậm, viền kép dưới/viền trên).
     - **Hàng dữ liệu** (giữa tiêu đề và tổng):
       - Nếu `table.showRowStripes !== false`: hàng lẻ là `band1`, hàng chẵn là `band2` (tính từ hàng dữ liệu đầu tiên).
       - Nếu `table.showColumnStripes`: xen kẽ cột `colBand1` / `colBand2`.
       - Nếu `table.showFirstColumn` và là cột đầu tiên: áp dụng `firstCol` (font bold, nền nổi bật nếu có).
       - Nếu `table.showLastColumn` và là cột cuối cùng: áp dụng `lastCol` (font bold, nền nổi bật nếu có).
   - **Quy tắc ưu tiên (Precedence)**: Định dạng người dùng đặt riêng trên ô (`itm.style.backgroundColor`, `itm.style.color`, `itm.style.fontWeight`, v.v.) luôn THẮNG (ghi đè lên kiểu bảng), khớp 100% với cơ chế `DisplayFormat` của Excel 2016.
3. Khi người dùng bật/tắt bất kỳ tùy chọn nào hoặc đổi kiểu bảng, gọi re-render vùng bảng mà không cần sửa `cellsData`, đảm bảo hiển thị tức thì, mượt mà và hỗ trợ Undo/Redo hoàn hảo.

### C. 21 Preset kiểu bảng chuẩn Excel 2016 (đo từ COM DisplayFormat)
Bao gồm đủ 3 họ:
- **Light 1–7**: `TableStyleLight1` đến `TableStyleLight7`
- **Medium 1–7**: `TableStyleMedium1` đến `TableStyleMedium7`
- **Dark 1–7**: `TableStyleDark1` đến `TableStyleDark7`
Mỗi preset được cấu hình chuẩn xác theo bảng đo màu từ Excel 2016:
- Màu nền và màu chữ header, band1, band2, firstCol, lastCol, total
- Màu viền headerBottom, totalTop, totalBottom
- Các alias kế thừa: `tableBlue` -> `TableStyleMedium2`, `tableGreen` -> `TableStyleMedium4`, `tableDark` -> `TableStyleDark1`, `tableOrange` -> `TableStyleMedium3`, `tablePurple` -> `TableStyleMedium12`.

### D. Ribbon Thiết kế Bảng & Lệnh
Thêm và đăng ký các lệnh mới:
- `sheet.table.toggleHeaderRow` (Hàng tiêu đề)
- `sheet.table.toggleTotalRow` (Hàng tổng - đã có, hoàn thiện tích hợp)
- `sheet.table.toggleBandedRows` (Hàng sọc)
- `sheet.table.toggleFirstColumn` (Cột đầu)
- `sheet.table.toggleLastColumn` (Cột cuối)
- `sheet.table.toggleBandedColumns` (Cột sọc)
- `sheet.table.toggleFilterButton` (Nút lọc)
- `sheet.table.setStyle` / `sheet.style.formatAsTable` (Kiểu bảng)

Trong `apps/sheet/sheet-ribbon.js`:
Cấu trúc nhóm `tableStyleOptions` thành các cột hộp kiểm chuẩn:
- Cột 1: Hàng tiêu đề, Hàng tổng, Hàng sọc
- Cột 2: Cột đầu, Cột cuối, Cột sọc
- Cột 3: Nút lọc
Tất cả các hộp kiểm dùng `type: "checkbox"` chuẩn WAI-ARIA, phím Space/Enter toggle, đồng bộ `checked` khi chọn ô trong bảng.
Undo/Redo: mọi thao tác toggle đều ghi vào snapshot lịch sử `sheet-tables` khôi phục đúng 1 bước.

### E. Lưu & Mở lại (FODS + OOXML)
- **FODS Serialization (`sheet-adapter.js`)**:
  Bổ sung vào thẻ `<table:database-range>`:
  - `vno:table-column-stripes="true/false"`
  - `vno:table-first-column="true/false"`
  - `vno:table-last-column="true/false"`
- **XLSX Patching (`ooxml_zip_patch.py`)**:
  - `parse_tables_from_fods`: đọc `column-stripes`, `first-column`, `last-column`.
  - `_apply_table_metadata_from_fods`: ghi `<tableStyleInfo name="{style}" showFirstColumn="{1 if first_column else 0}" showLastColumn="{1 if last_column else 0}" showRowStripes="{1 if row_stripes else 0}" showColumnStripes="{1 if column_stripes else 0}"/>`.
  - `_parse_xlsx_tables`: đọc `showFirstColumn`, `showLastColumn`, `showColumnStripes` từ `<tableStyleInfo>`.
  - `overlay_sheet_xlsx_tables`: đưa các cờ vào FODS `<table:database-range>`.
  - `sheet-adapter.js::_attachImportedTables`: khôi phục đủ 7 cờ lên model bảng khi mở tệp.

---

## 4. Danh sách tệp & module thay đổi
1. `apps/sheet/cell-style-presets.js`: Bổ sung 21 preset chuẩn Excel (Light 1-7, Medium 1-7, Dark 1-7) và mapper/alias.
2. `apps/sheet/cell-styles.js`: Cập nhật gallery hiển thị phân nhóm Light/Medium/Dark, chọn kiểu và đổi kiểu bảng trực tiếp.
3. `apps/sheet/sheet-grid.js`: Mở rộng model bảng 7 cờ, live overlay rendering trong `_renderCellVisual`, các phương thức toggle và setStyle, đồng bộ ribbon state.
4. `apps/sheet/sheet-ribbon.js`: Bổ sung 7 checkboxes vào nhóm `tableStyleOptions` của tab `tableDesign` và gallery kiểu bảng.
5. `platform/commands/command-definitions.js`: Khai báo các lệnh `sheet.table.toggle*`.
6. `adapters/libreoffice/sheet/sheet-adapter.js`: Đồng bộ lưu/đọc 7 cờ giữa FODS database-ranges và model bảng.
7. `adapters/libreoffice/common/ooxml_zip_patch.py`: Đọc/ghi chuẩn OpenXML cho `tableStyleInfo` và cấu trúc bảng.
8. `platform/i18n/strings-vi.js` & `strings-en.js`: Khai báo nhãn, tooltip tiếng Việt & tiếng Anh cho 7 tùy chọn và kiểu bảng (không vi phạm từ cấm).
9. `platform/help/entries-sheet.js`: Viết bài Trợ giúp tiếng Việt chi tiết cho tính năng Tùy chọn kiểu bảng và Thiết kế Bảng.
10. `scripts/audit-0610/structural_oracle.mjs` & `structural_oracle.ps1`: Bổ sung op `setTableStyle` và `setTableStyleOptions`, kịch bản `tests/functions/structural-cases-14.json`.
11. `tests/unit/help-coverage.test.js` & `tests/unit/sheet-tablestyle.test.js`: Đăng ký bộ unit test mới trong `tests/run-tests.js` và cập nhật count.
12. `docs/AUDIT-TABLESTYLE-1610.md`: Tài liệu kiểm toán chi tiết đo đạc trước/sau.

---

## 5. Rủi ro & Giải pháp phòng ngừa
- **Rủi ro 1: Thay đổi ngữ nghĩa lưu XLSX làm hỏng file hoặc lệch layout**:
  - *Giải pháp*: Chỉ sửa đổi thuộc tính trong thẻ `<tableStyleInfo>` và thuộc tính bảng (`headerRowCount`, `totalsRowCount`, `autoFilter`) đã nằm trong đặc tả chuẩn ECMA-376 Part 4. Chạy kiểm tra batch 10 tệp LAN (`VNO_AUDIT_MARK_DIRTY=1 batch_document_audit.py xlsx`) để bảo đảm diffs = 0 trên các tệp không dùng tính năng mới.
- **Rủi ro 2: Ghi đè định dạng ô cá nhân**:
  - *Giải pháp*: Trong hàm render, `itm.style` có độ ưu tiên cao hơn kiểu bảng. Nếu ô có màu nền riêng, giữ nguyên màu nền đó.
- **Rủi ro 3: Tương thích ngược với các test bảng hiện hữu**:
  - *Giải pháp*: Giữ nguyên các ID `tableBlue`, `tableGreen`, `tableDark`, `tableOrange`, `tablePurple` map trực tiếp sang `TableStyleMedium2`, `TableStyleMedium4`, `TableStyleDark1`, v.v. Tất cả 3518 baseline tests giữ nguyên trạng thái PASS.
- **Rủi ro 4: Bàn phím / Phím tắt / WAI-ARIA**:
  - *Giải pháp*: Các checkbox trên Ribbon sử dụng cơ chế `role="checkbox"`, `aria-checked`, kích hoạt bằng phím Space/Enter qua `components.js` sẵn có.

---

## 6. Kế hoạch kiểm thử & Tiêu chuẩn nghiệm thu
1. `npm test`: Đạt 100% (tổng số test >= 3518 + test mới, 0 FAIL).
2. `structural_oracle.mjs` với `structural-cases-1..8.json` tiếp tục PASS 100%.
3. `structural-cases-14.json` mới đối chiếu trực tiếp với Excel 2016 COM thật: PASS 100%.
4. `sheet_formulas_vs_cache.mjs --force`: `lan04` = 100%, `lan28` >= 98,18%.
5. Batch layout audit 10 tệp LAN: `diffs=0`.
6. Kiểm tra mở file lưu bằng Excel 2016 COM (ReadOnly): xác nhận đúng tên kiểu bảng và 7 cờ thuộc tính.
7. `tests/unit/help-coverage.test.js`: Cập nhật đúng số lượng lệnh Sheet có bài Help tiếng Việt.
8. Báo cáo hoàn thành `E:\VNOffice-briefs\logs\agy-tablestyle.DONE`.

---

## 7. Kế hoạch hoàn tác (Rollback Plan)
Nếu có bất kỳ lỗi hồi quy nghiêm trọng nào ảnh hưởng đến việc lưu mở hoặc tính toán công thức:
- Dùng `git checkout` để hoàn tác các file mã nguồn về commit sạch ban đầu.
- Bản sao lưu cấu hình preset và parser được bảo lưu cục bộ.

---

## 8. Quyết định cổng kế hoạch (Plan Gate Decision)
Thay đổi hoàn toàn nằm trong phạm vi tầng ứng dụng `apps/sheet/**`, adapter `adapters/libreoffice/**`, OOXML zip patch cho `tableStyleInfo`, và shared help/i18n.
Không thay đổi kiến trúc lưu ngoài các thuộc tính bảng chuẩn ECMA-376. Kế hoạch được tự duyệt và sẵn sàng triển khai theo đúng quy trình.
