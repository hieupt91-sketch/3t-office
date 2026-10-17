# BÁO CÁO ĐỐI CHIẾU & HOÀN THIỆN TÍNH NĂNG WORD 2016 (ĐỢT 2) — VN WRITER

- **Thời gian thực hiện:** 17/10/2026
- **Phiếu việc:** `E:\VNOffice-briefs\AGY-WRITER1.md` (AGY-WRITER2)
- **Nhánh Git / Worktree:** `feat/writer-tabs-tables-agy` tại `E:\VNOffice-agy-writer1`
- **Bộ đối chiếu chuẩn:** Microsoft Word 2016 COM thật (`Word.Application`)

---

## 1. Năm tính năng P1 hoàn thiện theo chuẩn Word 2016

### 1.1. Selection Pane (Ngăn lựa chọn đối tượng)
- **Word 2016 COM Oracle:**
  - `Shapes.Item(i).Visible`: `-1` (MsoTrue / Hiện), `0` (MsoFalse / Ẩn).
  - Đổi tên: gán trực tiếp thuộc tính `Name`.
  - Thay đổi thứ tự lớp Z-Order: `ZOrder(msoBringToFront / msoSendToBack / msoBringForward / msoSendBackward)`.
- **Triển khai trong VN Writer:**
  - Controller: `apps/writer/writer-arrange-controller.js`.
  - DOM Ngăn chọn `#vno-writer-selection-pane`: danh sách các đối tượng vẽ (hình khối, khung chữ, ảnh), biểu tượng mắt ẩn/hiện, nút Hiện tất cả / Ẩn tất cả, nút nâng/hạ Z-Order.
  - Cho phép nhấp đúp đổi tên đối tượng trực tiếp inline trên danh sách và chọn đa đối tượng (Ctrl/Shift+Click).
  - Lệnh đăng ký: `writer.view.selectionPane` (nằm trên tab `Bố cục` nhóm `Sắp xếp` và tab `Chế độ xem` nhóm `Hiển thị`).

### 1.2. Group / Ungroup đối tượng (Nhóm & Rã nhóm)
- **Word 2016 COM Oracle:**
  - `Selection.ShapeRange.Group()`: Gom các hình thành đối tượng đơn có kiểu `msoGroup` (Type = 6), các phần tử con thành `CanvasItems`.
  - `Selection.ShapeRange.Ungroup()`: Rã nhóm trở lại các hình đơn lẻ.
- **Triển khai trong VN Writer:**
  - Controller: `apps/writer/writer-arrange-controller.js`.
  - `groupSelectedObjects()` tạo đối tượng kiểu `group`, gắn `groupId` cho các hình con và tính toán khung bao ngoài `(x, y, w, h)`.
  - `ungroupSelectedObjects()` giải phóng `groupId`, trả các hình con về danh sách độc lập.
  - Phím tắt Bỏ nhóm: `Ctrl+Shift+G`. (Phím `Ctrl+G` được bảo toàn nguyên vẹn cho lệnh Đi đến `writer.edit.goTo` theo chuẩn Word).
  - Lệnh đăng ký: `writer.arrange.group`, `writer.arrange.ungroup`.

### 1.3. Split Window (Chia đôi cửa sổ soạn thảo)
- **Word 2016 COM Oracle:**
  - `ActiveWindow.Panes.Count`: 1 -> 2 (khi bật Split) -> 1 (khi tắt).
  - `ActiveWindow.SplitVertical = 50`: Tỉ lệ chia cửa sổ 50%.
- **Triển khai trong VN Writer:**
  - Controller: `apps/writer/writer-split-view.js`.
  - Thanh phân cách ngang draggable `.vno-writer-split-bar`. Kéo chuột điều chỉnh tỉ lệ phân vùng trên/dưới.
  - Nhấp đúp vào thanh phân cách để đóng chia cửa sổ (khớp hành vi Word 2016).
  - Cuộn độc lập giữa 2 phân vùng giúp đối chiếu các đoạn tài liệu cách xa nhau.
  - Lệnh đăng ký: `writer.view.split` (tab `Chế độ xem`, nhóm `Cửa sổ`).

