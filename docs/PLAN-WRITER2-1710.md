# Kế hoạch thực hiện: AGY-WRITER2 (17/10/2026)
# VN Writer: Ngăn lựa chọn đối tượng (Selection Pane), Nhóm/Bỏ nhóm (Group/Ungroup), Chia cửa sổ (Split Window), Thư viện kiểu bảng (Table Styles Gallery), Công thức bảng (=SUM(ABOVE/LEFT)) — Đạt chuẩn Word 2016 Parity

## 1. Mục tiêu (Objective)
Hoàn thiện 5 tính năng ưu tiên 1 (P1) còn thiếu trong `docs/WORD2016-FEATURE-CHECKLIST.md` để VN Writer đạt tương thích toàn diện với Microsoft Word 2016:
1. **Ngăn lựa chọn đối tượng (Selection Pane)**:
   - Panel quản lý danh sách toàn bộ hình khối, ảnh, hộp văn bản trên tài liệu (`#vno-writer-selection-pane`).
   - Điều khiển ẩn/hiện từng đối tượng (icon mắt 👁/🚫), Hiện tất cả / Ẩn tất cả.
   - Điều khiển thứ tự lớp z-order (Đưa lên trên, Đưa về sau, Đưa lên trước nhất, Đưa về sau cùng).
   - Đổi tên đối tượng trực tiếp khi nhấp đúp vào tên; chọn đối tượng đơn hoặc nhiều đối tượng với phím Ctrl/Shift.
2. **Nhóm và Bỏ nhóm đối tượng (Group / Ungroup)**:
   - Cho phép chọn nhiều hình vẽ / hộp văn bản và gộp thành một nhóm (`Group`, phím tắt `Ctrl+G`).
   - Tách nhóm đã chọn trở lại các hình vẽ độc lập (`Ungroup`, phím tắt `Ctrl+Shift+G`).
   - Hỗ trợ hoàn tác Undo / Redo cho thao tác nhóm và ngắt nhóm.
   - Xuất và lưu khứ hồi DOCX bảo toàn cấu trúc nhóm hình vẽ.
3. **Chia cửa sổ soạn thảo (Split Window)**:
   - Lệnh `writer.view.split` trên tab Chế độ xem (View) -> nhóm Cửa sổ (Window).
   - Chia khung soạn thảo tài liệu thành hai phần trên - dưới với thanh phân cách (`split-bar`).
   - Hai phần cuộn độc lập cho phép xem và đối chiếu các trang khác nhau của cùng một văn bản.
   - Nhấp đúp vào thanh chia hoặc bấm lại lệnh Chia để đóng phân chia cửa sổ.
4. **Thư viện kiểu bảng (Table Styles Gallery)**:
   - Gallery kiểu bảng phong phú với hơn 30 mẫu phối màu chuẩn văn phòng (Bảng thường, Bảng dạng lưới Grid, Bảng danh sách List; tông màu Nhẹ Light, Vừa Medium, Tối Dark kết hợp các tông màu Accent 1–6).
   - Hỗ trợ áp dụng đồng bộ các tùy chọn kiểu: Hàng tiêu đề (Header Row), Hàng sọc xen kẽ (Banded Rows), Cột đầu (First Column), Cột cuối (Last Column).
   - Xuất thẻ OOXML `w:tblStyle` và `w:tblLook` chuẩn ECMA-376 để Word 2016 đọc đúng kiểu dáng nguyên bản.
5. **Công thức tính toán trong bảng (=SUM(ABOVE/LEFT)...)**:
   - Hộp thoại Công thức (Formula) trên tab Bố cục Bảng -> nhóm Dữ liệu.
   - Tự động nhận diện ngữ cảnh ô: nếu phía trên có số thì gợi ý `=SUM(ABOVE)`, nếu bên trái có số thì gợi ý `=SUM(LEFT)`.
   - Hỗ trợ các hàm chuẩn: `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `PRODUCT`.
   - Định dạng hiển thị số linh hoạt (`#,##0`, `#,##0.00`, `0%`, `0.00%`).
   - Xuất trường công thức DOCX `w:fldSimple w:instr="=SUM(ABOVE) \# &quot;#,##0&quot;"` để Word COM đọc đúng `wdFieldFormula` và hiển thị kết quả chính xác.

## 2. Năng lực hiện tại (Current Capability)
- **Selection Pane & Group/Ungroup**: Đã được hiện thực thành công trên Sheet (`apps/sheet/sheet-grid.js`) và Slides (`apps/slides/slides-canvas.js`). Trên Writer đã có lớp quản lý hình khối `this.shapes` và `.vno-writer-shapes-layer`, nhưng chưa có controller gom Arrange riêng và chưa có UI Selection Pane; chưa có nhóm nhiều hình khối.
- **Split Window**: Đã có trên Sheet (`apps/sheet/sheet-grid.js:16850`). Trên Writer giao diện cuộn đơn; chưa có cơ chế chia khung cuộn 2 pane.
- **Table Styles**: Writer đã có tô màu ô và viền bảng cơ bản, tùy chọn hàng tiêu đề và hàng sọc, nhưng thiếu Thư viện kiểu bảng hoàn chỉnh và chưa gán `w:tblStyle` OOXML khi xuất tệp.
- **Table Formula**: Chưa có cơ chế đánh giá công thức ô bảng và chưa có hộp thoại Formula trong Writer.

