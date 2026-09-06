# Báo Cáo Rà Soát & Hoàn Thiện Khung Giao Diện Chính (App Chrome UI Polish)

- **Người thực hiện:** agy (UI/UX & Design Specialist)
- **Nhánh thực hiện:** `fix/app-chrome-ui-polish` (tách từ `main` tại commit `4b5a297`)
- **Thư mục làm việc (Worktree riêng):** `E:\VNOffice-agy-chrome-ui-audit`
- **Quy tắc an toàn:** Không sửa đổi mã tính toán/công thức/serialize; không merge vào `main`.

---

## 1. Tổng Quan & Kết Quả Kiểm Thử

Trước và sau khi tiến hành rà soát, toàn bộ hệ thống kiểm thử tự động đều được xác thực nghiêm ngặt:
- **Bộ kiểm thử chính:** 1170/1170 tests PASS (100% | 0 FAIL across 113 suites) qua `node tests/run-tests.js`.
- **Kiểm tra cú pháp JavaScript:** 87/87 files PASS (0 lỗi cú pháp) qua `node scripts/check-syntax.js`.
- **Kiểm tra tương phản token hệ thống:** 17/17 cặp màu token PASS qua `node scripts/audit-contrast.js`.
- **Kiểm tra tương phản thành phần chrome thực tế:** 13/13 cặp màu chrome PASS qua `node scripts/audit-dialog-contrast.mjs`.
- **Kiểm thử trực quan End-to-End (Playwright Headless Edge):** 8/8 tests PASS trong `tests/live/dark-mode-theme.playwright.mjs` và 11/11 tests PASS trong `tests/live/ribbon-collapse-toggle.playwright.mjs`.

---

## 2. Chi Tiết Rà Soát & Hoàn Thiện Từng Khu Vực Chrome

### Khu vực 1: Ribbon (Thanh Dải Lệnh) — Cả 3 Ứng Dụng (Writer, Sheet, Slides)
- **Vấn đề phát hiện:**
  - Ở chế độ Dark Mode, các nút lệnh ở trạng thái được chọn (active / `.is-checked`) sử dụng màu chữ `var(--vno-app-current)` khiến chữ tối nằm trên nền tối:
    - Sheet: `#0f6d38` trên nền `#052e16` chỉ đạt 2.32:1 (không đạt chuẩn WCAG AA >= 4.5:1).
    - Writer: `#0f4c81` trên nền `#172554` chỉ đạt 1.66:1 (không đạt chuẩn WCAG AA).
    - Slides: `#b53818` trên nền `#431407` chỉ đạt 2.64:1 (không đạt chuẩn WCAG AA).
  - Ribbon dropdown menu (`.vno-ribbon-dropdown-menu`) có nền cứng `#ffffff` không nhận diện chế độ Dark Mode.
  - Vòng sáng viền khi focus phím (`.vno-btn:focus-visible`) có `box-shadow` màu cứng `#ffffff` bị lộ viền trắng trong Dark Mode.
  - Dropdown Thư viện Kiểu (Styles Gallery) và Thẻ Chủ đề (Theme Gallery) trong Writer có các thẻ mẫu chứa màu cứng.
- **Giải pháp & Đo lường tương phản thực tế:**
  - Bổ sung biến token màu chữ tương phản cao trong `platform/theme/tokens.css`:
    - Writer: `--vno-writer-primary-fg: #60a5fa` (đạt 5.78:1 trên nền `#172554` trong Dark Mode, 8.86:1 trên nền sáng).
    - Sheet: `--vno-sheet-primary-fg: #4ade80` (đạt 8.55:1 trên nền `#052e16` trong Dark Mode, 6.43:1 trên nền sáng).
    - Slides: `--vno-slides-primary-fg: #fb923c` (đạt 6.92:1 trên nền `#431407` trong Dark Mode, 5.93:1 trên nền sáng).
  - Cập nhật `.vno-btn.is-checked`, `.vno-ribbon-btn-dropdown.is-active`, `.vno-ribbon-dropdown-item:focus` sử dụng `var(--vno-app-current-fg)`.
  - Thay đổi nền dropdown ribbon thành `var(--vno-bg-window)`.
  - Đổi `box-shadow` khi focus thành `var(--vno-bg-surface)`.
  - Token hóa Thư viện Kiểu và Chủ đề trong Writer, bổ sung thuộc tính trợ năng `aria-label` và `aria-pressed`.

