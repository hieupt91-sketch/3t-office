# HANDOFF: Keyboard Navigation — VN Slides

**Branch:** `fix/keyboard-navigation-slides`
**Worktree:** `E:\VNOffice-agy-keyboard-nav-slides`
**Pham vi:** Chi VN Slides (khong sua Sheet/Writer)
**Ngay:** 2026-09-06

---

## Khu vuc 1 — Canvas chinh: chon & di chuyen shape bang ban phim (Tab, Mui ten, Delete, Ctrl+D)

**File sua:** `apps/slides/slides-canvas.js`
**Test:** `tests/live/slides-canvas-keyboard-nav.playwright.mjs` (Live Edge Playwright PASS 100%)

### Hien trang truoc khi sua:
- Khi chèn shape, các shape dạng hình vẽ thường không có text (hoặc image, table, media) không có `tabIndex = 0`, khiến người dùng dùng phím không thể focus hoặc duyệt tới bằng Tab.
- `selectNextObject` duyệt qua danh sách đối tượng nhưng khi focus rơi vào Title/Body placeholder thì handler Tab của window bị chặn bởi `activeEl.isContentEditable`, khiến Tab bị kẹt không chuyển tiếp sang các shape.
- Phím Escape khi đang chỉnh sửa chữ trong shape hoặc Title/Body placeholder không thoát chế độ gõ chữ để trả focus về shape/canvas.
- Chưa có tính năng Ctrl+D nhân đôi shape trên canvas (trước đây Ctrl+D chỉ nhân đôi slide).
- Sau khi nhấn Delete xóa shape, focus bị rơi về `document.body` khiến người dùng mất ngữ cảnh bàn phím.

### Da thuc hien:
1. **Focus & Accessibility cho tat ca cac shape:**
   - Mọi shape không phải connector đều được gắn `tabIndex = 0`, `role = "button"`, `aria-label`, bộ lắng nghe `focus` để đồng bộ `selectedTarget`.
   - Vùng `canvasEl` được gắn `tabIndex = -1`, `role = "region"`, `aria-label = "Vùng trình chiếu slide"`.
2. **Dieu huong Tab / Shift+Tab:**
   - Hỗ trợ duyệt vòng tròn (wrap-around) giữa Title -> Body/Body2 -> các Shapes -> Title.
   - Thêm keydown handler cho Title, Body, Body2 và `textEl` của shape để Tab chuyển đối tượng mượt mà.
   - Escape thoát khỏi chế độ gõ chữ và trả focus về shape hoặc canvas.
   - Alt+Arrow (ArrowUp/Down/Left/Right) cho phép chuyển đổi chọn đối tượng trực tiếp.
3. **Phim mui ten (Nudge shape):**
   - Phím mũi tên (ArrowLeft/Right/Up/Down) di chuyển shape 1px; kết hợp Shift di chuyển 10px.
   - Khi canvas đang active mà chưa chọn shape, phím mũi tên tự động chọn shape đầu tiên/cuối cùng.
4. **Ctrl+D nhan doi shape (Duplicate):**
   - Thêm phương thức `duplicateSelectedShapes()` nhân đôi các shape đang chọn, tạo ID mới, dịch chuyển nhẹ +20px, ghi Undo `shape-add`, cập nhật vùng chọn và tự động focus vào shape mới nhân đôi.
   - Khi gọi lệnh `slides.slide.duplicate` hoặc bấm `Ctrl+D`: nếu đang chọn shape trên canvas thì nhân đôi shape; nếu không chọn shape thì nhân đôi slide.
5. **Delete xoa shape & giu focus:**
   - Phím Delete / Backspace xóa shape đang chọn, tự động chuyển focus về shape kế tiếp (hoặc canvas nếu không còn shape nào), ngăn ngừa mất focus.

---

## Khu vuc 2 — Slide Navigator (Filmstrip / dai thumbnail)

**File sua:** `apps/slides/slides-canvas.js`, `platform/text/spellcheck-dom-controller.js`
**Test:** `tests/live/slides-navigator-keyboard-nav.playwright.mjs` (Live Edge Playwright PASS 100%)

### Hien trang truoc khi sua:
- Các thumbnail trong slideListContainer không có roving `tabindex`, không có ARIA role tab/tablist.
- Không thể dùng phím mũi tên ArrowUp/ArrowDown để chuyển đổi slide từ dải thumbnail.
- Phím Enter/Space không kích hoạt chuyển focus vào vùng soạn thảo của slide (Title placeholder / Canvas).
- Khi xóa slide (Delete/Backspace), focus bị rơi về `document.body`.
- Phát hiện thêm bug: `restoreSelection` trong `SpellcheckDomController` khi debounce chạy đã tự động kích hoạt focus trở lại `titleEl` ngay cả khi người dùng đang focus ở thumbnail bên ngoài, cướp focus của người dùng bàn phím.

### Da thuc hien:
1. **Roving tabindex & ARIA semantics:**
   - Dải thumbnail `slideListContainer` gắn `role="tablist"`, `aria-orientation="vertical"`, `aria-label="Danh sách trang chiếu"`.
   - Mỗi thumbnail item gắn `role="tab"`, `aria-selected`, `aria-label="Trang chiếu N: Tiêu đề"` và roving tabindex (`tabindex="0"` cho slide đang chọn, `-1` cho các slide còn lại).
