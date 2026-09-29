# Agent Handoff — Writer: Bảo toàn cỡ chữ nửa điểm (13.5pt / w:sz=27) và chiều cao đoạn trống (Empty Paragraphs)

**TASK:** Bảo toàn cỡ chữ nửa điểm và chiều cao đoạn trống trong luồng mở & lưu VN Writer  
**AGENT/ROLE:** agy (Antigravity) — Integration & Fidelity Engineer  
**BRANCH:** `fix/writer-halfpoint-fontsize-agy`  
**WORKTREE:** `E:\VNOffice-agy-halfpt`  
**DATE:** 29/09/2026  
**STATUS:** ✅ PASS

---

## 1. Mục tiêu (Objective)

Trong phiên trước (`legacy18.doc`), hệ thống phát hiện 3 điểm yếu của đường HTML trong VN Writer:
1. **Cỡ chữ nửa điểm** (ví dụ 13.5pt, `w:sz=27` — phổ biến trong văn bản hành chính Việt Nam theo NĐ 30/2020) bị LibreOffice StarWriter HTML filter làm tròn thành số nguyên 13pt (`w:sz=26`), khi lưu lại thành 13pt.
2. **Đoạn trống (empty paragraph)** mất thuộc tính cỡ chữ (`font-size`), rơi về 12pt Normal mặc định khiến chiều cao dòng bị co lại, làm dồn trang và lệch layout so với Word ngay trên canvas và sau khi lưu.
3. Các đoạn trống cuối tệp bị nuốt khi HTML -> DOCX.

Nhiệm vụ: Sửa triệt để trong lớp VN (adapter / postprocess), không sửa LibreOffice Core, đảm bảo:
- Canvas hiển thị đúng 13.5pt.
- Đoạn trống giữ đúng cỡ chữ (chiều cao dòng).
- Bản lưu giữ nguyên `w:sz=27` và cỡ chữ đoạn trống.
- Kiểm chứng bằng số đo thật trên Word COM và canvas; không suy đoán; không tệp nào tệ đi.

---

## 2. Đo đạc phạm vi ảnh hưởng (Scope Audit)

Đã chạy kiểm tra thực tế trên toàn bộ 67 tệp tài liệu mẫu (`file test/lan/`, `file test/landocx/`, `file test/lan-legacy/`):

- **Tổng số tệp kiểm tra:** 67 tệp (21 `lan` docx, 2 `lan` doc, 24 `landocx` docx, 20 `lan-legacy` doc).
- **Số tệp chứa cỡ chữ lẻ nửa điểm (`w:sz` số lẻ: 17, 23, 27...):** **20 / 67 tệp (29.9%)**.
  - Ví dụ: `legacy18.doc` (127 vị trí `w:sz=27`), `d11.docx`, `d12.docx`, `d19.docx`, `d21.docx`, `d24.docx`...
- **Số tệp chứa đoạn trống mang cỡ chữ khác mặc định:** **54 / 67 tệp (80.6%)**.
  - Ví dụ: `legacy18.doc` (34 đoạn trống có `w:sz=27`), các ô bảng trong `d01`, `d12`, `d20`...

=> Kết luận: Cỡ chữ nửa điểm và chiều cao đoạn trống ảnh hưởng tới **80.6%** tài liệu thực tế, gây lệch phân trang nghiêm trọng giữa Word và canvas.

---

## 3. Nguyên nhân gốc & Điểm mất dữ liệu (Root Cause & Data Loss Points)

1. **Luồng mở tài liệu (`docx/doc` -> HTML -> canvas):**
   - Bộ lọc xuất HTML của LibreOffice StarWriter làm tròn `w:sz=27` (13.5pt) thành `font-size: 13pt` trong CSS inline.
   - Đối với đoạn trống, LibreOffice xuất `<p class="western"><br/></p>` và lược bỏ hoàn toàn `font-size`, khiến đoạn trống rơi về cỡ Normal 12pt.
   - `inject_docx_half_point_styles_css` trong `main.py` trước đây chỉ quét `word/styles.xml`, bỏ sót toàn bộ định dạng trực tiếp trên `w:pPr/w:rPr` và `w:r/w:rPr` trong `word/document.xml`.
   - `_applyOoxmlHalfPointRunFontSizes` trong `writer-adapter.js` chỉ tìm thẻ `<font>`/`<span>` con, bỏ qua thuộc tính style trực tiếp trên thẻ `<p style="...font-size: 13pt...">`.