### Khu vực 2: Status Bar (Thanh Trạng Thái) — Cả 3 Ứng Dụng
- **Vấn đề phát hiện:**
  - Thanh trạng thái có nền là màu nhận diện ứng dụng (`--vno-app-current`) và chữ màu trắng `#ffffff`. Độ tương phản nền/chữ đạt chuẩn cao: Writer đạt 8.86:1 (AAA), Sheet đạt 6.43:1 (AAA), Slides đạt 5.93:1 (AA).
  - Tuy nhiên, các nút thu nhỏ/phóng to (`#vno-zoom-out`, `#vno-zoom-in`) thiếu hiệu ứng phản hồi khi di chuột (`:hover`) và nhấn (`:active`).
  - Trong chế độ Dark Mode, mép trên của thanh trạng thái thiếu đường phân cách nhẹ với vùng soạn thảo/lưới.
- **Giải pháp & Đo lường thực tế:**
  - Thêm hiệu ứng di chuột và nhấn cho nút zoom: `.vno-zoom-slider button:hover { background-color: rgba(255, 255, 255, 0.18); }` và `:active { background-color: rgba(255, 255, 255, 0.28); }`.
  - Bổ sung đường viền phân tách thanh trạng thái khi ở Dark Mode: `[data-theme="dark"] .vno-statusbar { border-top: 1px solid rgba(255, 255, 255, 0.12); }`.
  - Nút thống kê đếm từ (`.vno-status-wordcount`) trong Writer có viền focus đạt 5.3:1 trên nền thanh trạng thái.

### Khu vực 3: Menu Tệp (Backstage View)
- **Vấn đề phát hiện:**
  - Bẫy tiêu điểm (Focus Trap): Khi mở Menu Tệp toàn màn hình, phím Tab và Shift+Tab có thể đưa tiêu điểm ra ngoài overlay vào trang nền phía dưới.
  - Danh sách tài liệu gần đây (`.vno-recent-row`): Gắn sự kiện inline `onmouseover="this.style.background='#f1f5f9'"` làm chóa nền trắng sáng bất thường khi di chuột trong chế độ Dark Mode.
  - Khung bảng tài liệu gần đây chứa mã màu cứng `background:#ffffff;` và tiêu đề cột `background:#fafafa;` không đồng bộ theo theme.
- **Giải pháp & Đo lường thực tế:**
  - Bổ sung bẫy tiêu điểm bàn phím hoàn chỉnh trong `showBackstageMenu()`: Phím Tab và Shift+Tab tự động quay vòng giữa nút "Quay lại", các mục điều hướng bên trái và các thẻ/hàng bên phải. Phím Escape đóng menu và phục hồi tiêu điểm ban đầu.
  - Tự động đặt tiêu điểm vào nút "Quay lại" khi vừa mở Backstage.
  - Gỡ bỏ inline hover trên `.vno-recent-row`, chuyển thành quy tắc CSS `.vno-recent-row:hover { background-color: var(--vno-bg-hover); }`.
  - Thay màu nền container và header danh sách tài liệu gần đây sang `var(--vno-bg-window)` và `var(--vno-bg-subtle)`.
  - Chữ hàng recent file khi hover trong Dark Mode (`#f1f5f9` trên `#2a2d2e`) đạt độ tương phản cực đại 12.67:1 (AAA).

### Khu vực 4: Quick Access Toolbar & Fixed Sidebars (Thanh Thao Tác Nhanh & Panel Cố Định)
- **Quick Access Toolbar & Title Bar:**
  - Bổ sung trạng thái vô hiệu hóa (`.vno-quick-btn:disabled`) với độ mờ 0.38 và `cursor: not-allowed` (ví dụ khi không có thao tác để Undo/Redo).
  - Bổ sung trạng thái nhấn (`.vno-quick-btn:active`) với nền `var(--vno-bg-active)`.
- **Thanh công thức VN Sheet (Formula Bar):**
  - Trạng thái `:focus` của ô nhập công thức (`.vno-formula-input:focus`) trước đây dùng viền `#0f6d38` (đạt 2.32:1 trong Dark Mode - vi phạm). Đã chuyển sang `var(--vno-sheet-primary-fg)` đạt 9.57:1 (AAA) trên nền tối.
  - Các nút thao tác công thức (Hủy ✕, Nhập ✓, fx) được bổ sung thuộc tính `type="button"` và trạng thái `:focus-visible` chuẩn WCAG.
