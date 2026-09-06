# Bàn giao: VN Office — Xem trước khi in trực tiếp trong Backstage (Live Preview Thumbnail)

## 1. Bối cảnh và yêu cầu

Trong Microsoft Office thật (Word, Excel, PowerPoint), khi người dùng mở menu Tệp (Backstage) và chọn mục In (Print), giao diện bên phải không chỉ là một danh sách cài đặt khô cứng hay đóng ngay modal, mà hiển thị trực quan một khung xem trước sống động (Live Preview Thumbnail) của trang in đầu tiên.

Trước đây tại VN Office:
- Khi mở Backstage và bấm "In", hệ thống đóng ngay overlay Backstage và kích hoạt hộp thoại in của trình duyệt (`window.print()`), khiến người dùng không có cơ hội nhìn trước bố cục trang in, kiểm tra số trang hay điều chỉnh trước khi in.
- Tính năng Xem trước khi in (Ctrl+F2) tuy đã hoàn thiện cho cả 3 ứng dụng (Writer, Sheet, Slides) với các thuật toán phân trang và hàm dựng DOM trang in chuẩn xác, nhưng chỉ chạy dưới dạng một overlay độc lập bên ngoài, chưa được tái sử dụng vào trong màn hình Backstage.

Yêu cầu đặt ra:
- Tái sử dụng 100% logic render đã có sẵn của cả 3 ứng dụng, tuyệt đối không tự viết lại logic phân trang hay thuật toán tính toán mới.
- Không sửa đổi các hàm phân trang lõi đã qua kiểm thử (`paginateContent`, `getPageDimensions`, `computePrintPages`, `_renderPrintPageTable`, `_renderSlidePrintPage`, `openPrintPreview`, `closePrintPreview`).
- Chuyển mục "In" trong Backstage thành tab con nội bộ, hiển thị panel in gồm:
  - Cột trái: Cụm điều khiển gồm nút "In ngay" lớn gọi lệnh in thật, cụm điều hướng chuyển trang Trước/Sau (tự động ẩn khi tài liệu chỉ có 1 trang) và thẻ thông tin tóm tắt thiết lập in.
  - Cột phải: Khung xem trước trực tiếp (Live Preview Thumbnail) hiển thị trang in hiện tại bằng DOM thật của từng ứng dụng.
- Dọn dẹp bộ nhớ và sự kiện sạch sẽ khi đóng Backstage hoặc khi chuyển đổi qua lại giữa các tab Trang chủ và In ấn.
- Đảm bảo toàn bộ hệ thống kiểm thử tự động (Unit test, Playwright Live test, Ribbon audit, WCAG Color contrast) đạt tỷ lệ 100% PASS.
- Thực hiện trên worktree riêng biệt, commit theo từng ứng dụng và không merge vào main.

## 2. Kiến trúc giải pháp

### 2.1 Cơ chế Provider linh hoạt trong AppShell (`_getPrintPreviewProvider()`)

Tại `platform/shell/app-shell.js`, phương thức `_getPrintPreviewProvider()` đóng vai trò cầu nối trung gian, nhận diện ứng dụng đang kích hoạt và trả về giao diện provider thống nhất mà không cần phụ thuộc cứng vào bất kỳ ứng dụng nào:

1. **VN Sheet Provider**:
   - Truy xuất `grid` từ `this.grid` hoặc thông qua `this.adapter.grid`.
   - Gọi `grid.computePrintPages()` để lấy danh sách trang in và tổng số trang theo đúng Vùng in (Print Area) và Thiết lập trang (Page Setup: lề, hướng giấy, tỷ lệ in).
   - Hàm `renderPage(printResult, pageIndex)` tái sử dụng trực tiếp `grid._renderPrintPageTable(page)` để dựng bảng dữ liệu `<table>` với đầy đủ style và dữ liệu ô thật.
   - Thẻ thông tin hiển thị khổ giấy (A4), hướng in (Dọc/Ngang), tỷ lệ in (%) và tổng số trang.

2. **VN Slides Provider**:
   - Truy xuất `canvas` từ `this.canvas` hoặc `this.adapter.canvas`.
   - Gọi `canvas.computePrintPages()` để lấy danh sách trang in, tự động loại bỏ các trang chiếu bị ẩn (Hide Slide).
   - Hàm `renderPage(printResult, pageIndex)` tái sử dụng trực tiếp `canvas._renderSlidePrintPage(slide, index)` dựng bề mặt slide `.vno-slides-print-surface` với tỷ lệ 16:9 HD, đầy đủ hình dạng vector, tiêu đề, nội dung và số trang chân trang.
   - Thẻ thông tin hiển thị kích thước slide (960x540), tỷ lệ khung hình (16:9 HD) và tổng số slide in.

