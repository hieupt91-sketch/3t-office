# Kế hoạch thực hiện: AGY-WRITER1 (17/10/2026)
# VN Writer: Hộp thoại Tabs + Đặt tab trên thước, Đi đến (Ctrl+G), Tách bảng, Xoay chữ trong ô, Thuộc tính bảng — khớp Word 2016

## 1. Mục tiêu (Objective)
Bổ sung và hoàn thiện 5 nhóm tính năng quan trọng trong VN Writer khớp chuẩn Microsoft Word 2016:
1. **Hộp thoại Tabs (Tabs Dialog)** & **Đặt tab trên thước ngang**: Cấu hình điểm dừng tab (trái, giữa, phải, thập phân, thanh; ký tự dẫn không/chấm/gạch/gạch dưới; đặt/xóa/xóa tất cả; điểm dừng mặc định); đặt tab bằng nhấp chuột trên thước ngang, kéo đổi vị trí, kéo ra ngoài để xóa; lưu DOCX chuẩn `w:tabs` (`w:val`, `w:leader`, `w:pos`).
2. **Hộp thoại Đi đến (Go To / Ctrl+G)**: Chuyển nhanh con trỏ và cuộn tới Trang, Dòng, Đề mục, Dấu trang (Bookmark), Chú thích cuối trang (Footnote/Endnote), Bảng; hỗ trợ nút Tiếp / Trước (Next / Previous).
3. **Tách bảng (Split Table)**: Lệnh tách bảng hiện tại thành hai bảng riêng biệt tại hàng có con trỏ, chèn đoạn văn giữa hai bảng, hỗ trợ hoàn tác Undo 1 bước, xuất 2 thẻ `w:tbl` trong DOCX.
4. **Hướng chữ trong ô (Text Direction)**: Xoay hướng chữ ô bảng theo chu trình: Ngang (horizontal / lrTb) -> Xoay 90° (top-to-bottom / tbRl) -> Xoay 270° (bottom-to-top / btLr); lưu DOCX thẻ `w:textDirection`; Word COM đọc `Cell.Range.Orientation`.
5. **Hộp thoại Thuộc tính bảng (Table Properties)**: Cấu hình gộp căn lề bảng (trái/giữa/phải), thụt lề trái bảng, độ rộng ưu tiên bảng/cột, chiều cao hàng, lề ô (Cell Margins: trên/dưới/trái/phải) và khoảng cách ô (spacing); lưu DOCX `w:tblCellMar`, `w:jc`, `w:tblInd`; Word COM đọc padding/spacing.

## 2. Năng lực hiện tại (Current Capability)
- **Tabs**: Có `apps/writer/tab-stops.js` hỗ trợ lưu `data-vno-tabs` (cm:căn:ký tự dẫn) và hàm dựng popup `showTabStopsDialog`, nhưng chưa có căn Thập phân (`dec`), Thanh (`bar`), chưa có trường Điểm dừng mặc định (Default tab stops); trên thước ngang (`apps/writer/writer-ruler-controller.js`) chưa vẽ marker tab stop, chưa có tương tác nhấp thước để tạo tab, chưa có kéo đổi vị trí hay kéo ra ngoài để xóa. Bộ lọc OOXML `_writer_tabs_xml` trong `adapters/libreoffice/common/ooxml_zip_patch.py` chỉ ánh xạ `l, c, r`, chưa hỗ trợ `dec, bar`.
- **Đi đến**: Sheet đã có `sheet.edit.goTo` (Ctrl+G). Writer chưa có lệnh và hộp thoại `writer.edit.goTo`, chưa có chuyển con trỏ theo trang, dòng, bookmark, đề mục, bảng, chú thích.
- **Tách bảng**: Writer đã có các lệnh chèn/xóa hàng cột, gộp/tách ô (`writer.table.splitCells`), nhưng chưa có `writer.table.splitTable` để chia một bảng thành hai bảng độc lập.
- **Hướng chữ trong ô**: Đã có `apps/writer/writer-table.js` và các hàm căn lề ô dọc, nhưng chưa có lệnh `writer.table.textDirection` để đổi chiều văn bản ô sang 90° / 270° và chưa xuất `w:textDirection` trong OOXML adapter.
- **Thuộc tính bảng**: Hiện cấu hình rải rác trên ribbon; chưa có hộp thoại `Table Properties` gộp gồm căn bảng, thụt lề bảng, chiều cao hàng, lề ô bảng (`tblCellMar`) và khoảng cách ô (`tblCellSpacing`).

## 3. Các tệp và mô-đun thay đổi (Files & Modules)
- `apps/writer/tab-stops.js`: Bổ sung loại căn thập phân (`dec`), thanh (`bar`); điểm dừng mặc định; xuất/nhập đầy đủ thuộc tính; hỗ trợ tương tác và hiển thị.
- `apps/writer/writer-ruler-controller.js`: Render marker các tab stops trên thanh thước; lắng nghe click trên thước để tạo tab stop mới; kéo thả di chuyển tab stop; kéo ra ngoài thanh thước để xóa tab stop; đồng bộ với đoạn văn hiện hành.
- `apps/writer/writer-goto-dialog.js` (mới): Tạo hộp thoại Đi đến (Ctrl+G) hỗ trợ Trang, Dòng, Đề mục, Dấu trang, Chú thích cuối trang, Bảng với nút Đi đến, Tiếp, Trước.
- `apps/writer/writer-table-properties-dialog.js` (mới): Tạo hộp thoại Thuộc tính bảng gộp (Căn lề, Thụt lề, Độ rộng, Chiều cao hàng, Lề ô trên/dưới/trái/phải, Khoảng cách ô).
- `apps/writer/writer-table.js`: Bổ sung phương thức tương tác và lệnh `splitTable`, `setTextDirection`.
- `adapters/libreoffice/writer/writer-adapter.js`:
  - Đăng ký và xử lý lệnh `writer.edit.goTo`, `writer.table.splitTable`, `writer.table.textDirection`, `writer.table.properties`.
  - Hoàn tác Undo/Redo cho các lệnh bảng: `splitTable`, `textDirection`, `properties`.