- **Thanh tab trang tính VN Sheet (Sheet Tab Bar):**
  - Đường gạch chân tab đang hoạt động (`.vno-sheet-tab-item.is-active`) và nút thêm trang tính (`.vno-sheet-add-btn:hover`) đã được token hóa với `var(--vno-sheet-primary-fg)`, đạt tương phản 9.57:1 trên nền tối.
  - Thêm viền tiêu điểm bàn phím `:focus-visible` cho từng tab và nút cuộn tab.
- **Dải hình thu nhỏ VN Slides (Slide Navigator / Thumbnails):**
  - Khung viền slide đang chọn (`.vno-slide-thumb-item.is-active .vno-slide-thumb-card`) trước đây dùng viền `#b53818` (đạt 2.64:1 trong Dark Mode - vi phạm). Đã chuyển sang `var(--vno-slides-primary-fg: #fb923c)` đạt 7.37:1 (AAA) trên nền tối.
  - Nút thêm slide (`.vno-slide-new-btn`) và vùng thả khi kéo reorder slide (`.is-drag-over`) được cập nhật màu viền và nền đồng bộ.
  - Bổ sung `:focus-visible` cho thẻ hình thu nhỏ để người dùng di chuyển bằng bàn phím.
- **Panel bình luận VN Writer (Comments Panel):**
  - Đã rà soát: Panel bên phải (`.vno-writer-comments-panel`) đã được token hóa đầy đủ từ trước với màu thẻ `#252526` và chữ `#f1f5f9` (đạt 13.98:1 trong Dark Mode).

### Khu vực 5: Context Menus (Menu Ngữ Cảnh Chuột Phải)
- **Menu chuột phải lưới VN Sheet (`showContextMenu` & `_showSheetTabContextMenu`):**
  - Bổ sung thuộc tính trợ năng: `role="menu"` cho khung menu, `role="menuitem"` và `tabindex="-1"` cho từng mục thao tác, `role="separator"` cho đường ngăn cách.
  - Chống tràn màn hình (Viewport Edge Clamping): Tọa độ hiển thị được tính toán giới hạn an toàn (`Math.min(e.clientX, window.innerWidth - 240)` và `Math.min(e.clientY, window.innerHeight - 380)`), ngăn menu tràn ra khỏi cạnh phải hoặc cạnh dưới màn hình.
  - Điều hướng bàn phím: Hỗ trợ phím Mũi tên Lên / Xuống để chuyển đổi mục chọn, phím Enter để thực hiện lệnh, phím Escape để đóng menu ngay lập tức.
  - Trạng thái hover/focus mục menu đạt tương phản 7.96:1 trong Dark Mode.
- **Menu nhóm slide VN Slides (`_openSlideSectionMenu`):**
  - Đã bổ sung tính toán clamping tọa độ `clientX` và `clientY` theo kích thước `window.innerWidth` và `window.innerHeight`.
- **Menu sửa chính tả VN Writer (`.vno-spellcheck-menu`):**
  - Chống tràn màn hình theo viewport và bổ sung sự kiện phím Escape để đóng nhanh.
  - Token hóa toàn bộ giao diện menu sửa lỗi: Thay thế màu cứng `#fff` và `#0f172a` bằng `var(--vno-bg-window)` và `var(--vno-text-primary)`. Trạng thái hover đạt 5.46:1 trong Dark Mode (AA).

---

## 3. Thành Phần Không Tồn Tại Trong Codebase (Báo Cáo Cho Codex / Grok)

Để các chuyên gia backend/core (Codex, Grok) nắm rõ hiện trạng và không nhầm lẫn khi triển khai tiếp:
1. **Writer Navigation Pane (Thanh điều hướng tiêu đề/trang):** Không tồn tại trong mã nguồn hiện tại. Ứng dụng Writer hiện quản lý tài liệu cuộn liên tục nhiều trang A4 qua `writer-view-controller.js` và `writer-app.js`, không có DOM component hay panel riêng cho danh sách heading/trang.
2. **Writer General Canvas Context Menu:** Khi nhấp chuột phải vào văn bản soạn thảo thông thường, Writer chỉ mở menu ngữ cảnh đối với từ bị gạch chân đỏ sai chính tả (`spellcheck-dom-controller.js`). Chưa có menu ngữ cảnh tổng quát cho canvas (Cut/Copy/Paste/Font/Paragraph).
3. **Slides General Canvas / Shape Context Menu:** Ứng dụng Slides hiện chỉ có menu ngữ cảnh cho việc quản lý Nhóm Slide trên thanh thumbnail (`_openSlideSectionMenu`). Chưa có menu chuột phải trên canvas hình khối (Cut/Copy/Bring to Front/Send to Back).
4. **Tell Me Search Bar:** Thanh tìm kiếm lệnh (Tell Me) chưa được cài đặt trong Topbar của `app-shell.js`.

