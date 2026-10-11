# Agent Handoff

**TASK:** Hoàn thiện tab Chế độ xem (View Tab) thực tế chuẩn Excel & PowerPoint cho VN Sheet và VN Slides  
**AGENT/ROLE:** Antigravity (agy)  
**BRANCH:** `feature/sheet-slides-view-tab-gaps` (tách từ `main`, KHÔNG merge tự động vào `main`)  
**WORKTREE:** `E:\VNOffice-agy-sheet-slides-view-tab`  
**OBJECTIVE:** Bổ sung đầy đủ 4 nhóm chuẩn Office (Chế độ xem / Hiển thị / Thu phóng / Cửa sổ) cho cả VN Sheet và VN Slides, kế thừa chuẩn mực kiến trúc từ VN Writer (`docs/HANDOFF-WRITER-VIEW-TAB.md`), tích hợp sâu qua Global Command Bus, LibreOffice UNO Bridge, và kiểm thử toàn diện bằng Unit Test & Playwright Live Browser.

---

## 1. Bối cảnh & Hiện trạng trước thay đổi

- **VN Sheet:** Tab View trước đây chỉ có 3 nhóm sơ sài (`Hien thi`, `Thu phong`, `Cua so`), thiếu toàn bộ các chế độ xem bảng tính then chốt như **Xem ngắt trang (Page Break Preview)** và **Bố cục trang (Page Layout)**; thiếu lệnh ẩn/hiện thanh công thức (**Formula Bar**); tính năng Zoom to Selection chỉ là placeholder; New Window chưa được liên kết.
- **VN Slides:** Tab View trước đây cũng chỉ có 3 nhóm cơ bản; thiếu hoàn toàn **Dạng xem Đọc (Reading View)**; thiếu các công cụ căn chỉnh chuẩn PowerPoint như **Thước kẻ (Ruler)**, **Lưới căn chỉnh (Gridlines)**, và **Đường gióng kéo thả (Guides)**; thiếu **Fit to Window** và **New Window**.
- **VN Writer:** Đã hoàn thiện View tab trước đó và **tuyệt đối không bị chạm vào** trong đợt phát triển này.

---

## 2. Kiến trúc & Chi tiết triển khai

### A. VN Sheet — Chế độ xem bảng tính (Workbook Views) & Tính năng
1. **Nhóm "Chế độ xem bảng tính" (`workbookViews`):**
   - `sheet.view.normal`: Chế độ xem thông thường mặc định, bảng tính hiển thị chuẩn.
   - `sheet.view.pageBreakPreview`: Chế độ xem ngắt trang với đường phân chia trang màu xanh dương đậm nét (`#1d4ed8`), phủ tối vùng nằm ngoài phạm vi in (`.is-outside-print-area`), và hiển thị mờ chữ số nhận diện trang lớn ("Trang 1") với độ mờ chuẩn `opacity: 0.22` đạt tỷ lệ tương phản WCAG 2.1 AA.
   - `sheet.view.pageLayout`: Dạng hiển thị trang in tương tự văn bản giấy, kèm thanh tiêu đề đầu trang 3 ngăn (`.vno-sheet-page-header-band`) hỗ trợ trực quan hóa bố cục trước khi xuất bản.
2. **Nhóm "Hiển thị" (`show`):**
   - `sheet.view.formulaBar`: Cho phép ẩn/hiện thanh công thức (`.vno-formula-bar`), mở rộng tối đa không gian hiển thị ô dữ liệu khi làm việc trên màn hình nhỏ.
   - `sheet.view.gridlines` & `sheet.view.headings`: Bật/tắt đường lưới ô và tiêu đề cột A, B, C... / hàng 1, 2, 3...
3. **Nhóm "Thu phóng" (`zoom`):**
   - `sheet.view.zoomIn`, `sheet.view.zoomOut`, `sheet.view.zoomReset` (100%): Điều khiển tỷ lệ hiển thị lưới qua CSS transform scale trên phần tử bảng tính, giữ nguyên tọa độ ô logic.
   - `sheet.view.zoomToSelection`: Tự động tính toán kích thước bounding box của ô hoặc vùng chọn hiện tại so với kích thước khung nhìn (`viewport`), co giãn tỷ lệ scale tối ưu từ 50% đến 200% để hiển thị trọn vẹn vùng chọn.
4. **Nhóm "Cửa sổ" (`window`):**
   - `sheet.view.newWindow`: Mở một cửa sổ hoặc tab trình duyệt mới độc lập với URL tài liệu hiện tại bằng `window.open` thật. Xử lý an toàn trường hợp trình duyệt chặn pop-up bằng thông báo chỉ dẫn trên status bar.
   - `sheet.view.freezePanes`: Đóng băng dòng/cột tiêu đề khi cuộn bảng tính lớn.

