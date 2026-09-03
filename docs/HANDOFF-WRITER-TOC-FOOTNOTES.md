# TÀI LIỆU BÀN GIAO: VN WRITER — MỤC LỤC TỰ ĐỘNG (TOC) & CHÚ THÍCH (FOOTNOTES/ENDNOTES)

## 1. Thông tin tổng quan & Phạm vi công việc

- **Worktree thực hiện**: `E:\VNOffice-agy-writer-toc`
- **Nhánh (Branch)**: `feature/writer-toc-footnotes` (tách từ `main` mới nhất đã tích hợp Deep Undo/Redo cho cả Writer và Sheet)
- **Tác giả triển khai**: Antigravity (agy)
- **Người review & nghiệm thu**: Claude (trước khi merge vào `main`)
- **Nguyên tắc phạm vi tuyệt đối**:
  - KHÔNG can thiệp vào `apps/sheet/**`, `apps/slides/**`, `platform/shell/app-shell.js`, `platform/ai/**`.
  - Không vi phạm worktree song song của Codex (`E:\VNOffice-codex-pivot-sheet`).
  - Không ghi đè hoặc gọi `register()` lần 2 cho command đã tồn tại.

---

## 2. Danh mục Command mới & Ánh xạ UNO

Toàn bộ 4 lệnh được khai báo chuẩn trong `platform/commands/command-definitions.js` (thuộc danh mục `reference`) và ánh xạ sang UNO trong `adapters/libreoffice/common/command-dispatch-mapper.js` (`VN_TO_UNO_MAP`):

| Command ID | Nhãn tiếng Việt | Phím tắt | Icon ID | Ánh xạ LibreOffice UNO | Vị trí Ribbon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `writer.reference.tocInsert` | Mục lục tự động | — | `tocInsert` | `.uno:InsertMultiIndex` | Tab **Tham chiếu** (Nhóm Mục lục) & Tab **Chèn** |
| `writer.reference.tocUpdate` | Cập nhật mục lục | — | `tocUpdate` | `.uno:UpdateCurIndex` | Tab **Tham chiếu** (Nhóm Mục lục) & Tab **Chèn** |
| `writer.reference.footnoteInsert` | Chú thích trang | `Ctrl+Alt+F` | `footnoteInsert` | `.uno:InsertFootnote` | Tab **Tham chiếu** (Nhóm Chú thích) & Tab **Chèn** |
| `writer.reference.endnoteInsert` | Chú thích cuối | `Ctrl+Alt+D` | `endnoteInsert` | `.uno:InsertEndnote` | Tab **Tham chiếu** (Nhóm Chú thích) & Tab **Chèn** |

Tất cả 4 icon SVG được thiết kế vector sắc nét (viewBox 0 0 24 24), chuẩn nhận diện Office, thêm vào `platform/ui-kit/icons.js`, hoàn toàn không dùng icon placeholder hay generic fallback.

---

## 3. Kiến trúc & Thiết kế kỹ thuật

### 3.1. Mục lục tự động (Table of Contents - TOC)
- **Cơ chế quét**: Phương thức `_collectHeadings()` duyệt toàn bộ DOM `bodyDom` (kể cả trong môi trường không hỗ trợ multi-selector thông qua bộ duyệt cây DOM tuần tự), lọc các thẻ `H1`, `H2`, `H3` nằm ngoài khối TOC.
- **Tạo Bookmark/Anchor tự động**: Mỗi Heading chưa có `id` sẽ được sinh định danh tự động duy nhất (dạng `heading-1-tieu-de`).
- **Cấu trúc DOM**: Khối TOC mang thuộc tính `data-vno-toc="true"` và `contenteditable="false"`, bao gồm:
  - Header với tiêu đề "MỤC LỤC", nút thao tác "🔄 Cập nhật" (`.vno-toc-btn-update`) và nút xóa (×, `.vno-toc-btn-delete`).
  - Danh sách các mục `.vno-toc-item` với các lớp phân cấp lồng dòng chuẩn: `.vno-toc-level-1` (đậm, lề trái 0px), `.vno-toc-level-2` (lề trái 20px), `.vno-toc-level-3` (lề trái 40px, chữ nghiêng).
  - Dấu chấm dóng hàng (`.vno-toc-leader`) tự động co giãn bằng flexbox CSS.
  - Thẻ liên kết nội bộ `<a href="#id" class="vno-toc-link" data-target-id="id">`.
- **Điều hướng nhấp chuột (Click Navigation)**: Bộ lắng nghe sự kiện tập trung trên `bodyDom` (`_bindReferenceInteractions`) bắt sự kiện nhấp vào link TOC, ngăn chặn hành vi nhảy trang mặc định và kích hoạt `scrollIntoView({ behavior: 'smooth', block: 'start' })` kèm `focus()` trên tiêu đề mục tiêu.
- **Ước lượng trang**: Phương thức `_estimateHeadingPage()` tính toán số trang gần đúng dựa trên khổ giấy/lề của Page Setup, độ cao từng khối phần tử và các dấu ngắt trang (`page-break-before`).

