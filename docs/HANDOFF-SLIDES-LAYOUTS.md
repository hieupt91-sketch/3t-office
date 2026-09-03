# Agent Handoff — Layout Chọn Sẵn Thật Cho VN Slides (Slide Layouts)

**TASK:** Triển khai tính năng Slide Layouts (Layout chọn sẵn) thật cho VN Slides (Tier 1 Feature Parity, tham khảo PowerPoint & LibreOffice Impress).  
**AGENT/ROLE:** Antigravity (UI, Canvas & Adapter Agent)  
**BRANCH:** `feature/slides-layouts`  
**WORKTREE:** `E:\VNOffice-agy-layouts`  
**DATE:** 2026-09-04  

---

## 1. Mục tiêu Đã Hoàn thành

1. **Khai báo Lệnh & Ánh xạ UNO chuẩn mực:**
   - Khai báo commands `slides.layout.apply` ("Bố cục") và `slides.layout.select` ("Chọn bố cục") trong `platform/commands/command-definitions.js`.
   - Ánh xạ 2 chiều sang lệnh UNO `.uno:AssignLayout` trong `adapters/libreoffice/common/command-dispatch-mapper.js`.
   - Thiết kế SVG vector chuyên nghiệp đa sắc độ `slideLayout` chuẩn bộ nhận diện Office Suite trong `platform/ui-kit/icons.js` (không dùng icon chung chung hay vòng tròn rỗng).
   - Tích hợp nút lệnh "Bố cục" vào thanh Ribbon VN Slides tại cả tab **Trang đầu** (`home`, nhóm "Trang chiếu") và tab **Thiết kế** (`design`, nhóm "Bố cục trang").

2. **Hệ thống 4 Bố cục Chuẩn hóa (Enterprise Presets):**
   - `title-only` (**Tiêu đề** / Title Slide): Tiêu đề cỡ lớn (44px) căn giữa trang chiếu, phần thân tự động ẩn.
   - `title-content` (**Tiêu đề + Nội dung** / Title & Content - mặc định): Tiêu đề trên đầu (32px), một khung nội dung chính soạn thảo tự do.
   - `two-content` (**Hai nội dung** / Two Content): Tiêu đề trên đầu kèm 2 cột nội dung độc lập (`body` & `body2`) đặt trong flex container (`.vno-slide-body-row`), cho phép nhập liệu, chọn lựa, và chỉnh sửa độc lập từng cột.
   - `blank` (**Trống** / Blank): Ẩn toàn bộ tiêu đề và nội dung mặc định, tạo canvas trắng hoàn toàn cho người dùng tự do chèn hình khối, hình ảnh, văn bản.

3. **Cơ chế Cô lập DOM & Dữ liệu Triệt để (Zero Cross-Slide Leakage):**
   - Mỗi slide lưu trữ thuộc tính `layoutType` riêng trong mảng `slides` (`{ id, title, body, body2, layoutType, shapes, ... }`).
   - Hàm `_applyLayoutToDom(layoutType)` đồng bộ trực tiếp thuộc tính `data-layout` trên thẻ canvas và điều chỉnh hiển thị của `titleEl`, `bodyRowEl`, `bodyEl`, `body2El`.
   - Khi chuyển đổi qua lại giữa các slide có bố cục khác nhau (ví dụ từ Hai nội dung sang Trống rồi sang Tiêu đề), DOM canvas lập tức cập nhật trạng thái tương ứng của slide đó mà không để rò rỉ styling hay nội dung sang slide kế tiếp.

4. **Hộp thoại Trực quan với Visual Previews (Interactive Layout Dialog):**
   - Phương thức `showLayoutDialog()` mở modal hiện đại hiển thị lưới 4 thẻ bố cục kèm hình ảnh preview SVG thu nhỏ sắc nét.
   - Thẻ đang được chọn sẽ có viền đỏ thương hiệu VN Office (`is-selected`).
   - Hỗ trợ thao tác nhấp đúp (double-click) để áp dụng ngay, hoặc chọn rồi bấm "Áp dụng cho trang này" / "Áp dụng tất cả".

