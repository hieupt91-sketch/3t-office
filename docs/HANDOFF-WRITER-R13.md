# HANDOFF — Writer Import Drawing Loss Audit R13

**Branch:** `audit/writer-r13`  
**Worktree:** `E:\VNOffice-opencode-writer-r13`  
**Date:** 2026-09-21  
**Tool:** `scripts/layout-audit/_import_drawing_loss.py`  
**Profile:** `$env:LOCALAPPDATA = E:\VNOffice-profiles\opencode`  
**Mẫu:** `E:\VN OFice\file test\landocx` (ngoài git, bỏ d10)  

---

## 1. Bảng 23 file — Mất lớp đối tượng vẽ khi LO xuất HTML (Mục 1c)

| File | pic:pic | wps:wsp | wpg:wgp | w:pict | v:shape | w:txbxContent | c:chart | wp:anchor | wp:inline | Tổng gốc | HTML img | HTML abs-div | HTML svg | HTML hr | Ước lượng mất | Tỷ lệ mất |
|------|---------|---------|---------|--------|---------|---------------|---------|-----------|-----------|----------|----------|--------------|----------|---------|---------------|-----------|
| d01  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d02  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d03  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d04  | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 12 | 6 | 0 | 0 | 0 | 6 | 50% |
| d05  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d06  | 1 | 91 | 3 | 59 | 0 | 74 | 0 | 60 | 0 | 288 | 60 | 0 | 0 | 0 | 228 | 79.2% |
| d07  | 0 | 1 | 0 | 2 | 1 | 0 | 0 | 1 | 0 | 5 | 1 | 0 | 0 | 0 | 4 | 80% |
| d08  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 1 | 0 | 0 | 0 | 1 | 50% |
| d09  | 0 | 30 | 0 | 30 | 15 | 30 | 0 | 30 | 0 | 135 | 30 | 0 | 0 | 0 | 105 | 77.8% |
| d11  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d12  | 0 | 0 | 0 | 4 | 1 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 5 | 100% |
| d13  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | 0 | 0 | 0 | 1 | 50% |
| d14  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d15  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 0 | 0 | 0 | 0 | 4 | 100% |
| d16  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | 0 | 0 | 0 | 1 | 50% |
| d17  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d18  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 2 | 0 | 0 | 0 | 2 | 50% |
| d19  | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 2 | 7 | 2 | 0 | 0 | 0 | 5 | 71.4% |
| d20  | 2 | 5 | 1 | 1 | 5 | 10 | 0 | 1 | 2 | 27 | 0 | 0 | 0 | 0 | 27 | 100% |
| d21  | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11 | 22 | 11 | 0 | 0 | 0 | 11 | 50% |
| d22  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d23  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% |
| d24  | 79 | 279 | 11 | 11 | 104 | 498 | 0 | 11 | 5 | 998 | 16 | 0 | 0 | 0 | 982 | 98.4% |

**Chú thích cột:**
- `pic:pic` = ảnh (DrawingML picture)
- `wps:wsp` = shape DrawingML (hình chữ nhật, đường kết nối…)
- `wpg:wgp` = nhóm shape
- `w:pict`/`v:shape` = VML (cũ)
- `w:txbxContent` = hộp văn bản
- `wp:anchor`/`wp:inline` = container neo/đóng dòng
- `HTML abs-div` = `<div style="position: absolute">` (LO không xuất cho file nào)
- `HTML svg` = `<svg>` (LO không xuất cho file nào)
- `Ước lượng mất` = Tổng gốc − Tổng HTML representation (suy luận theo tổng, không mapping 1-1)

### Tổng theo loại (Mục 1c)

- **File có shape (wps:wsp/wpg:wgp) bị mất:** 6/23 (d06, d07, d09, d19, d20, d24)
- **File có VML (v:shape/w:pict) bị mất:** 7/23 (d06, d07, d09, d12, d19, d20, d24)
- **File có textbox (w:txbxContent) bị mất:** 5/23 (d06, d09, d19, d20, d24)
- **File không có đối tượng vẽ nào:** 9/23 (d01, d02, d03, d05, d11, d14, d17, d22, d23)

**Kết luận lớp mất:** Lớp đối tượng vẽ mất khi LO xuất HTML **rất lớn** — file điển hình d06 mất 228/288 (79%), d09 mất 105/135 (78%), d24 mất 982/998 (98%). Nguyên nhân chính: bộ lọc HTML (StarWriter) của LibreOffice **không xuất** `wps:wsp`, `wpg:wgp`, `w:pict`/`v:shape`, `w:txbxContent` ra HTML. Chỉ `pic:pic` (ảnh) được chuyển thành `<img>`. Container `wp:anchor`/`wp:inline` cũng mất hoàn toàn. Đây là **mất ở chiều nhập (W5 mở rộng)**, không phải lỗi lưu.

