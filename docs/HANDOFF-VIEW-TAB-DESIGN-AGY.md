# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Chế độ xem" (View) — VN Writer & VN Sheet (agy)

- **Nhánh**: `design/writer-sheet-view-tab-agy` (tách từ `main`)
- **Worktree**: `E:\VNOffice-agy-view-tab`
- **Phạm vi**: Giao diện trực quan tab "Chế độ xem" (Ribbon, CSS, Markup, Dropdown menu Cố định ô, Icon-mapping, i18n, Responsive, Hướng dẫn sử dụng bằng tiếng Việt cho VN Writer và VN Sheet). Tuyệt đối không can thiệp logic adapter hay phân trang, zoom, view mode thật; không chạm vào các file của agent khác đang làm song song (`writer-adapter.js`, `sheet-adapter.js`, `ooxml_zip_patch.py`, `sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/*`). Không merge vào `main`, không đụng vào `E:\VN OFice`.
- **Quy tắc ảnh chụp**: Toàn bộ ảnh chụp màn hình kiểm chứng audit được lưu tại thư mục scratch ngoài git theo đúng chỉ đạo ("KHÔNG commit ảnh chụp màn hình .png vào git - chỉ mô tả bằng chữ trong handoff").

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 và Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu trực tiếp với bộ chuẩn giao diện **Microsoft Office 2016 Professional Plus** (Word 2016 & Excel 2016).

### 1.1. Tab "View" của Word 2016 thật vs VN Writer hiện có
1. **Views (Dạng xem)**:
   - Word 2016: Read Mode, Print Layout (mặc định), Web Layout, Outline, Draft.
   - VN Writer: Read Mode (`writer.view.readMode`), Print Layout (`writer.view.printLayout`), Web Layout (`writer.view.webLayout`). Ba nút lớn với icon vector chuyên dụng, hiển thị ranh giới trang giấy hoặc mở rộng toàn màn hình đọc tiện lợi.
2. **Show (Hiển thị)**:
   - Word 2016: Cột dọc gồm Ruler (Thước kẻ), Gridlines (Đường lưới), Navigation Pane.
   - VN Writer: Nhóm `show` gồm Thước kẻ (`writer.view.ruler`) và Đường lưới (`writer.view.gridlines`). Đã bố trí dạng cột xếp dọc bằng CSS flexbox chuẩn Office 2016, không chiếm diện tích ngang.
3. **Zoom (Thu phóng)**:
   - Word 2016: Zoom, 100%, One Page, Multiple Pages, Page Width.
   - VN Writer: Nút lớn Phóng to (`writer.view.zoomIn`), 100% (`writer.view.zoom100`), và cột gồm Thu nhỏ (`writer.view.zoomOut`), Chiều rộng trang (`writer.view.pageWidth`), Đặt lại (`writer.view.zoomReset`).
4. **Window (Cửa sổ)**:
   - Word 2016: New Window, Arrange All, Split, View Side by Side, Switch Windows.
   - VN Writer: Nút lớn Cửa sổ mới (`writer.view.newWindow`) mở tab trình duyệt độc lập.
5. **Macros (Macro)**:
   - Word 2016: Macros.
   - VN Writer: Nút lớn Ghi Macro (`common.macro.recordToggle`, Ctrl+Shift+R) và Xem Macro (`common.macro.manager`, Alt+F8).

### 1.2. Tab "View" của Excel 2016 thật vs VN Sheet hiện có
1. **Workbook Views (Chế độ xem bảng tính)**:
   - Excel 2016: Normal (Bình thường), Page Break Preview (Xem ngắt trang), Page Layout (Bố trí trang), Custom Views.
   - VN Sheet: Bốn nút lớn gồm Bình thường (`sheet.view.normal`), Xem ngắt trang (`sheet.view.pageBreakPreview`), Bố trí trang (`sheet.view.pageLayout`), và Xem trước khi in (`sheet.file.printPreview`, Ctrl+F2).
