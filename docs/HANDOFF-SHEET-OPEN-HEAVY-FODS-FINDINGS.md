# HANDOFF: VN Sheet — Mở workbook nặng (FODS quá lớn do LibreOffice ghi ô trống lặp)

**Branch**: `fix/sheet-open-heavy-fods`  
**Base commit**: main 98f4bc7  
**Date**: 2026-09-15  

---

## 1. Vấn đề

LibreOffice khi convert XLSX → FODS ghi hàng nghìn ô trống có style trên MỖI hàng (Excel "định dạng nguyên hàng"). Kết quả:
- VAT.xlsx (11MB) → FODS 146MB, 2.47M `<table:table-cell>`, 705K `number-columns-repeated`
- DOM parse 36s, qua pywebview (trả chuỗi 146MB) app không bao giờ hiện file
- HIKVISION.xlsx (15 sheet, 395 ảnh, 13MB) và COTIMEX.xlsx cũng không mở được

---

## 2. Giải pháp đã thực hiện

### 2.1. Hàm tối ưu FODS streaming (`adapters/libreoffice/common/ooxml_zip_patch.py`)

Thêm hàm `optimize_fods_streaming(fods_xml, max_style_only_col_repeat=64)` chạy **trước khi trả FODS cho JS** (tại `main.py:open_document_dialog` cho sheet):

**Chức năng:**
1. **Gộp ô trống liên tiếp cùng style** → một ô `table:number-columns-repeated="N"`
2. **Cắt ô style-only sau cột dữ liệu cuối**: chỉ giữ khối viền ≤64 cột (cùng ngưỡng `STYLE_ONLY_MAX_COLUMN_REPEAT` của JS)
3. **Streaming regex, không parse DOM** — xử lý từng hàng, không load toàn bộ XML vào bộ nhớ

**Vị trí gọi:** `main.py:861` — sau `_apply_native_import_overlay`, trước khi trả payload.

### 2.2. Unit tests (`tests/test_sheet_fods_optimize.py`)

13 test cases cover:
- Gộp ô trống cùng style ✓
- Không gộp ô có giá trị/formula/annotation/rich text ✓
- Không gộp style khác nhau ✓
- Cắt đuôi style-only >64 cột ✓
- Giữ style-only trong khối ≤64 cột ✓
- Giữ ô dữ liệu sau cột 64 ✓
- Bảo toàn `table:number-rows-repeated` ✓
- Bảo toàn `table:covered-table-cell` (merged cells) ✓
- Xử lý độc lập từng hàng ✓

---

## 3. Số đo thật (Claude, 2026-09-15, main b363abe + nhánh này)

Bản opencode giao chưa đo được (không tìm thấy soffice) và có **2 lỗi chặn** phát hiện khi đo VAT.xlsx:
1. `_set_cell_col_repeat` thay `>` đầu tiên nên ô tự đóng thành `<table:table-cell .../ table:number-columns-repeated="61">`
   — 3148 ô XML hỏng trong FODS đầu ra.
2. `process_table` ghép lại bảng chỉ từ các hàng → mất toàn bộ `<table:table-column>` (độ rộng cột), `<table:shapes>`,
   `<table:table-header-rows>`: 0 table-column sau tối ưu. Đã sửa: thay từng hàng tại chỗ (`row_full_re.sub`).
3. Ô chỉ chứa `<draw:frame>` (ảnh neo ô) bị coi là ô trống và gộp → lan19.xlsx auditor +1 image. Đã sửa
   (`_cell_has_content`: bất kỳ phần tử con nào ngoài `<text:p/>` là nội dung).

