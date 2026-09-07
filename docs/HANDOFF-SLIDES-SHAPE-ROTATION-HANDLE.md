# Agent Handoff

TASK: Thêm tay cầm xoay trực quan (Rotation Handle) trên canvas VN Slides cho hình vẽ/ảnh  
AGENT/ROLE: agy (Frontend / Canvas UI / User Interaction)  
BRANCH: `feat/slides-shape-rotation-handle`  
WORKTREE: `E:\VNOffice-agy-rotation-handle`  
OBJECTIVE: Người dùng chọn shape/image trên canvas VN Slides sẽ thấy tay cầm xoay tròn phía trên đỉnh hình (tương tự Microsoft PowerPoint), có thể nhấn kéo chuột để xoay đối tượng trực quan quanh tâm, hỗ trợ phím Shift để snap 15°, chuột phải đặt lại 0°, đầy đủ Undo/Redo và hỗ trợ trình chiếu/chế độ tối.

---

## 1. Plan Gate

- **Objective:** Cung cấp trải nghiệm xoay hình khối tương tác trực tiếp trên canvas VN Slides giống Microsoft PowerPoint.
- **Current capability trước task:** Shape model đã có thuộc tính `shape.rotation` (độ), adapter đã có khả năng đọc/parse `draw:transform rotate(...)`, nhưng trên canvas người dùng chỉ có thể co giãn (8 resize handles) hoặc kéo di chuyển shape, chưa có tay cầm xoay tương tác.
- **Files/modules:**
  - `apps/slides/slides-canvas.js`: Vẽ tay cầm xoay tròn + cuống nối (stem), xử lý kéo xoay (pointer events), tính góc với `Math.atan2`, snap 15° khi giữ Shift, cập nhật realtime CSS transform + thuộc tính `shape.rotation`, ghi nhận stack Undo/Redo, tùy chọn ngữ cảnh "Đặt lại góc xoay (0°)" và CSS transform trong slideshow presentation.
  - `apps/slides/slides.css`: Styling cho `.vno-shape-rotate-stem`, `.vno-shape-rotate-handle` (grab/grabbing cursor, hover/active scale, dark mode tokens).
  - `platform/help/entries-slides.js`: Bổ sung mục Hướng dẫn sử dụng bằng tiếng Việt chuẩn cho tính năng xoay hình khối theo Quy tắc 10 AGENTS.md.
  - `tests/unit/slides-shape-rotation-handle.test.js`: Suite kiểm thử đơn vị bao phủ toàn diện logic tay cầm, tính toán góc, snap 15°, reset 0°, undo/redo, slideshow transform.
  - `tests/run-tests.js`: Đăng ký suite 133.
  - `tests/live/slides-shape-rotation-handle.playwright.mjs`: Test live Playwright mô phỏng thao tác chuột kéo xoay handle thật trên canvas, kiểm tra style transform cập nhật, Undo Ctrl+Z và Redo Ctrl+Y.
- **Scope Boundary Compliance:**
  - KHÔNG can thiệp `adapters/libreoffice/slides/slides-adapter.js` (phần đọc/parse file đã hoàn thiện).
  - KHÔNG can thiệp serialization/saving (sẽ do Claude hoàn thiện).
  - KHÔNG sửa đổi hành vi `_attachResizeHandle`.
  - Không vi phạm boundary monorepo giữa Writer/Sheet/Slides.
- **Risk:** Cực thấp. Tách biệt hoàn toàn trên layer Canvas UI của VN Slides. Không ảnh hưởng các shape connector/line (vốn không dùng box rotation).
- **Rollback:** Xóa commit hoặc revert branch `feat/slides-shape-rotation-handle`.

---

## 2. Implementation Summary

