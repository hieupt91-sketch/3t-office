# HANDOFF: Kéo-thả di chuyển ảnh (drag-to-move) trên canvas bảng tính VN Sheet

- **Task**: Bổ sung tương tác kéo-thả di chuyển ảnh (drag-to-move) trên canvas lưới bảng tính VN Sheet, tự động snap về góc ô gần nhất, đồng bộ Undo/Redo và cập nhật trợ giúp người dùng tiếng Việt.
- **Branch**: `feat/sheet-image-drag-move`
- **Worktree**: `E:\VNOffice-agy-sheet-image-drag`
- **Agent**: agy

---

## 1. Bối cảnh & Vấn đề giải quyết

Trong lần Visual QA trước (`docs/HANDOFF-VISUAL-QA-IMAGE-SHAPES.md`, mục 2.2 và mục 4), agy đã phát hiện và ghi nhận khoảng trống tính năng (feature gap): các ảnh chèn trong VN Sheet (`.vno-sheet-image`) hiển thị dưới dạng overlay tĩnh neo theo ô (`image.anchor = { c, r }`), nhưng chưa có trình xử lý sự kiện con trỏ để kéo-thả di chuyển trên lưới bảng tính.

Sau khi luồng đọc/ghi ảnh nhúng Excel thật từ FODS/XLSX hoàn thiện (`docs/HANDOFF-SHEET-IMAGE-IMPORT-EXPORT.md`), nhiệm vụ này hiện thực hóa tương tác kéo-thả di chuyển ảnh trên canvas lưới bảng tính VN Sheet theo đúng yêu cầu:
1. Kéo-thả mượt mà bằng con trỏ chuột (`pointerdown`, `pointermove`, `pointerup`).
2. Tự động chuyển đổi pixel cuối cùng về tọa độ ô gần nhất và snap nhẹ về đúng góc ô (tương tự Microsoft Excel và LibreOffice Calc).
3. Hỗ trợ Undo (Ctrl+Z) và Redo (Ctrl+Y) đầy đủ cho thao tác di chuyển ảnh.
4. Con trỏ chuột trực quan: `cursor: move` khi hover, `cursor: grabbing` khi đang kéo.
5. Cập nhật Hướng dẫn sử dụng trong ứng dụng bằng tiếng Việt (theo Điều 10 của AGENTS.md).

---

## 2. Chi tiết các thay đổi kỹ thuật

### 2.1. Logic lưới bảng tính (`apps/sheet/sheet-grid.js`)

1. **Chuyển đổi ngược Pixel sang Tọa độ Ô (`_getAnchorFromPixel(left, top)`)**:
   - Sử dụng offset tiêu đề cố định: `headerLeft = 46px` (chiều rộng cột tiêu đề hàng), `headerTop = 28px` (chiều cao hàng tiêu đề cột).
   - Duyệt qua mảng cột `this.cols` và độ rộng từng cột `getColumnWidth(col)` để tính điểm chính giữa (midpoint) từng cột: nếu pixel `left < accumX + colW / 2` thì chọn cột đó, đảm bảo snap về ô gần nhất.
   - Tính hàng dựa trên chiều cao hàng `getRowHeight(r)` hoặc `this.rowHeight` (28px), hỗ trợ cả trường hợp hàng mặc định và hàng có chiều cao tùy chỉnh.
   - Clamp an toàn trong phạm vi bảng tính: cột từ `A` đến cột cuối cùng, hàng từ `1` đến `this.rowCount`.

2. **Gắn sự kiện kéo-thả ảnh (`_attachImageDrag(panel, image)`)**:
   - Lắng nghe `pointerdown` trên phần tử `<figure class="vno-sheet-image">`.
   - Bỏ qua nếu người dùng bấm vào nút xóa ảnh `[data-image-delete]`.
   - Gọi `panel.setPointerCapture(pointerId)` để bắt trọn chuỗi sự kiện con trỏ.
   - `pointermove`: cập nhật vị trí tức thời qua `panel.style.left` và `panel.style.top` (trực tiếp trên DOM để đạt độ mượt 60fps, không tính toán lại tọa độ ô liên tục). Bổ sung lớp CSS `.is-dragging`.
   - `pointerup`: giải phóng pointer capture, xóa lớp `.is-dragging`, tính toán pixel cuối cùng và gọi `_getAnchorFromPixel` để lấy ô neo mới.
   - Nếu ô neo mới khác ô ban đầu: cập nhật `image.anchor = { c: newAnchor.c, r: newAnchor.r }`, ghi nhận lịch sử vào `undoStack`, và gọi `this.renderImages()` để snap ảnh về góc ô mới.

3. **Hỗ trợ Undo/Redo thao tác di chuyển (`_applyHistoryActionImpl`)**:
   - Bổ sung xử lý `action.operation === "update"` hoặc `"move"` cho `action.type === "collection"`:
     - Tìm kiếm đối tượng ảnh theo `action.id`.
     - Phục hồi thuộc tính `anchor` từ `action.before` (khi Undo) hoặc `action.after` (khi Redo).
     - Gọi lại `this.renderImages()` để tái tạo giao diện thẻ ảnh tại vị trí ô tương ứng.