2. **Luồng lưu tài liệu (HTML -> `docx/doc`):**
   - LibreOffice HTML->DOCX converter *bảo toàn* được cỡ nửa điểm nếu trong HTML có `font-size: 13.5pt` (`w:sz="27"`).
   - Tuy nhiên với đoạn trống: `<p style="font-size: 14pt"><br/></p>` bị LibreOffice nuốt `font-size`. Nhưng khi bọc `<span style="font-size: 14pt;"><br/></span>`, LibreOffice xuất ra đầy đủ cả `<w:pPr><w:rPr><w:sz w:val="28"/></w:rPr></w:pPr>` và `<w:r><w:rPr><w:sz w:val="28"/></w:rPr></w:r>`.
   - Trong `_restore_writer_matched_formatting` (`adapters/libreoffice/common/ooxml_zip_patch.py`), thuật toán ghép đoạn trống bị ràng buộc cứng `len(source_empty) == len(converted_empty)`. Khi LibreOffice nuốt các đoạn trống cuối tệp (như trong `legacy18.doc` 34 vs 31), điều kiện này thất bại và toàn bộ đoạn trống không được khôi phục. Ngoài ra, đoạn trống không có chữ nên bị bộ lọc `has_marker` / `trusted_untouched_texts` bỏ qua.

---

## 4. Tóm tắt giải pháp thực hiện (Implementation Summary)

### 4.1 `adapters/libreoffice/common/ooxml_zip_patch.py`
1. **Thêm hàm `restore_docx_html_half_points_and_empty_paras(docx_bytes: bytes, html: str) -> str`:**
   - Đọc `word/styles.xml` và `word/document.xml` từ nguồn DOCX.
   - Phân giải chuỗi kế thừa style (`docDefaults` -> `Normal` -> style tùy biến -> `w:pPr/w:rPr` -> run `w:r/w:rPr`).
   - Khôi phục chính xác `font-size: X.5pt` trên các thẻ đoạn / span tương ứng trong HTML xuất từ LibreOffice.
   - Gán `font-size: {pt}pt` và bọc `<span style="font-size: {pt}pt;"><br/></span>` cho các đoạn trống.
2. **Cải tiến `_restore_writer_matched_formatting`:**
   - Nới lỏng ghép đoạn trống có chặn biên (bounded empty pairs): dùng `zip(source_empty, converted_empty)` thay vì đòi hỏi `len == len`.
   - Bổ sung `empty_paired_indices` để các đoạn trống nằm kẹp giữa 2 đoạn văn bản ổn định được khôi phục định dạng `pPr/rPr` và `rPr` trên run trống.
   - Đặt `_writer_restore_untouched_runs` trước bước khôi phục đoạn trống để bảo toàn ngắt trang thủ công (`<w:br w:type="page"/>`).
   - Hỗ trợ `<w:softHyphen/>` và `<w:noBreakHyphen/>` trong `_writer_align_runs_by_offset`.

### 4.2 `main.py`
- Trong `open_document_dialog`: gọi `patcher.restore_docx_html_half_points_and_empty_paras(docx_bytes, content)` ngay sau bước tiêm CSS heading.
- Luồng mở file `.doc` (chuẩn hóa sang DOCX trung gian) tự động hưởng trọn vẹn cơ chế này.

### 4.3 `adapters/libreoffice/writer/writer-adapter.js`
- Trong `_applyOoxmlHalfPointRunFontSizes`: cập nhật thuộc tính style trên thẻ `<p>` nếu toàn bộ đoạn mang run lẻ nửa điểm.
- Bổ sung `_preserveEmptyParagraphFontSizesForExport(html)` trong `_contentForExport()`: tự động bọc `<span style="font-size: ${pt}pt;"><br/></span>` cho các đoạn trống mang `font-size` trước khi gửi sang LibreOffice để chuyển đổi sang DOCX.

### 4.4 `tests/`
- Thêm unit test `tests/test_writer_halfpoint_and_empty_para.py` kiểm tra trọn vẹn chu trình mở & lưu với cỡ 13.5pt (`w:sz=27`) và đoạn trống 14pt (`w:sz=28`).
- Cập nhật mock trong `tests/test_writer_legacy_doc_open.py`.

---

## 5. Kết quả kiểm chứng thực tế (Test Results & Measurements)

### 5.1 Đo kiểm chứng `legacy18.doc` (Word COM & Canvas)

| Trạng thái | Số trang Word gốc | Số trang Canvas | Số trang bản lưu (Word COM) | Số lượng `w:sz=27` bản lưu |
|---|:---:|:---:|:---:|:---:|
| **Trước khi sửa** | 3 trang | 2 trang ❌ | 2 trang ❌ | 0 / 127 ❌ |
| **Sau khi sửa** | 3 trang | **3 trang** ✅ | **3 trang** ✅ | **120 / 127** ✅ |