### 2.1. Canvas UI & Interaction (`apps/slides/slides-canvas.js`)
1. **Selection Handles (`_ensureShapeSelectionHandles`):**
   - Khi chọn shape (loại khác `connector`), bên cạnh 8 nút co giãn (`.vno-shape-resize-handle`) và nút xóa (`.vno-shape-delete-btn`), tạo thêm:
     - `.vno-shape-rotate-stem`: Cuống thẳng nối từ tâm cạnh trên lên tay cầm xoay.
     - `.vno-shape-rotate-handle`: Nút tròn phía trên đỉnh hình (`top: -28px; left: calc(50% - 6px)`).
   - Gọi `_attachRotateHandle(rotateHandle, el, shape)` để gán bộ lắng nghe sự kiện tương tác.
2. **Rotate Handle Logic (`_attachRotateHandle`):**
   - Xử lý sự kiện Pointer (`pointerdown`, `pointermove`, `pointerup`, `lostpointercapture`).
   - Ngăn chặn bubbling (`e.stopPropagation()`, `e.preventDefault()`) để không kích hoạt drag/move shape.
   - Bắt tâm xoay đối tượng: Lấy `rect = shapeEl.getBoundingClientRect()`, tâm đối tượng là `cx = rect.left + rect.width / 2`, `cy = rect.top + rect.height / 2`. Lưu ý: Do CSS transform origin là `center center`, tâm bounding box không đổi qua các góc xoay.
   - Tính toán góc: `const rad = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);`  
     Góc độ chuẩn tính từ hướng thẳng đứng lên trên: `let deg = (rad * 180 / Math.PI) + 90;`  
     Chuẩn hóa góc về `[0, 360)`: `deg = ((deg % 360) + 360) % 360;`
   - **Shift Snapping (15°):** Nếu `moveEvent.shiftKey` đang nhấn, làm tròn góc tới bội số gần nhất của 15°: `deg = Math.round(deg / 15) * 15;`
   - **Quy ước 0°:** Nếu góc bằng 0 hoặc rất gần 0 (`Math.abs(deg) < 0.5` hoặc `Math.abs(deg - 360) < 0.5`), xóa thuộc tính `delete shape.rotation` (`undefined`) để đồng bộ hoàn hảo với quy ước canvas/adapter hiện hữu.
   - Cập nhật style trực tiếp thời gian thực: `shapeEl.style.transform = rotate(${Math.round(deg * 10) / 10}deg)` và `shapeEl.style.transformOrigin = "center center"`.
   - Cập nhật trạng thái con trỏ (`cursor: grabbing`) an toàn thông qua `document.body?.style`.
   - **Undo/Redo Stack:** Khi nhả chuột (`pointerup`), nếu góc thay đổi, đẩy hành động `{ type: "shape-rotate", slideIndex, shapeId, from, to }` vào `undoStack`, xóa `redoStack`, phát sự kiện `shape-changed`.
3. **Shape Drag Exclusion (`_attachShapeDrag`):**
   - Bổ sung điều kiện kiểm tra nếu target là `.vno-shape-rotate-handle` hoặc `.vno-shape-rotate-stem` thì bỏ qua, không kích hoạt kéo di chuyển vị trí shape.
4. **Undo / Redo Integration (`undo()`, `redo()`):**
   - Xử lý hành động `shape-rotate`: khôi phục `shape.rotation = action.from` (hoặc `action.to`), hoặc `delete shape.rotation` nếu giá trị undefined, chuyển về slide tương ứng và gọi `_renderShapesLayer()`.
5. **Context Menu & Reset Rotation (`_openShapeContextMenu`, `resetShapeRotation`):**
   - Trong menu ngữ cảnh chuột phải trên shape, nếu `shape.rotation` tồn tại (khác 0/undefined), hiển thị mục:  
     `Đặt lại góc xoay (0°)`
   - Khi chọn, gọi `resetShapeRotation(shapeId)`: lưu thao tác vào undo stack, xóa thuộc tính `shape.rotation` và render lại layer.
6. **Slideshow Mode Support (`_shapePresentationHtml`):**
   - Trong chế độ trình chiếu fullscreen/preview, bổ sung thuộc tính `transform: rotate(...)` vào style của shape nếu có `shape.rotation`.

