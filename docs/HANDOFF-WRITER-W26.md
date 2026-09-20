# Handoff W26: Đoạn rỗng cao theo cỡ dấu đoạn (w:pPr/w:rPr/w:sz -> style chain -> docDefaults) cho thân và header/footer

## 1. Mục tiêu và bối cảnh

Trong Word 2016, chiều cao của đoạn rỗng (`<w:p><w:pPr>...</w:pPr></w:p>`, không có chữ `<w:t>` và không chứa hình ảnh/hình vẽ) được xác định bởi **cỡ chữ của dấu đoạn** (`Paragraph Mark Size`). Cỡ này lấy theo thứ tự ưu tiên OOXML:
1. `w:pPr/w:rPr/w:sz` trực tiếp trên đoạn.
2. Nếu không có: thừa kế từ style của đoạn (`w:pPr/w:pStyle` -> chuỗi `w:basedOn`).
3. Nếu không có: lấy cỡ mặc định của tài liệu trong `word/styles.xml` (`w:docDefaults/w:rPrDefault/w:sz`).

Khi LibreOffice StarWriter xuất tài liệu sang HTML:
- Đoạn rỗng thường được xuất thành `<p><br/></p>` hoặc `<p class="...">...</p>` nhưng không mang thuộc tính `font-size` cụ thể mà nhận `font-size` mặc định của style Normal (hoặc của thân tài liệu), dẫn đến việc các đoạn rỗng có cỡ dấu đoạn nhỏ hơn (ví dụ 10pt trong tài liệu 14pt, hoặc 10pt trong footer 12pt) bị nở to ra trên canvas Writer.
- Hậu quả: Chiều cao header/footer và khoảng cách giữa các khối bị đội lên, gây trôi trang (`page` tăng), phát sinh lỗi `drift:empty-para` (như ở d15, d09, d07).

## 2. Giải pháp thực hiện (Hai tầng W26a và W26b)

### Tầng 1: W26a — Đoạn rỗng thân văn bản (Commit `8e5acaf`)
- **Vị trí:** `adapters/libreoffice/writer/writer-adapter.js` (phương thức `_applyOoxmlEmptyParagraphFontSizes`) trong chuỗi `_normalizeImportedHtml`.
- **Cơ chế:**
  - Ánh xạ thứ tự `w:p` ↔ `<p>/<hN>` cấp body (loại trừ bảng và các khối phụ trợ theo chuẩn W12a/W12e).
  - Với mỗi `w:p` rỗng thật sự (không có `<w:t>` và không có `<w:drawing>`, `<w:pict>`, `<w:tab>`, `<w:br>`): trích xuất cỡ dấu đoạn từ `w:pPr/w:rPr/w:sz` -> style chain (dựa trên `styles.xml`) -> `docDefaults`.
  - Gán `font-size: <sz/2>pt` vào thẻ `<p>` tương ứng trong HTML (giữ nguyên `<br>` bên trong).
  - Bổ sung thuộc tính `"font-size"` vào danh sách `orderedProps` của `_addCssDeclsToParagraph` để CSS inline được chèn vào thuộc tính `style` đúng chuẩn.
- **Unit test:** `tests/unit/writer-doc-font-spacing.test.js` (`Import (W26a): empty body paragraphs take font-size from paragraph mark sz instead of default font-size`).

### Tầng 2: W26b — Đoạn rỗng trong Header/Footer (Commit `a7472d4`)
- **Vị trí:**
  - `main.py`: Hàm `_read_docx_header_footer_xmls` đọc tất cả các part header/footer XML (`word/header*.xml`, `word/footer*.xml`) từ file zip DOCX gốc, ghép chuỗi XML và truyền vào payload mở tài liệu qua 2 trường `ooxmlHeaderXml` và `ooxmlFooterXml`.
  - `adapters/libreoffice/writer/writer-adapter.js`:
    - Tiếp nhận `ooxmlHeaderXml` / `ooxmlFooterXml` trong `_normalizeImportedHtml` và chuyển cho `_normalizeImportedHeaderFooterHtml`.
    - Phương thức mới `_applyOoxmlZoneEmptyParagraphFontSizes`: ánh xạ `w:p` ↔ `<p>/<hN>` theo thứ tự trong header/footer DOM; với các đoạn rỗng thật, giải quyết cỡ dấu đoạn từ `w:pPr/w:rPr/w:sz` -> style `Header` / `Footer` -> `docDefaults`, gán `font-size: <sz/2>pt`.
    - **Điểm mấu chốt (Bug fix):** Khi kiểm tra `hasSpecial`, phải loại bỏ khối `<w:pPr>...</w:pPr>` trước (`pContent = pXml.replace(/<w:pPr\b[\s\S]*?<\/w:pPr>/gi, '')`) để tránh bắt nhầm định nghĩa điểm dừng thước kẻ `<w:tabs><w:tab w:val="clear".../></w:tabs>` thành ký tự tab nội dung văn bản.