- `adapters/libreoffice/common/ooxml_zip_patch.py`:
  - Cập nhật `_TAB_ALIGN_OOXML` hỗ trợ `dec` -> `decimal`, `bar` -> `bar`.
  - Hỗ trợ trích xuất và bảo toàn `w:textDirection` (btLr, tbRl) cho ô bảng từ HTML/DOM (`data-vno-text-direction` hoặc CSS `writing-mode`).
  - Hỗ trợ ghi `w:tblCellMar`, `w:jc`, `w:tblInd`, `w:tblCellSpacing` từ bảng vào `w:tblPr`.
- `platform/commands/command-definitions.js`: Khai báo các lệnh mới kèm phím tắt, danh mục, icon, tooltip.
- `platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`: Định nghĩa nhãn, tooltip, chuỗi hộp thoại tiếng Việt và tiếng Anh đồng bộ 100%.
- `platform/help/entries-writer.js`: Bổ sung bài viết Hướng dẫn sử dụng chi tiết (tiếng Việt) cho từng tính năng mới, chỉ đúng tab/nhóm ribbon, ít nhất 3 bước thực hiện cụ thể, không placeholder.
- `tests/unit/help-coverage.test.js`: Cập nhật số đếm lệnh được bảo vệ và khớp 100%.
- `tests/unit/writer-tabs-tables-agy.test.js` (mới): Bộ kiểm thử tự động toàn diện cho cả 5 tính năng (Tabs, GoTo, SplitTable, TextDirection, TableProperties).
- `tests/live/cdp/writer-undo-matrix-full.desktop.mjs`: Bổ sung các lệnh mới vào danh sách kiểm thử hoàn tác.
- `docs/AUDIT-WRITER1-1710.md`: Báo cáo đối chiếu Word 2016 chi tiết.

## 4. Phụ thuộc & Ranh giới (Dependencies & Layer Boundary)
- Tôn trọng triệt để kiến trúc phân lớp: UI (`apps/writer`) -> Platform / CommandBus -> Adapter (`adapters/libreoffice/writer`) -> Core/OOXML filter.
- Giao diện người dùng thuần DOM / CSS / JS, không gọi trực tiếp API LibreOffice / Core.
- Không thêm thư viện ngoài (zero external dependency). Chạy hoàn toàn offline trong tiến trình Python desktop app.

## 5. Rủi ro & Giải pháp phòng ngừa (Risks & Mitigation)
- **Rủi ro 1: Lệch thước khi zoom/cuộn**: `WriterRulerController` đã có sẵn cơ chế tính tọa độ mm <-> pixel qua `mmToScreenPx` và `screenPxToMm`. Tab markers sẽ gắn theo tọa độ mm tương ứng với lề trái đoạn văn, đảm bảo luôn khớp chính xác khi thay đổi lề hoặc thụt lề.
- **Rủi ro 2: Khứ hồi DOCX mất thuộc tính bảng/ô**: Xử lý trực tiếp trong lớp OOXML zip patch sau khi StarWriter xuất HTML->DOCX, chèn đúng cấu trúc XML OOXML chuẩn ECMA-376 để Word 2016 đọc nguyên vẹn.
- **Rủi ro 3: Xung đột phím tắt Ctrl+G**: Ctrl+G trong Writer trước đây chưa dùng; nay gán cho `writer.edit.goTo` (khớp Word 2016), không ảnh hưởng đến Sheet hay Slides.

## 6. Kế hoạch kiểm thử (Test Plan)
1. **Kiểm thử đơn vị (Unit Tests)**:
   - Viết bài test mới kiểm tra các hàm parse/serialize tab stops, chuyển đổi twips, thuật toán tách bảng DOM, logic xoay hướng chữ, logic thuộc tính lề ô.
   - Chạy `npm test` đảm bảo 100% test bộ suite pass (nền >= 3563).
2. **Kiểm thử tương thích i18n & Help**:
   - Chạy `node scripts/audit-0610/i18n_parity.mjs` đạt 0 missingVI, 0 missingEN.
   - Chạy test help coverage đạt 100% lệnh có Help hợp lệ, không chứa tên thương mại cấm.
3. **Kiểm thử giao diện Desktop qua CDP & Hoàn tác**:
   - Chạy ma trận Hoàn tác `writer-undo-matrix-full.desktop.mjs` đạt 0 FAIL.
   - Chạy `scripts/audit-0610/doc_admin_30.mjs` đạt >= 29 PASS.
4. **Kiểm thử khứ hồi DOCX với Word COM thật**:
   - Đo thuộc tính ParagraphFormat.TabStops, Table.Rows, Cell.Range.Orientation, Table.TopPadding... bằng PowerShell Word COM chỉ-đọc.
   - Chạy `scripts/layout-audit/batch_document_audit.py docx`.

## 7. Kế hoạch hoàn tác / Khôi phục (Rollback)
- Mọi thay đổi thực hiện trên nhánh Git `feat/writer-tabs-tables-agy`.
- Có thể rollback từng commit hoặc hoàn nguyên nhánh mà không ảnh hưởng tới nhánh chính `main`.
