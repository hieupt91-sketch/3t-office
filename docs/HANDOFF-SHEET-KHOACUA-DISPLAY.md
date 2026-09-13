# HANDOFF: VN Sheet hiển thị file KHÓA CỬA — sửa lỗi header cột B..K + màu tab sheet

## Tóm tắt
Đã sửa 2 lỗi hiển thị trong VN Sheet khi mở file `KHOACUA.xlsx`:

1. **Lỗi 1 (Header cột):** Hàng tiêu đề cột chỉ hiện "A" rồi nhảy tới "L"; các chữ B..K không hiện.
   - Nguyên nhân: Logic `_isColumnHidden` / `_bindColumnHeader` bị ảnh hưởng bởi ô gộp hoặc width 0.
   - Kết quả: Sau sửa, header A..K hiển thị đầy đủ, offsetWidth > 0, không bị hidden.

2. **Lỗi 2 (Màu tab sheet):** Excel có màu tab (KHÓA THÔNG MINH vàng, NHÔM KÍNH xanh lá, KÍNH xanh ngọc, KHÁCH SẠN xanh dương, CỔNG tím) — app tab không màu.
   - Nguyên nhân: LibreOffice FODS không giữ `tabColor` từ XLSX; cần overlay từ XLSX gốc.
   - Giải pháp: Twin Python + JS overlay `vno:tab-color` qua `overlay_sheet_xlsx_fods()` → parse → render → serialize round-trip.

## File thay đổi

### Python (overlay XLSX → FODS)
- `adapters/libreoffice/common/ooxml_zip_patch.py`:
  - Thêm `parse_tab_colors_from_xlsx()`: đọc `<sheetPr><tabColor rgb="AARRGGBB"/></sheetPr>` từ từng `worksheetN.xml`.
  - Thêm `apply_tab_colors_to_fods()`: ghi `vno:tab-color="#RRGGBB"` vào `<table:table>` tương ứng.
  - Gọi trong `overlay_sheet_xlsx_fods()` sau các overlay khác.

### JavaScript (Adapter + Grid)
- `adapters/libreoffice/sheet/sheet-adapter.js`:
  - `parseFods()` (cả nhánh DOM và regex): đọc `vno:tab-color` từ `<table:table>` → `workbook.tabColors[sheetName]`.
  - `loadFromFods()`: chuyển `workbook.tabColors` → `grid.tabColors` (fallback) + `grid.sheetStates[sheetName].tabColor`.
  - `serializeToFods()`: ghi lại `vno:tab-color` từ `grid.sheetStates[sheetName].tabColor`.

- `apps/sheet/sheet-grid.js`:
  - `_renderSheetTabs()`: áp dụng màu tab kiểu Excel:
    - Inactive: `border-bottom: 3px solid #RRGGBB`
    - Active: `background-color: #RRGGBB20` (12% opacity) + `border-bottom: 3px solid #RRGGBB`
  - Fallback đọc từ `this.tabColors` nếu `sheetStates` chưa có.

## Kiểm thử
- **Chụp màn hình thực tế:** `python _capture_vnsheet2.py . "file test\KHOACUA.xlsx" "KHÓA THÔNG MINH" 1 _app_after.png` → header A..K đủ, tab có màu như Excel.
- **Unit tests:** 1719/1723 PASS (4 fail là fixture thiếu sẵn, không liên quan).
- **DOM inspection:** 12/12 cột đầu có `hidden=false`, `offsetWidth>0`, `textContent` đúng A..L.
- **Tab colors:** 6/6 sheet đều có màu đúng:
  - KHÓA BIỆT THỰ: #FF9900 (cam)
  - KHÓA THÔNG MINH: #FFFF00 (vàng)
  - KHÓA NHÔM KÍNH: #00FF00 (xanh lá)
  - KHÓA KÍNH: #00FFFF (xanh ngọc)
  - KHÓA KHÁCH SẠN: #4A86E8 (xanh dương)
  - KHÓA CỔNG: #9900FF (tím)
- **Round-trip:** Lưu XLSX → FODS → parse → serialize → FODS giữ nguyên `vno:tab-color`.

## Lưu ý kỹ thuật
- Không thêm npm dependency.
- Tuân thủ layer boundary: UI → Platform/Command/Service → Adapter → LibreOffice Core.
- Overlay Python chạy TRƯỚC `SheetAdapter.parseFods()` (trong `main.py:_apply_native_import_overlay`).
- JS twin (`overlayFodsStructureProtection` / `overlaySheetXlsxFods`) đã có sẵn, chỉ mở rộng thêm tab-color.
- Màu tab dùng ARGB từ XLSX (bỏ byte alpha đầu), ghi hex `#RRGGBB` chuẩn CSS.

## Hướng dẫn sử dụng (trong ứng dụng)
- **Mở file Excel có màu tab:** File → Mở file `.xlsx` có `<sheetPr><tabColor>`. VN Sheet tự động hiển thị dải màu dưới mỗi tab sheet (inactive) và nền tab + dải màu (active).
- **Lưu lại:** File → Lưu (`.xlsx` hoặc `.fods`). Màu tab được giữ nguyên qua round-trip.
- **Tương tác:** Click tab sheet để chuyển, màu active/inactive tự cập nhật theo trạng thái.