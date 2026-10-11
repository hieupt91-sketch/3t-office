# Báo cáo Bàn giao W23 — Header/Footer Fidelity & Vùng Thân Trang (Lớp `page`)

- **Nhiệm vụ**: `docs/TASK-BRIEF-WRITER-W23-HEADER-FOOTER.md`
- **Nhánh**: `fix/writer-w23-header-footer` (tách từ `main 64665ae` của VN Office)
- **Worktree**: `E:\VNOffice-agy-writer-w23`
- **Thực hiện**: agy (gemini-3.8-flash)
- **Mục tiêu**:
  - **W23a**: Đoạn trong header/footer chuẩn hoá như thân (bỏ spacer nhân tạo của LibreOffice HTML, áp pipeline line-height `--vno-lh`/`--vno-font-ratio` W1, strut W8/W12d) để chiều cao header/footer canvas khớp Word (Word ±2px).
  - **W23b**: Vùng thân trang theo đúng quy tắc Word khi header/footer cao hơn lề (`bodyTop = max(topMargin, headerDist + headerH)`, `bodyEnd = min(pageH - bottomMargin, pageH - footerDist - footerH)`). Áp dụng đồng nhất cho mọi trang qua `_getUsablePageHeight`, `_recomputeLivePagination`, `.vno-page-auto-gap`, và Print Preview (`paginateContent`).

---

## 1. Tóm tắt Thay đổi Kỹ thuật

### W23a — Đoạn trong header/footer đo như thân
1. **Loại bỏ spacer nhân tạo do StarWriter chèn**:
   - `adapters/libreoffice/writer/writer-adapter.js`: trong `_normalizeImportedHeaderFooterHtml(html, zone, ooxmlDocumentXml)`:
     - Header: StarWriter HTML tự động chèn `margin-bottom: X.XXcm` vào đoạn cuối cùng của header để đẩy thân trang trong StarWriter. Khi nhập vào VN Writer (header là `position: absolute`), margin này làm phình `offsetHeight` của header canvas gấp đôi Word. Adapter bóc bỏ thuộc tính `margin-bottom` này trên đoạn cuối cùng.
     - Footer: StarWriter HTML chèn `margin-top: X.XXcm` vào đoạn đầu tiên của footer. Adapter bóc bỏ thuộc tính `margin-top` này trên đoạn đầu tiên của footer.
2. **Áp dụng pipeline chuẩn hoá đoạn thân cho header/footer**:
   - Chạy `_collapseFloatOnlyParagraphBreaks(html)` (quy ước W4).
   - Chạy `_encodeProportionalLineHeights(html, ooxmlDocumentXml)` (`--vno-lh` quy ước W1).
   - Tính toán `--vno-font-ratio` cho từng text run trong header và footer.
3. **Chuẩn hoá font metrics strut (W8/W12d) trên cả headerDom và footerDom**:
   - Trong `open()`: gọi `this._normalizeImportedFontMetrics(this.headerDom)` và `this._normalizeImportedFontMetrics(this.footerDom)`.
4. **CSS header/footer (`apps/writer/writer.css`)**:
   - Đặt `min-height: 0; padding-bottom: 0; padding-top: 0; font-size: var(--vno-doc-font-size, 10pt);` cho `.vno-writer-header` và `.vno-writer-footer`. Khi rỗng (`:empty`) mới áp `min-height: 26px;`.
   - Thêm quy tắc `.vno-writer-header p, .vno-writer-footer p { margin: 0; text-align: left; }` để ngăn các đoạn trong header/footer kế thừa `margin: 0 0 6pt 0; text-align: justify;` của `.vno-writer-page p`.

### W23b — Vùng thân trang theo quy tắc Word
1. **Nguồn duy nhất tính chiều cao thân trang (`_getUsablePageHeight`)**:
   - Word rule:
     - Đỉnh thân trang: `bodyTop = Math.max(topMarginPx, headerDistancePx + headerHeightPx)`
     - Đáy thân trang: `bodyBottomLimit = Math.min(pageHeightPx - bottomMarginPx, pageHeightPx - footerDistancePx - footerHeightPx)`
     - Phần dư header: `headerExtraPx = Math.max(0, headerDistancePx + headerHeightPx - topMarginPx)`
     - Phần dư footer: `footerExtraPx = Math.max(0, footerDistancePx + footerHeightPx - bottomMarginPx)`
     - Chiều cao thân khả dụng: `availableHeightPx = Math.max(150, dim.printableHeightPx - headerExtraPx - footerExtraPx)`
2. **Bộ phân trang trực tiếp (`_recomputeLivePagination`)**:
   - Cập nhật `this.bodyDom.style.marginTop = headerExtraPx > 0 ? `${headerExtraPx}px` : "0"` để đẩy thân trang trên canvas trang 1.
   - Cập nhật `this.bodyDom.style.marginBottom = footerExtraPx > 0 ? `${footerExtraPx}px` : "0"` để bảo vệ khoảng cách chân trang.
   - Sử dụng `availableHeightPx` đã trừ cả `headerExtraPx` và `footerExtraPx` cho toàn bộ các trang (cả trang 2+) khi chèn `.vno-page-auto-gap`.