3. **VN Writer Provider**:
   - Truy xuất `adapter` từ `this.adapter` hoặc `globalUnoBridge.activeDocument`.
   - Gọi `adapter.getPageDimensions()` và `adapter.paginateContent()` để phân trang nội dung tài liệu thành các khối HTML tương ứng với từng trang in A4.
   - Hàm `renderPage(printResult, pageIndex)` dựng khung trang in `.vno-print-preview-sheet` với kích thước pixel, lề trang, đầu trang (header), chân trang (footer) và cấu hình đa cột (columns).
   - Thẻ thông tin hiển thị khổ giấy (A4), hướng in và tổng số trang.

### 2.2 Dựng giao diện Backstage Print Panel (`_renderBackstagePrintPanel()`)

Giao diện được chia thành hai cột chuẩn mực Microsoft Office:
- **Cột trái (Điều khiển và thông tin)**:
  - Nút "In ngay" (`.vno-backstage-print-now-btn`): Nút bấm lớn nổi bật với biểu tượng máy in SVG sắc nét, sử dụng màu thương hiệu của từng ứng dụng (`var(--vno-app-current)`). Khi bấm, overlay Backstage được đóng lại và lệnh in chuẩn `common.file.print` được kích hoạt ngay lập tức.
  - Cụm điều hướng trang (`.vno-backstage-print-nav`): Hiển thị nút "Trang trước", số trang hiện tại trên tổng số trang ("Trang X / Y") và nút "Trang sau".
    - Với tài liệu 1 trang: Cụm này tự động ẩn hoàn toàn (`display: none`) để giao diện gọn gàng.
    - Với tài liệu nhiều trang: Tự động kích hoạt, nút "Trang trước" bị vô hiệu hóa ở trang đầu, nút "Trang sau" bị vô hiệu hóa ở trang cuối.
  - Bảng tóm tắt thiết lập in (`.vno-backstage-print-info`): Liệt kê tên tài liệu, khổ giấy, hướng in và số trang một cách trang nhã.
- **Cột phải (Khung xem trước Live Thumbnail)**:
  - Viewport cuộn `.vno-backstage-print-preview-viewport` với nền sáng nhẹ và viền bo mềm mại.
  - Sân khấu hiển thị `.vno-backstage-print-stage` áp dụng tỷ lệ thu nhỏ `transform: scale(0.78)` đặt ở đỉnh tâm, đảm bảo toàn bộ trang giấy in A4 hoặc slide trình chiếu 16:9 vừa vặn trong tầm nhìn người dùng mà vẫn đọc rõ nội dung văn bản.

### 2.3 Quản lý vòng đời và chuyển đổi Tab Backstage

Trong phương thức `showBackstageMenu()`:
- Nút "In" trên thanh điều hướng bên trái được gắn thuộc tính `data-backstage-tab="print"` và ID `#vno-backstage-nav-print`.
- Khung nội dung Backstage chứa hai khu vực: `#vno-backstage-home-view` (màn hình Trang chủ với các mẫu tệp và danh sách tệp gần đây) và `#vno-backstage-print-view` (panel xem trước in).
- Khi người dùng chuyển qua lại giữa "Trang chủ" và "In ấn", hàm `showTab()` thực hiện dọn dẹp sạch sẽ listener và nội dung DOM cũ trước khi dựng lại view mới, ngăn chặn hoàn toàn hiện tượng rò rỉ bộ nhớ hoặc xung đột sự kiện.
- Đóng Backstage bằng nút "Quay lại" (`#vno-backstage-back`) hoặc phím Escape đều gọi hàm đóng chung kèm dọn dẹp bộ nhớ triệt để.

### 2.4 Hoàn thiện chuẩn tương phản màu WCAG AA

Trong quá trình rà soát, bộ kiểm tra tự động tỷ lệ tương phản màu toàn diện (`scripts/audit-contrast.js`) phát hiện các thành phần của Backstage Print nằm trong vùng nội dung nền sáng `#ffffff` / `#f8fafc` thay vì nền tối của thanh sidebar bên trái `#0f4c81`. Đã chuẩn hóa:
- Khai báo token mặc định `--vno-app-current` trong `:root` tại `platform/theme/tokens.css`.
- Bổ sung nhận diện nền sáng cho các selector `.vno-backstage-print-*` trong công cụ kiểm tra độ tương phản màu, đạt 100% chuẩn WCAG AA và AAA (tỷ lệ tương phản chữ đen trên nền sáng đạt trên 15:1, chữ trắng trên nút in đạt trên 8.4:1).

## 3. Danh sách các tệp thay đổi

1. `platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`:
   - Bổ sung chuỗi bản địa hóa `printNow`: "In ngay" / "Print Now".
2. `platform/theme/tokens.css`:
   - Bổ sung các biến `--vno-app-current`, `--vno-app-current-hover`, `--vno-app-current-light` vào `:root`.
