# Handoff: VN Slides Object Animations & Speaker Notes (Tier 1 Parity)

**Thời gian hoàn thành:** 2026-09-04  
**Nhánh thực hiện:** `feature/slides-animations-notes` (tại worktree `E:\VNOffice-slides-anim`)  
**Tác giả:** Antigravity (Pair programming assistant)  
**Trạng thái kiểm thử:** 173/173 PASS | 0 FAIL (bao gồm kiểm thử cú pháp `node --check` và kiểm thử trình duyệt headless thật `msedge.exe`)

---

## 1. Tóm tắt nội dung đã hoàn thành

Đã triển khai hoàn chỉnh 2 tính năng Tier 1 cốt lõi còn thiếu của VN Slides theo chuẩn PowerPoint / LibreOffice Impress:

### 1.1. Animations cho đối tượng trong slide (Object Entrance Animations)
- **Hiệu ứng thật:** Hỗ trợ 5 kiểu hiệu ứng xuất hiện (Fade In, Fly In, Zoom In, Bounce In, Slide Left) và kiểu Không có ("none").
- **Cấu hình chi tiết:** Thời gian hiệu ứng (Duration: 300ms - 1000ms), Độ trễ xuất hiện (Delay: 0ms - 1000ms).
- **Lưu trữ chuẩn xác:** Cấu hình animation được lưu trực tiếp vào từng đối tượng:
  - `slide.titleAnimation = { type, duration, delay }` cho tiêu đề.
  - `slide.bodyAnimation = { type, duration, delay }` cho nội dung chính.
  - `shape.animation = { type, duration, delay }` cho từng hình khối vector hoặc hình ảnh trong `slide.shapes`.
- **Thực thi CSS Keyframes chuẩn xác khi trình chiếu F5:** Khi trình chiếu toàn màn hình, các đối tượng có animation sẽ bắt đầu ở trạng thái ẩn (`opacity: 0`), sau đó kích hoạt keyframe CSS thật tương ứng tại thời điểm slide hiện lên với `forwards` fill-mode (không phải animation tĩnh chạy sẵn khi tải trang). Khi chuyển giữa các slide (Next/Prev), hiệu ứng được reset và kích hoạt lại đúng thời điểm slide mục tiêu xuất hiện.
- **Hộp thoại Animation trực quan:** Tích hợp `showAnimationDialog()` cho phép chọn đối tượng cần áp dụng (Tiêu đề, Nội dung, Hình khối/Ảnh), chọn kiểu, thời gian, độ trễ và có khung xem thử hiệu ứng trực tiếp với nút "▶ Xem thử hiệu ứng".
- **Giao diện Canvas Editor:** Khi chọn một hình khối hoặc văn bản trên canvas, đối tượng được viền chọn nổi bật; các hình khối có hiệu ứng hiển thị huy hiệu `★ [Tên hiệu ứng]` nhỏ ở góc.

### 1.2. Speaker Notes & Chế độ Presenter Console (Ghi chú người thuyết trình)
- **Bảng nhập ghi chú dưới Canvas:** Thêm bảng ghi chú chuyên dụng `vno-slide-notes-panel` bên dưới canvas. Mặc định ở trạng thái thu gọn tinh gọn (không chiếm không gian làm việc), có nút bấm bật/tắt (hoặc phím tắt / lệnh ribbon). Khi mở rộng cho phép người thuyết trình soạn thảo ghi chú thoải mái kèm bộ đếm số ký tự trực quan theo thời gian thực.
- **Cô lập dữ liệu 100% giữa các slide (Không rò rỉ chéo):** Mỗi trang chiếu trong `this.slides` sở hữu trường `notes: ""` riêng biệt. Khi chuyển slide bằng click thumbnail, phím tắt hoặc code, textarea lập tức nạp đúng dữ liệu ghi chú của slide được kích hoạt. Thao tác chỉnh sửa ở slide A tuyệt đối không làm thay đổi slide B.
- **Bảo mật nội dung khi trình chiếu F5 cho khán giả:** Chế độ `startSlideShow()` (F5 / Shift+F5) giữ nguyên màn hình chiếu sạch đẹp cho khán giả, KHÔNG hiển thị ghi chú người thuyết trình.
- **Chế độ Presenter Console (`startPresenterMode` / Alt+F5):**
  - Màn hình dành riêng cho người thuyết trình với giao diện tối chuyên nghiệp.
  - Hiển thị song song: Màn hình thu nhỏ của trang chiếu hiện tại + Khung đọc ghi chú người thuyết trình cỡ chữ lớn (có nút tăng/giảm cỡ chữ A+/A-).
  - Khung xem trước trang chiếu kế tiếp (Next Slide Preview) giúp người thuyết trình chủ động chuẩn bị lời dẫn.
  - Đồng hồ đếm thời gian thuyết trình (Stopwatch `hh:mm:ss`) và đồng hồ thời gian thực cục bộ.
  - Điều hướng slide mượt mà bằng cả chuột lẫn phím (Space, Mũi tên, PageUp/Down, Esc).