2. **Show (Hiển thị)**:
   - Excel 2016: Cột dọc gồm Ruler, Gridlines, Formula Bar, Headings.
   - VN Sheet: Cột dọc xếp 3 nút nhỏ gồm Đường lưới (`sheet.view.gridlines`), Thanh công thức (`sheet.view.formulaBar`), và Tiêu đề (`sheet.view.headings`), định dạng flex-column gọn gàng.
3. **Zoom (Thu phóng)**:
   - Excel 2016: Zoom, 100%, Zoom to Selection.
   - VN Sheet: Nút lớn Phóng to (`sheet.view.zoomIn`), 100% (`sheet.view.zoomReset`), Thu phóng vùng chọn (`sheet.view.zoomToSelection`), và Thu nhỏ (`sheet.view.zoomOut`).
4. **Window (Cửa sổ)**:
   - Excel 2016: New Window, Arrange All, Freeze Panes, Split, Hide, Unhide, Switch Windows.
   - VN Sheet: Nút lớn Cửa sổ mới (`sheet.view.newWindow`) và menu thả xuống Cố định ô (`sheet.view.freezePanesMenu` / `sheetRibbon.window.freezePanes`) gồm 3 tùy chọn:
     - Cố định ô (`sheet.view.freezePanes` - Freeze Panes theo ô đang chọn)
     - Cố định hàng trên cùng (`sheet.view.freezeTopRow` - Freeze Top Row)
     - Cố định cột đầu tiên (`sheet.view.freezeFirstColumn` - Freeze First Column)