5. **Đồng bộ Toàn diện Toàn bộ Tính năng Trình chiếu:**
   - **Filmstrip Thumbnails**: Cập nhật hàm `_renderThumbnails()` hiển thị trực quan layout của từng slide (blank không hiện text line, title-only căn giữa, two-content hiện 2 cột vạch mô phỏng).
   - **F5 SlideShow**: Trình chiếu toàn màn hình tự động phân nhánh render HTML theo đúng bố cục của từng slide (cột đôi, tiêu đề lớn căn giữa, hoặc trống).
   - **Presenter Mode**: Chế độ người thuyết trình hiển thị thẻ xem trước phân chia đúng 2 cột hoặc tiêu đề lớn, đồng bộ hoàn hảo với Speaker Notes và đồng hồ bấm giờ.
   - **Undo / Redo**: Lưu lại lịch sử thay đổi layout và nội dung cột 2 (`body2`), cho phép hoàn tác và làm lại trơn tru.

6. **Lưu/Đọc Chuẩn File FODP (ODF Presentation Standard):**
   - Trong `SlidesAdapter.serializeToFodp()`: Đóng gói thuộc tính `presentation:layout="two-content"|"title-only"|"blank"|"title-content"`.
   - Đối với layout `two-content`, tuần tự hóa 2 thẻ khung riêng biệt: `presentation:class="subtitle"` cho cột 1 và `presentation:class="outline"` cho cột 2.
   - Trong `SlidesAdapter.parseFodp()`: Tự động trích xuất `presentation:layout` và tách hai khung văn bản nạp trở lại `body` và `body2` mà không làm hỏng tính tương thích ngược với các file FODP cũ.

---

## 2. Danh mục Tệp Thay đổi

1. `platform/ui-kit/icons.js`: Thêm icon vector chuẩn Office `slideLayout`.
2. `platform/commands/command-definitions.js`: Khai báo `slides.layout.apply` và `slides.layout.select`.
3. `adapters/libreoffice/common/command-dispatch-mapper.js`: Ánh xạ `.uno:AssignLayout`.
4. `apps/slides/slides-ribbon.js`: Thêm nút Bố cục vào nhóm "Trang chiếu" (Trang đầu) và "Bố cục trang" (Thiết kế).
5. `apps/slides/slides.css`: Bổ sung CSS cho `.vno-slide-body-row`, `.vno-slide-title.is-title-only`, hộp thoại `.vno-layouts-grid`, `.vno-layout-card`.
6. `apps/slides/slides-canvas.js`: Định nghĩa `SLIDE_LAYOUT_TYPES`, thêm `bodyRowEl`, `body2El`, các hàm `_applyLayoutToDom()`, `applySlideLayout()`, `getSlideLayout()`, `showLayoutDialog()`, cập nhật `selectSlide()`, `addNewSlide()`, `duplicateCurrentSlide()`, `_renderThumbnails()`, `startSlideShow()`, `startPresenterMode()`.
7. `apps/slides/slides-app.js`: Cập nhật mẫu trắng ban đầu khởi tạo `layoutType: "title-content"`.
8. `adapters/libreoffice/slides/slides-adapter.js`: Điều phối dispatch `slides.layout.apply` -> `canvas.showLayoutDialog()`; xử lý ghi/đọc layout và 2 cột trong `serializeToFodp()` & `parseFodp()`.
9. `tests/unit/slides-layouts.test.js`: Suite 18 với 15 unit tests toàn diện về 4 layouts, DOM mutation, cô lập dữ liệu, cột đôi, undo/redo, dispatch, FODP round-trip.
10. `tests/unit/adapter-mapping.test.js`: Kiểm thử dispatch `slides.layout.apply`.
11. `tests/smoke/html-smoke.test.js`: Kiểm thử render headless browser thật chuyển đổi bố cục và cột đôi.
12. `tests/run-tests.js`: Đăng ký suite 18 vào master runner.
13. `docs/FEATURE-PARITY-ROADMAP.md`: Đánh dấu `[x]` hoàn thành tính năng Layout chọn sẵn.

---

## 3. Kết quả Kiểm thử Đạt được

- **Syntax Check (`scripts/check-syntax.js`)**: 38/38 files PASS (0 lỗi cú pháp).
- **Master Test Runner (`tests/run-tests.js`)**: **215/215 PASS | 0 FAIL**.
- **Real Browser Headless (msedge.exe)**:
  - Nạp index.html và mount DOM VN Writer: **PASS**
  - Track Changes: **PASS**
  - Nạp VN Slides Studio & Speaker Notes: **PASS**
  - Mở Print Preview VN Writer: **PASS**
  - Chuyển đổi 4 Slide Layouts, cột đôi body2 & cô lập dữ liệu DOM thật: **PASS**
