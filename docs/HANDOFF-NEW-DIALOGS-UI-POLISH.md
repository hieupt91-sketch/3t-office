# Báo cáo Rà soát & Hoàn thiện UI/UX Các Hộp thoại Mới (VN Office Suite)

- **Tác giả / Vai trò:** agy (UI / UX Polish Specialist)
- **Nhánh thực hiện:** fix/new-dialogs-ui-polish trên worktree E:\VNOffice-agy-new-dialogs-ui-audit
- **Tách từ:** main (trạng thái ban đầu: 1148/1148 PASS)
- **Trạng thái kiểm thử sau hoàn thiện:** **1148/1148 PASS (100%)**, 0 FAIL, 86/86 tệp cú pháp hợp lệ, toàn bộ Playwright live tests đạt.

---

## 1. Tóm tắt & Phạm vi Công việc

Nhiệm vụ tập trung **100% vào cải thiện UI/UX, khả năng tiếp cận (A11y/ARIA), độ tương phản WCAG 2.1 AA (Light/Dark Mode), bẫy focus (Focus Trap), phím tắt (Esc/Enter) và khả năng thích ứng (Responsive)** cho toàn bộ các hộp thoại (dialogs) mới được triển khai gần đây:

1. **VN Sheet:**
   - Hợp nhất dữ liệu (*Consolidate*)
   - Ước lượng công thức (*Evaluate Formula*)
   - Hộp thoại chọn loại Biểu đồ Pivot (*PivotChart*)
   - Phân tích Giả định (*What-If Analysis*: *Data Table* & *Scenario Manager*)
   - Khóa trang tính & Khóa sổ tính (*Protect Sheet* / *Protect Workbook*)
   - Đổi tên & Di chuyển/Sao chép trang tính (*Rename* / *Move-Copy Sheet*)
2. **VN Slides:**
   - Phân đoạn trang chiếu (*Sections*: Thêm, Đổi tên, Menu ngữ cảnh)
   - Ngăn hoạt hình (*Animation Pane*)
   - Thiết lập trình chiếu (*Set Up Slide Show*)
   - Nhóm biên tập (*Find / Replace*)
3. **VN Writer:**
   - Màu trang & Ngắt phần (*Page Color* & *Section Breaks*)
   - Hình mờ & Viền trang (*Watermark* & *Page Border*)
   - Phong bì & Nhãn (*Envelopes* & *Labels*)
   - Bộ chọn minh họa (*Illustrations*: *Shapes*, *SmartArt Diagrams*, *Charts*)

> **Quy tắc cốt lõi đã tuân thủ:** Tuyệt đối KHÔNG can thiệp vào logic tính toán, engine công thức, mô hình dữ liệu hay logic tuần tự hóa FODS/FODT/FODP/OOXML.

---

## 2. Các Lỗi Giao diện Nghiêm trọng Đã Phát hiện & Khắc phục

Trong quá trình rà soát chi tiết, agy đã phát hiện và xử lý triệt để các vấn đề tiềm ẩn:

1. **Focus trap và phím Enter trong Phong bì / Nhãn (apps/writer/envelopes-labels.js):**
   - Hộp thoại Envelopes và Labels gọi trapFocus(dialogBox, event) tại xử lý keydown; đã kiểm thử lại xác nhận không phát sinh ngoại lệ khi Tab qua các trường, và bổ sung phím Ctrl+Enter (hoặc Cmd+Enter) để gửi lệnh ngay cả khi con trỏ đang ở trong textarea nhiều dòng, không làm mất tính năng xuống dòng bằng Enter thường.
2. **Thiếu lớp CSS .vno-dialog-box & Nút chưa định kiểu trong Màu trang (apps/writer/page-decorations.js):**
   - showPageColorDialog sử dụng class .vno-dialog thay vì .vno-dialog-box, và footer dùng `<button class="primary">` thay vì .vno-btn.vno-btn-primary.
   - *Khắc phục:* Chuẩn hóa thành .vno-dialog-box với `width: 420px; max-width: calc(100vw - 32px)`, áp dụng lớp button của UI-Kit và bổ sung hỗ trợ phím Enter.
