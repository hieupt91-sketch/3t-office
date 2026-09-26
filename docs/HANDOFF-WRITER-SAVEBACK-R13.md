# HANDOFF — Writer Save-Back R13 (Grok)

**Branch:** `fix/writer-saveback-r13-grok`  
**Worktree:** `E:\VNOffice-grok-writer-saveback-r13`  
**Date:** 2026-09-26  
**Profile:** `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`  
**Mẫu:** `E:\VN OFice\file test\landocx` (23 file .docx hợp lệ; d10 là PDF đội đuôi, loại)  
**Tool tầng:** `scripts/layout-audit/_saveback_stages.py`  
**Tool 23 file:** `scripts/layout-audit/_batch_writer.py` + Word 2016 COM (`_word_oracle3.ps1`)

Commits: `fe1023f` `fix(writer): W-saveback-r13a ...` · `3768fea` `fix(writer): W-saveback-r13d ...`

---

## 0. Kết luận ngắn (trung thực)

- **Lỗi A (d09 nhân bảng) trên đường lưu thật (Stage4 / sửa+lưu):** trước R13 đã hết — W27b trả bảng nổi `tblpPr`, bản lưu **2/2 bảng cấp 1**. Stage3 (LibreOffice HTML→DOCX, chưa hậu xử lý) vẫn bọc bản sao bảng tài chính trong `txbxContent` (3 `<w:tbl>` thô, 1 bảng cấp 1). R13a thêm bộ lọc **bảng cấp 1 trùng toàn bộ chữ, đứng sát nhau** trong `postprocess_created_writer_docx`. Trên d09 sống, clone **không** nằm sát nhau ở thân nên R13a **không đụng** file này; W27b vẫn là lớp sửa d09 thật. R13a phủ đúng mẫu R12 mô tả (hai `<w:tbl>` thân giống hệt) và đường tạo mới (không có `source_docx` / W27b).
- **Lỗi D (d13/d21 mất `w:br type="page"`) trên đường lưu thật:** trước R13 Stage4 đã có lại `br=1` nhờ W37/W27a. Stage3 vẫn 0. R13d mở rộng W22d: khớp `vno-untouched-N`, quét cả `h1`–`h6` và đoạn rỗng. Sau W22d, Stage3 d13/d21 có `pageBreakBefore` trên heading; sau `postprocess_writer_docx` còn đúng **một** `w:br type="page"` trên đoạn rỗng (W37 trả run nguồn, R13d bỏ `pageBreakBefore` thừa ở đoạn sau).
- **23/23 file** (trừ d10): canvas = số trang Word gốc = số trang bản lưu. Mốc canvas = Word không giảm. Không file nào tăng bảng cấp 1 hay mất `w:br type="page"` so với nguồn.
- **Không đụng lỗi B** (d06 Rectangle/Connector, chiều nhập).

---

## 1. Đo 4 tầng TRƯỚC khi sửa R13

Script `_saveback_stages.py` đếm `<w:tbl` nên phình vì `tblPr`/`tblGrid`. Cột dưới dùng bảng **cấp 1** (`_writer_top_level_tables`) và `w:br type=page` / `w:pageBreakBefore` trên `word/document.xml`.

| File | Tầng | Bảng cấp 1 | raw `\<w:tbl>` | Paras (body, script) | PBB | BrPage |
|------|------|------------|----------------|----------------------|-----|--------|
| **d09** | Stage1/2 HTML | 2 `<table>` | — | 426 / 416 | — | — |
| | Stage3 LO (no post) | **1** | **3** | 344 | 0 | 0 |
| | Stage4 lưu thật | **2** | **2** | 405 | 0 | 0 |
| **d13** | Stage1/2 HTML | 7 | — | 295 | — | 1 CSS |
| | Stage3 LO (no post) | 7 | 7 | 335 | 0 | **0** |
| | Stage4 lưu thật | 7 | 7 | 335 | 0 | **1** |
| **d21** | Stage1/2 HTML | 0 | — | 39 | — | 1 CSS |
| | Stage3 LO (no post) | 0 | 0 | 39 | 0 | **0** |
| | Stage4 lưu thật | 0 | 0 | 39 | 0 | **1** |

Stage3 d09: `tbl1` thân = bảng ngành nghề; `tbl2` và `tbl3` cùng nội dung «Năm Tài Chính 2019…» **trong `w:txbxContent`** (không phải hai bảng thân liền nhau). W27b gỡ khung → 1 bảng nổi `tblpPr` + 1 bảng ngành = 2.

