# Agent Handoff

TASK: Sheet: thanh cảnh báo "Liên kết ngoài" giống Excel (agy, UI + nối logic nhỏ)  
AGENT/ROLE: agy / Sheet & UI Kit owner  
BRANCH: `design/sheet-extlink-bar-agy`  
WORKTREE: `E:\VNOffice-agy-extlink-bar`  
OBJECTIVE: Bổ sung thanh thông báo ngữ cảnh dùng chung (`NotificationBar` trong `platform/ui-kit/`) hiển thị dưới ribbon; kích hoạt cảnh báo an toàn trên VN Sheet khi mở tệp có công thức liên kết tới sổ làm việc khác (external links); đạt chuẩn trợ năng WCAG 2.1 AA (cả Sáng và Tối), phím Tab/Esc, responsive không tràn 1024px; kèm nội dung Hướng dẫn sử dụng tiếng Việt trong ứng dụng.

## 1. FINDINGS & BỐI CẢNH
- Các tệp Excel thực tế trên mạng LAN thường chứa công thức liên kết tới sổ làm việc khác (`=[B.xlsx]Sheet1!A1`). Trước đây, `SheetAdapter` chỉ đếm `this.externalLinkCells` và thông báo ngắn ở thanh trạng thái dưới đáy màn hình.
- Microsoft Excel có thanh cảnh báo màu vàng đặc trưng đặt dưới ribbon: biểu tượng khiên bảo mật + thông điệp + nút hành động.
- VN Office là ứng dụng văn phòng chạy ngoại tuyến độc lập (offline-first), không tự ý kết nối hay cập nhật từ tệp nguồn khác, do đó nút hành động cung cấp là "Tìm hiểu thêm" để mở bài hướng dẫn Help tiếng Việt giải thích rõ ràng cơ chế hoạt động cho người dùng.

## 2. IMPLEMENTATION SUMMARY
1. **Component dùng chung `NotificationBar` (`platform/ui-kit/notification-bar.js`, export từ `platform/ui-kit/components.js`)**:
   - Vị trí: Đặt dưới ribbon, phía trên không gian làm việc (lưới/trang) qua container `.vno-notification-host`.
   - Giao diện vàng nhạt Office:
     - Chế độ Sáng (Light Mode): Nền `#fff4ce`, viền `#facc15`, chữ `#1f2937` (độ tương phản 13.34:1 >= 4.5:1 đạt WCAG AA/AAA). Nút hành động chữ `#78350f` trên `#ffffff` (tương phản 9.07:1). Nút đóng hover `#fef08a`.
     - Chế độ Tối (Dark Mode): Nền `#3b2f0a`, viền `#854d0e`, chữ `#fef3c7` (tương phản 10.99:1 >= 4.5:1 đạt WCAG AA/AAA). Nút hành động chữ `#fde047` trên `#4c3809` (tương phản 8.49:1). Nút đóng hover `#524626`.
   - Trợ năng & Phím bấm:
     - `role="status"`, `aria-live="polite"`.
     - Phím Tab di chuyển vào được nút hành động và nút đóng.
     - Phím `Escape` đóng thanh khi focus nằm bên trong thanh.
     - Responsive: Flexbox co giãn linh hoạt, không tràn ngang tại 1024px.
2. **Tích hợp `AppShell` (`platform/shell/app-shell.js`)**:
   - Khởi tạo host container `.vno-notification-host` nằm giữa ribbon và workspace.
   - Bổ sung phương thức `showNotification(options)` và `clearNotification()`.
   - `resetDocumentChrome()` tự động gọi `clearNotification()` khi mở tệp khác hoặc tạo tệp mới.
3. **Nối logic cảnh báo Sheet (`adapters/libreoffice/sheet/sheet-adapter.js`)**:
   - Khi `loadFromFods` phát hiện `externalLinkCells > 0`:
     - Giữ nguyên thông báo trạng thái status bar.
     - Kích hoạt `showNotification`: "Tệp có N ô liên kết tới sổ làm việc khác. VN Office hiển thị giá trị lưu lần cuối và không tự cập nhật (ứng dụng chạy ngoại tuyến)." + nút "Tìm hiểu thêm" mở bài Help `sheet.formula.externalLinks` + nút đóng (×).
   - Khi `externalLinkCells === 0` hoặc khi gọi `newDocument()`: tự động ẩn thanh thông báo.
   - Không thay đổi bất kỳ logic tính toán, lưu trữ hay serialization liên kết ngoài nào (giữ nguyên tính tương thích LibreOffice ODF và Excel).
4. **Bổ sung Hướng dẫn sử dụng tiếng Việt (`platform/help/entries-sheet.js`)**:
   - Cập nhật mục trợ giúp `sheet.formula.externalLinks` ("Liên kết tới sổ làm việc khác") mô tả rõ thanh cảnh báo màu vàng dưới ribbon, nút "Tìm hiểu thêm", phím Esc và các bước thao tác cụ thể. Tuân thủ nghiêm ngặt mục 10 AGENTS.md.