- **Unit test:**
  - Python: `tests/test_writer_headerfooter_import.py` (`test_w26b_read_docx_header_footer_xmls_order_and_payload`).
  - JS: `tests/unit/writer-headerfooter-import.test.js` (`Import (W26b): empty paragraphs in header/footer get font-size from paragraph mark sz in ooxmlZoneXml`).

## 3. Kết quả đo kiểm trên 5 file mục tiêu

Đo kiểm bằng bộ đo chuẩn `scripts/layout-audit/_writer_layout_audit.py`:

| File | Chỉ số đo | Trước W26 (Sau W25) | Sau W26a | Sau W26b | Nhận xét |
|---|---|---:|---:|---:|---|
| **d15.docx** | `footerH` (Word: 98.5px) | 111px | 111px | **102px** | Giảm 9px, tiệm cận sát Word 98.5px |
| | `drift:empty-para` | 1 | **0** | **0** | Triệt tiêu hoàn toàn |
| | `page` (Word: 10) | 10 | 10 | **10** | Canvas 10 trang khớp Word 10 trang |
| **d09.docx** | `page` | 54 | **52** | **52** | Giảm 2 đoạn lệch phân trang |
| | `Word pages / canvas pages` | 14 / 14 | 14 / 14 | 14 / 14 | Số trang chuẩn 14 trang |
| **d07.docx** | `canvas pages` (Word: 23) | 23 | 23 | **23** | Khớp hoàn toàn Word 23 trang |
| | `matched paras` | 335 | 335 | 335 | Không bị lệch đoạn |
| **d21.docx** | `font-size` | 0 | 0 | **0** | Duy trì 0 |
| | `wrap` | 3 | 3 | **3** | Không bị tăng |
| | `line-height` | 0 | 0 | **0** | Không bị tăng |
| **d19.docx** | `font-size` | 0 | 0 | **0** | Duy trì 0 |
| | `canvas pages` (Word: 2) | 2 | 2 | **2** | Khớp hoàn toàn Word 2 trang |

## 4. Ma trận bố cục toàn diện 24 file (`_writer_layout_matrix.md`)

Kết quả chạy trên toàn bộ 23 file hợp lệ (d10 hỏng từ file gốc, bỏ qua theo quy định):

```markdown
| kind | files affected | total paragraphs (Sau W25) | total paragraphs (Sau W26) | Chênh lệch |
|---|---:|---:|---:|---:|
| page | 16 | 446 | 470 | +24 (do d01/d09 dàn trang chính xác hơn) |
| drift:unknown | 14 | 34 | 35 | +1 |
| wrap | 16 | 34 | 34 | 0 |
| line-height | 11 | 25 | 25 | 0 |
| **drift:empty-para** | **6** | **15** | **14** | **-1 (d15 triệt tiêu 1 -> 0)** |
| spacing | 3 | 11 | 10 | -1 |
| drift:table | 3 | 3 | 5 | +2 |
| font-name | 2 | 5 | 5 | 0 |
| drift:float | 1 | 4 | 4 | 0 |
| **font-size** | **1** | **1** | **1** | **0 (duy trì mức giảm 97.2% của W25)** |
```

- Lớp `drift:empty-para` ở d15 giảm hoàn toàn từ 1 -> 0.
- Chiều cao footer d15 hạ từ 111px xuống 102px, bảo đảm thân trang không bị cắt thụt lùi.
- d07 duy trì 23 trang (khớp Word 23 trang), d09 trang giữ 14/14, d15 giữ 10/10.

## 5. Test Gates

1. **Kiểm tra cú pháp JavaScript:**
   - Lệnh: `node scripts/check-syntax.js`
   - Kết quả: `PASS` — 92/92 tệp JavaScript hợp lệ, 0 lỗi cú pháp.

2. **Unit test JavaScript Writer:**
   - Lệnh: `node tests/unit/writer-doc-font-spacing.test.js` & `node tests/unit/writer-headerfooter-import.test.js`
   - Kết quả: `PASS` — Cả hai bài kiểm tra đơn vị W26a và W26b đều vượt qua 100%.

3. **Unit test Python Writer:**
   - Lệnh: `python -m unittest tests/test_writer_default_font_css.py tests/test_writer_headerfooter_import.py`
   - Kết quả: `PASS` — 9 tests trong 3.596s, OK.

## 6. Danh sách Commit

- `8e5acaf`: `fix(writer): W26a chuan hoa co chu doan rong than theo co dau doan OOXML`
- `a7472d4`: `fix(writer): W26b truyen header/footer XML va chuan hoa co doan rong zone`
- Cập nhật quy ước vào `docs/QUY-UOC-DOI-CHIEU.md` (dòng W26a và W26b).