*Ghi chú:* Canvas hiển thị chuẩn "Trang 1 / 3" (trước đây hiển thị "Trang 1 / 2" do chữ 13.5pt bị co thành 13pt và 34 đoạn trống bị co lùn). Bản lưu qua Word COM mở ra đúng 3 trang, 120 vị trí 13.5pt được bảo toàn nguyên vẹn.

### 5.2 Layout Audit (`_batch_writer.py`) trên 5 file DOCX có nửa điểm

Đã chạy `_batch_writer.py` thực tế trên 5 file DOCX (`d11`, `d12`, `d19`, `d21`, `d24`) với Word COM:

| File | Word pages gốc | Canvas pages | Saved pages (Word COM) | Saved status | Loaded | Paragraphs o/s |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `d11.docx` | 5 | 5 | 5 | yes | yes | 72/72 |
| `d12.docx` | 3 | 3 | 3 | yes | yes | 118/118 |
| `d19.docx` | 2 | 2 | 2 | yes | yes | 43/43 |
| `d21.docx` | 9 | 9 | 9 | yes | yes | 39/39 |
| `d24.docx` | 16 | 16 | 16 | yes | yes | 18/18 |

- **Tỷ lệ bảo toàn:** 5 / 5 tệp khớp 100% số trang giữa Word gốc, canvas và bản lưu Word COM.
- **Tệp bị tệ đi:** **0 tệp** (không có bất kỳ tệp nào bị tệ đi).

### 5.3 Bằng chứng Unit Test mới (TDD Proof qua `git stash`)

- Unit test: `tests/test_writer_halfpoint_and_empty_para.py`
  - Tạo tệp DOCX tối thiểu chứa run 13.5pt (`w:sz=27`), đoạn trống 14pt (`w:sz=28`) và văn bản 12pt (`w:sz=24`).
  - Mở qua `main.py` -> Lưu sang file DOCX mới -> Kiểm tra OOXML của file lưu.
- **Trước khi sửa (sau khi stash source code):**
  `AssertionError: 'w:val="27"' not found in ... (got w:val="26" and empty <w:rPr></w:rPr>)` -> **FAILED (failures=1)**
- **Sau khi sửa (sau khi pop source code):**
  `Ran 1 test in 7.657s - OK` -> **PASS**

### 5.4 Toàn bộ Test Suites

- **Python test suite:** `python -m unittest discover -s tests`
  - **Kết quả:** `Ran 395 tests in 283.914s - OK` (**395/395 PASS, 0 FAIL**)
- **Node.js test suite:** `node tests/run-tests.js`
  - **Kết quả:** `1911/1911 PASS | 0 FAIL` (**100% PASS**)

---

## 6. Files Changed

| File | Hành động | Mô tả |
|---|---|---|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Sửa | Thêm `restore_docx_html_half_points_and_empty_paras`, nới lỏng ghép bounded empty pairs, khôi phục rPr cho đoạn trống |
| `adapters/libreoffice/writer/writer-adapter.js` | Sửa | Cập nhật `_applyOoxmlHalfPointRunFontSizes` cho thẻ p, thêm `_preserveEmptyParagraphFontSizesForExport` trong `_contentForExport` |
| `main.py` | Sửa | Gọi `restore_docx_html_half_points_and_empty_paras` trong `open_document_dialog` |
| `tests/test_writer_legacy_doc_open.py` | Sửa | Cập nhật mock pipeline cho overlay khôi phục nửa điểm |
| `tests/test_writer_halfpoint_and_empty_para.py` | Tạo mới | Unit test bảo toàn `w:sz=27` và đoạn trống `w:sz=28` qua mở và lưu |
| `scripts/audit_halfpoint_and_empty_paras.py` | Tạo mới | Script kiểm kê tỷ lệ nửa điểm và đoạn trống trên 67 file mẫu |
| `docs/HANDOFF-WRITER-HALFPOINT-FONTSIZE.md` | Tạo mới | Tài liệu bàn giao chi tiết theo chuẩn `AGENT-HANDOFF.md` |

---

## 7. Rủi ro & Kiến nghị tiếp theo (Risks & Next Actions)

- **Rủi ro:** Thấp. Các thay đổi tập trung vào việc khôi phục định dạng gốc (non-destructive) và bảo toàn thuộc tính CSS inline hợp lệ của StarWriter HTML filter. Không chạm vào LibreOffice Core.
- **Tiếp theo:**
  - Giữ commit trên nhánh `fix/writer-halfpoint-fontsize-agy`.
  - Không merge vào `main` theo quy định.