### 2.2. CSS Styling (`apps/slides/slides.css`)
- `.vno-shape-rotate-stem`: Chiều cao 22px, rộng 1px, căn giữa phía trên, màu `#2563eb`, `pointer-events: none`.
- `.vno-shape-rotate-handle`: Kích thước 12x12px hình tròn, viền trắng, đổ bóng nhẹ, `cursor: grab`, chuyển màu và phóng to nhẹ khi `:hover`.
- Trạng thái `:active` và class `.is-rotating`: Đổi con trỏ thành `cursor: grabbing !important` và nền màu xanh đậm `#1e40af`.
- Hỗ trợ đầy đủ Dark Theme thông qua CSS variables và token dark mode (`[data-theme="dark"]`).

### 2.3. User Guide / In-App Help (`platform/help/entries-slides.js`)
- Thêm entry chuẩn tiếng Việt: `slides.shape.rotationHandle` ("Xoay hình khối và hình ảnh") thuộc nhóm "Minh họa", tab "Chèn".
- Hướng dẫn chi tiết các thao tác: kéo tay cầm xoay tròn, giữ Shift để snap 15°, chuột phải chọn "Đặt lại góc xoay (0°)", và dùng Ctrl+Z / Ctrl+Y để hoàn tác/làm lại.

---

## 3. Files Changed / Added

1. `apps/slides/slides-canvas.js` — Thêm tay cầm xoay, stem, tương tác pointer, undo/redo, context menu reset, presentation html.
2. `apps/slides/slides.css` — CSS cho tay cầm và cuống xoay, hover, active, dark mode.
3. `platform/help/entries-slides.js` — Hướng dẫn sử dụng tiếng Việt cho tính năng xoay hình khối.
4. `tests/unit/slides-shape-rotation-handle.test.js` — Suite kiểm thử đơn vị với 10 assertions chuyên sâu.
5. `tests/run-tests.js` — Đăng ký suite 133 vào test runner chính.
6. `tests/live/slides-shape-rotation-handle.playwright.mjs` — Kiểm thử tự động Playwright live drag handle, CSS update, undo, redo, context menu.
7. `docs/HANDOFF-SLIDES-SHAPE-ROTATION-HANDLE.md` — Tài liệu bàn giao chi tiết.

---

## 4. Test Results

| Suite | Lệnh | Kết quả |
|---|---|---|
| Cú pháp toàn bộ file | `node scripts/check-syntax.js` | **89/89 PASS** (0 syntax error) |
| Bộ kiểm thử đơn vị tổng | `node tests/run-tests.js` | **1463/1463 PASS, 0 FAIL** (133 suites) |
| Unit test tính năng mới | Chạy trong suite 133 | **10/10 PASS** (Handle creation, connector exclusion, math atan2, shift snapping, 0-deg removal, undo/redo, context menu reset, slideshow html) |
| Live Playwright thao tác chuột thật | `node tests/live/slides-shape-rotation-handle.playwright.mjs` | **100% PASS** (Mô phỏng chuột kéo xoay handle 45°, kiểm tra transform, Ctrl+Z, Ctrl+Y, context menu reset) |
| Ribbon Audit 1280px Regression | `node tests/live/ribbon-audit-1280.playwright.mjs` | **104/104 PASS** (100% PASS trên cả 3 ứng dụng Writer, Sheet, Slides) |

---

## 5. Non-Regression & Scope Verification
- Không có bất kỳ thay đổi nào trong `adapters/libreoffice/slides/slides-adapter.js`.
- Không có bất kỳ thay đổi nào trong file serialization/FODP saving.
- Không sửa đổi logic co giãn kích thước (`_attachResizeHandle`).
- Toàn bộ 1454 bài test cũ của hệ thống giữ nguyên trạng thái PASS 100%.

---

## 6. Next Steps
- Commit các thay đổi trên nhánh `feat/slides-shape-rotation-handle`.
- Giữ nguyên branch trên worktree `E:\VNOffice-agy-rotation-handle`, không merge vào `main`, không `git push`.
- Claude/đồng đội phụ trách phần adapter/serialization có thể kết nối thuộc tính `shape.rotation` vào FODP XML serializer (`draw:transform="rotate(...)"`) khi sẵn sàng.