Stage2 HTML lỗi D:

- d13: **không** còn `<p>` rỗng; ngắt nằm trên `<h1 id="vno-untouched-5" style="break-before: page">`. W22d cũ chỉ quét `<p>` có chữ → bỏ qua.
- d21: `<p id="vno-untouched-4" style="break-before: page">` chứa tiêu đề Xiaomi (HTML đã dồn CSS xuống đoạn có chữ).

Sửa+lưu **trước** R13a/R13d (`_batch_writer`, chèn ZZ): d09 bảng 2/2 trang 14=14; d13 br 1/1 trang 10=10; d21 br 1/1 trang 9=9. Stage4 trên main đã đúng; R13 vá lớp HTML (`postprocess_created_writer_docx`) mà R12 chỉ định.

---

## 2. Lỗi A — d09 bảng nhân đôi

### Cách sửa (commit `fe1023f`)

`_remove_duplicate_adjacent_writer_tables` trong `postprocess_created_writer_docx`:

- Fingerprint = toàn bộ chữ ô, chuẩn hoá.
- Chỉ xoá bản **sau** khi hai bảng cấp 1 giống hệt và giữa chúng chỉ có đoạn rỗng/bookmark.
- Chỉ xoá phần dư so với số `<table>` trong HTML nguồn (hai bảng giống nhau mà HTML đã có đủ thì giữ).

Gọi **trước** W22f để chỉ số cột HTML↔DOCX không lệch.

### Đo sau

- Unit: clone sát nhau HTML 2 bảng / DOCX 3 → còn 2; HTML đã 2 bảng giống nhau → giữ 2; hai bảng khác chữ → giữ 2.
- d09 Stage3 qua `postprocess_created_writer_docx`: vẫn 1 bảng cấp 1 / 3 raw (clone trong txbx — R13a không đụng). Qua thêm `postprocess_writer_docx`: 2/2, `tblpPr` còn trên bảng tài chính.
- Batch 23 file: không file nào tăng bảng cấp 1 so với nguồn.

**Còn sót:** LibreOffice vẫn nhân bảng tài chính **trong hộp văn bản** ở Stage3. Không có `source_docx` thì W27b không chạy; R13a cũng không gỡ clone trong txbx. Đường mở-sửa-lưu (có DOCX nguồn) thì sạch.

---

## 3. Lỗi D — d13/d21 mất `w:br type="page"`

### Cách sửa (commit `3768fea`)

`_restore_writer_html_page_breaks` thay khối W22d cũ:

1. Quét `<p>` và `<h1>`–`<h6>` có `page-break-before:always` / `break-before:page`.
2. Khớp đoạn bằng bookmark `vno-untouched-N` / `vno-edited-N` (cùng cơ chế W22d/W35); fallback chữ duy nhất trên **thân** (không viết vào ô bảng — lớp C d15).
3. HTML rỗng / marker bị LO nuốt → `w:br type="page"` trên đoạn rỗng (hoặc chèn đoạn rỗng trước bookmark kế).
4. HTML có chữ → `w:pageBreakBefore` (giữ test tạo mới W22d).
5. `_writer_collapse_consecutive_page_breaks` sau W37: đoạn rỗng đã có `br` thì bỏ `pageBreakBefore` ở đoạn kế (tránh 2 ngắt = thêm trang). `_add_page_break_before_to_paragraph` không gắn pbb nếu đoạn đã có `w:br type="page"`.

### Đo trước / sau trên file mục tiêu

Áp postprocess lên Stage3 đã bắt (cùng HTML Stage2):

| File | Stage3 | Chỉ `postprocess_created_writer_docx` (R13d) | + `postprocess_writer_docx` |
|------|--------|---------------------------------------------|------------------------------|
| d13 | br 0, pbb 0 | br 0, **pbb 1** (heading `vno-untouched-5`) | **br 1**, pbb 0 — đoạn rỗng `<w:br w:type="page"/>` như nguồn |
| d21 | br 0, pbb 0 | br 0, **pbb 1** (đoạn `vno-untouched-4`) | **br 1**, pbb 0 — đoạn rỗng có rPr nguồn như gốc |

Batch sửa+lưu: d13 br **1/1** trang 10=10; d21 br **1/1** trang 9=9.

