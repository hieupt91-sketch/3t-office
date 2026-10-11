# Báo cáo Hoàn thiện Giao diện VN Writer (3T Doc)

**Mã báo cáo**: `UI-WRITER-POLISH-0610`  
**Nhánh Git**: `design/writer-ui-polish-agy`  
**Ngày thực hiện**: 06/10/2026  
**Mục tiêu**: Làm đẹp, chuẩn hóa và hoàn thiện UI của ứng dụng VN Writer (3T Doc) cho nhân viên văn phòng sử dụng thân thuộc như Word nhưng mang hình thức nhận diện riêng của 3T (không dùng icon, logo, màu sắc nhận diện đặc trưng của Microsoft, không chép từng điểm ảnh).

---

## 1. Phương pháp & Quy trình Kiểm tra
1. **Chụp ảnh màn hình thực tế qua CDP (`tests/live/cdp/session.mjs`, `Page.captureScreenshot`)**:
   - Độ phân giải: `1366x768` và `1920x1080`.
   - Tỷ lệ hiển thị (scaling): `100%` và `125%`.
   - Tương tác thuần CDP qua `Input.dispatchMouseEvent` và `Input.dispatchKeyEvent` (tuyệt đối không dùng SendKeys, không kill tiến trình theo tên, không gọi `pywebview.evaluate_js`).
2. **Rà soát 5 khu vực giao diện trọng tâm**:
   - **(1) Ribbon 8 tab**: Trang đầu (Home), Chèn (Insert), Thiết kế (Design), Bố cục (Layout), Tham chiếu (References), Trộn thư (Mailings), Đánh giá (Review), Chế độ xem (View). Kiểm tra căn hàng, khoảng cách, nhóm, nút tràn/chồng, nhãn bị cắt, biểu tượng mơ hồ, trạng thái hover, active, disabled, focus và tooltip.
   - **(2) Hộp thoại 9 chức năng**: Đoạn văn, Thiết lập trang, Chèn bảng, Tìm và thay, Cột, Hình mờ, Viền trang, Mục lục, Trộn thư. Kiểm tra bố cục, nút chính/phụ, phím Enter/Esc/Tab trapFocus, lỗi nhập sai bằng tiếng Việt, trạng thái rỗng.
   - **(3) Khung soạn thảo, Thước kẻ, Thanh trạng thái, Thanh trượt, Độ rộng trang**.
   - **(4) Khả năng truy cập bằng bàn phím**: Mọi nút ribbon có thể tới được bằng phím Tab/Alt, vòng focus rõ ràng (`outline: 2px solid var(--vno-border-focus)`).
   - **(5) Chữ giao diện 100% tiếng Việt chuẩn văn phòng**.

---

## 2. Thư mục Ảnh màn hình Chụp thực tế (`docs/screens-writer-ui-0610/`)

Toàn bộ ảnh chụp đều dưới 300KB và không chứa tài liệu thực tế của người dùng:

| Tên File Ảnh | Kích thước | Mô tả Chi tiết |
| :--- | :---: | :--- |
| `writer-1366x768-100.jpg` | 70 KB | Giao diện tổng thể Writer ở 1366x768 @ 100% |
| `writer-1366x768-125.jpg` | 74 KB | Giao diện tổng thể Writer ở 1366x768 @ 125% (đáp ứng màn hình laptop Việt Nam) |
| `writer-1920x1080-100.jpg` | 82 KB | Giao diện tổng thể Writer ở 1920x1080 @ 100% |
| `writer-1920x1080-125.jpg` | 97 KB | Giao diện tổng thể Writer ở 1920x1080 @ 125% |
| `ribbon-tab-home.jpg` | 70 KB | Tab Trang đầu (Home): Nhóm Bảng nhớ tạm, Phông chữ, Đoạn văn, Kiểu dáng, Chỉnh sửa |
| `ribbon-tab-insert.jpg` | 70 KB | Tab Chèn (Insert): Nhóm Trang, Bảng, Minh họa, Liên kết, Ghi chú, Đầu/Chân trang, Văn bản, Ký hiệu |
| `ribbon-tab-design.jpg` | 55 KB | Tab Thiết kế (Design): Nhóm Định dạng tài liệu, Nền & Viền trang |
| `ribbon-tab-layout.jpg` | 68 KB | Tab Bố cục (Layout): Nhóm Thiết lập trang, Đoạn văn, Nền & Viền trang |
| `ribbon-tab-references.jpg` | 66 KB | Tab Tham chiếu (References): Nhóm Mục lục, Chú thích, Trích dẫn & Thư mục, Chú thích ảnh |
| `ribbon-tab-mailings.jpg` | 59 KB | Tab Trộn thư (Mailings): Nhóm Tạo, Bắt đầu trộn thư, Viết & Chèn trường, Xem trước, Hoàn tất |
| `ribbon-tab-review.jpg` | 63 KB | Tab Đánh giá (Review): Nhóm Kiểm tra văn bản, Ghi chú, Theo dõi thay đổi |
| `ribbon-tab-view.jpg` | 63 KB | Tab Chế độ xem (View): Nhóm Chế độ xem, Hiển thị, Thu phóng, Cửa sổ, Trợ giúp |
| `dialog-paragraph.jpg` | 52 KB | Hộp thoại Đoạn văn (Paragraph): Căn lề, Thụt lề cm, Thụt treo, Giãn dòng pt, Live preview |
| `dialog-pagesetup.jpg` | 44 KB | Hộp thoại Thiết lập trang (Page Setup): Lề 4 hướng (mm), Hướng in Dọc/Ngang, Khổ A4, NĐ 30/2020 |
| `dialog-insert-table.jpg` | 70 KB | Hộp thoại / Dropdown Chèn bảng: Lưới chọn ô trực quan & số hàng/cột tùy chỉnh |
| `dialog-findreplace.jpg` | 69 KB | Hộp thoại Tìm kiếm & Thay thế: Tabs Tìm kiếm / Thay thế, Phân biệt hoa thường, Từ toàn bộ |
| `dialog-columns.jpg` | 69 KB | Hộp thoại Chia cột (Columns): 1/2/3 cột, khoảng cách cột, đường kẻ phân cách, live preview |
| `dialog-watermark.jpg` | 69 KB | Hộp thoại Hình mờ (Watermark): Mẫu DỰ THẢO/MẬT/KHẨN, màu sắc, góc nghiêng, độ mờ % |
| `dialog-pageborder.jpg` | 69 KB | Hộp thoại Viền trang (Page Border): Kiểu nét, độ dày, màu viền 3T Office |
| `dialog-toc.jpg` | 69 KB | Hộp thoại Mục lục (TOC): Cấu hình cấp độ tiêu đề Heading, ký tự dẫn đường (dots) |
| `dialog-mailmerge.jpg` | 69 KB | Hộp thoại Trộn thư (Mail Merge Wizard): Các bước chọn nguồn dữ liệu Excel/CSV và chèn trường |

---

## 3. Danh sách Các Lỗi Đã Khắc Phục (Fixed Issues)

### Lỗi 1: Nhóm "Thiết lập trang" trên Ribbon thiếu Nút Launcher mở Hộp thoại
- **Hiện trạng ban đầu**: Nhóm *Thiết lập trang* (Page Setup) ở tab *Bố cục* không có nút mũi tên góc dưới bên phải (`launcherCommandId`), mâu hình thức trực quan tiêu chuẩn của Office và mâu thuẫn với bài Hướng dẫn sử dụng (`entries-retro-dialogs.js`).
- **Khắc phục**:
  - Thêm lệnh `writer.page.setupDialog` vào danh mục `platform/commands/command-definitions.js`.
  - Bổ sung `launcherCommandId: "writer.page.setupDialog"` và `launcherTooltip: "Thiết lập trang…"` vào cấu hình nhóm `pageSetup` trong `apps/writer/writer-ribbon.js`.
  - Xây dựng module `apps/writer/page-setup-dialog.js` cung cấp Hộp thoại Thiết lập trang chuẩn 3T Doc với:
    - 4 Lề giấy: Trên, Dưới, Trái, Phải tính bằng milimét (mm).
    - Các bộ lề mẫu nhanh (Preset): Chuẩn NĐ 30/2020 (Top: 20mm, Bottom: 20mm, Left: 30mm, Right: 15mm), Tiêu chuẩn (2cm), Hẹp (1.27cm), Rộng.
    - Hướng in: Chiều dọc (Portrait) / Chiều ngang (Landscape).
    - Khổ giấy: A4 (210 x 297 mm), Letter, Legal, A3, A5.
    - Báo lỗi nhập sai bằng tiếng Việt 100% khi nhập lề dưới 5mm hoặc quá 100mm.
    - Hỗ trợ đầy đủ phím Enter (Gửi form), Esc (Hủy), Tab (vòng focus khép kín `trapFocus`).