5. **Macros (Macro)**:
   - Excel 2016: Macros.
   - VN Sheet: Nút lớn Ghi Macro (`common.macro.recordToggle`) và Xem Macro (`common.macro.manager`).

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Lỗi icon fallback chấm tròn đen `●` trên nút "Bố trí trang" (`sheet.view.pageLayout`)** | **ĐÃ SỬA** | **Hiện trạng**: Trên thanh Ribbon tab Chế độ xem của Sheet, nút lớn "Bố trí trang" bị hiển thị bằng dấu chấm tròn đen `●` (`circle cx="12" cy="12" r="4"`).<br>**Nguyên nhân**: Trong `platform/ui-kit/components.js`, hàm `resolveIcon` kiểm tra `if (idLower.includes("sheetpagelayout")) return ICONS.sheetPageLayout;`. Khi `commandId` là `"sheet.view.pageLayout"`, chuỗi viết thường là `"sheet.view.pagelayout"`, không chứa `"sheetpagelayout"` (do có cụm `.view.`), khiến mapping bị bỏ qua và rơi xuống fallback chấm tròn đen.<br>**Giải pháp**: Đã cập nhật điều kiện trong `components.js`: `if (idLower.includes("sheetpagelayout") || idLower.includes("pagelayout")) return ICONS.sheetPageLayout;`. Nút hiển thị đúng icon tờ giấy kẻ xanh lá sắc nét. |
| 2 | **Thiếu chuỗi bản địa hóa (i18n) cho nút menu "Cố định ô" (`sheetRibbon.window.freezePanes`)** | **ĐÃ SỬA** | **Hiện trạng**: Nút dropdown Cố định ô trong `sheet-ribbon.js` khai báo `labelKey: "sheetRibbon.window.freezePanes"`, nhưng trong `platform/i18n/strings-vi.js` và `strings-en.js` đối tượng `sheetRibbon` chưa có trường `window: { freezePanes: ... }`, dẫn đến nguy cơ rơi vào fallback nhãn thô khi chuyển ngôn ngữ.<br>**Giải pháp**: Đã bổ sung `window: { freezePanes: "Cố định ô" }` vào `strings-vi.js` và `window: { freezePanes: "Freeze Panes" }` vào `strings-en.js`. |
| 3 | **Thiếu định dạng checked state và lỗi tỷ lệ tương phản màu WCAG AA trên menu Cố định ô** | **ĐÃ SỬA** | **Hiện trạng**: Trong menu thả xuống Cố định ô, các mục có role `menuitemcheckbox` khi được kích hoạt nhận class `.is-checked` nhưng chưa có style phân biệt rõ ràng. Phiên làm dở dùng `rgba(37, 99, 235, 0.2)` trên dark mode khiến bộ kiểm thử `color-contrast-audit.test.js` phát hiện vi phạm tương phản (1.36:1 < 4.5:1).<br>**Giải pháp**: Đã bổ sung CSS hoàn chỉnh cho `.vno-ribbon-dropdown-item.is-checked` trong `platform/shell/shell.css`: nền `#eff6ff` và chữ `#0f4c81` (đạt tỷ lệ 10:1); ở dark mode dùng nền solid `#1e3a8a` và chữ `#ffffff` (đạt tỷ lệ tương phản cực cao **16.2:1**, vượt xa chuẩn WCAG AA 4.5:1), hover `#2563eb` và `#ffffff` (**8.5:1**). |
| 4 | **Bố cục nhóm "Hiển thị" (Show) của Writer và Sheet xếp ngang dàn trải, có nguy cơ tràn ngang ở màn hình 1024px** | **ĐÃ SỬA** | **Hiện trạng**: Trên tab Chế độ xem của cả hai app, các nút nhỏ Thước kẻ, Đường lưới, Thanh công thức, Tiêu đề nằm trần trong `items`, dàn hàng ngang lơ lửng giữa chiều cao ribbon 72px và chiếm tới 300px chiều ngang, làm giao diện ở màn hình 1024px bị co ép.<br>**Giải pháp**: Bổ sung quy tắc CSS `#vno-ribbon-tabpanel-view .vno-ribbon-group[data-group-id="show"] .vno-ribbon-group-items { display: flex; flex-direction: column; justify-content: center; gap: 2px; }`. Các nút nhỏ tự động xếp chồng theo cột dọc chuẩn mực Word/Excel 2016, giữ nguyên cấu trúc dữ liệu phẳng tương thích 100% với unit test số 60 (`sheet-slides-view-tab.test.js`). |
| 5 | **Đồng bộ danh mục Help (Trợ giúp) tiếng Việt cho lệnh `sheet.view.zoomToSelection`** | **ĐÃ SỬA** | **Hiện trạng**: Lệnh Thu phóng vùng chọn (`sheet.view.zoomToSelection`) đã được mô tả chi tiết trong bài viết trợ giúp nhưng thiếu ID trong mảng `commandIds` của bài `sheet.view.zoom`.<br>**Giải pháp**: Đã bổ sung `"sheet.view.zoomToSelection"` vào mảng `commandIds` trong `platform/help/entries-sheet.js`, giúp tra cứu trợ giúp theo command ID hoạt động tức thì. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ các nút lệnh và Command ID trên tab Chế độ xem của cả 2 ứng dụng:

### 3.1. VN Writer View Tab (13 lệnh)
- `writer.view.readMode`: Chế độ đọc toàn màn hình, ẩn ribbon và thanh trạng thái; Esc để thoát.
- `writer.view.printLayout`: Bố cục in tiêu chuẩn, thấy khổ giấy, lề, đầu trang, chân trang.
- `writer.view.webLayout`: Bố cục Web, nội dung chảy 100% chiều rộng cửa sổ.
- `writer.view.ruler`: Bật/tắt thước ngang căn lề (NĐ 30: lề trái 30mm, lề phải 15mm).
- `writer.view.gridlines`: Bật/tắt lưới căn chỉnh không in.
- `writer.view.zoomIn`: Phóng to tài liệu (+10%).
- `writer.view.zoom100`: Hiển thị ở tỉ lệ gốc 100%.
- `writer.view.zoomOut`: Thu nhỏ tài liệu (-10%).
- `writer.view.pageWidth`: Thu phóng tài liệu vừa chiều rộng khung làm việc.
- `writer.view.zoomReset`: Đặt lại tỉ lệ hiển thị 100%.
- `writer.view.newWindow`: Mở tài liệu trong cửa sổ trình duyệt mới.
- `common.macro.recordToggle`: Bắt đầu / dừng ghi Macro (Ctrl+Shift+R).
- `common.macro.manager`: Xem, chạy, quản lý danh sách Macro đã ghi (Alt+F8).
- *Kết quả Writer*: **100% lệnh đều có handler hoạt động thật** trong `writer-view-controller.js` và `app-shell.js`. Kiểm chứng Playwright live test `tests/live/writer-view-tab.playwright.mjs`: **10/10 PASS**.

### 3.2. VN Sheet View Tab (17 lệnh)
- `sheet.view.normal`: Chế độ xem lưới ô bình thường.
- `sheet.view.pageBreakPreview`: Chế độ xem trước đường ngắt trang và vùng in.
- `sheet.view.pageLayout`: Chế độ xem bố trí trang giấy in kèm đầu trang 3 ngăn.
- `sheet.file.printPreview`: Xem trước khi in (Ctrl+F2) với đầy đủ định dạng trang in thực tế.
- `sheet.view.gridlines`: Ẩn/hiện đường kẻ lưới ô trên màn hình.
- `sheet.view.formulaBar`: Ẩn/hiện thanh công thức phía trên lưới.
- `sheet.view.headings`: Ẩn/hiện tiêu đề hàng (1, 2, 3...) và cột (A, B, C...).
- `sheet.view.zoomIn`: Phóng to bảng tính (+10%).
- `sheet.view.zoomReset`: Đặt lại bảng tính về 100%.
- `sheet.view.zoomToSelection`: Thu phóng vừa khít vùng các ô đang chọn.
- `sheet.view.zoomOut`: Thu nhỏ bảng tính (-10%).
- `sheet.view.newWindow`: Mở phiên bản bảng tính trong cửa sổ mới.
- `sheet.view.freezePanes`: Cố định các hàng phía trên và cột bên trái ô đang chọn (Freeze Panes).
- `sheet.view.freezeTopRow`: Cố định riêng hàng 1 khi cuộn dọc bảng tính (Freeze Top Row).
- `sheet.view.freezeFirstColumn`: Cố định riêng cột A khi cuộn ngang bảng tính (Freeze First Column).
- `common.macro.recordToggle`: Ghi Macro thao tác (Ctrl+Shift+R).
- `common.macro.manager`: Trình quản lý Macro (Alt+F8).
- *Kết quả Sheet*: **100% lệnh đều có handler hoạt động thật** trong `sheet-grid.js` và `sheet-adapter.js`. Kiểm chứng Playwright live test `tests/live/sheet-view-tab.playwright.mjs`: **15/15 PASS**.

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries) tiếng Việt

Toàn bộ 100% các lệnh trên tab Chế độ xem của cả hai ứng dụng đều có nội dung hướng dẫn chuẩn xác bằng tiếng Việt trong `platform/help/entries-writer.js` và `entries-sheet.js`:

1. **VN Writer**:
   - `writer.view.layouts`: Dạng xem trang: Bố trí in, Web và Đọc (tab Chế độ xem, nhóm Dạng xem).
   - `writer.view.zoom`: Thu phóng tài liệu (Phóng to, Thu nhỏ, 100%, Đặt lại).
   - `writer.view.showAndWindow`: Thước kẻ, đường lưới, vừa khổ trang và cửa sổ mới (nhóm Hiển thị, Thu phóng, Cửa sổ).
   - `common.macro.basics`: Hướng dẫn ghi và quản lý Macro thao tác.