2. **Dieu huong ban phim tren thumbnail:**
   - `ArrowDown` / `ArrowRight`: Chuyển sang slide tiếp theo và duy trì focus trên thumbnail mới.
   - `ArrowUp` / `ArrowLeft`: Chuyển về slide trước đó và duy trì focus trên thumbnail mới.
   - `Home`: Nhảy về slide đầu tiên (index 0) và focus thumbnail đầu.
   - `End`: Nhảy về slide cuối cùng và focus thumbnail cuối.
   - `Enter` / `Space`: Nhảy vào bên trong slide (focus vào tiêu đề `titleEl` hoặc vùng vẽ `canvasEl`).
   - `Delete` / `Backspace`: Xóa slide đang chọn (nếu có > 1 slide) và tự động chuyển focus về thumbnail kế tiếp.
   - `Ctrl+D`: Nhân đôi slide đang chọn và focus thumbnail bản sao mới.
   - `ContextMenu` / `Shift+F10`: Mở menu ngữ cảnh section/slide tại vị trí thumbnail.
3. **Sua bug cuop focus cua bo kiem tra chinh ta (`SpellcheckDomController`):**
   - Trong `platform/text/spellcheck-dom-controller.js`, bổ sung kiểm tra `selectionOffset(root)` và `restoreSelection(root, offset)`: nếu `document.activeElement` không nằm trong `root`, không khôi phục selection để tránh việc `addRange` cướp focus từ thumbnail hoặc các thành phần UI khác.
4. **Bao toan focus trong `deleteCurrentSlide` & `duplicateCurrentSlide`:**
   - Sau khi xóa hoặc nhân đôi slide, tự động tìm và gọi `.focus()` trên thumbnail của slide đang chọn, đảm bảo focus không bị rơi về `document.body`.

---

## Khu vuc 3 — Menu ngu canh Slides (Context menu & focus tra ve sau Escape)

**File sua:** `apps/slides/slides-canvas.js`
**Test:** `tests/live/slides-context-menu-keyboard-nav.playwright.mjs` (Live Edge Playwright PASS 100%)

### Hien trang truoc khi sua:
- Trong `_openSlideSectionMenu`, biến `section` không được khai báo (`const section = this._sectionAtSlide(slideIndex)` bị thiếu), dẫn tới `ReferenceError` khi mở menu.
- Khi đóng menu ngữ cảnh thumbnail/section bằng phím Escape, nếu menu mở bằng chuột phải (hoặc `document.activeElement` là body), focus không được đảm bảo trả về đúng thumbnail trigger mà bị lạc về body.
- Thiếu menu ngữ cảnh (Context Menu) cho hình vẽ (shape) trên canvas khi người dùng chuột phải hoặc nhấn phím `ContextMenu` / `Shift+F10`.
- Các nút trong menu chưa hỗ trợ phím `Home` (về đầu) và `End` (về cuối).

### Da thuc hien:
1. **Sua loi va hoan thien Slide/Section Context Menu (`_openSlideSectionMenu`):**
   - Khai báo đúng `const section = this._sectionAtSlide(slideIndex)`.
   - Xác định `triggerEl` chuẩn xác: ưu tiên phần tử focus trước đó nếu nằm trong DOM, hoặc fallback về thumbnail item tương ứng `[data-slide-index="${slideIndex}"]`.
   - Bổ sung các tùy chọn chuẩn Office: "Trang mới", "Nhân đôi trang", "Xóa trang" (disable khi chỉ có 1 slide), "Thêm Phần", "Đổi tên Phần", "Xóa Phần".
   - Bàn phím: `ArrowDown` / `ArrowUp` di chuyển vòng tròn với roving tabindex, `Home` / `End` nhảy nhanh, `Escape` đóng menu và phục hồi focus ngay lập tức về `triggerEl`.
2. **Tao moi Shape Context Menu (`_openShapeContextMenu`):**
   - Hỗ trợ mở menu ngữ cảnh cho hình vẽ qua chuột phải (`contextmenu`) hoặc bàn phím (`ContextMenu` / `Shift+F10`).
   - Cung cấp các thao tác nhanh: "Nhân đôi (Ctrl+D)", "Xóa hình vẽ (Delete)", "Chỉnh sửa biểu đồ..." (nếu là biểu đồ), "Xóa nhóm sơ đồ" (nếu là SmartArt node).
   - Khi đóng bằng `Escape` hoặc click ra ngoài, focus được khôi phục 100% về shape ban đầu.
   - Sau khi thoát menu, các phím mũi tên tiếp tục nudge shape mượt mà, không bị kẹt hay mất focus.

---

## Khu vuc 4 — Ribbon Slides (Arrow nav tab & gallery dropdowns)
*(Dang thuc hien tiep theo)*

---

## Khu vuc 5 — Animation Pane (Keyboard navigation hieu ung)
*(Chua thuc hien)*

---

## Kiem tra da chay
- `node scripts/check-syntax.js`: 87/87 PASS.
- `node tests/live/slides-mouse-shortcuts.playwright.mjs`: PASS 100%.
- `node tests/live/slides-canvas-keyboard-nav.playwright.mjs`: PASS 100%.
- `node tests/live/slides-navigator-keyboard-nav.playwright.mjs`: PASS 100%.
- `node tests/live/slides-context-menu-keyboard-nav.playwright.mjs`: PASS 100%.