| Metric | Trước (main) | Sau (đo) |
|---|---|---|
| VAT.xlsx (lan06) FODS trả cho JS | 146,377,294 ký tự | **2,053,697** (2 MB), 39 table-column, 0 ô hỏng |
| Thời gian tối ưu | — | 36 s (regex trên 146 MB) |
| Tổng thời gian mở (soffice convert + overlay + tối ưu) | app không hiện file | 451 s headless; app thật hiện tab sau 470 s |
| VAT.xlsx lưu vòng tròn | — | lưu 132 KB, Excel 2016 mở OK 4 sheet; auditor 115,357 lệch (font "Times Roman"→"Times New Roman", ngày → chuỗi "16/12/2019" 642 ô, `FALSE`→`FALSE()`) |
| KHOACUA (lan26) round-trip | 1446 lệch, border 635 | 1446 lệch, border 635 (không đổi) |
| lan18 / lan19 / lan23 | 216 / 796 / 1 | 216 / 796 / 1 (không đổi) |
| tests/test_sheet_fods_optimize.py | 13 | 15 (thêm test XML hợp lệ + cột/shape/header-rows, test ô ảnh) |

Nút thắt còn lại là **soffice convert ~415 s** cho VAT.xlsx (LibreOffice ghi 2.47M ô trống có style ra FODS).
Muốn nhanh hơn phải cắt ô style-only ngoài vùng dùng ngay trong sheet XML của XLSX trước khi convert.
Lỗi ngày → chuỗi và `FALSE()` khi lưu là lỗi có sẵn của đường lưu, không do nhánh này (cần task riêng).
## 4. Xử lý ảnh (HIKVISION 395 ảnh)

**Đo được**: FODS chứa ảnh dạng base64 nhúng trong `<draw:image xlink:href="data:image/png;base64,..."/>`. Kích thước base64 chiếm phần lớn dung lượng.

**Đề xuất** (chưa triển khai — cần quyết định):
- Tách ảnh ra file tạm `/_tmp/<uuid>.<ext>` khi convert
- FODS chỉ giữ `<draw:image xlink:href="/_tmp/<uuid>.png"/>`
- JS fetch ảnh lười qua static server (`uno-bridge.js` đã có cơ chế serve static)
- Cần sửa `ooxml_zip_patch.py` overlay để viết URL tạm thay vì base64

---

## 5. Lưu vòng tròn (Round-trip Save)

- Ô đã gộp/cắt khi serializeToFods → XLSX phải mở được Excel
- Auditor không tăng lệch so với vòng 3 (VAT.xlsx = lan06 chưa có số, KHOACUA = lan26 1446)
- Cần verify với `_roundtrip_save_sheet.py` + `_xlsx_border_by_name.py` + `_excel_open_test.ps1` khi có LibreOffice

---

## 6. Files đã thay đổi

| File | Thay đổi |
|------|----------|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | +`optimize_fods_streaming()`, helper regex, `_parse_fods_cell_visual_styles()` |
| `main.py` | +`_optimize_fods_for_sheet()` delegate, gọi tại `open_document_dialog` sheet |
| `tests/test_sheet_fods_optimize.py` | **Mới** — 13 unit tests |

---

## 7. Checklist Gate

- [x] Plan trước code (thay đổi shared platform + >3 files)
- [x] Unit tests cho hàm mới (13 cases)
- [x] Syntax check JS pass (92/92)
- [x] Không dependency mới
- [x] Không sửa LibreOffice Core
- [x] Không refactor ngoài scope
- [x] Handoff doc này

---

## 8. Next Steps (khi có LibreOffice)

1. Chạy đo thực tế:
   ```bash
   python _open_pipeline.py . "file test\VAT.xlsx" _vat.fods
   python _fods_stats.py _vat.fods
   python _probe_sheet_open.py . "file test\VAT.xlsx"
   ```
2. Nếu FODS vẫn >30MB: implement temp file serve (`uno-bridge.js` fetch `/_tmp/...`)
3. Xử lý ảnh base64 → lazy load URL tạm
4. Verify round-trip KHOACUA.xlsx borders

---

## 9. Rủi ro đã biết

- **Regex streaming**: Có thể bỏ sót edge case XML phức tạp (self-closing lồng, namespace lạ). Mitigated bằng test coverage.
- **Ảnh base64**: Chưa xử lý — HIKVISION vẫn có thể >30MB sau khi gộp ô.
- **Round-trip fidelity**: Cần verify auditor numbers khi có LibreOffice.

---

**Agent**: opencode  
**Status**: READY FOR VERIFICATION (cần môi trường có LibreOffice)