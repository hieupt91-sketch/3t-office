# Handoff R19 — Bisect HTML để tìm nguyên nhân bảng tài chính bị mất khi lưu (W27b)

## Tóm tắt
Bisect trên `d09_stage2_export.html` (xuất từ `_contentForExport`) cho thấy: **bảng tài chính không bị nhân đôi — nó bị LOẠI BỎ (dropped) do thuộc tính `align="left"`**. Việc "nhân đôi" báo cáo trước đó là do sai phương pháp đếm (`"<w:tbl".count()` tính nhầm các thuộc tính `w:tblW`, `w:tblPr`, v.v.). Đếm đúng bằng regex `<w:tbl\b` cho kết quả chính xác.

## Bảng biến thể × số bảng (đếm `<w:tbl\b` trong `word/document.xml`)

| Biến thể | Mô tả | Số bảng | Ghi chú |
|----------|-------|---------|---------|
| 00_baseline | `stage2_export.html` gốc | 1 | Chỉ còn bảng bố cục |
| 01_layout_only | Chỉ giữ bảng bố cục + bảng tài chính | 1 | Giống baseline |
| 02_no_layout_table_attrs | Bỏ **tất cả** thuộc tính 2 bảng | 2 | **Cả 2 bảng đều xuất hiện** |
| 02_no_width / _cellpadding / _cellspacing / _border | Bỏ từng thuộc tính bảng bố cục | 1 | Không thay đổi |
| 03_td_no_* | Bỏ thuộc tính `<td>` chứa bảng tài chính | 1 | Không thay đổi |
| 04_fin_no_dir / _hspace / _cellpadding / _cellspacing / _width | Bỏ từng thuộc tính bảng tài chính | 1 | Không thay đổi |
| **04_fin_no_align** | **Bỏ `align="left"` trên bảng tài chính** | **2** | **CẢ 2 BẢNG XUẤT HIỆN** |
| 05_fin_replaced_with_p | Thay bảng tài chính bằng `<p>` | 1 | Chỉ còn bảng bố cục |
| 06_minimal_two_separate | 2 bảng đơn giản tách biệt | 2 | Cả 2 xuất hiện |
| 06b_minimal_truly_nested | Bảng lồng thực sự | 2 | Cả 2 xuất hiện |
| 07_minimal_layout_real_fin | Bố cục tối giản + bảng tài chính thật | 1 | Bảng tài chính **bị mất** |
| 08_html_odt_docx | HTML → ODT → DOCX (2 bước) | 1 | Vẫn mất bảng tài chính |

## HTML tối thiểu GÂY MẤT BẢNG (1 bảng thay vì 2)
```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<table cellpadding="2" cellspacing="0" width="100%"><tr><td>Label</td><td>Value</td></tr></table>
<table dir="ltr" align="left" hspace="12" cellpadding="7" cellspacing="0" width="636"><tr><td>A</td><td>B</td></tr></table>
</body></html>
```
→ Kết quả: **1 bảng** (bảng thứ 2 bị dropped).

## HTML tối thiểu KHÔNG GÂY MẤT (2 bảng)
```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<table cellpadding="2" cellspacing="0" width="100%"><tr><td>Label</td><td>Value</td></tr></table>
<table dir="ltr" hspace="12" cellpadding="7" cellspacing="0" width="636"><tr><td>A</td><td>B</td></tr></table>
</body></html>
```
→ Kết quả: **2 bảng** (chỉ khác ở việc **bỏ `align="left"`**).

## Nguyên nhân gốc rễ
LibreOffice HTML import filter (StarWriter) có hành vi bất thường:
- Bảng có `align="left"` **hoặc** `align="right"` → **bị loại bỏ hoàn toàn** (0 bảng trong DOCX).
- Bảng **không có** `align` (hoặc `align="center"`, hoặc các thuộc tính khác) → xuất hiện bình thường (1 bảng).

Trong `d09_stage2_export.html`:
- Bảng bố cục: **không có `align`** → xuất hiện.
- Bảng tài chính: **có `align="left"`** → bị dropped.

## Kết luận & Đề xuất sửa

### Chỗ cần sửa: `_contentForExport` (JS adapter Writer)
Thuộc tính `align="left"` được ghi ra bởi adapter khi xuất HTML. Cần **loại bỏ hoặc đổi thành `align="center"`** cho các bảng (đặc biệt là bảng lồng/float) trong `_contentForExport`.

**Cụ thể:** Trong `apps/writer/adapter/...` (hàm build HTML export), tìm chỗ set `align="left"` cho bảng (thường do `float: left` trong CSS) và bỏ nó, hoặc đổi thành `style="float:none"` / không ghi `align`.

### Hậu xử lý DOCX (fallback)
Nếu không thể sửa kịp ở HTML, có thể thêm bước post-process trong `main.py` → `_apply_native_export_postprocess` (writer/docx):
- Phát hiện các bảng bị lost (so sánh số bảng HTML vs DOCX).
- Hoặc đơn giản: sau khi convert, kiểm tra nếu số `<w:tbl\b` < số `<table>` trong HTML nguồn thì log warning.

### Lưu ý
- Việc chuyển HTML → ODT → DOCX (2 bước) **không khắc phục** được lỗi này (vẫn 1 bảng).
- Bảng bố cục trong d09 có nhiều hàng (danh sách mã ngành), không phải bảng 1 hàng đơn giản.
- Gốc rễ: LibreOffice StarWriter HTML filter bug với `align="left/right"`. Không phải lỗi lồng bảng.

## File script bisect
`scripts/layout-audit/_html_docx_bisect.py` — dùng lại cho các case tương tự.
Chạy: `python _html_docx_bisect.py <worktree> <html_file> <outdir>` (cần `$env:LOCALAPPDATA = 'E:\VNOffice-profiles\opencode'`).
## Claude kiểm lại (21/9) — kết luận trên SAI hướng, đúng điểm kích hoạt

Đo lại bằng `main._run_soffice_convert` với chính 2 HTML tối thiểu ở trên (đếm `<w:tbl\b`, `<w:txbxContent`):

| HTML | `<w:tbl` | `<w:txbxContent` | chữ |
|---|---:|---:|---|
| có `align="left"` | **3** | 2 | LabelValue**ABAB** |
| không `align` | 2 | 0 | LabelValueAB |

Bảng `align="left"` KHÔNG bị loại bỏ: LibreOffice nhập nó thành khung nổi (frame) rồi xuất DOCX thành hộp văn bản
`mc:AlternateContent` với **Choice + Fallback cùng chứa bảng** → đếm ra 3 bảng / chữ nhân đôi (đây chính là "nhân đôi"
R12/R13 thấy). Word hiển thị MỘT hộp văn bản nổi chứa bảng. Nguồn d09 có 2 bảng ở thân, bảng thứ hai là **bảng nổi**
(`w:tblpPr` tblpX=-190 tblpY=97) — nên `align="left"` là cách LibreOffice biểu diễn bảng nổi, không phải lỗi.

Sửa đúng chỗ (W27b, `_restore_writer_floating_tables` trong `postprocess_writer_docx`): khung có nội dung đúng một
bảng → trả lại `<w:tbl>` ở thân với `<w:tblpPr>` của nguồn (ghép theo chữ đầu bảng) hoặc suy từ `wp:anchor`.
d09 lưu: tbl 2/2, tblpPr 1/1, txbx 30/30 (trước: 3/2, 46/30). Trang Word sau lưu vẫn 12 (nguồn 14) — lớp khác.