4. **Ngăn chặn xung đột kéo ảnh mặc định của trình duyệt**:
   - Gán `img.draggable = false` và kiểu CSS `pointer-events: none; user-select: none; -webkit-user-drag: none;` cho thẻ `<img>` con bên trong thẻ ảnh.

---

### 2.2. Kiểu dáng & Phản hồi con trỏ (`apps/sheet/sheet.css`)

- `.vno-sheet-image`: Bổ sung `cursor: move; user-select: none; touch-action: none;`.
- `.vno-sheet-image:active`: Bổ sung `cursor: grabbing;`.
- `.vno-sheet-image.is-dragging`:
  - `cursor: grabbing !important;`
  - `opacity: 0.88;`
  - `z-index: 100 !important;`
  - Đổ bóng nổi bật đa lớp khi nâng thẻ ảnh lên: `box-shadow: 0 12px 28px rgba(15, 23, 42, 0.35) !important;` (và phiên bản dark mode `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;`).
  - Tắt hiệu ứng transition trong lúc kéo để vị trí bám sát con trỏ tức thì: `transition: none !important;`.
- Nút xóa ảnh `button[data-image-delete]`: Bảo đảm luôn giữ `cursor: pointer !important;` độc lập.

---

### 2.3. Hướng dẫn sử dụng trong ứng dụng (`platform/help/entries-sheet.js`)

Tuân thủ nghiêm ngặt **Điều 10 của AGENTS.md**, mục trợ giúp `sheet.insert.image` ("Chèn và di chuyển ảnh trên bảng tính") đã được cập nhật nội dung tiếng Việt chuẩn xác theo đúng UI hiện có:
- Vị trí truy cập: Tab **Chèn** → nhóm **Minh họa** → nút **Chèn ảnh**.
- Hướng dẫn thao tác kéo-thả di chuyển: Nhấp giữ chuột trái trên khung ảnh (con trỏ chuột đổi thành biểu tượng di chuyển) rồi kéo đến vị trí mong muốn. Khi thả chuột, ảnh tự động căn chỉnh và neo chuẩn xác về góc ô gần nhất theo hàng và cột.
- Phím tắt hoàn tác: Nhấn `Ctrl+Z` để đưa ảnh về vị trí ô trước đó, hoặc `Ctrl+Y` để làm lại thao tác di chuyển.
- Thao tác xóa: Nhấp vào nút dấu nhân (×) màu đỏ ở góc trên bên phải của thẻ ảnh.

---

## 3. Ranh giới an toàn đã tuân thủ

- Không chỉnh sửa `adapters/libreoffice/sheet/sheet-adapter.js` (luồng đọc/ghi file Excel thật giữ nguyên vẹn 100%).
- Không chỉnh sửa hành vi chèn/xóa của `insertImage()` và `deleteImage()`.
- Dữ liệu ảnh luôn neo theo tọa độ ô (`image.anchor = { c, r }`), không lưu pixel tự do, bảo đảm tính tương thích hoàn hảo khi lưu và mở lại tệp FODS/XLSX.

---

## 4. Bảng kết quả kiểm thử (Test Results)

| Bài kiểm thử | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| **Cú pháp toàn bộ dự án** | `node scripts/check-syntax.js` | **89/89 PASS** | 0 lỗi cú pháp |
| **Độ tương phản WCAG 2.1 AA** | `node scripts/audit-contrast.js` | **100% PASS** | Tất cả token màu đều đạt chuẩn |
| **Bộ kiểm thử toàn hệ thống** | `node tests/run-tests.js` | **1468/1468 PASS** | Tăng 2 tests so với 1466 ban đầu, 0 FAIL |
| **Ribbon 1280px Laptop Audit** | `node tests/live/ribbon-audit-1280.playwright.mjs` | **100% PASS** | 104/104 tabs 0px tràn ngang |
| **Kiểm thử kéo-thả ảnh Live** | `node tests/live/sheet-image-drag.playwright.mjs` | **100% PASS** | Kéo B2 -> E7, snap ô, Ctrl+Z, Ctrl+Y, nút xóa |

---

## 5. Danh sách tệp tin thay đổi (Files Changed)

- `apps/sheet/sheet-grid.js`: Thêm `_getAnchorFromPixel()`, `_attachImageDrag()`, tích hợp kéo thả trong `renderImages()`, hỗ trợ `operation: "update"` trong undo/redo collection.
- `apps/sheet/sheet.css`: Thêm kiểu dáng kéo thả ảnh `.vno-sheet-image.is-dragging`, con trỏ chuột `move`/`grabbing`, hỗ trợ theme Sáng và Tối.
- `platform/help/entries-sheet.js`: Cập nhật nội dung hướng dẫn sử dụng tiếng Việt cho tính năng di chuyển ảnh kéo-thả (Rule 10).
- `tests/unit/sheet-images.test.js`: Thêm unit tests cho `_getAnchorFromPixel` và Undo/Redo di chuyển ảnh.
- `tests/live/sheet-image-drag.playwright.mjs`: Kịch bản kiểm thử Playwright live thật cho thao tác kéo-thả ảnh.
- `docs/HANDOFF-SHEET-IMAGE-DRAG-MOVE.md`: Tài liệu bàn giao chi tiết.