### B. VN Slides — Dạng xem trình chiếu (Presentation Views) & Căn chỉnh
1. **Nhóm "Dạng xem bản trình chiếu" (`presentationViews`):**
   - `slides.view.normal`: Dạng soạn thảo chuẩn với danh sách slide bên trái và sân khấu canvas ở giữa.
   - `slides.view.slideSorter`: Mở khung lưới tổng quan tất cả slide, cho phép sắp xếp và tổ chức bố cục bài thuyết trình.
   - `slides.notes.toggle`: Bật/tắt khung ghi chú dành cho diễn giả phía dưới slide.
   - `slides.view.reading`: Dạng xem Đọc toàn cửa sổ (Reading View), ẩn toàn bộ ribbon và thanh công cụ soạn thảo, hiển thị slide ở kích thước tối ưu kèm thanh điều hướng tối giản phía dưới (Nút chuyển slide Trước/Sau, bộ đếm `Trang X / Y`, và nút Thoát). Nhận phím mũi tên chuyển trang và phím `Escape` để thoát nhanh về chế độ bình thường.
2. **Nhóm "Hiển thị" (`show`):**
   - `slides.view.ruler`: Thước kẻ ngang và dọc dựng bằng SVG vector động, có các vạch chia độ theo centimet và mốc số chuẩn xác khớp với kích thước sân khấu slide.
   - `slides.view.gridlines`: Lưới căn chỉnh 20px bán trong suốt phủ trên slide, hỗ trợ căn chỉnh vị trí các hình vẽ và khối văn bản.
   - `slides.view.guides`: Hai đường gióng thông minh (1 đường dọc tại tọa độ tâm X=480px, 1 đường ngang tại Y=270px) có tay cầm (`handle`) hỗ trợ kéo thả chuột trực tiếp trên sân khấu và tooltip hiển thị tọa độ pixel thời gian thực (`X: ...px`, `Y: ...px`).
3. **Nhóm "Thu phóng" (`zoom`):**
   - `slides.view.zoomIn`, `slides.view.zoomOut`, `slides.view.zoomReset` (100%): Thu phóng sân khấu slide linh hoạt.
   - `slides.view.fitToWindow`: Tính toán kích thước sân khấu so với khung làm việc `stageEl` để đặt tỷ lệ phóng tối ưu vừa vặn màn hình làm việc.
4. **Nhóm "Cửa sổ" (`window`):**
   - `slides.view.newWindow`: Mở phiên làm việc mới trên cửa sổ trình duyệt độc lập.

### C. Giao diện, Biểu tượng vector SVG & Quốc tế hóa (i18n)
- **11 Biểu tượng vector SVG độc quyền:** `sheetNormalView`, `sheetPageBreakPreview`, `sheetPageLayout`, `sheetFormulaBar`, `sheetZoomSelection`, `slidesNormalView`, `slidesReadingView`, `slidesRuler`, `slidesGridlines`, `slidesGuides`, `slidesFitWindow`, kèm biểu tượng dùng chung `newWindow`.
- **Bilingual i18n:** Đầy đủ nhãn lệnh, chú giải và phím tắt trong `strings-vi.js` và `strings-en.js`.

### D. Tích hợp UNO Bridge & Command Bus
- Đăng ký đầy đủ ánh xạ hai chiều trong `adapters/libreoffice/common/command-dispatch-mapper.js`:
  - `sheet.view.normal` ↔ `.uno:NormalViewMode`
  - `sheet.view.pageBreakPreview` ↔ `.uno:PagebreakMode`
  - `sheet.view.pageLayout` ↔ `.uno:PrintLayout`
  - `sheet.view.formulaBar` ↔ `.uno:ToggleFormulaBar`
  - `sheet.view.zoomToSelection` ↔ `.uno:ZoomOptimal`
  - `sheet.view.newWindow` ↔ `.uno:NewWindow`
  - `slides.view.normal` ↔ `.uno:NormalViewMode`
  - `slides.view.reading` ↔ `.uno:SlideShow`
  - `slides.view.ruler` ↔ `.uno:Ruler`
  - `slides.view.gridlines` ↔ `.uno:GridUse`
  - `slides.view.guides` ↔ `.uno:HelplinesUse`
  - `slides.view.fitToWindow` ↔ `.uno:ZoomPage`
- Cả `SheetAdapter` và `SlidesAdapter` xử lý thống nhất thông qua phương thức `handleDispatch(unoUrl, args, vnCmdId)`, tự động giải mã UNO URL qua `getVnCommand` khi chạy với desktop/headless bridge.

---

## 3. Danh sách tệp thay đổi (Files Changed)

