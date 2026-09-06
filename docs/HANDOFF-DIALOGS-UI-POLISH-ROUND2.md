# Báo cáo Rà soát & Hoàn thiện UI/UX Đợt 2 Các Hộp thoại & Màn hình (VN Office Suite)

- **Tác giả / Vai trò:** agy (UI / UX Polish Specialist)
- **Nhánh thực hiện:** fix/dialogs-ui-polish-round2 trên worktree E:\VNOffice-agy-ui-audit-round2
- **Tách từ:** main (commit 1baa979 Merge branch 'fix/new-dialogs-ui-polish', trạng thái ban đầu: 1160/1160 PASS)
- **Trạng thái kiểm thử sau hoàn thiện:** **1160/1160 PASS (100%)**, 0 FAIL, 87/87 tệp cú pháp hợp lệ, 100% đạt chuẩn WCAG 2.1 AA.

---

## 1. Tóm tắt & Phạm vi Công việc

Đợt rà soát giao diện Round 2 tiếp tục tập trung **100% vào cải thiện UI/UX, khả năng tiếp cận (A11y/ARIA), độ tương phản màu WCAG 2.1 AA (Light/Dark Theme), bẫy focus (Focus Trap), phím tắt (Esc/Enter) và khả năng co giãn trên màn hình hẹp (Responsive max-width)** cho toàn bộ các màn hình, popover và hộp thoại chưa được rà soát ở đợt 1.

### Phạm vi đối chiếu theo yêu cầu người dùng:
1. **VN Sheet:**
   - Định dạng có điều kiện (*Conditional Formatting*): Hộp thoại thêm/sửa quy tắc và trạng thái các tính năng mở rộng.
   - Xác thực dữ liệu (*Data Validation*): Rà soát hộp thoại cấu hình tiêu chí hợp lệ.
   - Sắp xếp & Lọc (*Sort / Filter*): Menu bộ lọc ngữ cảnh (*AutoFilter popover*).
   - Định dạng ô (*Format Cells*): Rà soát đối chiếu làm chuẩn mực.
   - Đầu trang / Chân trang (*Header & Footer*): Hộp thoại thiết lập in ấn.
2. **VN Slides:**
   - Chuyển tiếp trang chiếu (*Slide Transition*): Hộp thoại chọn hiệu ứng chuyển slide.
   - Định dạng nền trang chiếu (*Format Background*): Hộp thoại màu nền và hiệu ứng tô.
   - Chèn biểu đồ (*Insert Chart*): Hộp thoại nhập dữ liệu và cấu hình loại biểu đồ.
   - Sơ đồ thông minh (*SmartArt Diagram*): Hộp thoại chọn kiểu sơ đồ và điều hướng bàn phím.
   - Bảng điều khiển thuyết trình (*Presenter View Controls*): Giao diện điều khiển trình chiếu hai màn hình.
   - Đầu trang / Chân trang (*Header & Footer*): Hộp thoại chân trang slide và ghi chú.
3. **VN Writer:**
   - Ngăn bình luận lề (*Comments Panel*): Thẻ bình luận, trạng thái đã giải quyết, nút xóa và điểm neo.
   - Theo dõi thay đổi (*Track Changes*): Khảo sát ngăn duyệt thay đổi (*Reviewing Pane*).
   - Mục lục (*Table of Contents*): Khảo sát hộp thoại cấu hình mục lục.
   - Đầu trang / Chân trang (*Header & Footer*): Khảo sát cơ chế tương tác.
   - Tìm kiếm & Thay thế (*Find & Replace*): Khảo sát các tùy chọn nâng cao.

> **Quy tắc cốt lõi đã tuân thủ nghiêm ngặt:** Tuyệt đối KHÔNG sửa đổi bất kỳ dòng mã nào liên quan đến logic tính toán, engine công thức, mô hình dữ liệu, hoặc logic tuần tự hóa xuất nhập FODS/FODT/FODP/OOXML (đây là phạm vi độc quyền của Codex/Grok).

