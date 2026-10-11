# Brief S24 — Tài liệu TẠO MỚI trong VN Sheet → lưu XLSX → mở Excel 2016 phải giống hệt

## Bộ đo mới (19/9/2026 đêm, đã chạy được)

- `python scripts/layout-audit/_create_new_sheet.py . <out.xlsx>`: mở app thật KHÔNG có file, đặt giá trị/định dạng qua
  API grid thật (`window.__vnoAppInstance.grid` — hook trong `index.html`), lưu qua `common.file.save`, ghi
  `<out>.expected.json`.
- `powershell -File scripts/layout-audit/_excel_readback.ps1 -File <out.xlsx>`: Excel COM đọc lại từng thuộc tính
  (giá trị, công thức, numFmt, font, cỡ, đậm/nghiêng/gạch, màu chữ, nền, viền, căn, wrap, gộp, rộng cột, cao dòng) và
  so với expected → `CHECKS=33 DIFFS=2`.

## Số đo lần đầu (main cda5726)

| Kiểm tra | Kết quả | Lớp |
|---|---|---|
| 31/33 thuộc tính (giá trị, công thức, numFmt số/%/tiền/ngày, đậm/nghiêng/gạch, font, cỡ (khi đặt bằng px), màu, nền, viền, wrap, căn, gộp, cao dòng) | khớp | — |
| Rộng cột A đặt 160 px → Excel 151 px; C 48 → 45 | lệch | **S24a** chuỗi đổi px→cm→chars: app coi px = width×MDW + 5 (quy ước LibreOffice ở overlay `_overlay_sheet_layout_from_xlsx`), còn Excel vẽ px = width×MDW (S11). Thống nhất: px của app = px Excel (bỏ +5 ở overlay, `chars_for = px / MDW` ở `_restore_column_widths`), vẫn đối xứng cho file nhập |
| Font mặc định của workbook mới trong file = **Arial 10** (LibreOffice), `defaultRowHeight="12.8"`, `defaultColWidth="11.53"` | lệch (chưa có check — thêm vào kịch bản: ô B5 không định dạng phải là Calibri 11; cột B mặc định 64 px; dòng 6 mặc định 20 px) | **S24b** app không khai báo style mặc định trong FODS; đồng thời grid app đang vẽ mặc định "Be Vietnam Pro" 11 px, dòng 26 px, cột 100 px — khác cả Excel lẫn file lưu ra |
| Ribbon "Cỡ chữ" chọn 11 → `setFontSize("11")` → `style.fontSize = "11px"` (= 8,25 pt); model tính bằng px (nhập file: 11 pt → "14.67px") | lệch (thêm check: đặt cỡ qua lệnh `sheet.font.size` = 14 → Excel phải đọc 14) | **S24c** ribbon truyền pt, hàm coi là px; `adjustFontSize` (grow/shrink) cũng vậy |

## Quy ước đề xuất (cần số đo xác nhận sau khi sửa)

- **S24b (quyết định thiết kế, làm luôn)**: workbook mới của VN Sheet = workbook mới của Excel 2016: font Normal
  **Calibri 11 pt** (14,67 px), dòng mặc định **20 px** (15 pt), cột mặc định **64 px** (8,43 ký tự, MDW 7).
  Sửa: `DEFAULT_ROW_HEIGHT_PX`/`DEFAULT_COL_WIDTH_PX` (`apps/sheet/sheet-grid.js`), CSS `.vno-grid-cell` height /
  `.vno-grid-table` font (`apps/sheet/sheet.css` — font Calibri 14.67px, fallback Carlito), hằng 26/100 trong
  `adapters/libreoffice/sheet/sheet-adapter.js` (`_isCloseToDefault`, `defaultRowHeight`, `defaultColWidth`), và FODS
  serialize khai báo `<style:default-style style:family="table-cell">` (Calibri 11pt) + cột/dòng mặc định
  (`style:column-width="1.693cm"`, `style:row-height="0.529cm"`, `use-optimal-row-height="false"`). Hậu xử lý khi
  KHÔNG có file gốc: fonts[0] = Calibri 11 (`<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`),
  `sheetFormatPr defaultRowHeight="15"`, bỏ `defaultColWidth` LibreOffice. Cập nhật unit test đang giả định 26/100.
- **S24a**: px app = px Excel (mọi nơi). Kiểm tra file nhập không hồi quy: batch 26 file `columnWidth` vẫn 0.
- **S24c**: `setFontSize(pt)` → `${pt * 4 / 3}px` (làm tròn 2 chữ số); `adjustFontSize` tính bậc theo pt.

## Nghiệm thu (tôi đo lại)

1. Mở rộng kịch bản `_create_new_sheet.py` + `EXPECTED` cho 3 lớp trên (ô mặc định, cột/dòng mặc định, cỡ chữ qua lệnh
   `globalCommandBus.execute("sheet.font.size", "14")`), chạy: **DIFFS=0**.
2. `python scripts/layout-audit/_batch_audit.py .` (26 file nhập, bỏ lan06/lan14): vẫn 26 file 0 lệch, Excel OK, lint clean.
3. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_sheet*.py"`.
4. Ghi S24a–c vào `docs/QUY-UOC-DOI-CHIEU.md`. Commit `git commit -F` tiếng Việt không dấu; báo cáo kèm số đo thật.
   Không chạy song song với tiến trình khác dùng soffice profile Sheet / Excel COM.
