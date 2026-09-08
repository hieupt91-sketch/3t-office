# Handoff: Sheet Hidden Level & AutoFilter Fidelity

## Tổng quan

Giữ đúng mức ẩn sheet (`veryHidden`) và trạng thái AutoFilter khi mở/lưu XLSX qua VN Sheet.

## Root cause xác nhận

### veryHidden — Giới hạn của soffice (không phải lỗi VN Office)

Đã test round-trip TRỰC TIẾP qua `soffice --convert-to` thuần (không qua VN Office code):

- **Input**: XLSX có 4 sheet: DataSheet (visible), InternalHelper (veryHidden), HiddenSheet (hidden), PlainSheet (visible)
- **Sau XLSX→FODS**: Tất cả sheet đều có `visibility=NOT SET` trong FODS — soffice **BỎ HOÀN TOÀN** thuộc tính visibility của sheet.
- **Sau FODS→XLSX**: `veryHidden` bị downgrade thành `hidden`. `hidden` giữ nguyên.

**Kết luận**: Đây là giới hạn thật của bộ filter converter trong LibreOffice, không phải lỗi code VN Office.

### AutoFilter — FODS giữ được, nhưng serializeToFods() không ghi ra

- **Input**: XLSX có DataSheet với `<autoFilter ref="A1:B2"/>`
- **Sau XLSX→FODS**: FODS có `<table:database-range table:target-range-address="DataSheet.A1:B2" table:display-filter-buttons="true"/>` — **FODS giữ đúng**.
- **Sau FODS→XLSX**: `<autoFilter ref="A1:B2"/>` được giữ nguyên.

**Kết luận**: LibreOffice giữ đúng AutoFilter qua round-trip. Lỗi nằm ở `serializeToFods()` của VN Office — trước đây không phát sinh `<table:database-ranges>` nên step FODS→XLSX không có dữ liệu để giữ lại.

## Biện pháp vá

### veryHidden — Overlay + Postprocess pattern

1. **Import (XLSX→FODS)**: `overlay_sheet_xlsx_fods()` đọc `state="veryHidden"` từ `<sheet>` trong `xl/workbook.xml` và ghi đè `vno:sheet-state="veryHidden"` vào `<table:table>` trong FODS.
2. **Serialize (FODS internal)**: `serializeToFods()` echo lại `vno:sheet-state` attribute.
3. **Export (FODS→XLSX)**: `postprocess_sheet_xlsx()` đọc `vno:sheet-state` từ FODS và ghi `state="veryHidden"` lại vào `xl/workbook.xml`.

### AutoFilter — Overlay + Postprocess pattern

1. **Import (XLSX→FODS)**: `_overlay_autofilter_from_xlsx()` đọc `<autoFilter ref>` từ mỗi `worksheetN.xml` và inject `<table:database-ranges>` vào FODS.
2. **Serialize (FODS internal)**: `serializeToFods()` phát `<table:database-ranges>` khi sheet có `isFilterActive=true`.
3. **Export (FODS→XLSX)**: `postprocess_sheet_xlsx()` đọc `<table:database-range>` từ FODS và ghi `<autoFilter ref>` vào đúng worksheet XML.

## File đã sửa

### Python
- `adapters/libreoffice/common/ooxml_zip_patch.py`
  - Thêm: `parse_sheet_visibility_from_workbook()`, `apply_sheet_visibility_to_fods()`, `parse_sheet_visibility_from_fods()`, `apply_sheet_visibility_to_workbook()`
  - Thêm: `parse_autofilter_from_worksheet()`, `apply_autofilter_to_fods()`, `parse_autofilter_from_fods()`, `apply_autofilter_to_worksheet()`, `_overlay_autofilter_from_xlsx()`
  - Sửa: `overlay_sheet_xlsx_fods()` — thêm visibility + autofilter overlay
  - Sửa: `postprocess_sheet_xlsx()` — thêm visibility + autofilter postprocess

### JavaScript (browser adapter)
- `adapters/libreoffice/sheet/sheet-adapter.js`
  - Thêm: `_attachImportedSheetVisibility()`, `_attachImportedAutoFilter()`, `_serializeDatabaseRanges()`
  - Sửa: `serializeToFods()` — thêm `vno:sheet-state` attribute + `<table:database-ranges>`
  - Sửa: `loadFromFods()` — restore `sheetVisibilityBySheet`, `isFilterActive`, `filterRange`
  - Sửa: `parseFods()` — gọi `_attachImportedSheetVisibility` + `_attachImportedAutoFilter`

### JavaScript (Node postprocess)
- `adapters/libreoffice/sheet/xlsx-native-postprocess.js`
  - Thêm: `parseSheetVisibilityFromWorkbook()`, `applySheetVisibilityToWorkbook()`, `parseSheetVisibilityFromFods()`, `applySheetVisibilityToFods()`, `parseAutofilterFromWorksheet()`, `parseAutofilterFromFods()`, `applyAutofilterToWorksheet()`, `overlayAutofilterFromXlsx()`
  - Sửa: `postProcessSheetXlsx()` — thêm visibility + autofilter postprocess
  - Sửa: `overlaySheetXlsxFods()` — thêm visibility + autofilter overlay

### Tests
- `tests/test_sheet_hidden_autofilter.py` — 28 tests mới
- `tests/fixtures/real-office-samples/sample-sheet-hidden-autofilter.xlsx` — fixture test

## Test results

- `python -m unittest tests.test_sheet_hidden_autofilter`: **28/28 PASS**
- `python -m unittest tests.test_sheet_freeze_panes`: **12/12 PASS** (không regress)
- `node scripts/check-syntax.js`: **90/90 PASS**

## Lưu ý