---

## 2. Đếm lại `<w:tbl>` chính xác cho d09, d13, d15 (Mục 2)

### d09

| Tầng | `<w:tbl>` / `<table>` | Ghi chú |
|------|------------------------|---------|
| Gốc (stage0_original) | 2 | Đúng |
| LO import HTML (stage1) | 2 | `<table>` trong HTML |
| App export (stage2_export) | 2 | `<table>` trong `_contentForExport` |
| App DOM (stage2_dom) | 2 | `<table>` trong `.vno-writer-body` |
| LO HTML→DOCX (stage3) | **3** | **Nhân đôi: bảng 3 là bản sao y hệt bảng 2** |

**Vị trí bảng nhân đôi (tầng 3 — document.xml sau LO HTML→DOCX):**
- Bảng 1: Bảng tiêu đề (giữ nguyên)
- Bảng 2: Bảng tài chính (header: "Năm Tài Chính 2019 2020 2021", data: "Doanh Thu…", "Chi Phí…")
- **Bảng 3 (nhân đôi): Ngay sau bảng 2**, nội dung y hệt bảng 2 (6 từ đầu 3 đoạn: "Năm Tài Chính 2019 2020 2021", "Doanh Thu 68.038.183 432.115.763 547.603.274", "Chi Phí 19.256.300 175.167.655 962.211.337")

**Ở tầng 2 (stage2_dom): 2 bảng có nằm trong `<li>`/`div[data-vno-float]` không?**
- **KHÔNG.** Tầng 2 chỉ có 2 bảng. Cả 2 đều **không** nằm trong `<li>` và **không** có ancestor `div[data-vno-float]`. Bảng 2 nằm trong `<td>` của một bảng bố cục cha (layout table), bảng 1 nằm ở cấp độ body. LibreOffice tự nhân đôi khi import HTML→DOCX (tầng 3), không phải do cấu trúc tầng 2.

### d13

| Tầng | `<w:tbl>` / `<table>` | Ghi chú |
|------|------------------------|---------|
| Gốc | 7 | Đúng (R11b: 7/7) |
| LO import HTML | 7 | |
| App export | 7 | |
| App DOM | 7 | |
| LO HTML→DOCX | **7** | **Giữ nguyên, không mất, không nhân đôi** |

**Giải thích con số 49 của R12:** R12 đếm nhầm — có thể đếm `<w:tblPr`/`<w:tblGrid` hoặc lặp nested table trong cell. `<w:tbl\b` chính xác cho **7** (khớp R11b).

### d15

| Tầng | `<w:tbl>` / `<table>` | Ghi chú |
|------|------------------------|---------|
| Gốc | 2 | Đúng (R11b: 2/2) |
| LO import HTML | 2 | |
| App export | 2 | |
| App DOM | 2 | |
| LO HTML→DOCX | **2** | **Giữ nguyên** |

**Giải thích con số 14 của R12:** Tương tự d13 — R12 đếm nhầm `<w:tblPr`/`<w:tblGrid` hoặc nested table. `<w:tbl\b` chính xác cho **2** (khớp R11b).

---

## 3. Kết luận tổng thể

1. **Lớp mất đối tượng vẽ (Import Drawing Loss):** Rất lớn, hệ thống trên 23 file. Chỉ `pic:pic` (ảnh) sống sót. Shape DrawingML (`wps:wsp`), nhóm (`wpg:wgp`), VML (`w:pict`/`v:shape`), textbox (`w:txbxContent`) **mất hoàn toàn ở tầng 1 (LO DOCX→HTML)**. Đây là **ưu tiên cao cho W5 mở rộng chiều nhập** (Adapter import), không phải sửa đường lưu.

2. **Số bảng `<w:tbl>`:**
   - d09: Gốc 2 → Tầng 3 thành **3** (nhân đôi bảng tài chính). Tầng 2 **chỉ có 2**, không trong `<li>`/`data-vno-float`.
   - d13: **7** ở mọi tầng (R12 báo 49 do đếm sai `<w:tblPr`/`<w:tblGrid` hoặc nested).
   - d15: **2** ở mọi tầng (R12 báo 14 do cùng lý do).

3. **Đề xuất lớp sửa:**
   - **Lớp A (W5 Import):** `adapters/libreoffice/writer/writer-adapter.js` — `_normalizeImportedHtml`: tái tạo Rectangle/Connector/Textbox từ `wps:wsp`/`wp:anchor` gốc (giữ `wp:docPr @name`).
   - **Lớp B (Tầng 3 LO HTML→DOCX):** `adapters/libreoffice/common/ooxml_zip_patch.py` — `postprocess_created_writer_docx`: phát hiện bảng nhân đôi (cùng header/content) và gộp/bỏ cho d09.