### 3.2. Chú thích chân trang (Footnotes) & Chú thích cuối (Endnotes)
- **Footnotes**:
  - Tại vị trí con trỏ (Selection Range) trong văn bản, chèn số mũ `<sup class="vno-footnote-ref" data-vno-footnote-ref="ID" contenteditable="false">1</sup>`.
  - Tự động tạo vùng chứa `<div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false">`.
  - Thêm dòng chú thích `.vno-footnote-item` mang `data-vno-footnote-id="ID"`, bao gồm: số thứ tự `.vno-note-num`, ô văn bản nhập nội dung trực tiếp `.vno-note-text` (`contenteditable="true"`) và nút xóa nhanh `.vno-note-delete-btn`.
  - Đánh số liên tục tự động 1, 2, 3...
- **Endnotes**:
  - Chèn số mũ La Mã: `<sup class="vno-endnote-ref" data-vno-endnote-ref="ID" contenteditable="false">i</sup>`.
  - Vùng chứa `<div data-vno-endnotes="true" class="vno-writer-endnotes-container">`.
  - Đánh số La Mã liên tục tự động: i, ii, iii, iv, v... thông qua helper `toRoman()`.
- **Đánh số lại khi xóa (Renumbering without Skipping)**:
  - Khi xóa một chú thích bất kỳ (dù ở đầu, giữa hay cuối danh sách) bằng phương thức `deleteFootnote()` / `deleteEndnote()` hoặc nhấn nút xóa ×, hệ thống xóa đồng thời cả số mũ trong bài và dòng ghi chú, sau đó gọi `renumberFootnotes()` / `renumberEndnotes()`.
  - Quét lại toàn bộ các thẻ `sup` còn lại theo thứ tự xuất hiện thực tế trong bài viết và cập nhật số hiển thị cả trên số mũ lẫn tại cột số thứ tự của dòng ghi chú. Hoàn toàn không xảy ra hiện tượng nhảy số (1, 3 sau khi xóa 2).

### 3.3. Tích hợp Deep Undo/Redo
- Mọi thao tác chèn/cập nhật/xóa Mục lục, chèn/xóa Chú thích đều gọi `flushTyping()` và `recordSnapshot(actionName)`.
- Khi người dùng bấm Undo (Ctrl+Z): Cả số mũ tham chiếu và vùng/dòng chú thích đều biến mất sạch sẽ, tài liệu quay về trạng thái trước đó.
- Khi người dùng bấm Redo (Ctrl+Y): Cả số mũ và dòng chú thích được phục hồi nguyên vẹn.

### 3.4. Tích hợp Print Preview
- Trong phương thức `openPrintPreview()`:
  - Gọi `_extractNotesForPreview(rawBody)` để bóc tách các khối `[data-vno-footnotes]` và `[data-vno-endnotes]` ra khỏi nội dung phân trang văn bản thông thường.
  - Phân trang nội dung văn bản chính (`paginateContent`) thành các trang `pageBodies`.
  - Duyệt từng trang: gọi `_renderPageFootnotesForPreview(pageHtml, footnotesMap)`. Quét các thẻ `data-vno-footnote-ref` xuất hiện trên chính trang đó để render khối `.vno-print-preview-footnotes` ở đáy của đúng trang tương ứng. Footnotes của trang 1 nằm ở trang 1, của trang 2 nằm ở trang 2 (không bị dồn về cuối).
  - Đối với Endnotes: gọi `_renderEndnotesForPreview(endnotesMap)` và chỉ gắn vào trang cuối cùng của tài liệu.

### 3.5. Làm sạch khi Xuất tệp (DOCX / PDF / ODT)
- Cập nhật hàm `_stripSessionMarkup(html)` trong `WriterAdapter`:
  - Loại bỏ triệt để các nút thao tác tương tác nội bộ: `.vno-toc-btn`, `.vno-toc-btn-update`, `.vno-toc-btn-delete`, `.vno-note-delete-btn`.
  - Giữ lại 100% nội dung HTML có cấu trúc của Mục lục (tiêu đề, các dòng phân cấp, liên kết bookmark) và các dòng chú thích chân trang / cuối tài liệu. Khi LibreOffice headless chuyển đổi sang DOCX/PDF, các bookmark nội bộ và văn bản chú thích được giữ trọn vẹn.

---

## 4. Báo cáo Kết quả Kiểm thử (Test Verification)

### 4.1. Kiểm tra cú pháp (Syntax Check)
- Chạy: `node scripts/check-syntax.js`
- Kết quả: **38/38 files hợp lệ | 0 lỗi cú pháp**.