- `veryHidden` chỉ round-trip đúng trong VN Office (qua `vno:sheet-state`). File XLSX xuất ra sẽ có `state="veryHidden"` đúng chuẩn OOXML, nhưng nếu mở bằng LibreOffice/Excel trực tiếp, veryHidden sẽ vẫn bị downgrade thành hidden (do giới hạn soffice).
- AutoFilter round-trip đúng cả trong VN Office lẫn khi mở lại bằng Excel/LibreOffice (vì `<autoFilter ref>` là chuẩn OOXML).
- Fixture test nằm trong `tests/fixtures/real-office-samples/` — KHÔNG commit file trong `file test/` (dữ liệu cá nhân).

## Xác minh độc lập của Claude bằng file thật — phát hiện 2 lỗi thật, đã sửa trước khi merge

Test của opencode (28/28) chỉ dùng fixture tổng hợp (synthetic, tạo bằng `openpyxl`). Đã tự chạy lại đúng luồng thật (`_apply_native_import_overlay` + `_apply_native_export_postprocess`) trên file thật `file test/DSS_Báo giá Dahua HN-T11.2023.xlsx` (15 sheet, 2 sheet ẩn, 2 sheet có AutoFilter thật — đã xác nhận qua `<autoFilter>` element thật, không phải suy từ `_xlnm._FilterDatabase` vốn chỉ là tên nội bộ Excel tự sinh, không đồng nghĩa với filter đang bật).

### Lỗi 1 (NGHIÊM TRỌNG — làm hỏng cấu trúc file XLSX) — đã sửa

`apply_sheet_visibility_to_workbook()` (Python, `ooxml_zip_patch.py`) và `applySheetVisibilityToWorkbook()` (JS twin, `xlsx-native-postprocess.js`) dùng regex `<sheet\b([^>]*)/?>` — vì `[^>]*` là greedy, nó nuốt luôn dấu `/` tự đóng thẻ vào trong nhóm bắt (`attrs`) thay vì để `/?` xử lý riêng. Khi ghép `state="..."` vào cuối `attrs` rồi thêm `>`, kết quả bị hỏng dạng:

```
<sheet name="foxz" sheetId="1"  r:id="rId3"/ state="veryHidden">
```

— dấu `/` tự đóng nằm lạc giữa thẻ, phá vỡ cú pháp self-closing, khiến `xl/workbook.xml` **không còn là XML hợp lệ** (`xml.etree.ElementTree` báo lỗi parse thẳng). File XLSX kết quả sẽ **không mở được đúng** trong Excel/LibreOffice — đây là hồi quy nghiêm trọng hơn cả lỗi gốc định sửa. Bộ test hiện có (bao gồm `test_writes_veryhidden_back_to_workbook`) KHÔNG bắt được lỗi này vì fixture tổng hợp không tạo ra đúng hình dạng thẻ tự đóng gây lỗi.

**Đã sửa** (cả Python lẫn JS): tước bỏ dấu `/` cuối (nếu có) khỏi `attrs` trước khi ghép, rồi luôn tự phát ra dạng tự đóng `<sheet .../>` một cách tường minh, không phụ thuộc vào những gì regex bắt được.

### Lỗi 2 (làm mất veryHidden ở tầng JS thật, dù tầng Python đúng)

`_attachImportedSheetVisibility()` và đoạn serialize `vno:sheet-state` trong `sheet-adapter.js` đều gọi `.toLowerCase()` trên state đọc được rồi so sánh với chuỗi `"veryHidden"` (chữ H hoa) — so sánh này **KHÔNG BAO GIỜ đúng** vì vế trái luôn chữ thường (`"veryhidden"`). Nghĩa là dù tầng Python (`ooxml_zip_patch.py`) đã ghi đúng `vno:sheet-state="veryHidden"` vào FODS, tầng JS thật (nơi ứng dụng thực sự chạy khi người dùng dùng UI) sẽ KHÔNG BAO GIỜ nhận diện được giá trị này khi Mở, và cũng không bao giờ ghi đúng khi Lưu — toàn bộ round-trip veryHidden bị đứt gãy ở đúng tầng UI thật, dù test Python-only (bỏ qua tầng JS) vẫn báo PASS.

**Đã sửa** cả 2 chỗ: so sánh sau khi lowercase với `"veryhidden"` (chữ thường), nhưng LUÔN lưu/ghi ra giá trị chuẩn hóa đúng casing OOXML (`"veryHidden"`).

**Xác minh sau khi sửa:**
- Chạy lại round-trip thật trên file Dahua: `foxz` → `state=veryHidden` (đúng, khôi phục đúng cả mức mà bản thân soffice tự đánh mất), `Các mã điều chỉnh giá` → `state=hidden` (đúng).
- `xl/workbook.xml` kết quả parse được bằng `xml.etree.ElementTree` không lỗi (xác nhận không còn hỏng cấu trúc).
- AutoFilter: khôi phục đúng 2/2 sheet có `<autoFilter>` thật trong file gốc (100% đúng — số "7" trong mô tả brief ban đầu là đếm nhầm theo `_xlnm._FilterDatabase`, không phải AutoFilter thật đang bật).
- Viết kịch bản Node độc lập xác nhận logic case-insensitive-nhưng-canonical-output hoạt động đúng cho cả chiều Mở và Lưu.
- Chạy lại `tests/test_sheet_hidden_autofilter.py` (28/28), `tests/test_sheet_freeze_panes.py` (12/12), `tests/test_sheet_xlsx_native_open.py`, `tests/test_sheet_save_roundtrip.py`, `tests/test_sheet_csv_import_advanced.py` — tổng 54/54 PASS sau khi sửa, không hồi quy.
- `node scripts/check-syntax.js`: 90/90 PASS.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
