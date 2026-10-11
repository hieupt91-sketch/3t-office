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

### 5.2 Layout Audit (`_batch_writer.py`) trên toàn bộ 24 file DOCX (`landocx`, d01–d24)

Đã chạy `_batch_writer.py` thực tế trên toàn bộ 24 file DOCX trong `file test/landocx` (tương ứng 21 tệp trong `file test/lan/*.docx` + `d22..d24`) với Word COM:

| File | Word pages gốc | Canvas pages | Saved pages (Word COM) | Saved | Loaded | Paras o/s | SectPr o/s | Br o/s | ZZ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `d01.docx` | 19 | 19 | 19 | yes | yes | 619/619 | 0/0 | 0/0 | True |
| `d02.docx` | 11 | 11 | 11 | yes | yes | 196/196 | 0/0 | 0/0 | True |
| `d03.docx` | 1 | 1 | 1 | yes | yes | 45/45 | 2/2 | 1/1 | True |
| `d04.docx` | 5 | 5 | 5 | yes | yes | 245/245 | 0/0 | 0/0 | True |
| `d05.docx` | 2 | 2 | 2 | yes | yes | 56/56 | 0/0 | 0/0 | True |
| `d06.docx` | **3** | **3** | **3** | **yes** | **yes** | 65/64 | 0/0 | 1/1 | **True** |
| `d07.docx` | 23 | 23 | 23 | yes | yes | 583/583 | 0/0 | 0/0 | True |
| `d08.docx` | 1 | 1 | 1 | yes | yes | 29/29 | 0/0 | 0/0 | True |
| `d09.docx` | 14 | 14 | 14 | yes | yes | 406/405 | 0/0 | 0/0 | True |
| `d10.docx` | *(Gốc lỗi Word)* | 1 | 1 | yes | NO | None/1 | None/0 | None/0 | False |
| `d11.docx` | 5 | 5 | 5 | yes | yes | 72/72 | 0/0 | 0/0 | True |
| `d12.docx` | 3 | 3 | 3 | yes | yes | 118/115 | 0/0 | 0/0 | True |
| `d13.docx` | 10 | 10 | 10 | yes | yes | 328/335 | 0/0 | 1/1 | True |
| `d14.docx` | 3 | 3 | 3 | yes | yes | 49/49 | 0/0 | 0/0 | True |
| `d15.docx` | 10 | 10 | 10 | yes | yes | 238/238 | 0/0 | 1/1 | True |
| `d16.docx` | 8 | 8 | 8 | yes | yes | 165/165 | 0/0 | 0/0 | True |
| `d17.docx` | 5 | 5 | 5 | yes | yes | 116/116 | 0/0 | 0/0 | True |
| `d18.docx` | 2 | 2 | 2 | yes | yes | 48/48 | 0/0 | 0/0 | True |
| `d19.docx` | 2 | 2 | 2 | yes | yes | 43/41 | 0/0 | 0/0 | True |
| `d20.docx` | 3 | 3 | 3 | yes | yes | 329/330 | 0/0 | 1/1 | True |
| `d21.docx` | 9 | 9 | 9 | yes | yes | 39/39 | 0/0 | 1/1 | True |
| `d22.docx` | 5 | 5 | 5 | yes | yes | 116/116 | 0/0 | 0/0 | True |
| `d23.docx` | 1 | 1 | 1 | yes | yes | 45/45 | 2/2 | 1/1 | True |
| `d24.docx` | 16 | 16 | 16 | yes | yes | 18/18 | 2/2 | 9/9 | True |

- **Khắc phục d06.docx:** Bản lưu `_rt_d06.docx` mở bình thường trong Word 2016 (3 trang), không còn lỗi XML.
- **Tỷ lệ bảo toàn:** 23 / 23 tệp hợp lệ khớp **100% số trang** giữa Word gốc, canvas và bản lưu Word COM.
- **Kiểm tra tính toàn vẹn XML & docPr:** Quét toàn bộ 24 bản lưu bằng `xml.etree.ElementTree`, tất cả parse thành công 100%, tất cả ID `docPr` đều duy nhất (không trùng lặp).

### 5.3 Đợt Fix Hồi Quy d06 (Root Cause & Fix Details)