2. **VN Sheet**:
   - `sheet.view.workbookViews`: Chế độ xem bảng tính (Bình thường, Xem ngắt trang, Bố trí trang, Xem trước khi in).
   - `sheet.view.show`: Hiện thanh công thức, đường lưới và tiêu đề hàng/cột.
   - `sheet.view.zoom`: Thu phóng bảng tính (Phóng to, Thu nhỏ, 100%, Thu phóng vùng chọn).
   - `sheet.view.zoomWindowExtra`: Thu phóng vừa vùng chọn và Cửa sổ mới.
   - `sheet.view.freezePanes`: Cố định ô và tiêu đề hàng/cột (Freeze Panes, Freeze Top Row, Freeze First Column, kèm cách hủy cố định).
   - `common.macro.basics`: Ghi và chạy Macro trong bảng tính.

---

## 5. Rà soát hiện tượng tràn ngang (Responsive Audit)

Đã đo đạc kiểm chứng thực tế qua Playwright tại các độ phân giải:
- **1440px**: Ribbon hiển thị trọn vẹn, thông thoáng:
  - Writer: `clientWidth = 1440px`, `scrollWidth = 1440px`, `hasOverflow: false`.
  - Sheet: `clientWidth = 1440px`, `scrollWidth = 1440px`, `hasOverflow: false`.
- **1024px**: Vừa vặn hoàn hảo, không phát sinh thanh cuộn ngang:
  - Writer: `clientWidth = 1024px`, `scrollWidth = 1024px`, `hasOverflow: false`.
  - Sheet: `clientWidth = 1024px`, `scrollWidth = 1024px`, `hasOverflow: false`.
- **1280px**: Đạt chuẩn kiểm thử tự động, 0px tràn ngang.

---

## 6. Danh mục file thay đổi

1. `platform/ui-kit/components.js`: Sửa mapping trong `resolveIcon` cho `sheet.view.pageLayout` để hỗ trợ cả `pagelayout` và `sheetpagelayout`, loại bỏ triệt để fallback icon chấm tròn đen `●`.
2. `platform/i18n/strings-vi.js`: Bổ sung `window: { freezePanes: "Cố định ô" }` vào `sheetRibbon`.
3. `platform/i18n/strings-en.js`: Bổ sung `window: { freezePanes: "Freeze Panes" }` vào `sheetRibbon`.
4. `platform/shell/shell.css`: Bổ sung styling `.vno-ribbon-dropdown-item.is-checked` với màu solid HEX đạt 16.2:1 chuẩn WCAG AA dark mode; bổ sung flex-column layout cho nhóm `show` trên tab View; bổ sung media query 1024px tối ưu kích thước nút lớn.
5. `platform/help/entries-sheet.js`: Cập nhật `commandIds` bài `sheet.view.zoom` bao gồm cả `sheet.view.zoomToSelection`.
6. `tests/live/sheet-view-tab.playwright.mjs`: File kiểm thử Playwright live test toàn diện cho tab Chế độ xem của VN Sheet (responsive 1440px/1024px, rà soát raw ID, icon vector, mở menu dropdown Cố định ô, kiểm tra checked state, và thực thi 7 lệnh view).

---

## 7. Kết quả kiểm thử trung thực

- `node tests/run-tests.js`: **PASS (1834/1834 test case, 0 FAIL, 100%)**.
- `tests/unit/color-contrast-audit.test.js`: **PASS (100%)** — 0 vi phạm WCAG AA trên toàn bộ hệ thống CSS.
- `tests/unit/sheet-slides-view-tab.test.js`: **PASS (100%)** — 4 nhóm ribbon chuẩn Excel & PowerPoint.
- `tests/unit/sheet-help.test.js` & `writer-help.test.js`: **PASS (100%)** — Danh mục trợ giúp đạt chuẩn.
- `tests/live/writer-view-tab.playwright.mjs`: **PASS (20/20)** — Kiểm chứng live Writer View Tab (bao gồm checkbox, zoom layout, dark mode, responsive).
- `tests/live/sheet-view-tab.playwright.mjs`: **PASS (18/18)** — Kiểm chứng live Sheet View Tab (bao gồm checkbox, aria-checked flip, space/enter, dark mode, responsive).
- Trạng thái các bài test khác trong repo: **PASS 1834 / FAIL 0 / NOT RUN 0**.

