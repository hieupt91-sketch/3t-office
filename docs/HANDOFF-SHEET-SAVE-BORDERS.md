# HANDOFF: VN Sheet — Lưu viền ô (Round 2)

## Tóm tắt thay đổi

Vòng 2 sửa lỗi lưu viền ô: gỡ bỏ post-process chép viền theo toạ độ (nguy hiểm khi chèn/xoá hàng), sửa gốc rễ ở `parseFods`/`serializeToFods` để giữ ô rỗng có viền, và sửa `activeTab` dùng sheet đang active từ model/FODS thay vì XLSX gốc.

## Các file đã thay đổi

| File | Thay đổi chính |
|------|----------------|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Xoá `_parse_xlsx_borders_and_styles`, `_apply_borders_from_source_xlsx`; thêm `parse_active_sheet_from_fods`; `postprocess_sheet_xlsx` đọc `ActiveTable` từ FODS nguồn → ghi `activeTab` vào workbook.xml; sửa regex `apply_active_tab_to_workbook` tránh tạo `//>` |
| `main.py` | `_apply_native_export_postprocess`: bỏ tham số `source_xlsx`, chỉ truyền `source_fods` cho post-process |
| `adapters/libreoffice/sheet/sheet-adapter.js` | `_fodsCellHasRealContent`/`_fodsCellMarkupHasRealContent`: thêm tham số `cellVisualStyles`, trả về `true` nếu ô có style viền; `_cellHasPersistableContent`: trả về `true` nếu ô có visual style (viền, nền, font, alignment...) |
| `tests/test_sheet_borders_activetab.py` | Unit test mới: ô rỗng có viền double round-trip FODS; activeTab từ FODS → XLSX |

## Kết quả đo thực tế (Dahua HN-T11.2023.xlsx)

### Trước (Round 1 — có post-process `_apply_borders_from_source_xlsx`)

| Chỉ số | Sheet11 (Các mã sản phẩm dừng phân phối) |
|--------|------------------------------------------|
| Ô có `s=` | 88 |
| Ô có viền | 80 |

### Sau (Round 2 — bỏ post-process, sửa parseFods/serializeToFods)

| Chỉ số | Sheet11 (Các mã sản phẩm dừng phân phối) |
|--------|------------------------------------------|
| Ô có `s=` | **101** (+13) |
| Ô có viền | **94** (+14) |

> **Lưu ý**: LibreOffice FODS→XLSX conversion vốn dĩ lossy (gốc 147 ô có viền). Việc bỏ post-process *cải thiện* từ 80→94 ô có viền vì parseFods/serializeToFods giờ giữ ô rỗng có style. Còn lại 47 ô mất do giới hạn bản chất của chuyển đổi LibreOffice, không phải bug VN Office.

### activeTab
- **Gốc**: `activeTab=1` (sheet "Thông báo Sản phẩm mới")
- **Sau lưu**: `activeTab=1` ✓ (đọc từ FODS `ActiveTable` do `serializeToFods` ghi)

## Chi tiết kỹ thuật

### 1. Giữ ô rỗng có viền trong parseFods
- `_fodsCellHasRealContent(cell, cellVisualStyles)` (nhánh DOM) và `_fodsCellMarkupHasRealContent(attrs, content, cellVisualStyles)` (nhánh regex): nếu `table:style-name` tham chiếu style có `borderLeft/Right/Top/Bottom` → coi là "có nội dung hiển thị" → materialize trong used range.
- Pre-scan used-range (`lastDataRow`/`lastDataCol`) giờ mở rộng đến ô có viền.

### 2. Ghi `table:style-name` cho ô chỉ có style trong serializeToFods
- `_cellHasPersistableContent(item)`: trả về `true` nếu `item.style` có bất kỳ visual property nào (`borderLeft`, `backgroundColor`, `fontWeight`, `textAlign`, ...).
- Ô rỗng (`val: ""`) nhưng có border → được đưa vào used range khi serialize → ghi ra `<table:table-cell table:style-name="ceN"/>`.

### 3. activeTab từ model/FODS
- `serializeToFods()` ghi `config:name="ActiveTable"` với `this.grid.activeSheet`.
- `postprocess_sheet_xlsx()` đọc `ActiveTable` từ `source_fods` → map sang index trong `xl/workbook.xml` → ghi `activeTab`.
- Bỏ hoàn toàn việc đọc `activeTab` từ `source_xlsx` (sai: user đổi sheet rồi lưu thì phải lưu sheet đang chọn).

## Rủi ro & Hạn chế

- **LibreOffice FODS→XLSX lossy**: Không thể khắc phục hoàn toàn ở tầng VN Office. 94/147 ô có viền là giới hạn hiện tại.
- **Post-process cũ nguy hiểm**: Chép viền theo toạ độ (`B2` → `B2`) → user chèn hàng → viền lệch ô. Đã xoá hoàn toàn.
- **DOM vs Regex branch**: Cả hai nhánh parseFods đều đã sửa. Regex branch dùng khi `DOMParser` không có (Node.js test env).

## Test coverage

```bash
python -m unittest tests.test_sheet_borders_activetab -v
# 8 tests OK: empty cell border round-trip, activeTab FODS→XLSX, parseActiveSheetFromFods

python -m unittest tests.test_sheet_save_roundtrip -v
# 2 tests OK: full round-trip fidelity trên 6 fixture

python -m unittest tests.test_sheet_active_tab_overlay -v
# 18 tests OK: activeTab overlay XLSX→FODS (File → Mở)

python -m unittest tests.test_sheet_freeze_panes tests.test_sheet_hidden_autofilter tests.test_sheet_xlsx_native_open -v
# All OK: freeze panes, autofilter, visibility, workbookProtection
```

## Rollback plan

Nếu cần rollback vòng 2:
```bash
git revert <commit-hash-of-this-round>
```
Các thay đổi độc lập, không phá vỡ tính năng khác (freeze panes, autofilter, workbookProtection, visible/hidden sheets).

## Tài liệu liên quan

- `docs/HANDOFF-SHEET-AUDIT-ROUND2.md` — cập nhật trạng thái audit
- `TASK-BRIEF-SHEET-SAVE-BORDERS-R2.md` — brief gốc