**Còn sót:** Stage3 thuần LibreOffice vẫn 0 ngắt. Không có HTML nguồn thì W22d không chạy. Không có DOCX nguồn thì W37 không trả run `br`; bản tạo mới giữ `pageBreakBefore` trên đoạn/heading (đúng test W22d).

---

## 4. Đo lại 23 file lưu (Word 2016 COM)

`$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Mỗi file: mở app → canvas từ status bar → chèn ZZ+bold → lưu → Word COM đếm trang PDF.

| file | Word gốc | canvas | bản lưu | paras o/s | br o/s | pbb o/s | bảng cấp 1 o/s |
|------|---------:|-------:|--------:|-----------|--------|---------|----------------|
| d01 | 19 | 19 | 19 | 619/619 | 0/0 | 0/0 | 7/7 |
| d02 | 11 | 11 | 11 | 196/196 | 0/0 | 0/0 | 2/2 |
| d03 | 1 | 1 | 1 | 45/45 | 1/1 | 0/0 | 3/3 |
| d04 | 5 | 5 | 5 | 245/245 | 0/0 | 0/0 | 1/1 |
| d05 | 2 | 2 | 2 | 56/56 | 0/0 | 0/0 | 1/1 |
| d06 | 3 | 3 | 3 | 65/62 | 1/1 | 0/0 | 0/0 |
| d07 | 23 | 23 | 23 | 583/582 | 0/0 | 0/0 | 9/9 |
| d08 | 1 | 1 | 1 | 29/29 | 0/0 | 0/0 | 1/1 |
| d09 | 14 | 14 | 14 | 406/405 | 0/0 | 0/0 | **2/2** |
| d11 | 5 | 5 | 5 | 72/72 | 0/0 | 0/0 | 0/0 |
| d12 | 3 | 3 | 3 | 118/115 | 0/0 | 0/0 | 1/1 |
| d13 | 10 | 10 | 10 | 328/335 | **1/1** | 0/0 | 7/7 |
| d14 | 3 | 3 | 3 | 49/49 | 0/0 | 0/0 | 0/0 |
| d15 | 10 | 10 | 10 | 238/238 | 1/1 | 0/0 | 2/2 |
| d16 | 8 | 8 | 8 | 165/165 | 0/0 | 0/0 | 2/2 |
| d17 | 5 | 5 | 5 | 116/116 | 0/0 | 0/0 | 2/2 |
| d18 | 2 | 2 | 2 | 48/48 | 0/0 | 0/0 | 1/1 |
| d19 | 2 | 2 | 2 | 43/41 | 0/0 | 0/0 | 0/0 |
| d20 | 3 | 3 | 3 | 329/330 | 1/1 | 0/0 | 7/7 |
| d21 | 9 | 9 | 9 | 39/39 | **1/1** | 0/0 | 0/0 |
| d22 | 5 | 5 | 5 | 116/116 | 0/0 | 0/0 | 2/2 |
| d23 | 1 | 1 | 1 | 45/45 | 1/1 | 0/0 | 3/3 |
| d24 | 16 | 16 | 16 | 18/18 | 9/9 | 0/0 | 0/0 |

- **Canvas = Word: 23/23.** Mốc 22/22 không giảm (lần đo này đủ 23 file hợp lệ đều khớp).
- **Số trang bản lưu = Word gốc: 23/23.** Không hồi quy trang.
- **Bảng cấp 1:** mọi file khớp nguồn. d09 2/2 (R11b từng 2/3).
- **`w:br type=page`:** mọi file có br nguồn giữ đủ (d13/d21 1/1; d03/d06/d15/d20/d23 1/1; d24 9/9). Không pbb thừa.
- Lệch số đoạn còn lại (d06 65→62, d09 406→405, d12 118→115, d13 328→335, d19 43→41, d20 329→330) là lệch LibreOffice từ trước R13, không do hai commit này. R11b d09 từng 406→344.
- d06 `media` 1→0 và mất Rectangle/Connector: **lỗi B, chiều nhập, ngoài phạm vi.**

`node tests/run-tests.js`: 1835/1835 trước commit D. Trước commit A có 1 FAIL soffice CF/validation (agent khác giữ soffice); chạy lại profile grok → pass.

---

## 5. Việc không làm

- Không sửa UI / ribbon / i18n / help.
- Không đụng chiều nhập DrawingML (lỗi B).
- Không rebase/force, không commit tài liệu `file test\`.