---

## 2. Bảng Phân loại Chi tiết Các Màn hình: Đã Tối ưu vs. Chưa có trong Code

Nhằm giúp các kỹ sư phụ trách logic (Codex/Grok) và đội ngũ phát triển nắm rõ hiện trạng sản phẩm, bảng dưới đây liệt kê chính xác trạng thái từng màn hình:

| Ứng dụng | Màn hình / Hộp thoại | Trạng thái Code | Chi tiết thực hiện & Kiến nghị phát triển |
| :--- | :--- | :---: | :--- |
| **Sheet** | **Conditional Formatting Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showConditionalFormattingDialog()` trong `apps/sheet/sheet-grid.js`: Thêm `max-width`, bổ sung ARIA label cho input/select, nút chọn màu tùy biến viền, sửa lỗi tương phản thông báo lỗi `#f87171` và nút đóng `#94a3b8` trong Dark Mode. |
| **Sheet** | Manage Rules / Color Scale / Data Bar UI | *Chưa code UI* | Engine Sheet đã hỗ trợ conditional formatting, nhưng giao diện Quản lý đa quy tắc (*Manage Rules Manager*) và thanh công cụ chọn nhanh Color Scale/Data Bar/Icon Set chưa được dựng UI. |
| **Sheet** | **Data Validation Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showDataValidationDialog()` trong `apps/sheet/sheet-grid.js`: Chuẩn hóa ARIA labels cho các trường điều kiện, giá trị tối thiểu/tối đa, hỗ trợ phím Enter để lưu nhanh, Esc đóng hộp thoại. |
| **Sheet** | **AutoFilter Popover Menu** | **ĐÃ HOÀN THIỆN** | Nâng cấp toàn diện menu bộ lọc `openFilterMenu()` trong `apps/sheet/sheet-grid.js`: Gắn `role="dialog"`, `aria-label`, cài đặt bẫy focus bàn phím (Tab vòng lặp), phím `Escape` đóng và trả focus về nút lọc ban đầu, phím `Enter` áp dụng lọc, thay thế nền trắng cứng bằng CSS tokens (`--vno-bg-surface`, `--vno-border-default`, `--vno-text-primary`). |
| **Sheet** | Multi-level Sort Dialog | *Chưa code UI* | Sắp xếp dữ liệu hiện hoạt động trực tiếp qua nút Sắp xếp A-Z / Z-A trên ribbon hoặc trên AutoFilter popover. Hộp thoại sắp xếp nhiều cấp (*Sort by Column then by...*) chưa có trong codebase. |
| **Sheet** | **Format Cells Dialog** | **ĐẠT CHUẨN** | `apps/sheet/format-cells-dialog.js` là hộp thoại chuẩn mực với 6 tab (Number, Alignment, Font, Border, Fill, Protection), bẫy focus, phím tắt Esc/Enter và hỗ trợ Dark Mode hoàn hảo. |
| **Sheet** | Insert Table Dialog (Ctrl+T) | *Chưa code UI* | Tính năng bảng hiện áp dụng kiểu trực tiếp qua Format as Table hoặc cell styles, chưa mở hộp thoại xác nhận vùng dữ liệu "My table has headers". |
| **Sheet** | **Header / Footer Dialog** | **ĐÃ HOÀN THIỆN** | `showHeaderFooterDialog()` trong `apps/sheet/sheet-grid.js` đã được chuẩn hóa lớp hộp thoại và hỗ trợ bàn phím. |
| **Slides** | **Slide Transition Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showTransitionDialog()` trong `apps/slides/slides-canvas.js`: Bổ sung `max-width: calc(100vw - 32px)`, token hóa nhãn văn bản và thẻ xem trước hiệu ứng, xử lý phím `Enter` áp dụng chuyển tiếp, tự động focus vào danh sách chọn hiệu ứng khi mở. |
| **Slides** | **Format Background Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showFormatBackgroundDialog()` trong `apps/slides/slides-canvas.js`: Thêm `max-width`, gán ARIA label rõ ràng cho các ô chọn màu và kiểu tô nền, hỗ trợ phím `Enter` áp dụng ngay. |
| **Slides** | **SmartArt Diagram Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showDiagramDialog()` trong `apps/slides/slides-canvas.js` và `apps/slides/slides.css`: Hỗ trợ phím mũi tên (`ArrowRight`, `ArrowLeft`, `ArrowUp`, `ArrowDown`) chuyển nhanh qua các thẻ sơ đồ, phím `Enter` chèn sơ đồ; định kiểu Dark Mode cho thẻ sơ đồ với nền tối `#252526` và viền cam `#fdba74` nổi bật khi chọn (thay vì nền trắng cứng). |
| **Slides** | **Insert Chart Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showSlidesChartDialog()` trong `apps/slides/slides-chart.js` và `apps/slides/slides.css`: Token hóa các trường nhập dữ liệu biểu đồ, sửa màu chữ thông báo lỗi trong Dark Mode thành `#f87171` (đạt 6.03:1, chuẩn WCAG AA). |
| **Slides** | **Presenter View Controls** | **ĐÃ HOÀN THIỆN** | Tối ưu bảng điều khiển thuyết trình `startPresenterMode()` trong `apps/slides/slides.css`: Đồng bộ nền nút điều khiển console thành `#334155` với chữ `#f8fafc` (tỷ lệ tương phản 9.90:1). |
| **Slides** | **Header / Footer Dialog** | **ĐÃ HOÀN THIỆN** | Tối ưu `showHeaderFooterDialog()` trong `apps/slides/insert-dialogs.js`: Thêm `max-width`, token hóa ô nhập văn bản `#vno-hf-text`, gán nhãn ARIA cho từng trường lựa chọn. |
| **Writer** | **Comments Panel** | **ĐÃ HOÀN THIỆN** | Tối ưu bảng ghi chú lề trong `apps/writer/writer.css`: Bổ sung đầy đủ Dark Mode cho `.vno-comment-card` (nền surface `#252526`, viền `#3f3f46`), thẻ đã xử lý `.is-resolved` giảm độ mờ opacity 0.65 dịu mắt thay vì giữ màu nền xám sáng chói lóa, màu tên tác giả `#f1f5f9` (13.98:1), thời gian `#94a3b8` (5.97:1), nút xóa `#fca5a5` (8.07:1), và điểm neo chữ nổi bật `.vno-comment-anchor`. |
| **Writer** | Track Changes Reviewing Panel | *Chưa code UI* | Writer hiện hiển thị thay đổi sửa đổi trực tiếp trên mặt giấy A4 thông qua thẻ inline `<ins>` và `<del>` kèm thuộc tính `data-vno-change`. Thanh bên Reviewing Pane tổng hợp danh sách thay đổi và các nút Chấp nhận/Từ chối hàng loạt chưa được xây dựng. |
| **Writer** | Table of Contents Dialog | *Chưa code UI* | Tính năng Mục lục hiện chèn tự động trực tiếp vào vị trí con trỏ dựa trên các thẻ tiêu đề (Heading 1-3). Hộp thoại tùy chọn cấp độ mục lục và ký tự dóng hàng chưa có trong codebase. |
| **Writer** | Insert Header / Footer Dialog | *Chưa code UI* | Thao tác Đầu trang / Chân trang trong Writer được kích hoạt trực tiếp bằng cách click đúp hoặc gọi lệnh canvas `activateHeader()` / `activateFooter()`, không qua hộp thoại trung gian. |
| **Writer** | Advanced Find & Replace Dialog | *Chưa code UI* | Hộp thoại Tìm & Thay thế tiêu chuẩn hoạt động tốt qua `platform/ui-kit/dialogs.js`. Các tính năng nâng cao (Regular Expression, Phân biệt hoa thường, Định dạng văn bản) chưa có UI riêng. |

