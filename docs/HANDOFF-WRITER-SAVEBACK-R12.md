# HANDOFF — Writer Save-Back Audit R12

**Branch:** `audit/writer-saveback-r12`  
**Worktree:** `E:\VNOffice-opencode-writer-r12`  
**Date:** 2026-09-21  
**Tool:** `scripts/layout-audit/_saveback_stages.py`  
**Profile:** `$env:LOCALAPPDATA = E:\VNOffice-profiles\opencode`  
**Mẫu:** `E:\VN OFice\file test\landocx` (ngoài git)  

---

## 1. Bảng tầng × số đếm (5 file × 4 tầng)

| File | Tầng | Tables | Paras | Rectangles | Connectors | PageBreaks | PBB | BrPage |
|------|------|--------|-------|------------|------------|------------|-----|--------|
| **d09** | Stage1 LO Import | 2 | 426 | 0 | 0 | 0 | - | - |
| | Stage2 Export | 2 | 417 | 0 | 0 | 0 | - | - |
| | Stage2 DOM | 2 | 412 | 0 | 0 | 0 | - | - |
| | Stage3 LO Docx (no post) | 3 | 344 | 0 | 0 | 0 | 0 | 0 |
| | Stage4 Real Save | 3 | 344 | 0 | 0 | 0 | 0 | 0 |
| **d06** | Stage1 LO Import | 0 | 118 | 0 | 0 | 1 | - | - |
| | Stage2 Export | 0 | 130 | 0 | 0 | 1 | - | - |
| | Stage2 DOM | 0 | 130 | 0 | 0 | 1 | - | - |
| | Stage3 LO Docx (no post) | 0 | 61 | 0 | 0 | 0 | 0 | 0 |
| | Stage4 Real Save | 0 | 61 | 17 | 45 | 2 | 2 | 0 |
| **d15** | Stage1 LO Import | 2 | 243 | 0 | 0 | 2 | - | - |
| | Stage2 Export | 2 | 241 | 0 | 0 | 2 | - | - |
| | Stage2 DOM | 2 | 235 | 0 | 0 | 2 | - | - |
| | Stage3 LO Docx (no post) | 14 | 239 | 0 | 0 | 2 | 1 | 1 |
| | Stage4 Real Save | 14 | 239 | 0 | 0 | 2 | 1 | 1 |
| **d13** | Stage1 LO Import | 7 | 295 | 0 | 0 | 1 | - | - |
| | Stage2 Export | 7 | 295 | 0 | 0 | 1 | - | - |
| | Stage2 DOM | 7 | 293 | 0 | 0 | 1 | - | - |
| | Stage3 LO Docx (no post) | 49 | 335 | 0 | 0 | 0 | 0 | 0 |
| | Stage4 Real Save | 49 | 335 | 0 | 0 | 0 | 0 | 0 |
| **d21** | Stage1 LO Import | 0 | 39 | 0 | 0 | 1 | - | - |
| | Stage2 Export | 0 | 39 | 0 | 0 | 1 | - | - |
| | Stage2 DOM | 0 | 39 | 0 | 0 | 1 | - | - |
| | Stage3 LO Docx (no post) | 0 | 39 | 0 | 0 | 0 | 0 | 0 |
| | Stage4 Real Save | 0 | 39 | 0 | 0 | 0 | 0 | 0 |

*Chú thích:* PageBreaks ở HTML = `page-break-before: always` hoặc `break-before: page`. PBB = `w:pageBreakBefore`. BrPage = `w:br type=page`.

---

## 2. Trả lời 4 câu hỏi

### Câu 1: d09 — Bảng thứ 3 xuất hiện ở tầng nào? Nội dung? Phần tử bao quanh ở stage2_dom?

- **Tầng xuất hiện:** **Tầng 3 (LibreOffice HTML→DOCX)**. Stage1 và Stage2 chỉ có 2 bảng. Stage3 sinh ra bảng thứ 3 là **bản sao y hệt bảng 2**.
- **Nội dung bảng 3 (6 từ đầu 3 đoạn đầu):**
  1. `Năm Tài Chính 2019 2020 2021`
  2. `Doanh Thu 68.038.183 432.115.763 547.603.274`
  3. `Chi Phí 19.256.300 175.167.655 962.211.337`
- **Phần tử bao quanh ở stage2_dom.html:** **KHÔNG CÓ** — bảng thứ 3 **không tồn tại** ở tầng 2 (chỉ có 2 bảng). LibreOffice tự nhân đôi bảng tài chính khi import HTML→DOCX.

### Câu 2: d06 — 22 Rectangle còn ở tầng 1 không?