5. **Kiểm thử tự động toàn diện**:
   - Unit test `tests/unit/notification-bar.test.js`: 15/15 ca kiểm thử đạt chuẩn (render, accessibility, buttons, dismiss, Esc, setMessage, WCAG AA tương phản màu).
   - Tích hợp unit test trong `tests/unit/sheet-external-links.test.js`: kiểm tra SheetAdapter kích hoạt thanh cảnh báo, cập nhật số ô và tự ẩn khi tạo mới.
   - Live Playwright Audit `tests/live/sheet-extlink-bar.playwright.mjs`: 21/21 assertions PASS trên trình duyệt thật (Edge headless), 0 pageerror.

## 3. FILES CHANGED
- `platform/ui-kit/notification-bar.js` (Mới: Component thanh thông báo dùng chung)
- `platform/ui-kit/components.js` (Export NotificationBar & createNotificationBar)
- `platform/ui-kit/ui-kit.css` (Style NotificationBar, dark mode, responsive, WCAG AA)
- `platform/shell/app-shell.js` (Tích hợp notification host và helper APIs)
- `adapters/libreoffice/sheet/sheet-adapter.js` (Nối logic hiển thị thanh thông báo khi có liên kết ngoài)
- `platform/help/entries-sheet.js` (Bổ sung hướng dẫn sử dụng tiếng Việt cho thanh thông báo)
- `tests/unit/notification-bar.test.js` (Mới: Unit test component & WCAG AA contrast)
- `tests/unit/sheet-external-links.test.js` (Bổ sung unit test SheetAdapter notification bar)
- `tests/helpers/soffice-convert.mjs` (Tăng timeout tối thiểu 90s cho spawnSync LibreOffice trên Windows)
- `tests/run-tests.js` (Đăng ký suite 155 NotificationBar)
- `tests/live/sheet-extlink-bar.playwright.mjs` (Mới: Live Playwright test trên Edge)
- `docs/HANDOFF-SHEET-EXTLINK-BAR-AGY.md` (Tài liệu bàn giao)

## 4. COMMANDS RUN
- `node --check platform/ui-kit/notification-bar.js` -> PASS
- `node --check platform/shell/app-shell.js` -> PASS
- `node --check adapters/libreoffice/sheet/sheet-adapter.js` -> PASS
- `node --check platform/help/entries-sheet.js` -> PASS
- `node tests/live/sheet-extlink-bar.playwright.mjs` -> PASS (21/21 assertions, 0 pageerror)
- `node tests/run-tests.js` -> PASS (1882/1882 PASS, 0 FAIL)
- `git status` / `git diff --check` -> Clean

## 5. BUILD & TEST RESULTS
- **Master Test Runner (`node tests/run-tests.js`)**: **1882/1882 PASS | 0 FAIL** (155/155 test suites đạt chuẩn chất lượng).
- **Live Playwright Audit (`tests/live/sheet-extlink-bar.playwright.mjs`)**:
  - Trang trắng ban đầu không hiện thanh cảnh báo: PASS
  - Thanh thông báo xuất hiện khi mở tệp có liên kết ngoài: PASS
  - Thuộc tính `role="status"` và `aria-live="polite"`: PASS
  - Nội dung thông điệp chính xác số ô và lưu ý ngoại tuyến: PASS
  - Biểu tượng khiên bảo mật SVG: PASS
  - Nút hành động "Tìm hiểu thêm": PASS
  - Nút đóng (×): PASS
  - WCAG AA Contrast (Sáng): Chữ 13.34:1 >= 4.5:1, Nút 9.07:1 >= 4.5:1: PASS
  - WCAG AA Contrast (Tối): Chữ 10.99:1 >= 4.5:1, Nút 8.49:1 >= 4.5:1: PASS
  - Viewport 1024px không tràn ngang: PASS
  - Nút "Tìm hiểu thêm" mở đúng bài Help `sheet.formula.externalLinks`: PASS
  - Nút đóng (×) đóng thanh: PASS
  - Phím Escape đóng thanh khi focus bên trong: PASS
  - Tự ẩn khi mở tệp không có liên kết ngoài hoặc gọi `newDocument()`: PASS
  - Tổng số lỗi console / pageerror: 0

## 6. KNOWN FAILURES
- Không có (0 FAIL).

## 7. RISKS & REGRESSION MITIGATION
- **Hiển thị giao diện**: Thanh thông báo nằm trong `.vno-notification-host` độc lập ngay dưới ribbon, không làm xô lệch cấu trúc lưới SheetGrid hay trang Writer/Slides.
- **Dữ liệu tài liệu**: Tuyệt đối không thay đổi logic tính toán, parse FODS hoặc serialize liên kết ngoài. Các công thức liên kết như `=[B.xlsx]Sheet1!A1` và `SUM(...)` vẫn giữ nguyên giá trị lưu lần cuối và không làm hỏng file.
- **Tiêu chuẩn Layer**: Component đặt tại `platform/ui-kit/`, AppShell quản lý lifecycle host, Adapter chỉ kích hoạt sự kiện UI thông qua AppShell abstraction; không gọi chéo nội bộ.

## 8. DEFERRED / OMITTED
- Không có (toàn bộ yêu cầu trong task brief đã hoàn thành 100%).

## 9. NEXT ACTION
- Nhánh `design/sheet-extlink-bar-agy` sẵn sàng để người phụ trách rà soát. Không tự ý merge vào `main`.