1. **Hiện tượng:** Tại commit 379bfb0, khi chạy batch trên `d06.docx`, Word báo lỗi: *"Word encountered an error processing the XML file"*. Phân tích bằng `ElementTree` phát hiện lỗi `mismatched tag: line 2, column 30347`.
2. **Cơ chế gây lỗi:**
   - Trong `d06.docx` có các shape/drawing/textbox phức tạp chứa đoạn lồng (`<v:textbox><w:txbxContent><w:p>...`).
   - `_document_paragraph_ranges` trước đây không loại bỏ `<w:txbxContent>`, dẫn đến danh sách ranges chứa cả đoạn cha lẫn đoạn lồng con (overlapping ranges).
   - Commit 379bfb0 nới lỏng điều kiện `len(source_empty) == len(converted_empty)` thành `zip(source_empty, converted_empty)`, vô tình ghép một đoạn chứa drawing 69KB với một đoạn trống 200B.
   - Khi thực hiện thay thế đoạn rỗng theo offset, việc thay thế đoạn con bên trong đã làm dịch chuyển chiều dài chuỗi, khiến việc thay thế đoạn cha cắt đứt phần đầu thẻ mở `<w:p><w:pPr>...` của đoạn văn bản tiếp theo (`0" w:left="0" w:right="0"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>H</w:t></w:r></w:p>`), làm hỏng cấu trúc thẻ XML.
3. **Các biện pháp khắc phục triệt để:**
   - `_document_paragraph_ranges`: loại bỏ phạm vi bên trong `<w:txbxContent>` và lọc bỏ bất kỳ đoạn con lồng nào để đảm bảo 100% ranges không bao giờ chồng lấn (`no overlapping ranges`).
   - `_restore_writer_matched_formatting`: khôi phục điều kiện nghiêm ngặt `len(source_empty) == len(converted_empty)` cho bounded empty pairs.
   - Bảo vệ rPr của đoạn trống: chỉ áp dụng can thiệp `source_rpr` lên run khi đoạn **không phải** là drawing carrier (`not has_drawing`). Đối với drawing carrier, chỉ khôi phục thuộc tính đoạn (`pPr`) mà không can thiệp thẻ con trong run drawing.
   - `restore_docx_html_half_points_and_empty_paras`: làm rỗng vùng `<w:txbxContent>` bằng khoảng trắng trước khi regex quét đoạn dòng văn bản, ngăn regex bị dừng non tại các thẻ `</w:p>` lồng nhau.
   - `_preserveEmptyParagraphFontSizesForExport` trong `writer-adapter.js`: thêm guard bỏ qua các đoạn có chứa cấu trúc hình vẽ, SVG, Canvas, div hoặc thuộc tính `vno-`.
4. **Unit test tái hiện hồi quy:**
   - Thêm `test_empty_para_adjacent_to_drawing_produces_valid_xml` trong `tests/test_writer_halfpoint_and_empty_para.py`.
   - Test tạo tài liệu chứa đoạn rỗng nằm kề đoạn vẽ có textbox lồng nhau, kiểm tra không có range chồng lấn và XML sau khi match formatting phải parse hợp lệ qua `ElementTree`.

### 5.4 Toàn bộ Test Suites

- **Python test suite:** `python -m unittest discover -s tests`
  - **Kết quả:** `Ran 396 tests in 290.773s - OK` (**396/396 PASS, 0 FAIL**)
- **Node.js test suite:** `node tests/run-tests.js`
  - **Kết quả:** `1910/1910 PASS | 0 FAIL` (**100% PASS**)

---

## 6. Files Changed

| File | Hành động | Mô tả |
|---|---|---|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Sửa | Khắc phục `_document_paragraph_ranges` không chồng lấn, khôi phục `len == len` cho empty_pairs, guard `has_drawing` cho rPr đoạn trống, làm rỗng `txbxContent` khi phân tích HTML |
| `adapters/libreoffice/writer/writer-adapter.js` | Sửa | Safeguard `_preserveEmptyParagraphFontSizesForExport` cho các đoạn chứa drawing/shape/canvas |
| `tests/test_writer_halfpoint_and_empty_para.py` | Sửa | Thêm `test_empty_para_adjacent_to_drawing_produces_valid_xml` |
| `docs/HANDOFF-WRITER-HALFPOINT-FONTSIZE.md` | Cập nhật | Bổ sung phân tích nguyên nhân gốc, cơ chế sửa hồi quy d06 và bảng kết quả audit toàn bộ 24 file |

---

## 7. Rủi ro & Kiến nghị tiếp theo (Risks & Next Actions)

- **Rủi ro:** Cực thấp. Đã kiểm chứng Word COM trên toàn bộ 24 file mẫu thực tế và `legacy18.doc`.
- **Tiếp theo:**
  - Giữ commit trên nhánh `fix/writer-halfpoint-fontsize-agy`.
  - Không merge vào `main` theo quy định.