---

## 3. Bảng Đo Lường Độ Tương Phản Màu Thực Tế (WCAG 2.1 AA)

Toàn bộ các chỉ số dưới đây được đo lường thực tế thông qua công thức W3C Relative Luminance chuẩn của `platform/ui-kit/contrast-checker.js` (chạy qua script tự động `scripts/audit-dialog-contrast.mjs`):

| Thành phần / Ngữ cảnh kiểm tra | Màu Chữ (FG) | Màu Nền (BG) | Tỷ lệ đo được | Yêu cầu WCAG AA | Kết luận |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Sheet - Hint text (Light)** | #475569 | #ffffff | **7.58:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet - Hint text (Dark)** | #94a3b8 | #1e1e1e | **6.50:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet - Label secondary (Light)** | #334155 | #ffffff | **10.35:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet - Label secondary (Dark)** | #cbd5e1 | #1e1e1e | **11.23:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet - Error text (Light)** | #b91c1c | #ffffff | **6.47:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet - Error text (Dark)** | #f87171 | #1e1e1e | **6.03:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Sheet - Rule Dialog Close Btn (Dark)** | #94a3b8 | #1e1e1e | **6.50:1** | ≥ 3.0:1 | **PASS** (AA) |
| **Sheet - AutoFilter Item (Light)** | #0f172a | #ffffff | **17.85:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet - AutoFilter Item (Dark)** | #f1f5f9 | #1e1e1e | **15.22:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet - AutoFilter Section Label (Light)** | #475569 | #ffffff | **7.58:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Sheet - AutoFilter Section Label (Dark)** | #94a3b8 | #1e1e1e | **6.50:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Slides - Transition Preview Card (Light)**| #b53818 | #ffffff | **5.93:1** | ≥ 3.0:1 | **PASS** (AA) |
| **Slides - Transition Preview Card (Dark)** | #fdba74 | #252526 | **9.08:1** | ≥ 3.0:1 | **PASS** (AAA) |
| **Slides - Diagram Card Title (Dark)** | #f1f5f9 | #252526 | **13.98:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides - Diagram Card Selected (Dark)** | #f1f5f9 | #431407 | **14.29:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides - Diagram Preview Symbol (Dark)**| #60a5fa | #252526 | **6.02:1** | ≥ 3.0:1 | **PASS** (AA) |
| **Slides - Presenter Console Button** | #f8fafc | #334155 | **9.90:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Slides - Chart Error Message (Dark)** | #f87171 | #1e1e1e | **6.03:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Writer - Comment Card Text (Dark)** | #f1f5f9 | #252526 | **13.98:1** | ≥ 4.5:1 | **PASS** (AAA) |
| **Writer - Comment Meta Time (Dark)** | #94a3b8 | #252526 | **5.97:1** | ≥ 4.5:1 | **PASS** (AA) |
| **Writer - Comment Delete Button (Dark)** | #fca5a5 | #252526 | **8.07:1** | ≥ 4.5:1 | **PASS** (AAA) |