### 1.4. Table Styles Gallery (Thư viện 32 kiểu bảng)
- **Word 2016 COM Oracle:**
  - Bảng áp dụng kiểu chuẩn Word `Table Grid` (Lưới bảng), `ApplyStyleHeadingRows: true`, `ApplyStyleRowBands: true`.
  - Xuất OOXML: thẻ `<w:tblStyle w:val="TableGrid"/>` và `<w:tblLook w:val="04A0" w:firstRow="1" w:noHBand="0".../>`.
- **Triển khai trong VN Writer:**
  - Module: `apps/writer/writer-table-styles.js`.
  - Đầy đủ 32 kiểu dáng bảng chuẩn phân loại theo: Plain Tables (Bảng đơn giản), Grid Tables Light/Medium/Dark (Bảng lưới sáng/vừa/đậm), List Tables (Bảng danh sách).
  - Thư viện xem trước dạng popup thẻ màu trực quan khi bấm nút Kiểu bảng.
  - Khôi phục và ghi thuộc tính `w:tblStyle` và `w:tblLook` trong `adapters/libreoffice/common/ooxml_zip_patch.py`.
  - Lệnh đăng ký: `writer.table.stylesGallery` (tab ngữ cảnh `Thiết kế Bảng`, nhóm `Kiểu bảng`).

### 1.5. Table Formula Dialog & Engine (Công thức trong bảng)
- **Word 2016 COM Oracle:**
  - Ô cuối cột chứa `100` và `100`: Word gợi ý mặc định `=SUM(ABOVE)`, kết quả tính ra `200`.
  - Ô cuối hàng chứa `100` và `120`: Word gợi ý mặc định `=SUM(LEFT)`, kết quả tính ra `220`.
  - Lưu vào DOCX: thẻ `<w:fldSimple w:instr="=SUM(ABOVE) \# &quot;#,##0&quot;"/>`.
- **Triển khai trong VN Writer:**
  - Module: `apps/writer/writer-table-formula-dialog.js`.
  - Tự động phát hiện ngữ cảnh ô để gợi ý `=SUM(ABOVE)` hoặc `=SUM(LEFT)`.
  - Hỗ trợ các hàm chuẩn: `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `PRODUCT`.
  - Định dạng số: `#,#0`, `0.00`, `0%`...
  - Hộp thoại giao diện người dùng tiếng Việt chuẩn mực, hỗ trợ chọn hàm và định dạng số từ dropdown.
  - Xuất OOXML: tự động phục hồi và chuyển đổi sang trường công thức `<w:fldSimple>` trong `adapters/libreoffice/common/ooxml_zip_patch.py`.
  - Lệnh đăng ký: `writer.table.formula` (tab ngữ cảnh `Bố cục Bảng`, nhóm `Dữ liệu`).

---

## 2. Kết quả kiểm thử & Đối chiếu chất lượng

1. **Bộ kiểm thử tự động toàn diện:**
   - Lệnh: `node tests/run-tests.js`
   - Kết quả: **3656 / 3656 PASS | 0 FAIL (100% Green)** trên toàn bộ 273 test suites.
2. **Kiểm tra độ phủ bài Hướng dẫn sử dụng:**
   - Lệnh: `node scripts/help-coverage.mjs`
   - Kết quả: **100.0%** (214/214 lệnh Writer có handler và bài Help cụ thể, 0 nút chết).
3. **Kiểm tra song ngữ i18n:**
   - Lệnh: `node scripts/audit-0610/i18n_parity.mjs`
   - Kết quả: **VI=2782, EN=2782, missingVI=0, missingEN=0 (100% khớp)**.
4. **Kiểm tra xuất nhập OOXML Python:**
   - Lệnh: `python -m unittest tests/test_writer_table_formula_style_export.py`
   - Kết quả: **Ran 3 tests -> OK**.
5. **Cập nhật danh mục đối chiếu Word 2016:**
   - Script: `python scripts/audit-0610/gen_word_checklist.py`
   - Đã đánh dấu `V` (Đã đối chiếu Word 2016) cho cả 5 tính năng, nâng số lượng mục đã xác minh lên **138/273**.