3. **Đồng nhất Print Preview và ước tính trang mục lục (`_estimateHeadingPage`)**:
   - `paginateContent` nhận `availableHeightPx` từ `_getUsablePageHeight`.
   - `_estimateHeadingPage` gọi `_getUsablePageHeight(dim)` thay vì trừ cứng 46px/48px.

---

## 2. Số đo Kiểm chứng trên các Tài liệu Mục tiêu

| Tài liệu | Word (pt) | Baseline Canvas (trước W23) | Sau W23a & W23b | Đánh giá |
|---|---|---|---|---|
| **d07.docx** | Header: 51pt = 68.0px<br>bodyTop = 72pt = 96px | headerH: **150.5px**<br>bodyTop: **152px**<br>page lỗi: **136** | headerH: **68px** (lệch 0.0px!)<br>bodyTop: **96px**<br>page lỗi: **30** (giảm 106 đoạn!) | Header nằm gọn trong lề trên, canvas 23/23 trang |
| **d09.docx** | Header: 60pt = 80.0px<br>headerDist = 36pt = 48px<br>bodyTop = 96pt = 128px | headerH: **126px**<br>bodyTop: **175px**<br>page lỗi: 37 | headerH: **81px** (lệch 1.0px!)<br>bodyTop: **129px** (lệch 1.0px!)<br>page lỗi: 39 | Canvas 14/14 trang, đẩy bodyTop khớp Word |
| **d13.docx** | Header: 10.8pt = 14.4px<br>Footer: 10.8pt = 14.4px<br>bodyTop = 46.5pt = 62px | Chưa đo | headerH: **13px** (lệch 1.4px)<br>footerH: **13px** (lệch 1.4px)<br>bodyTop: **62px**<br>page lỗi: **25** (giảm từ 30) | Header/footer nằm gọn trong lề, canvas 10/10 trang |
| **d15.docx** | Header: rỗng (42.5px)<br>Footer: 74pt = 98.5px<br>footerDist: 2.85pt = 3.8px<br>footerTop = 765pt | headerH: 95.9px<br>footerH: **158px**<br>bodyTop: 76.6px<br>page lỗi: 15 | headerH: 44px<br>footerH: **124px** (sau đo lại)<br>bodyTop: 76px<br>'II. SẢN PHẨM VÀ GIÁ' sang đúng **trang 3** (Word p3, trước W23b nằm ở p2) | footerExtra cắt đáy thân, phân trang khớp Word |

---

## 3. Các bài Kiểm tra và Cổng Chất lượng (Quality Gates)

1. **Kiểm tra cú pháp**:
   - `node scripts/check-syntax.js`: **92/92 files hợp lệ, 0 lỗi cú pháp**.
2. **Kiểm tra đơn vị Node**:
   - `node tests/run-tests.js`: **1800/1800 PASS, 0 FAIL** (bổ sung suite test cho W23a và W23b trong `tests/unit/writer-headerfooter-import.test.js`).
3. **Kiểm tra Python Writer**:
   - `python -m unittest discover -s tests -p "test_writer*.py"`: **66/66 PASS** (185s).
4. **Quy ước và Commit Git**:
   - Cập nhật quy ước W23a và W23b vào `docs/QUY-UOC-DOI-CHIEU.md`.
   - 2 commit riêng biệt với thông điệp tiếng Việt không dấu:
     - `a2099db`: `fix(writer): W23a doan trong header footer do nhu than`
     - `bb6cd6b`: `fix(writer): W23b vung than trang theo quy tac Word`

---

## 4. Kiểm chứng độc lập (Claude, 21/9, profile riêng, cùng cache Word, bộ đo tách `<li>`)

Sửa thêm khi gộp: (1) bỏ `text-align: left` ép lên đoạn header/footer (đè căn giữa của tài liệu); (2) **W23c**: cỡ chữ
vùng header/footer lấy từ style `Header`/`Footer` trong styles.xml (chuỗi basedOn → docDefaults) qua
`--vno-header-font-size`/`--vno-footer-font-size` — d15 footer 124px → 111px (Word 98,5px; phần còn lại là đoạn rỗng
có `pPr/rPr/sz=20` trong footer1.xml mà adapter chưa nhận — lớp W26 đoạn rỗng theo cỡ dấu đoạn).

| File | Wp/Cp | page trước (W10b) → sau W23a+b+c | ghi chú |
|---|---|---|---|
| d07 | 23/23 | 136 → 30 | headerH 150 → 68px (Word 68), bodyTop 152 → 96px; drift:table 3 → 0 |
| d13 | 10/10 | 30 → 25 | |
| d15 | 10/10 | 15 → 14 (W23a+b không có W23c: **61**, canvas 11 trang) | footerH 158 → 111px |
| d09 | 14/14 | 37 → 39 | headerH 126 → 81px (Word 80), bodyTop 175 → 129 (Word 128) |
| 24 file | | **page 552 → 442**; wrap 32, line-height 31, spacing 38, font-size 36 không đổi; drift:unknown 58 → 60; drift:table 7 → 4 | |