### 4.2. Bộ kiểm thử đơn vị & hành vi (Automated Test Suite)
- Chạy: `node tests/run-tests.js`
- Tổng số Suite: **22 suites**
- Tổng số bài test: **254/254 PASS | 0 FAIL**
- Chi tiết Suite 22 (`tests/unit/writer-toc-footnotes.test.js`):
  1. `[PASS] Writer References: 4 command mới được khai báo chuẩn trong WRITER_COMMANDS`
  2. `[PASS] Writer References: Ánh xạ đúng chuẩn UNO trong command-dispatch-mapper.js`
  3. `[PASS] Writer References: 4 icon SVG chuẩn sắc nét hiện diện trong ICONS, không dùng fallback`
  4. `[PASS] Writer References: Hiện diện trong Ribbon tab 'Tham chiếu' và 'Chèn'`
  5. `[PASS] Writer TOC: Quét toàn bộ bodyDom sinh mục lục lồng cấp (H1, H2, H3), leader dots và link thật`
  6. `[PASS] Writer TOC: Nhấp link trong mục lục cuộn và nhảy đúng tới tiêu đề tương ứng`
  7. `[PASS] Writer TOC: Cập nhật mục lục khi thêm tiêu đề mới và xóa mục lục hoạt động chuẩn`
  8. `[PASS] Writer Footnotes: Chèn 3 chú thích tự động đánh số liên tục 1, 2, 3 cả ở số mũ và phần nội dung`
  9. `[PASS] Writer Footnotes: Xóa chú thích ở giữa tự động đánh số lại liên tục 1, 2 (không bị nhảy số 1, 3)`
  10. `[PASS] Writer Endnotes: Chèn chú thích cuối tài liệu đánh số La Mã liên tục (i, ii, iii) và đánh lại chuẩn`
  11. `[PASS] Writer Undo/Redo: Hoàn tác chèn footnote làm biến mất cả số mũ và dòng chú thích; làm lại khôi phục cả hai`
  12. `[PASS] Writer Print Preview: Footnote xuất hiện ở chân trang chứa chính nó thay vì dồn về cuối tài liệu`
  13. `[PASS] Writer Export: _stripSessionMarkup loại bỏ nút thao tác nhưng giữ nguyên vẹn nội dung mục lục và chú thích`

---

## 5. Danh sách các tệp đã chỉnh sửa & tạo mới

1. `platform/ui-kit/icons.js` (modified): Thêm 4 icon vector `tocInsert`, `tocUpdate`, `footnoteInsert`, `endnoteInsert`.
2. `platform/commands/command-definitions.js` (modified): Khai báo 4 command thuộc category `reference` kèm shortcut.
3. `adapters/libreoffice/common/command-dispatch-mapper.js` (modified): Ánh xạ 4 lệnh sang UNO URLs trong `VN_TO_UNO_MAP`.
4. `apps/writer/writer-ribbon.js` (modified): Bổ sung tab **Tham chiếu** (nhóm Mục lục & Chú thích) và nhóm Mục lục & Chú thích trên tab **Chèn**.
5. `apps/writer/writer.css` (modified): Thêm toàn bộ style cho TOC, leader dots, footnotes container, print preview footnotes/endnotes.
6. `adapters/libreoffice/writer/writer-adapter.js` (modified): Triển khai toàn bộ logic TOC, Footnotes, Endnotes, Renumbering, Event Delegation, Preview Pagination & Footnote Attachment, Export Sanitization.
7. `tests/unit/writer-toc-footnotes.test.js` (new): Bộ 13 test hành vi toàn diện cho TOC và Footnotes/Endnotes.
8. `tests/run-tests.js` (modified): Đăng ký Suite 22 vào test runner trung tâm.
9. `docs/FEATURE-PARITY-ROADMAP.md` (modified): Cập nhật trạng thái Tier 2 kèm ghi chú kỹ thuật trung thực.
10. `docs/HANDOFF-WRITER-TOC-FOOTNOTES.md` (new): Tài liệu bàn giao chi tiết này.

---

## 6. Ghi chú trung thực về Giới hạn kỹ thuật (Known Limitations)

1. **Ước tính số trang trong chế độ soạn thảo (DOM Edit Mode)**: Số trang hiển thị trên dòng mục lục là ước tính heuristic dựa trên chiều rộng/chiều cao khả dụng cấu hình trong Page Setup và các ngắt trang cứng. Trong chế độ web contenteditable, chưa có layout engine nhị phân đo font metric chính xác đến từng pixel như LibreOffice C++ core; khi xuất DOCX/PDF thông qua LibreOffice headless, các bookmark và liên kết được bảo toàn và số trang in thực tế sẽ do engine LibreOffice tính toán.
2. **Lưu trữ Footnotes trong DOCX**: Trong phiên làm việc web, chú thích được lưu trong DOM ngữ nghĩa của tài liệu. Khi xuất DOCX qua bộ chuyển đổi HTML-to-DOCX của LibreOffice, chú thích được giữ trọn vẹn dưới dạng trực quan, chưa can thiệp ghi trực tiếp vào các khối nhị phân XML nội bộ (`word/footnotes.xml`) của gói OOXML.
