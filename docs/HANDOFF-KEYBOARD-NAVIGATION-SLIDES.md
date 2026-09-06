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
*(Dang thuc hien tiep theo)*

---

## Khu vuc 3 — Menu ngu canh Slides (Context menu & focus tra ve sau Escape)
*(Chua thuc hien)*

---

## Khu vuc 4 — Ribbon Slides (Arrow nav tab & gallery dropdowns)
*(Chua thuc hien)*

---

## Khu vuc 5 — Animation Pane (Keyboard navigation hieu ung)
*(Chua thuc hien)*

---

## Kiem tra da chay
- `node scripts/check-syntax.js`: 87/87 PASS.
- `node tests/live/slides-mouse-shortcuts.playwright.mjs`: PASS 100%.
- `node tests/live/slides-canvas-keyboard-nav.playwright.mjs`: PASS 100%.