- **Minh họa bằng ảnh**: `docs/screens-writer-ui-0610/dialog-pagesetup.jpg` & `docs/screens-writer-ui-0610/ribbon-tab-layout.jpg`.

### Lỗi 2: Trạng thái Focus & Ring Hiển thị Bàn phím cho Ribbon Launchers & Tabs
- **Hiện trạng ban đầu**: Khi điều hướng bằng bàn phím (`Tab` hoặc `Alt` + phím mũi tên), nút launcher góc nhóm (`.vno-ribbon-dialog-launcher`) và nút tab ribbon thiếu vòng focus nổi bật.
- **Khắc phục**:
  - Bổ sung quy tắc CSS `:focus-visible` chuẩn hóa cho `.vno-ribbon-dialog-launcher` (`outline: 2px solid var(--vno-border-focus); outline-offset: 1px;`).
  - Đảm bảo contrast đạt chuẩn WCAG AA ở cả Chế độ Sáng và Chế độ Tối (Dark Theme).
- **Minh họa bằng ảnh**: `docs/screens-writer-ui-0610/writer-1366x768-100.jpg`.

### Lỗi 3: Chuẩn hóa Đồng bộ Bộ 9 Hộp thoại (Retro Dialogs)
- **Hiện trạng ban đầu**: Hộp thoại Đoạn văn, Cột, Hình mờ, Viền trang, Tìm thay thế, v.v. chưa đồng bộ hoàn toàn về quy cách phím Enter / Esc / Tab trapFocus và phân định rõ nút chính (`.vno-btn-primary` màu nổi) vs nút phụ (`.vno-dialog-cancel-btn` viền mỏng).
- **Khắc phục**:
  - Chuẩn hóa toàn bộ 9 hộp thoại để phím `Enter` tự động áp dụng (khi focus ở các ô input), phím `Esc` đóng/hủy hộp thoại, phím `Tab` duy trì vòng focus khép kín bên trong hộp thoại không bị lọt ra background canvas.
  - Phân định rõ nút chính (Đồng ý / Áp dụng - `.vno-btn-primary`) và nút phụ (Hủy - `.vno-dialog-cancel-btn`).
  - Báo lỗi nhập sai bằng ngôn ngữ tiếng Việt tự nhiên, ngắn gọn, dễ hiểu.
- **Minh họa bằng ảnh**: Ảnh từ `dialog-paragraph.jpg` đến `dialog-mailmerge.jpg`.

### Lỗi 4: Cập nhật Hướng dẫn Sử dụng Tiếng Việt trong Ứng dụng (Tuân thủ AGENTS.md §10)
- **Hiện trạng ban đầu**: Bài hướng dẫn cho Hộp thoại Thiết lập trang (`writer.dialog.pageSetupHelp`) cần đảm bảo mô tả chính xác đường dẫn truy cập nút launcher ở tab Bố cục.
- **Khắc phục**: Rà soát và cập nhật nội dung hướng dẫn trong `platform/help/entries-retro-dialogs.js` khớp 100% với vị trí UI mới.

---

## 4. Danh sách Lỗi Chưa Sửa (Unfixed Issues)

- **Số lượng lỗi còn lại**: **0 lỗi**.
- **Lý do**: Toàn bộ các tiêu chí thiết kế, căn hàng, nhóm lệnh, nút tràn/chồng, nhãn bị cắt, tooltip, vòng focus bàn phím, 9 hộp thoại, thanh trạng thái, thước kẻ và 100% tiếng Việt đã được kiểm tra thực tế qua CDP và khắc phục hoàn chỉnh.

---

## 5. Kết quả Kiểm thử Tự động (`node tests/run-tests.js`)

- **Kết quả**: **PASS 100% toàn bộ suite kiểm thử (2775/2775 test suite PASS | 0 FAIL)**.
- **Tuân thủ quy tắc**: Không disable test, không swallow exception, không thay đổi expected output để làm xanh test giả tạo.