---

## 4. Lịch sử Commit trên Nhánh fix/dialogs-ui-polish-round2

Các thay đổi được tổ chức thành các commit độc lập, rõ ràng theo từng nhóm ứng dụng:

1. `3fee70e`: `sheet: polish ui, focus trap and dark mode contrast for conditional formatting and filter`
   - Hoàn thiện giao diện hộp thoại Conditional Formatting và AutoFilter menu.
   - Thêm focus trap, phím tắt Esc/Enter, ARIA labels và định kiểu Dark Mode.
2. `7cb66ea`: `slides: polish ui and wcag contrast for transition, diagram, chart and presenter view`
   - Bổ sung phím tắt Enter, điều hướng phím mũi tên trong sơ đồ SmartArt.
   - Cập nhật tokens Dark Mode cho thẻ sơ đồ, bảng chuyển tiếp, bảng điều khiển thuyết trình và hộp thoại biểu đồ.
3. `790c918`: `writer: polish wcag contrast for comments panel in dark mode`
   - Khắc phục triệt để tương phản thẻ bình luận, thẻ đã giải quyết và nút thao tác xóa trong chế độ tối.
   - Cập nhật bộ test đo tương phản tự động cho Writer Comments Panel.

---

## 5. Hướng dẫn Kiểm tra Tự động & Thủ công