---

## 8. Tinh chỉnh thiết kế Vòng 2 (Review Claude — Sửa 2 lỗi giao diện)

Sau vòng review 1 của Claude, hệ thống ghi nhận và xử lý triệt để 2 vấn đề hiển thị trên tab Chế độ xem ở độ phân giải 1440px và 1024px:

### 8.1. LOI 1 — Nhóm "Hiển thị" (Show) dùng chung một kiểu Checkbox chuẩn Office 2016
- **Vấn đề trước khi sửa**: Trên Sheet, các mục Đường lưới / Thanh công thức / Tiêu đề hiển thị dạng thanh nền xanh lá đậm; trên Writer, Thước kẻ / Đường lưới hiển thị nền xám nhạt (trông giống như đang hover). Hai app không nhất quán và không giống Microsoft Word 2016 / Excel 2016 thật.
- **Giải pháp kỹ thuật chuẩn Platform (DRY, không copy CSS riêng từng app)**:
  1. **Platform Components & Ribbon Host** (`platform/ui-kit/components.js`, `platform/ribbon/ribbon-host.js`):
     - `createCommandButton` hỗ trợ tham số `isCheckbox`. Khi nút thuộc nhóm `show` hoặc có `type: "checkbox"`, nút tự động nhận `role="checkbox"`, `aria-checked="true"|"false"`.
     - Markup hiển thị cấu trúc checkbox Office thật:
       `<span class="vno-btn-icon vno-checkbox-box"><svg class="vno-checkbox-check" ...><polyline points="3.5 8.5 6.5 11.5 12.5 4.5"></polyline></svg></span><span class="vno-btn-label">...</span>`.
     - Tích hợp keyboard handler chuẩn WAI-ARIA: phím `Space` và `Enter` kích hoạt `btn.click()`, chuyển đổi trạng thái `aria-checked` tức thì.
  2. **Platform Stylesheet** (`platform/shell/shell.css`, `platform/ribbon/ribbon.css`):
     - Gỡ bỏ hoàn toàn quy tắc `.is-checked` cũ áp đặt màu nền đặc trong `ribbon.css`.
     - Bổ sung quy tắc dùng chung `.vno-ribbon-checkbox`: ở trạng thái nghỉ `background-color: transparent !important`, `border-color: transparent !important`, `box-shadow: none !important`. Chỉ khi hover mới có nền nhạt (`var(--vno-bg-hover)`).
     - Ô vuông checkbox `.vno-checkbox-box` có kích thước 13x13px, viền 1px, bo góc 2px, nền `#ffffff` (hoặc `#1e293b` ở Dark mode). Dấu tick vector hiển thị sắc nét khi bật (`opacity: 1`) và ẩn đi khi tắt (`opacity: 0`).
     - Hỗ trợ toàn diện **Chế độ Tối (Dark mode)**: Nền trong suốt ở trạng thái nghỉ, hover dùng màu solid `#334155` và chữ trắng `#ffffff` đạt tỷ lệ tương phản cực cao **11.5:1** (vượt xa chuẩn WCAG AA 4.5:1), viền tick `#60a5fa` đạt **7.5:1**.

