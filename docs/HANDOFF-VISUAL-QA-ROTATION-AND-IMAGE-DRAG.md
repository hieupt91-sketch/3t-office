# Báo Cáo Bàn Giao: Visual QA Xoay Hình Khối (Slides) & Kéo-Thả Ảnh Freeze Panes (Sheet)

- **TASK**: Visual QA và hoàn thiện trải nghiệm thị giác/tương tác cho 2 tính năng:
  1. Xoay hình khối trong Slides (Slides shape rotation).
  2. Kéo-thả ảnh trong Sheet có Freeze Panes (Sheet image drag + freeze pane).
- **AGENT/ROLE**: agy (Visual QA / Frontend Polish)
- **BRANCH**: `visual-qa/rotation-and-image-drag`
- **WORKTREE**: `E:\VNOffice-agy-rotation-visualqa`
- **DATE**: 2026-09-07

---

## 1. Phạm vi & Nguyên tắc tuân thủ

- **Ranh giới an toàn**:
  - Chỉ tập trung kiểm tra và hoàn thiện vấn đề thị giác, tương tác (CSS, vị trí pixel, cursor, tooltip phản hồi, responsive 1024px / 1280px / 1600px).
  - Không can thiệp vào các tệp trong `adapters/libreoffice/**`.
  - Không sửa công thức toán học xoay/co giãn hay ma trận vector trong `_attachResizeHandle` / `_attachRotateHandle` (đã được kiểm chứng kỹ ở các phiên trước).
  - Không can thiệp vào ứng dụng Writer.
  - Cập nhật tài liệu Hướng dẫn sử dụng tiếng Việt tương ứng trong `platform/help/` theo Điều 10 của `AGENTS.md`.

---

## 2. Kết quả kiểm tra thị giác & Các cải tiến đã thực hiện

### 2.1. Tính năng 1: Xoay hình khối trong VN Slides (Slides shape rotation)

File liên quan: `apps/slides/slides-canvas.js`, `apps/slides/slides.css`, `platform/help/entries-slides.js`.

#### Những điểm đã kiểm tra:
1. **Vị trí và độ ổn định của tay cầm xoay**:
   - Tay cầm xoay hình tròn màu xanh dương (`.vno-shape-rotate-handle`) và cuống nối (`.vno-shape-rotate-stem`) hiển thị chính xác phía trên đỉnh đối tượng (cách đỉnh 28px).
   - Kiểm tra trên các loại hình: Hình chữ nhật (`rect`), Hình elip (`ellipse`), Hộp văn bản (`textbox`).
   - Không bị lệch tâm, không đè lên nội dung hình khối, không bị biến mất ở các độ zoom và độ phân giải màn hình (1600px, 1280px, 1024px).
2. **8 tay cầm co giãn (Resize handles)**:
   - Sau khi xoay hình ở các góc khác nhau (30°, 45°, 90°, 180°), 8 tay cầm co giãn vẫn nằm đúng tại các góc và cạnh của hình đã xoay.
3. **Con trỏ chuột thông minh (Dynamic Cursor)**:
   - Logic `cursorForHandle` hoạt động chính xác: Khi xoay 90°, tay cầm `n` (ở đỉnh xoay sang mép phải màn hình) hiển thị đúng con trỏ kéo ngang `ew-resize`; tay cầm `e` (xoay xuống mép đáy) hiển thị đúng con trỏ kéo dọc `ns-resize`.
4. **Nút xóa đỏ (Counter-rotation)**:
   - Nút xóa (`.vno-shape-delete-btn`) được áp dụng `rotate(${-targetRot}deg)`, luôn giữ tư thế thẳng đứng trên màn hình, giúp người dùng dễ nhận biết và thao tác.
5. **Chế độ trình chiếu (Slideshow)**:
   - Khi chiếu toàn màn hình (F5 / `startSlideShow`), hình vẽ xoay hiển thị đúng góc quay qua `transform: rotate(...)`.
   - Toàn bộ tay cầm thao tác (`.vno-shape-rotate-handle`, `.vno-shape-resize-handle`, `.vno-shape-delete-btn`) không xuất hiện trong chế độ trình chiếu.

#### Vấn đề phát hiện & Cải tiến UI đã thực hiện:
- **Vấn đề**: Khi kéo xoay (đặc biệt khi giữ Shift để snap từng bước 15°), người dùng không có phản hồi thị giác số đo góc độ đang xoay (phải ước lượng bằng mắt).
- **Cải tiến**:
  - Đã bổ sung huy hiệu tooltip góc độ thời gian thực (`.vno-shape-rotate-tooltip`) hiển thị số độ (ví dụ: `0°`, `15°`, `45°`, `90°`...).
  - Tooltip được đặt phía trên tay cầm xoay và tự động counter-rotate (`rotate(${-currentRot}deg)`), đảm bảo chữ số luôn nằm ngang dễ đọc xuôi chiều, không bị lộn ngược khi hình xoay 180°.
  - Tự động gỡ bỏ sạch sẽ tooltip khi người dùng nhả chuột (`pointerup`).
  - Đầy đủ kiểu dáng trong cả chế độ giao diện Sáng và Tối (Dark Mode).