3. **Chữ tàng hình trong Chế độ Tối (Dark Mode) của Writer Illustrations (apps/writer/writer-illustrations.js):**
   - Các card lựa chọn trong showShapeDialog và showDiagramDialog sử dụng mã màu cứng `color: #1e293b; background: #fff; border: 2px solid #cbd5e1;`. Khi người dùng bật Dark Mode (nền #1e1e1e), chữ màu đen than #1e293b trên nền tối có tỷ lệ tương phản chỉ **1.14:1** (không thể đọc được).
   - *Khắc phục:* Chuyển sang dùng token CSS `var(--vno-text-primary)`, `var(--vno-bg-surface)`, `var(--vno-border-default)`, `var(--vno-border-focus)`, đảm bảo tỷ lệ tương phản đạt **> 13:1** trên cả hai theme.
4. **Thẻ nền cam chói lóa trong Ngăn hoạt hình Slides (apps/slides/slides.css):**
   - .vno-anim-pane-item có màu cứng `background: #fff7ed; border: #fed7aa; color: #0f172a;` và hoàn toàn không có override Dark Mode. Trong Dark theme, một card trắng-cam nổi chói gắt trên giao diện tối.
   - *Khắc phục:* Thêm khối CSS `[data-theme="dark"] .vno-animation-pane *` với nền surface tối, viền mặc định, chữ rõ ràng và nút xóa có độ tương phản đạt chuẩn.
5. **Màu cứng không đạt chuẩn WCAG trong Thiết lập trình chiếu (apps/slides/slides-canvas.js):**
   - showSetupShowDialog dùng các mã màu inline như #475569, #64748b, #334155, #cbd5e1 dẫn tới vi phạm WCAG AA khi ở Dark Mode.
   - *Khắc phục:* Thay thế bằng các CSS design tokens `var(--vno-text-secondary)`, `var(--vno-text-muted)`, `var(--vno-text-primary)`, `var(--vno-border-default)`, `var(--vno-bg-surface)`.
6. **Token không tồn tại trong Sheet CSS (apps/sheet/sheet.css):**
   - .vno-scenario-manager input tham chiếu tới `var(--vno-bg-primary)` (biến không tồn tại trong tokens.css).
   - *Khắc phục:* Chuẩn hóa về `var(--vno-bg-surface)`. Đồng thời tinh chỉnh màu gạch chân của Evaluate Formula trong dark mode để vượt qua kiểm toán tự động của suite.

---

## 3. Bảng Đo Lường Độ Tương Phản Màu Thực Tế (WCAG 2.1 AA)

Toàn bộ các chỉ số dưới đây được tính toán chính xác bằng công thức toán học W3C thông qua platform/ui-kit/contrast-checker.js (chạy qua script tự động scripts/audit-dialog-contrast.mjs):

| Thành phần / Ngữ cảnh | Mã màu Chữ (FG) | Mã màu Nền (BG) | Tỷ lệ đo được | Yêu cầu WCAG AA | Đánh giá |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Sheet Hint text (Light)** | #475569 | #ffffff | **7.58:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet Hint text (Dark)** | #94a3b8 | #1e1e1e | **6.50:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet Label text (Light)** | #334155 | #ffffff | **10.35:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet Label text (Dark)** | #cbd5e1 | #1e1e1e | **11.23:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet Dialog Error (Light)** | #b91c1c | #ffffff | **6.47:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet Dialog Error (Dark)** | #f87171 | #1e1e1e | **6.03:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet Eval Underline (Light)** | #0f6d38 | #f8fafc | **6.15:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet Eval Underline (Dark)** | #4ade80 | #2d2d2d | **7.90:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet Consolidate Dest (Light)** | #0f172a | #ffffff | **17.85:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet Consolidate Dest (Dark)** | #f1f5f9 | #1e1e1e | **15.22:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Anim Pane Title (Light)** | #0f172a | #ffffff | **17.85:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Anim Pane Title (Dark)** | #f1f5f9 | #1e1e1e | **15.22:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Anim Pane Close (Light)**| #b53818 | #ffffff | **5.93:1** | ≥ 3.0:1 | **PASS** (AA) |
| **Slides Anim Pane Close (Dark)** | #fdba74 | #1e1e1e | **9.89:1** | ≥ 3.0:1 | **PASS** (AAA) |
| **Slides Anim Order Badge** | #ffffff | #b53818 | **5.93:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Slides Anim Object Name (Light)**| #0f172a | #fff7ed | **16.81:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Anim Object Name (Dark)** | #f1f5f9 | #431407 | **14.29:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Anim Type Label (Light)** | #9a3412 | #fff7ed | **6.88:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Slides Anim Type Label (Dark)**  | #fdba74 | #431407 | **9.28:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Anim Remove Btn (Light)** | #b91c1c | #ffffff | **6.47:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Slides Anim Remove Btn (Dark)**  | #fca5a5 | #252526 | **8.07:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Set Up Show Hint (Light)**| #475569 | #ffffff | **7.58:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides Set Up Show Hint (Dark)** | #94a3b8 | #1e1e1e | **6.50:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Writer Page Color Active Border**| #2563eb | #ffffff | **5.17:1** | ≥ 3.0:1 | **PASS** (AA) |
| **Writer Envelopes Icon (Light)**  | #0f4c81 | #f8fafc | **8.46:1** | ≥ 3.0:1 | **PASS** (AAA) |
| **Writer Envelopes Icon (Dark)**   | #93c5fd | #1f1f1f | **9.14:1** | ≥ 3.0:1 | **PASS** (AAA) |
| **Writer Illustrations Card (Light)**| #1e293b| #ffffff | **14.63:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Writer Illustrations Card (Dark)** | #f1f5f9| #252526 | **13.98:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Writer Chart Preview Label (Light)**| #334155| #ffffff | **10.35:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Writer Chart Preview Label (Dark)** | #cbd5e1| #1e1e1e | **11.23:1** | ≥ 4.5:1 | **PASS** (AAA) |

---

## 4. Chi tiết Hoàn thiện Theo Từng Ứng Dụng

### A. VN Sheet
- **Khung hộp thoại chung (_createSheetDialog):**
  - Tự động sinh titleId độc nhất và liên kết thuộc tính aria-labelledby trên .vno-dialog-box.
  - Nút đóng được chuẩn hóa với class .vno-btn.vno-btn-icon-only.vno-dialog-close-btn.vno-rule-close, bổ sung thuộc tính title="Đóng" cho tooltip trợ năng.
  - Bổ sung phím tắt Enter để kích hoạt nút Xác nhận/Áp dụng (.vno-rule-apply), loại trừ vùng nhập textarea để người dùng xuống dòng bình thường.
  - Mở rộng Focus Trap bao gồm cả `textarea:not([disabled])`.
  - Tự động autofocus vào ô input/select đầu tiên thay vì nút hủy.
- **Hộp thoại Rename & Move/Copy Sheet:**
  - Bổ sung thuộc tính `for` rõ ràng kết nối label tới ô input (vno-rename-sheet, vno-move-before, vno-move-copy).
- **Hộp thoại Protect Sheet & Protect Workbook:**
  - Chuẩn hóa khoảng cách các checkbox quyền hạn, liên kết label-input, hiển thị cảnh báo viền đỏ rõ ràng khi nhập sai mật khẩu.
- **Hộp thoại Evaluate Formula:**
  - Sắp xếp lại thứ tự nút footer chuẩn giao diện Microsoft Excel: *Ước lượng (Evaluate)* → *Bước vào (Step In)* → *Bước ra (Step Out)* → *Khởi động lại (Restart)* → *Đóng (Close)*.
  - Sửa màu gạch chân kết quả trung gian trong dark mode sang #4ade80 (7.90:1).
- **Hộp thoại Consolidate & What-If Analysis:**
  - Thêm `max-width: calc(100vw - 32px)` chống tràn trên màn hình 1024px.
  - Khắc phục token nền input `var(--vno-bg-surface)`.

### B. VN Slides
- **Phân đoạn trang chiếu (Sections):**
  - Đảm bảo menu ngữ cảnh .vno-slide-section-menu đóng tức thì khi nhấn Escape.
  - Hỗ trợ duyệt bàn phím với phím mũi tên Lên/Xuống (ArrowUp/ArrowDown) và cập nhật tabindex động.
- **Ngăn hoạt hình (Animation Pane):**
  - Nút đóng header được bổ sung title="Đóng", hỗ trợ hover nền tinh tế.
  - Thêm thuộc tính `max-width: calc(100% - 36px)` để panel co giãn an toàn trên màn hình nhỏ.
  - Khắc phục toàn diện màu sắc Dark Mode: các thẻ item chuyển sang nền tối với viền subtle, nhãn loại hiệu ứng có độ tương phản 9.28:1, nút Xóa màu đỏ nhạt có độ tương phản 8.07:1.
- **Thiết lập trình chiếu (Set Up Slide Show):**
  - Loại bỏ các mã màu inline lỗi thời, chuyển sang CSS tokens.
  - Nút đóng chuẩn hóa .vno-btn.vno-btn-icon-only.vno-dialog-close-btn kèm title.
  - Hỗ trợ nhấn Enter để kích hoạt nút Áp dụng (#vno-setup-ok).
- **Tìm kiếm & Thay thế (Find/Replace):**
  - Cung cấp class .vno-dialog-input và thiết lập màu nền surface / màu chữ primary tường minh, tránh lỗi hiển thị ô nhập màu trắng trên nền tối.

### C. VN Writer
- **Màu trang (Page Color):**
  - Chuyển thẻ bao ngoài sang .vno-dialog-box tiêu chuẩn, sửa lỗi nút chân trang unstyled.
  - Bổ sung phím Enter để áp dụng màu đã chọn.
- **Hình mờ & Viền trang (Watermark & Page Border):**
  - Thêm `max-width: calc(100vw - 32px)`.
  - Nhãn phần trăm độ mờ watermark sử dụng token `--vno-app-current-fg` thay vì #0f4c81 cố định để hiển thị nổi bật trên cả 2 theme.
  - Bổ sung phím Enter áp dụng cấu hình viền và hình mờ ngay lập tức.
- **Phong bì & Nhãn (Envelopes & Labels):**
  - Kết nối và kiểm thử toàn diện trapFocus đảm bảo không phát sinh ngoại lệ khi người dùng Tab qua các trường.
  - Icon tiêu đề dùng token app hiện tại.
  - Hỗ trợ phím tắt thông minh: Nhấn Ctrl+Enter (hoặc Cmd+Enter) khi đang ở trong ô địa chỉ nhiều dòng (textarea) sẽ trực tiếp gửi lệnh tạo phong bì / tạo nhãn mà không làm mất tính năng xuống dòng (Enter) của văn bản.
- **Bộ chọn Hình khối / Sơ đồ / Biểu đồ (Writer Illustrations):**
  - Thẻ card lựa chọn (.vno-shape-card, .vno-diagram-card) hoàn toàn thích ứng với theme Dark, độ tương phản chữ đạt **13.98:1**.
  - Trạng thái được chọn (is-selected) dùng biến viền focus và nền highlight nhẹ.
  - Hộp thoại Biểu đồ (showChartDialog): Các ô nhập dữ liệu mẫu (nhãn, giá trị) và khung SVG Preview được gắn nền surface rõ ràng, hỗ trợ Enter để chèn biểu đồ.

---

## 5. Kết quả Xác minh & Kiểm thử (Verification)

1. **Kiểm tra Cú pháp Tự động (scripts/check-syntax.js):**
   - Đã quét toàn bộ **86/86 tệp JavaScript** trong codebase.
   - Kết quả: **86/86 files hợp lệ | 0 lỗi cú pháp**.
2. **Kiểm toán Tương phản Toàn hệ thống (tests/unit/color-contrast-audit.test.js):**
   - WCAG Luminance: PASS
   - WCAG Contrast Ratio: PASS
   - Tokens Audit: PASS (100% token đạt chuẩn WCAG AA)
   - Automated CSS Audit: **PASS (0 vi phạm tỷ lệ tương phản trên toàn bộ stylesheet)**.
3. **Master Test Runner (tests/run-tests.js):**
   - Chạy toàn bộ 111 test suites (Unit, Behavioral, Integration, Import/Export, FODS, FODT, FODP).
   - Kết quả: **1148/1148 PASS | 0 FAIL**.
4. **Playwright Live Browser Verification:**
   - tests/live/sheet-evaluate-formula.playwright.mjs: PASS
   - tests/live/sheet-consolidate.playwright.mjs: PASS
   - tests/live/slides-sections.playwright.mjs: PASS
   - tests/live/slides-animation-pane-setup-show.playwright.mjs: PASS
   - tests/live/writer-envelopes-labels.playwright.mjs: PASS
   - tests/live/writer-illustration-dialogs.playwright.mjs: PASS

---

## 6. Lịch sử Cam kết (Git Commits trên nhánh fix/new-dialogs-ui-polish)

Toàn bộ công việc được phân nhóm cam kết rõ ràng, tách biệt theo từng ứng dụng:

- `c51fe3e` style(writer): polish UI/UX, dark mode, ARIA, and focus trap for envelopes, labels, page color, and illustrations
- `2484c9b` style(slides): polish UI/UX, dark mode contrast, ARIA for sections, animation pane, and setup show
- `1b065d8` style(sheet): polish UI/UX, contrast, ARIA, and focus trap for new sheet dialogs

*Nhánh fix/new-dialogs-ui-polish đang ở trạng thái sạch, độc lập trên worktree E:\VNOffice-agy-new-dialogs-ui-audit.*