- **Kết quả:** **MẤT HOÀN TOÀN Ở TẦNG 1** (LibreOffice import DOCX→HTML).
- Original: 37 Rectangle, 54 Straight Connector.
- Stage1 (LO import HTML): 0 Rectangle, 0 Connector.
- Stage2 (App export): 0 Rectangle, 0 Connector.
- **Kết luận:** Rơi ở **chiều nhập (W5 mở rộng)** — bộ lọc HTML (StarWriter) của LibreOffice **không xuất DrawingML Rectangle/Connector ra HTML**. Không phải lỗi lưu.

### Câu 3: d15 — `break-before: page` của đoạn "Căn cứ Bộ luật…" ở tầng 2 có trước `<table>` sát không? Tầng 3 `w:pageBreakBefore`/`w:br` ở đoạn nào?

- **Tầng 2 (Stage2 export):** Có 2 `page-break-before`:
  1. Trên **`<table width="623" ... style="page-break-before: always">`** (bảng đầu tiên).
  2. Trên đoạn **`<p ... break-before: page>`** chứa "Căn cứ Bộ luật dân sự…".
  → Đoạn "Căn cứ…" **KHÔNG** đứng ngay trước bảng — bảng đã có `page-break-before` riêng.
- **Tầng 3 (Stage3 LO docx):**
  - `w:pageBreakBefore`: 1 lần, trên đoạn **RỖNG** bên trong bảng (table cell header).
  - `w:br type=page`: 1 lần, cũng trên đoạn **RỖNG** bên trong bảng.
- **Kết luận:** Rơi ở **LibreOffice import HTML→DOCX (tầng 3)**. LibreOffice nhận `break-before: page` trên `<p>` nhưng **gắn nhầm `w:pageBreakBefore` vào đoạn rỗng trong bảng** (heading cell) thay vì đoạn "Căn cứ…". Tầng 4 (hậu xử lý) không thay đổi (stage3 = stage4).

### Câu 4: d13 (br 1→0, đoạn +7) và d21 (br 1→0) — Cùng cơ chế với d15?

- **d13:** Original 1 `w:br type=page` → Stage1: 1 → Stage2: 1 → **Stage3: 0** (mất hẳn) → Stage4: 0. Đoạn tăng +7 (328→335).
- **d21:** Original 1 `w:br type=page` → Stage1: 1 → Stage2: 1 → **Stage3: 0** (mất hẳn) → Stage4: 0. Đoạn giữ nguyên (39→39).
- **d15:** Original 1 `w:br type=page` → Stage3: **chuyển thành `w:pageBreakBefore` SAI VỊ TRÍ** (vào table header).
- **Kết luận:** **KHÔNG cùng cơ chế**.
  - d15: **Chuyển sai chỗ** (break-before trên `<p>` → pbb vào table cell).
  - d13/d21: **Mất hoàn toàn** (break-before/page-break-before không sinh ra pbb cũng không giữ br).
  - Cả 3 đều rơi ở **tầng 3 (LibreOffice HTML→DOCX)** nhưng biểu hiện khác nhau.

---

## 3. Đề xuất lớp (tầng + chỗ sửa)

| Lớp | File | Tầng rơi | Chỗ sửa đề xuất |
|-----|------|----------|-----------------|
| **A** | d09 | Tầng 3 (LO HTML→DOCX) | `adapters/libreoffice/common/ooxml_zip_patch.py` — `postprocess_created_writer_docx`: phát hiện bảng nhân đôi (cùng header/content) và gộp/bỏ. Hoặc sửa `_contentForExport` tránh emit CSS gây LO nhầm. |
| **B** | d06 | Tầng 1 (LO DOCX→HTML) | **Không sửa ở đường lưu**. Cần mở rộng W5 (chiều nhập): `adapters/libreoffice/writer/writer-adapter.js` `_normalizeImportedHtml` để tái tạo Rectangle/Connector từ `wps:wsp`/`wp:anchor` gốc (giữ tên `wp:docPr name=`). |
| **C** | d15 | Tầng 3 (LO HTML→DOCX) | `ooxml_zip_patch.py` `postprocess_created_writer_docx` (W22d): cải tiến logic khớp `break-before: page` — dùng `vno-untouched-N` bookmark để map đúng đoạn, không cho LO gắn pbb vào table cell. |
| **D** | d13, d21 | Tầng 3 (LO HTML→DOCX) | `ooxml_zip_patch.py` `postprocess_created_writer_docx`: bổ sung khôi phục `w:br type=page` từ `break-before: page`/`page-break-before: always` trong HTML nguồn (tương tự W22d nhưng cho trường hợp LO bỏ qua hoàn toàn). |

---

## 4. Ghi chú thực thi

- Script `_saveback_stages.py` đã commit kèm handoff.
- Không commit file test/output (`audit_out/`, `_saveback2/`).
- Không ghi tên tài liệu thật trong handoff.
- Chạy lần lượt từng file trong cùng phiên PowerShell đã set `LOCALAPPDATA`.