---

### 2.2. Tính năng 2: Kéo-thả ảnh trong Sheet có Freeze Panes

File liên quan: `apps/sheet/sheet-grid.js`, `apps/sheet/sheet.css`, `platform/help/entries-sheet.js`.

#### Những điểm đã kiểm tra:
1. **Độ dính của ảnh trong vùng đóng băng (Freeze Panes)**:
   - Bật Freeze Panes (Hàng 1 + Cột A) và chèn ảnh vào ô A1.
   - Khi cuộn dọc (`scrollTop=400`) và cuộn ngang (`scrollLeft=250`), ảnh tại A1 giữ nguyên tọa độ tuyệt đối trên màn hình (độ lệch < 2px), không bị giật, không bị trôi lệch, không bị nhấp nháy khi cuộn nhanh.
   - Ảnh tại ô thường (E8) cuộn trôi mượt mà theo lưới bảng tính.
2. **Độc lập trục đóng băng trong `_updateFrozenImages()`**:
   - Hoàn thiện logic tính toán độ dịch chuyển `tx` và `ty` theo từng trục riêng biệt (`data-frozen-row` và `data-frozen-col`), tránh trường hợp ảnh chỉ đóng băng hàng nhưng bị dính oan theo trục ngang (hoặc ngược lại).
   - Bổ sung lời gọi `this._updateFrozenImages()` ngay cuối hàm `renderImages()`, đảm bảo ảnh vừa chèn hoặc vừa re-render khi viewport đang cuộn dở lập tức nhận đúng vị trí neo đóng băng.
3. **Kéo-thả ảnh trong vùng đóng băng**:
   - Kéo ảnh từ A1 sang B1: Ảnh snap chuẩn xác về ô B1 và duy trì vị trí neo đóng băng. Thao tác hoàn tác Ctrl+Z khôi phục chuẩn xác.

#### Vấn đề phát hiện & Cải tiến UI đã thực hiện:
- **Vấn đề**: Khi kéo-thả ảnh trên bảng tính, chỉ có khung ảnh di chuyển trơn mà thiếu chỉ báo ô đích sắp rơi vào, khiến người dùng khó căn chính xác ô neo mong muốn.
- **Cải tiến**:
  - Đã bổ sung hiệu ứng highlight ô đích thời gian thực (`.vno-grid-cell.is-drop-target`):
    - Trong lúc kéo chuột, ô lưới gần nhất dưới góc trên-trái của ảnh tự động được viền nét đứt 2px màu xanh lá thương hiệu (`var(--vno-sheet-primary)`) và nền xanh nhạt mờ (`rgba(15, 109, 56, 0.18)`).
    - Hiệu ứng highlight chuyển dịch tức thì khi chuột di chuyển qua các ô khác nhau.
    - Khi thả chuột (`pointerup`), toàn bộ highlight `.is-drop-target` tự động được dọn dẹp và ảnh snap hoàn hảo vào đúng ô đã chỉ báo.
  - Hỗ trợ đầy đủ hiển thị tương phản cao trong Dark Mode (`rgba(74, 222, 128, 0.25)`).

---

## 3. Danh sách ảnh chụp màn hình kiểm chứng (Visual Evidence)

Toàn bộ ảnh chụp màn hình thực tế được ghi lại tự động từ Edge/Playwright trong thư mục `docs/screenshots/`:

| STT | Tên tệp ảnh | Nội dung kiểm chứng |
| :---: | :--- | :--- |
| 1 | `docs/screenshots/slides-rotation-visual-qa-1600-shapes.png` | 3 hình khối (rect, ellipse, textbox) và tay cầm xoay chuẩn tại 1600px |
| 2 | `docs/screenshots/slides-rotation-visual-qa-rotating-tooltip.png` | Tooltip hiển thị góc độ trực quan (`.vno-shape-rotate-tooltip`) khi kéo xoay |
| 3 | `docs/screenshots/slides-rotation-visual-qa-rotated-handles.png` | Hình xoay 90°: 8 tay cầm resize, con trỏ chuột thích ứng và nút xóa thẳng đứng |
| 4 | `docs/screenshots/slides-rotation-visual-qa-slideshow.png` | Chế độ trình chiếu (Slideshow): Hình xoay chuẩn, không có tay cầm thao tác thừa |
| 5 | `docs/screenshots/slides-rotation-visual-qa-1024-responsive.png` | Hiển thị responsive tay cầm xoay ổn định tại độ phân giải nhỏ 1024px |
| 6 | `docs/screenshots/sheet-image-drag-freeze-visual-qa-initial.png` | Trạng thái ban đầu: Freeze Panes Hàng 1 + Cột A, ảnh A1 và ảnh E8 |
| 7 | `docs/screenshots/sheet-image-drag-freeze-visual-qa-scrolled.png` | Sau khi cuộn dọc và ngang: Ảnh A1 dính cố định, ảnh E8 cuộn trôi chuẩn |
| 8 | `docs/screenshots/sheet-image-drag-freeze-visual-qa-dragging-highlight.png` | Phản hồi thị giác: Ô đích được highlight nét đứt (`.is-drop-target`) trong khi kéo ảnh |
| 9 | `docs/screenshots/sheet-image-drag-freeze-visual-qa-dropped.png` | Sau khi thả chuột: Ảnh snap chuẩn xác vào ô đích, không còn highlight thừa |
| 10 | `docs/screenshots/sheet-image-drag-freeze-visual-qa-frozen-drag.png` | Kéo ảnh trong vùng đóng băng (A1 -> B1) duy trì tính năng dính cố định |
| 11 | `docs/screenshots/sheet-image-drag-freeze-visual-qa-1024-responsive.png` | Hiển thị responsive ảnh và bảng tính có Freeze Panes tại 1024px |

---

## 4. Kết quả kiểm thử tự động (Test Verification)

### 4.1. Kiểm tra cú pháp toàn dự án (`node scripts/check-syntax.js`)
- **Kết quả**: **89/89 files hợp lệ | 0 lỗi cú pháp** (PASS 100%).

### 4.2. Bộ kiểm thử đơn vị & tích hợp (`node tests/run-tests.js`)
- **Kết quả**: **1503/1503 PASS | 0 FAIL** (Tăng từ 1502 lên 1503 với bài kiểm thử đơn vị mới cho tooltip góc xoay).

### 4.3. Kiểm thử Ribbon Audit 1280px (`node tests/live/ribbon-audit-1280.playwright.mjs`)
- **Kết quả**: **104/104 PASS | 0px tràn ngang** trên cả 3 ứng dụng (Writer, Sheet, Slides), 2 độ phân giải (1280x720 và 1280x800), 2 ngôn ngữ (VI và EN), kiểm tra thành công tương tác click tất cả 41 nút lệnh thu gọn.

### 4.4. Kiểm thử Live Playwright Visual QA mới xây dựng
- `node tests/live/slides-rotation-visual-qa.playwright.mjs`: **100% PASS**.
- `node tests/live/sheet-image-drag-freeze-visual-qa.playwright.mjs`: **100% PASS**.

---

## 5. Danh sách tệp đã tạo / sửa đổi

1. `apps/slides/slides-canvas.js`: Bổ sung khởi tạo, cập nhật thời gian thực và dọn dẹp `.vno-shape-rotate-tooltip` trong `_attachRotateHandle` và `_removeShapeSelectionHandles`.
2. `apps/slides/slides.css`: Thêm kiểu dáng badge cho `.vno-shape-rotate-tooltip` (chế độ sáng và dark mode).
3. `apps/sheet/sheet-grid.js`: Bổ sung highlight ô đích `.is-drop-target` trong `_attachImageDrag`, phân định trục `frozenRow`/`frozenCol` trong `renderImages` và `_updateFrozenImages`.
4. `apps/sheet/sheet.css`: Thêm kiểu dáng viền nét đứt cho `.vno-grid-cell.is-drop-target` (chế độ sáng và dark mode).
5. `platform/help/entries-slides.js`: Cập nhật nội dung hướng dẫn tiếng Việt giải thích tooltip góc xoay.
6. `platform/help/entries-sheet.js`: Cập nhật nội dung hướng dẫn tiếng Việt giải thích highlight ô đích khi kéo ảnh.
7. `tests/unit/slides-shape-rotation-handle.test.js`: Thêm test đơn vị cho `.vno-shape-rotate-tooltip`.
8. `tests/live/slides-rotation-visual-qa.playwright.mjs`: Tệp kiểm thử live Playwright Visual QA cho Slides shape rotation.
9. `tests/live/sheet-image-drag-freeze-visual-qa.playwright.mjs`: Tệp kiểm thử live Playwright Visual QA cho Sheet image drag + freeze pane.
10. `docs/HANDOFF-VISUAL-QA-ROTATION-AND-IMAGE-DRAG.md`: Báo cáo bàn giao chi tiết này.