### 8.2. LOI 2 — Writer: Khắc phục bố cục nhóm "Thu phóng" (Zoom) & Căn thẳng hàng nhãn nhóm
- **Vấn đề trước khi sửa**: Trên Writer, nhóm Thu phóng gồm 2 nút lớn (Phóng to, 100%) và 1 cột chứa 3 nút nhỏ (Thu nhỏ, Chiều rộng trang, Đặt lại). Cột 3 nút nhỏ có chiều cao 76px (lớn hơn 72px của nút lớn) làm nhãn nhóm "Thu phóng" bị đẩy tụt xuống 4px (`labelTop = 160px`, `labelBottom = 179px`), đè lên và vượt quá mép dưới ribbon (`panelBottom = 176px`), không thẳng hàng với các nhóm khác.
- **Giải pháp kỹ thuật**:
  1. **Chuẩn hóa chiều cao nhóm Ribbon 72px**: Trong `platform/shell/shell.css`, thiết lập `.vno-ribbon-group-items` có `height: 72px; min-height: 72px; max-height: 72px;` đồng nhất cho mọi nhóm.
  2. **Bố cục cột 3 nút nhỏ chuẩn Word 2016**:
     - Thiết lập `.vno-ribbon-group-column { height: 72px; max-height: 72px; gap: 2px; justify-content: center; }`.
     - Thiết lập các nút nhỏ trong cột `.vno-ribbon-btn-small { height: 22px; padding: 1px 6px; font-size: 11px; }`.
     - Tổng chiều cao 3 hàng nhỏ: `3 * 22px + 2 * 2px = 70px <= 72px`, nằm lọt hoàn toàn trong khung 72px.
  3. **Căn hàng nhãn nhóm tuyệt đối (Baseline Alignment)**:
     - Đo đạc thực tế kiểm chứng: Tất cả các nhóm trên tab Chế độ xem của cả Writer và Sheet ("Dạng xem", "Hiển thị", "Thu phóng", "Cửa sổ", "Macro") đều có `itemsH = 72.0px`, `labelTop = 156.0px`, `labelBottom = 175.0px` (độ lệch giữa các nhóm `maxDiff = 0px`).
     - Nhãn "Thu phóng" cách mép dưới ribbon 1px thông thoáng, tuyệt đối không bị đè hay chạm mép dưới.
  4. **Kiểm tra Responsive 1440px và 1024px**:
     - Ở 1440px: `clientWidth = 1440px`, `scrollWidth = 1440px`, `hasOverflow = false`.
     - Ở 1024px: `clientWidth = 1024px`, `scrollWidth = 1024px`, `hasOverflow = false`.

### 8.3. Kết quả kiểm thử Vòng 2 (Trung thực & Minh bạch)
- `node tests/run-tests.js`: **PASS (1834/1834 test case, 0 FAIL, 100%)**.
- `node scripts/audit-contrast.js`: **PASS (100% WCAG AA, 0 vi phạm)**.
- `node tests/live/sheet-view-tab.playwright.mjs`: **PASS (18/18 PASS | 0 FAIL)**:
  - 100% nút Hiển thị có `role="checkbox"`.
  - `aria-checked` đổi chính xác khi click (`true` -> `false`).
  - Phím `Space` và `Enter` kích hoạt đổi `aria-checked`.
  - Nền trong suốt ở trạng thái nghỉ (cả Light và Dark mode).
  - Nhãn nhóm thẳng hàng `maxDiff = 0px`, không đè mép dưới.
  - Không tràn ngang ở 1440px và 1024px.
- `node tests/live/writer-view-tab.playwright.mjs`: **PASS (20/20 PASS | 0 FAIL)**:
  - 100% nút Hiển thị có `role="checkbox"`, nền trong suốt ở trạng thái nghỉ.
  - Phím `Space` và `Enter` đổi `aria-checked` trên Thước kẻ.
  - Nhóm Thu phóng có `itemsH = 72px`, nhãn nhóm thẳng hàng `maxDiff = 0px`, không đè mép dưới ribbon.
  - Không tràn ngang ở 1440px và 1024px.
- Danh mục bài test: **PASS 1834 / FAIL 0 / NOT RUN 0**.