## 3. Các tệp và mô-đun thay đổi (Files & Modules)
- `apps/writer/writer-arrange-controller.js` (mới): Quản lý Ngăn chọn đối tượng (Selection Pane), thứ tự z-order, ẩn/hiện, đổi tên và logic Nhóm/Bỏ nhóm (Group/Ungroup).
- `apps/writer/writer-split-view.js` (mới): Điều khiển chia cửa sổ soạn thảo 2 phân vùng cuộn độc lập kèm thanh kéo chia tỷ lệ.
- `apps/writer/writer-table-styles.js` (mới): Bộ thư viện 30+ kiểu dáng bảng biểu phong cách Word 2016 và popup gallery chọn kiểu.
- `apps/writer/writer-table-formula-dialog.js` (mới): Hộp thoại chèn công thức bảng (=SUM(ABOVE), =SUM(LEFT)...), tính toán giá trị và chèn trường động.
- `apps/writer/writer-ribbon.js`: Bổ sung các lệnh trên ribbon:
  - Tab Layout & Tab View: Selection Pane, Group, Ungroup.
  - Tab View: Split Window.
  - Tab Table Design: Table Styles Gallery.
  - Tab Table Layout: Table Formula.
- `adapters/libreoffice/writer/writer-adapter.js`: Tích hợp các controller mới, đăng ký handler command, hỗ trợ Undo/Redo cho Group/Ungroup, Table Style, Formula.
- `adapters/libreoffice/common/ooxml_zip_patch.py`:
  - Khứ hồi `w:tblStyle` và `w:tblLook` trong `w:tblPr`.
  - Khứ hồi `w:fldSimple` công thức bảng Word.
  - Bảo toàn thuộc tính nhóm hình vẽ `groupId` và thuộc tính hiển thị `visible`.
- `platform/commands/command-definitions.js`: Khai báo 6 lệnh Writer mới kèm biểu tượng, shortcut, tooltip.
- `platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`: Định nghĩa nhãn, tooltip và chuỗi giao diện tương ứng (đồng bộ 100%).
- `platform/help/entries-writer.js`: Bổ sung bài viết Hướng dẫn sử dụng chi tiết (tiếng Việt) cho từng tính năng mới, chỉ đúng tab/nhóm ribbon, tối thiểu 3 bước cụ thể, không placeholder.
- `tests/unit/writer-word2016-parity2.test.js` (mới): Bộ kiểm thử đơn vị bao phủ toàn bộ 5 tính năng mới.
- `tests/live/cdp/writer-word2016-parity2.desktop.mjs` (mới): Kiểm thử thao tác chuột / bàn phím thật trên giao diện Desktop qua giao thức CDP.
- `scripts/audit-0610/word_oracle_writer2.ps1` & `docs/word-oracle-writer2-1710.json`: Đo kiểm Word 2016 COM thật.
- `docs/AUDIT-WRITER2-1710.md` (mới): Báo cáo đối chiếu và nghiệm thu kết quả.

## 4. Phụ thuộc & Ranh giới (Dependencies & Layer Boundary)
- Tuân thủ nghiêm ngặt mô hình 4 tầng: UI -> Platform/CommandBus -> Adapter -> LibreOffice Core / OOXML filter.
- Ứng dụng chạy OFFLINE hoàn toàn, tự phục vụ trong tiến trình Python của `main.py`.
- Tuyệt đối không kill tiến trình theo tên, chỉ kill theo PID cụ thể.
- Mọi thao tác tương tác qua CDP / DOM event chuẩn, không dùng SendKeys hay cliclick hệ điều hành.

## 5. Kế hoạch kiểm thử (Test Plan)
1. Chạy đo kiểm Word 2016 COM: `powershell -ExecutionPolicy Bypass -File scripts/audit-0610/word_oracle_writer2.ps1` -> 5 phép đo đạt chuẩn.
2. Kiểm tra test suite: `node tests/run-tests.js` -> 100% PASS, 0 FAIL.
3. Kiểm tra i18n parity: `node scripts/audit-0610/i18n_parity.mjs` -> 0 missingVI, 0 missingEN.
4. Kiểm tra Help coverage: `node scripts/help-coverage.mjs` -> 100% lệnh có Help, 0 dead buttons.
5. Kiểm tra python test: `python -m unittest tests/test_writer_table_properties_export.py tests/test_writer_tabs_export.py`.
6. Kiểm tra CDP desktop: chạy test CDP click chuột thật và xác nhận kết quả.