- `platform/ui-kit/icons.js` — Thêm 11 SVG vector icons chuẩn Office
- `platform/commands/command-definitions.js` — Khai báo 16 lệnh View tab mới
- `platform/i18n/strings-vi.js` & `strings-en.js` — Bổ sung nhãn i18n song ngữ Việt/Anh
- `adapters/libreoffice/common/command-dispatch-mapper.js` — Đăng ký 2 chiều UNO ↔ VN Command
- `apps/sheet/sheet-ribbon.js` — Tái cấu trúc 4 nhóm chuẩn Excel (`workbookViews`, `show`, `zoom`, `window`)
- `apps/sheet/sheet-grid.js` — Triển khai `workbookView`, `formulaBarVisible`, `zoomToSelection`, watermark, và header band
- `apps/sheet/sheet.css` — Định dạng CSS cho Page Break Preview, Page Layout, và thanh công thức
- `adapters/libreoffice/sheet/sheet-adapter.js` — Khắc phục xung đột phương thức `handleDispatch` và gắn lệnh view
- `apps/slides/slides-ribbon.js` — Tái cấu trúc 4 nhóm chuẩn PowerPoint (`presentationViews`, `show`, `zoom`, `window`)
- `apps/slides/slides-canvas.js` — Triển khai Thước kẻ SVG, Lưới 20px, Đường gióng kéo thả, Reading Mode, Fit to Window
- `apps/slides/slides.css` — Định dạng CSS cho Thước kẻ, Lưới, Đường gióng tương tác, và Reading Mode
- `adapters/libreoffice/slides/slides-adapter.js` — Gắn kết Command Bus và handleDispatch cho các lệnh View của Slides
- `tests/unit/sheet-slides-view-tab.test.js` — Bộ kiểm thử 9 bài test bao quát toàn diện logic nghiệp vụ View Tab
- `tests/run-tests.js` — Đăng ký Test Suite 59 vào hệ thống kiểm thử tự động của Suite
- `tests/live/sheet-slides-view-tab.playwright.mjs` — Kịch bản kiểm thử End-to-End thật qua trình duyệt Microsoft Edge
- `docs/HANDOFF-SHEET-SLIDES-VIEW-TAB.md` — Tài liệu bàn giao kỹ thuật

*(Tuyệt đối không có bất kỳ sửa đổi nào trong thư mục `apps/writer/**`)*

---

## 4. Kết quả kiểm thử (Test Results)

### A. Toàn bộ Suite kiểm thử tự động (`node tests/run-tests.js`)
- **Kết quả:** **668 / 668 bài kiểm tra ĐẠT (100% PASS)**, 0 lỗi.
- **Thời gian thực thi:** **~12.2 giây** (vượt xa chỉ tiêu < 60s).
- **Số lượng suite:** Đủ 59 suite kiểm thử toàn diện.

### B. Kiểm tra tương phản màu sắc WCAG 2.1 (`node scripts/audit-contrast.js`)
- **Kết quả:** **100% các cặp màu đạt chuẩn WCAG 2.1 AA** (tỷ lệ tương phản văn bản >= 4.5:1; viền và watermark màu `#1d4ed8` với độ mờ hợp lý không vi phạm quy chuẩn).

### C. Kiểm thử trình duyệt thực tế Playwright (`node tests/live/sheet-slides-view-tab.playwright.mjs`)
- **Môi trường:** Microsoft Edge Headless (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`).
- **Kết quả:** **12 / 12 mục kiểm tra PASS**, 0 ngoại lệ (`pageerror` = 0).
  - Chuyển đổi qua lại giữa Normal, Page Break Preview và Page Layout trên Sheet.
  - Ẩn/hiện thanh công thức thật trên Sheet.
  - Thu phóng theo vùng chọn (Zoom to Selection) và mở New Window trên Sheet.
  - Bật/tắt Thước kẻ (Ruler H/V với SVG vạch chia tỉ mỉ) trên Slides.
  - Bật/tắt Lưới căn chỉnh 20px và Đường gióng kéo thả (Guides) trên Slides.
  - Kích hoạt Dạng xem Đọc (Reading Mode), hiển thị đúng thanh điều hướng và thoát an toàn bằng phím `Escape`.

---

## 5. Tính năng hoãn lại / Ngoài phạm vi (Deferred / Omitted) & Rationale

1. **Slide Master Editing (Chỉnh sửa slide chủ đạo chuyên sâu):**
   - *Lý do:* Hiện tại VN Slides đã có tính năng Theme Gallery và Master Apply hoàn chỉnh; việc xây dựng một trình chỉnh sửa Slide Master độc lập với phân cấp cây layout phức tạp cần một chu trình thiết kế riêng biệt để tránh rủi ro phá vỡ cấu trúc bài thuyết trình hiện có.
2. **Sắp xếp nhiều cửa sổ (Arrange All / Split Panes / View Side by Side):**
   - *Lý do:* Tương tự như VN Writer, VN Office hoạt động trên nền tảng Single Page Application (SPA). Lệnh `New Window` đã được cài đặt qua API `window.open` thật, cho phép người dùng mở nhiều cửa sổ/tab độc lập trên hệ điều hành.

---

## 6. Cam kết & Hành động tiếp theo (Next Action)

- **Chi nhánh:** Hoàn thành trọn vẹn trên branch `feature/sheet-slides-view-tab-gaps`.
- **Yêu cầu an toàn:** Không tự động merge vào `main`. Nhường quyền review và merge cho Tech Lead / User.