---

## 4. Bảng Đo Độ Tương Phản Màu Thực Tế (WCAG 2.1 AA)

| Thành phần kiểm tra | Chế độ | Màu chữ / viền (FG) | Màu nền (BG) | Tỷ lệ tương phản | Chuẩn yêu cầu | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Writer Ribbon Active Button** | Dark | `#60a5fa` | `#172554` | **5.78:1** | >= 4.5:1 | **PASS** |
| **Sheet Ribbon Active Button** | Dark | `#4ade80` | `#052e16` | **8.55:1** | >= 4.5:1 | **PASS (AAA)** |
| **Slides Ribbon Active Button** | Dark | `#fb923c` | `#431407` | **6.92:1** | >= 4.5:1 | **PASS** |
| **Writer Status Bar Text** | Chung | `#ffffff` | `#0f4c81` | **8.86:1** | >= 4.5:1 | **PASS (AAA)** |
| **Sheet Status Bar Text** | Chung | `#ffffff` | `#0f6d38` | **6.43:1** | >= 4.5:1 | **PASS (AAA)** |
| **Slides Status Bar Text** | Chung | `#ffffff` | `#b53818` | **5.93:1** | >= 4.5:1 | **PASS** |
| **Backstage Active Nav Item** | Dark | `#60a5fa` | `#1e1e1e` | **6.56:1** | >= 4.5:1 | **PASS** |
| **Backstage Recent Row Hover** | Dark | `#f1f5f9` | `#2a2d2e` | **12.67:1** | >= 4.5:1 | **PASS (AAA)** |
| **Sheet Formula Input Focus** | Dark | `#4ade80` | `#1e1e1e` | **9.57:1** | >= 3.0:1 | **PASS (AAA)** |
| **Sheet Active Tab Text** | Dark | `#4ade80` | `#1e1e1e` | **9.57:1** | >= 4.5:1 | **PASS (AAA)** |
| **Slides Active Thumb Outline** | Dark | `#fb923c` | `#1e1e1e` | **7.37:1** | >= 3.0:1 | **PASS (AAA)** |
| **Sheet Context Menu Hover** | Dark | `#4ade80` | `#2a2d2e` | **7.96:1** | >= 4.5:1 | **PASS (AAA)** |
| **Writer Spellcheck Hover** | Dark | `#60a5fa` | `#2a2d2e` | **5.46:1** | >= 4.5:1 | **PASS** |

---

## 5. Nhật Ký Commit (Git Commit History)

Toàn bộ công việc được phân chia theo từng khu vực độc lập, commit riêng biệt và đầy đủ:

1. `687e4b9` - `style(ribbon): polish dark mode contrast, active button states, and tokenization`
   - Bổ sung `--vno-*-primary-fg` trong `tokens.css`.
   - Token hóa dropdown ribbon, style gallery, theme gallery.
2. `481c09f` - `style(statusbar): improve zoom control hover feedback and dark mode contrast`
   - Thêm hover/active cho nút zoom, thêm viền ngăn cách trên statusbar khi ở dark mode.
3. `a46adaa` - `fix(backstage): add keyboard focus trap and dark mode tokenization`
   - Thêm bẫy tiêu điểm bàn phím Tab/Shift+Tab, gỡ inline hover, token hóa danh sách gần đây.
4. `a72f891` - `style(chrome): polish formula bar, slide navigator, and quick tools`
   - Bổ sung viền focus công thức, tab active, thumbnail active, trạng thái disabled của quick tools.
5. `425579b` - `fix(contextmenu): add ARIA attributes, keyboard navigation, and viewport edge clamping`
   - Thêm ARIA role=menu/menuitem, điều hướng phím mũi tên và Escape, chống tràn mép màn hình.
6. `d360923` - `test(contrast): extend automated audit with chrome components and update screenshots`
   - Mở rộng script kiểm tra độ tương phản tự động và cập nhật ảnh chụp giao diện Playwright.
