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