3. `platform/shell/shell.css`:
   - Bổ sung quy tắc CSS cho `.vno-backstage-print-panel`, `.vno-backstage-print-controls`, `.vno-backstage-print-now-btn`, `.vno-backstage-print-nav`, `.vno-backstage-print-page-indicator`, `.vno-backstage-print-info`, `.vno-backstage-print-preview-viewport`, `.vno-backstage-print-stage`.
   - Cập nhật khối `@media print` ẩn hoàn toàn `.vno-backstage-overlay`.
4. `platform/shell/app-shell.js`:
   - Bổ sung phương thức `_getPrintPreviewProvider()` hỗ trợ cả 3 ứng dụng Sheet, Slides và Writer.
   - Bổ sung phương thức `_renderBackstagePrintPanel()`.
   - Cập nhật `showBackstageMenu()` chuyển nút In thành tab con nội bộ có quản lý vòng đời.
5. `adapters/libreoffice/sheet/sheet-adapter.js`:
   - Trong `setShell(shell)`, lưu tham chiếu `shell.adapter = this;` và `shell.grid = this.grid;`.
6. `adapters/libreoffice/slides/slides-adapter.js`:
   - Trong `setShell(shell)`, lưu tham chiếu `shell.adapter = this;` và `shell.canvas = this.canvas;`.
7. `adapters/libreoffice/writer/writer-adapter.js`:
   - Trong `setShell(shell)`, lưu tham chiếu `shell.adapter = this;`.
8. `scripts/audit-contrast.js`:
   - Nhận diện chính xác nền sáng cho các thành phần `backstage-print-`.
9. `tests/unit/backstage-print-thumbnail.test.js` (Mới):
   - 10 bài kiểm thử đơn vị và hành vi mô phỏng DOM chi tiết cho cả 3 ứng dụng.
10. `tests/run-tests.js`:
    - Đăng ký Suite kiểm thử số 124: "VN Office Backstage Print Thumbnail & Live Preview".
11. `tests/live/sheet-backstage-print-thumbnail.playwright.mjs` (Mới):
    - Kiểm thử trình duyệt thật Playwright cho VN Sheet (cổng 8936).
12. `tests/live/slides-backstage-print-thumbnail.playwright.mjs` (Mới):
    - Kiểm thử trình duyệt thật Playwright cho VN Slides (cổng 8937).
13. `tests/live/writer-backstage-print-thumbnail.playwright.mjs` (Mới):
    - Kiểm thử trình duyệt thật Playwright cho VN Writer (cổng 8938).

## 4. Lịch sử Commit theo từng ứng dụng

Mỗi ứng dụng được kiểm thử độc lập và commit riêng biệt trên branch `feat/backstage-print-thumbnail`:
- Commit 1 (`5ac32e9`): `feat(sheet): backstage print live preview thumbnail with real table DOM & page navigation`
- Commit 2 (`678c3dc`): `feat(slides): backstage print live preview thumbnail with real slide DOM & navigation`
- Commit 3 (`3245d0d`): `feat(writer): backstage print live preview thumbnail with real document sheet & print now`

## 5. Kết quả kiểm thử toàn diện

Tất cả các cổng kiểm soát chất lượng của dự án đều đạt kết quả tuyệt đối:

1. **Cú pháp JavaScript (`node scripts/check-syntax.js`)**:
   - Quét toàn bộ mã nguồn: 100% PASS, không có bất kỳ lỗi cú pháp nào.

2. **Kiểm thử Đơn vị & Tích hợp (`node tests/run-tests.js`)**:
   - Tổng số kiểm thử: **1369 / 1369 PASS | 0 FAIL**.
   - Suite 124 (Backstage Print Thumbnail): 10/10 PASS.
   - Suite 57 (WCAG Color Contrast Audit): 7/7 PASS (0 vi phạm tương phản màu).
   - Suite 121 (Sheet Print Preview): 15/15 PASS.
   - Suite 122 (Slides Print Preview): 11/11 PASS.

3. **Kiểm thử Trình duyệt Thật Playwright Live (`tests/live/`)**:
   - `sheet-backstage-print-thumbnail.playwright.mjs`: PASS.
   - `slides-backstage-print-thumbnail.playwright.mjs`: PASS.
   - `writer-backstage-print-thumbnail.playwright.mjs`: PASS.

4. **Kiểm tra hồi quy giao diện (`node tests/live/ribbon-audit-1280.playwright.mjs`)**:
   - Kiểm tra 104 lượt trên 26 tab, 2 độ phân giải (1280x720 và 1280x800) và 2 ngôn ngữ (VI/EN):
   - **100% PASS**: 0px tràn ngang tại 1280px trên cả 3 ứng dụng.