### A. Lệnh kiểm tra tự động (Automated Verification)

Chạy các lệnh sau từ thư mục gốc của worktree `E:\VNOffice-agy-ui-audit-round2`:

```powershell
# 1. Kiểm tra tính toàn vẹn cú pháp toàn bộ 87 tệp JavaScript trong dự án
node scripts/check-syntax.js
# Kết quả mong đợi: 87/87 files hợp lệ | 0 lỗi cú pháp

# 2. Đo lường tỷ lệ tương phản thực tế của toàn bộ các hộp thoại đã rà soát
node scripts/audit-dialog-contrast.mjs
# Kết quả mong đợi: 100% CÁC CẶP MÀU ĐỀU ĐẠT CHUẨN WCAG 2.1 AA!

# 3. Quét kiểm toán tự động tương phản màu trên toàn bộ hệ thống CSS
node scripts/audit-contrast.js
# Kết quả mong đợi: 0 vi phạm tỷ lệ tương phản màu WCAG AA

# 4. Thực thi toàn bộ bộ kiểm thử tích hợp và hành vi của VN Office Suite
node tests/run-tests.js
# Kết quả mong đợi: 1160/1160 PASS | 0 FAIL
```

### B. Hướng dẫn kiểm thử thủ công trên trình duyệt (Manual Visual Test)

1. Khởi chạy máy chủ nội bộ: `node scripts/serve.js` và truy cập `http://localhost:8080`.
2. **Kiểm tra VN Sheet:**
   - Mở Sheet, nhập dữ liệu vào ô A1:A5.
   - Bật AutoFilter (tab Dữ liệu > Lọc). Click vào biểu tượng mũi tên lọc trên ô tiêu đề.
   - Nhấn phím `Tab` để kiểm tra bẫy focus bàn phím (con trỏ chỉ di chuyển tuần hoàn trong popover lọc).
   - Nhấn phím `Escape`: Popover phải đóng lập tức và focus được trả lại nút lọc trên ô lưới.
   - Mở tab Trang chủ > Định dạng có điều kiện: Mở hộp thoại thêm quy tắc, chuyển sang Dark Mode để xác nhận chữ, nhãn, nút đóng và thông báo lỗi hiển thị sắc nét, không bị chói hoặc tàng hình.
3. **Kiểm tra VN Slides:**
   - Mở Slides, vào tab Chèn > Sơ đồ (Diagram): Dùng các phím mũi tên `ArrowRight`, `ArrowLeft`, `ArrowUp`, `ArrowDown` để chọn kiểu sơ đồ; nhấn `Enter` để chèn sơ đồ được chọn.
   - Vào tab Hiệu ứng chuyển tiếp: Thử chọn hiệu ứng, nhấn `Enter` để áp dụng nhanh.
   - Chuyển theme sang Dark Mode: Xác nhận các thẻ sơ đồ có màu nền tối và viền cam khi chọn, không bị nền trắng chói lóa.
4. **Kiểm tra VN Writer:**
   - Mở Writer, bôi đen một đoạn văn bản và chọn Thêm bình luận.
   - Chuyển sang Dark Mode: Xác nhận thẻ bình luận nền tối dịu mắt, tên tác giả và ngày giờ rõ ràng.
   - Đánh dấu Giải quyết bình luận: Thẻ chuyển sang trạng thái mờ dịu mắt (opacity 0.65), chữ vẫn hoàn toàn đọc được rõ ràng.