- **Lưu trữ & Chuyển đổi định dạng tệp chuẩn (FODP / PPTX):** Cập nhật `serializeToFodp()` để lưu Speaker Notes vào thẻ chuẩn `<presentation:notes>` của chuẩn OpenDocument. Cập nhật `parseFodp()` để đọc lại đầy đủ ghi chú tiếng Việt có dấu và cô lập không để văn bản ghi chú lẫn vào `slide.body`.

---

## 2. Ánh xạ lệnh Command Bus & UNO Adapter

Tuân thủ nghiêm ngặt nguyên tắc của bộ ứng dụng: không đăng ký trùng lệnh, mọi command ID đều có mapping UNO 2 chiều rõ ràng:

| VN Command ID | Danh mục | Nhãn hiển thị | Phím tắt | UNO Mapping | Hành vi Adapter |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `slides.animation.apply` | `animation` | Hiệu ứng đối tượng | — | `.uno:CustomAnimation` | `canvas.showAnimationDialog()` |
| `slides.notes.toggle` | `view` | Ghi chú thuyết trình | — | `.uno:InsertAnnotation` | `canvas.toggleNotes()` |
| `slides.show.presenterMode` | `show` | Chế độ Presenter | `Alt+F5` | `.uno:PresenterConsole` | `canvas.startPresenterMode()` |

Thanh Ribbon của VN Slides được cập nhật thêm tab "Hoạt hình" (Animations), nhóm "Người thuyết trình" trong tab "Trình chiếu" (Slide Show), và nút gắn nhanh trong tab "Trang đầu" (Home).

---

## 3. Giới hạn kỹ thuật đã biết (Known Limitations)

- **Môi trường Web & Chế độ Presenter:** Do môi trường trình duyệt web và WebView2 có các ràng buộc bảo mật về sandbox màn hình (không thể tự ý mở cửa sổ độc lập toàn quyền trên màn hình thứ hai của hệ điều hành mà không có sự tương tác qua API desktop chuyên sâu), Chế độ Presenter hiện được triển khai dưới dạng bảng điều khiển overlay tương tác cao cấp trong cùng cửa sổ làm việc.
- **File I/O:** FODP serialize/parse lưu trữ đầy đủ `presentation:notes`. Cấu hình animation hiện được lưu trong cấu trúc dữ liệu JSON/model của ứng dụng. Khi lưu FODP, LibreOffice Impress chuyển đổi nội dung và ghi chú chuẩn xác sang PPTX/ODP/PDF.

---

## 4. Tệp đã sửa đổi

1. `platform/commands/command-definitions.js`: Định nghĩa các lệnh `slides.animation.apply`, `slides.notes.toggle`, `slides.show.presenterMode`.
2. `adapters/libreoffice/common/command-dispatch-mapper.js`: Ánh xạ 2 chiều giữa các VN Command và các `.uno:` command tương ứng.
3. `adapters/libreoffice/slides/slides-adapter.js`: Điều phối dispatch và tích hợp `<presentation:notes>` trong `serializeToFodp` / `parseFodp`.
4. `apps/slides/slides-canvas.js`: Quản lý state animation & notes, render panel ghi chú, dialog animation, F5 slideshow với CSS animation, và chế độ Presenter Console.
5. `apps/slides/slides-ribbon.js`: Bổ sung tab Hoạt hình và các nhóm lệnh tương ứng trên Ribbon.
6. `apps/slides/slides.css`: Định nghĩa keyframes CSS cho animation, badge trên canvas, styling cho notes panel và presenter view.
7. `tests/unit/slides-animations-notes.test.js`: Bộ kiểm thử đơn vị độc lập 8 bài test toàn diện.
8. `tests/smoke/html-smoke.test.js`: Bổ sung kiểm thử nạp và render DOM VN Slides qua trình duyệt headless thật (`msedge.exe`).
9. `tests/run-tests.js`: Kích hoạt Suite 13 vào luồng kiểm thử tự động toàn Suite.
10. `docs/FEATURE-PARITY-ROADMAP.md`: Cập nhật trạng thái `[x]` của Animations và Speaker Notes.
