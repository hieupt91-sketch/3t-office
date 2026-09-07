# BÁO CÁO ĐÁNH GIÁ THIẾT KẾ TRỰC QUAN (VISUAL QA) — VÒNG 2

- **TASK**: Đánh giá thiết kế trực quan (Visual QA) độc lập, VÒNG 2, cho 3 tính năng mới hoàn thành:
  1. Tay cầm xoay hình VN Slides (`HANDOFF-SLIDES-SHAPE-ROTATION-HANDLE.md` & `HANDOFF-SLIDES-SHAPE-ROTATION-DISPLAY.md`)
  2. Hình Tam giác / Hình thoi trong VN Writer (`HANDOFF-WRITER-TRIANGLE-DIAMOND-SHAPES.md`)
  3. Kéo-thả di chuyển ảnh trong VN Sheet (`HANDOFF-SHEET-IMAGE-DRAG-MOVE.md`)
- **AGENT/ROLE**: Visual QA & UI/UX Design Specialist (`agy`)
- **BRANCH**: `chore/visual-qa-round-2`
- **WORKTREE**: `E:\VNOffice-agy-visual-qa-2`

---

## 1. Tóm tắt kết quả đánh giá

| STT | Tính năng | Vấn đề phát hiện | Phân loại | Trạng thái | Lý do / Hướng xử lý |
|:---:|---|---|---|:---:|---|
| **1** | **VN Slides**: Tay cầm xoay hình | 8 tay cầm co giãn (.vno-shape-resize-handle) và tay cầm xoay (.vno-shape-rotate-handle) nằm đúng ở các cạnh/góc của hình đã xoay (xoay cùng phần tử cha DOM `el`). Tuy nhiên, khi kéo co giãn trên hình đã xoay (45°, 90°, 135°), logic toán học `_attachResizeHandle` dùng tọa độ màn hình không xoay (`dx`, `dy`), gây biến dạng sai trục. Con trỏ chuột (resize cursors) không xoay theo hướng cục bộ. Nút xóa đỏ bị xoay theo hình. | UX / Logic toán học | **GHI NHẬN** | Vấn đề toán học ma trận vector xoay và chiếu tọa độ màn hình, vượt quá phạm vi CSS/UI polish. Cần thiết kế lại tương tác resize ma trận xoay riêng. |
| **2a** | **VN Writer**: Màu mặc định Tam giác / Hình thoi | Tam giác mặc định xanh lá (`#16a34a`), Hình thoi mặc định tím thạch anh (`#9333ea`). Trong văn bản hành chính Việt Nam của Writer, bảng màu này tạo cảm giác "cầu vồng", thiếu tính liên kết so với màu chủ đạo xanh dương (`#2563eb`). Trong Word/Docs, các hình cơ bản dùng chung Theme Primary Color. | Thiết kế / Bảng màu | **GHI NHẬN** | Các unit test hiện có (`writer-illustration-dialogs.test.js`) kiểm tra chặt chẽ giá trị `#16a34a` và `#9333ea`. Đổi màu mặc định sẽ vi phạm Rule 8; ghi nhận để Claude/Design Lead xem xét thống nhất bảng màu theme. |
| **2b** | **VN Writer**: Hộp thoại Chèn hình khối (7 lựa chọn) | Khi nâng từ 5 lên 7 mục trong lưới 2 cột, lựa chọn thứ 7 ("Đường thẳng ngang") đứng đơn độc ở hàng 4, để lại khoảng trống bất đối xứng lớn. | Bố cục UI | **ĐÃ SỬA** | Cập nhật thẻ thứ 7 (`line`) trải rộng toàn bộ 2 cột (`grid-column: 1 / -1`), hiển thị dạng thanh ngang cân đối, thẩm mỹ cao. |
| **2c** | **VN Writer**: Dark Mode thẻ chọn hình khối | Thẻ được chọn sử dụng biến `--vno-sheet-light` (rò rỉ từ VN Sheet), khi bật Dark Mode biến thành màu xanh lục thẫm `#052e16` lạc quẻ với giao diện Writer. Xem trước đường thẳng ngang có `stroke: "#0f172a"` (đen đậm) bị chìm hoàn toàn vào nền tối `#252526`. | Dark Mode / Token Theme | **ĐÃ SỬA** | Đổi biến nền thẻ chọn sang `var(--vno-writer-light, var(--vno-bg-selected))` (ra màu navy sẫm `#172554` trong Dark Mode). Đường thẳng ngang dùng `var(--vno-text-primary, #0f172a)`, hiển thị sáng rõ `#f1f5f9` trong Dark Mode. |
| **3a** | **VN Sheet**: Kéo ảnh qua vùng Freeze Panes | Ảnh di chuyển mượt mà qua vùng đóng băng. Tuy nhiên, do `imageLayer` nằm trên `table` nhưng không được phân tách theo các viewport con của Freeze Panes: ảnh neo tại ô đóng băng (A1) sẽ bị cuộn trôi mất khi người dùng cuộn trang, còn ảnh ở vùng tự do khi cuộn lên sẽ đè nổi lên trên các hàng/cột cố định. | Kiến trúc DOM / Viewport Split | **GHI NHẬN** | Cần kiến trúc chia lớp `imageLayer` theo 4 pane (Top-Left, Top-Right, Bottom-Left, Bottom-Right) hoặc SVG clipping path. Vượt quá phạm vi CSS. |
| **3b** | **VN Sheet**: Kéo ảnh ra ngoài vùng nhìn thấy (Cần cuộn) | Kéo ảnh vượt qua biên phải/dưới của màn hình không kích hoạt auto-scroll. Khi thả chuột, ảnh snap vào ô ngoài vùng nhìn thấy (ví dụ `O18`) và "biến mất" khỏi màn hình cho đến khi người dùng tự cuộn tay tìm lại. | Tương tác / Auto-scroll | **GHI NHẬN** | Cần bổ sung thuật toán phát hiện biên (threshold ~30px) và cuộn tự động `requestAnimationFrame(scrollStep)`. Thuộc phạm vi tương tác nâng cao. |

---

## 2. Chi tiết đánh giá trực quan chuyên sâu

### 2.1. VN Slides: Tay cầm xoay hình & Tương tác Co giãn khi hình đã xoay

#### A. Kiểm tra trực quan vị trí 8 tay cầm co giãn và tay cầm xoay:
- **Cơ chế DOM hiện tại**: Trong `apps/slides/slides-canvas.js`, hàm `_ensureShapeSelectionHandles(el, shape)` gắn 8 tay cầm co giãn (`.vno-shape-resize-handle`), cuống xoay (`.vno-shape-rotate-stem`) và tay cầm xoay (`.vno-shape-rotate-handle`) trực tiếp làm con của thẻ `div.vno-slide-shape-item`.
- **Hành vi hiển thị thực tế tại các góc 45°, 90°, 135°**:
  - Vì phần tử cha nhận kiểu nội dòng `transform: rotate(deg); transform-origin: center center;`, toàn bộ cây DOM con kế thừa hệ tọa độ quay này.
  - Do đó, **8 tay cầm co giãn CÓ XOAY THEO hình khối** và luôn bám chính xác vào 4 góc và trung điểm 4 cạnh của hình khối đã xoay (minh chứng: `docs/screenshots/visual-qa-round-2/slides-shape-45deg.png` và `slides-shape-90deg.png`).
  - **Cuống nối và tay cầm xoay**: Nằm vuông góc phía trên cạnh đỉnh của hình khối đã xoay (tại 45° chĩa về hướng Đông Bắc, tại 90° chĩa về hướng Đông, tại 135° chĩa về hướng Đông Nam). Đây là hành vi hoàn toàn tương đồng với Microsoft PowerPoint hiện đại.

#### B. Các vấn đề trải nghiệm thị giác phát hiện khi thao tác:
1. **Biến dạng co giãn sai trục (Axis Resizing Distortion)**:
   - Trong `_attachResizeHandle(h, el, shape, dir)`:
     ```javascript
     const dx = moveEvent.clientX - startClientX;
     const dy = moveEvent.clientY - startClientY;
     if (dir.includes("e")) newW = Math.max(20, origW + dx);
     if (dir.includes("s")) newH = Math.max(20, origH + dy);
     ```
   - Giá trị `dx`, `dy` được tính theo hệ tọa độ màn hình không xoay (viewport X/Y), nhưng lại được gán trực tiếp cho chiều rộng `shape.w` và chiều cao `shape.h` (vốn là hệ tọa độ cục bộ của hình).
   - *Hậu quả thực tế tại góc xoay 90°*: Tay cầm `e` (Đông) nằm ở phía dưới đáy của hình chữ nhật đứng trên màn hình. Khi người dùng kéo tay cầm này sang phải màn hình (`dx > 0`), hình chữ nhật không giãn sang phải mà lại dài thêm về phía dưới! Nếu người dùng kéo chuột xuống dưới (`dy > 0`), chiều rộng hình không thay đổi gì (`dx = 0`).
2. **Lệch con trỏ chuột (Cursor mismatch)**:
   - Con trỏ chuột CSS gắn tĩnh theo tên tay cầm: `vno-handle-e` có `cursor: ew-resize`, `vno-handle-n` có `cursor: ns-resize`.
   - Tại góc 90°: Tay cầm nằm ở cạnh phải màn hình (vốn là đỉnh của hình ban đầu) lại hiển thị con trỏ mũi tên lên-xuống (`ns-resize`), trong khi tay cầm ở cạnh đáy màn hình lại hiển thị con trỏ trái-phải (`ew-resize`), gây nhầm lẫn thị giác nghiêm trọng khi rê chuột.
3. **Nút xóa đỏ xoay lệch vị trí**:
   - Nút xóa `.vno-shape-delete-btn` cố định tại `top: -12px; right: -12px`. Khi hình xoay 90°, nút xóa bị lật sang góc dưới-phải màn hình.

---

### 2.2. VN Writer: Bổ sung Tam giác/Hình thoi, Bảng màu và Bố cục Hộp thoại

#### A. Đánh giá bảng màu mặc định (Tam giác xanh lá, Hình thoi tím):
- **Phân tích thiết kế**:
  - VN Writer là ứng dụng soạn thảo văn bản, định hướng tài liệu hành chính công vụ và văn phòng chuyên nghiệp tại Việt Nam. Màu nhận diện của Writer là Xanh dương đậm (`#0f4c81` / `#2563eb`).
  - Hiện tại, 7 loại hình khối trong Writer mang 6 dải màu khác nhau:
    - Chữ nhật & Chữ nhật bo tròn: `#2563eb` (Xanh dương)
    - Hình tròn / Elip: `#0ea5e9` (Xanh da trời)
    - Tam giác: `#16a34a` (Xanh lá)
    - Hình thoi: `#9333ea` (Tím thạch anh)
    - Mũi tên: `#f59e0b` (Cam hổ phách)
    - Đường thẳng: `#0f172a` (Đen xám)
  - Khi chèn vào tài liệu thực tế (xem `docs/screenshots/visual-qa-round-2/writer-shapes-canvas-light.png`), các màu xanh lá và tím rực rỡ tạo cảm giác giống các mảnh ghép sticker/clipart rời rạc, không ăn nhập với văn bản hành chính trang trọng.
  - **Khuyến nghị kiến trúc**: Trong các phiên bản tương lai, nên có cơ chế đồng bộ màu hình khối theo `theme.accent1` (mặc định là xanh dương đồng nhất cho tất cả các hình cơ bản), cho phép người dùng đổi màu tùy chọn qua thanh Ribbon / Color Picker khi có nhu cầu.

#### B. Đánh giá và Cải tiến Hộp thoại "Chèn hình khối" (`apps/writer/writer-illustrations.js`):
1. **Bố cục 7 lựa chọn**:
   - Trước cải tiến: Lưới 2 cột (`repeat(2, 1fr)`). Khi có 7 lựa chọn, hàng thứ 4 chỉ có 1 thẻ "Đường thẳng ngang" nằm lệch bên trái, cột bên phải để trống một mảng trắng rộng 213px gây cảm giác chưa hoàn thiện.
   - **Đã khắc phục**: Áp dụng quy tắc `grid-column: 1 / -1` cho phần tử lẻ cuối cùng. Thẻ "Đường thẳng ngang" được định dạng dàn ngang (`flex-direction: row`), căn giữa nội dung, tạo sự cân bằng hoàn hảo cho toàn bộ hộp thoại (xem `writer-shape-dialog-light.png`).
2. **Khắc phục lỗi Dark Mode**:
   - **Rò rỉ CSS Variable**: Thẻ được chọn trước đây dùng `var(--vno-sheet-light, #eff6ff)`. Trong Dark Mode, biến này chuyển thành màu xanh lục đậm `#052e16` của ứng dụng VN Sheet. Đã sửa sang `var(--vno-writer-light, var(--vno-bg-selected, #eff6ff))` để hiển thị màu xanh navy `#172554` đồng nhất với Writer.
   - **Đường thẳng ngang tàng hình**: Thẻ preview của đường thẳng ngang trước đây có `stroke: "#0f172a"`. Trên nền tối `#252526` của Dark Mode, nét vẽ gần như vô hình. Đã bổ sung biến `var(--vno-text-primary, #0f172a)` cho nét vẽ xem trước trong hộp thoại, tự động chuyển thành trắng sáng `#f1f5f9` trong Dark Mode (xem `writer-shape-dialog-dark-selected.png`).

---

### 2.3. VN Sheet: Kéo-thả ảnh với Freeze Panes & Vùng cuộn

#### A. Kéo ảnh qua vùng Freeze Panes & Hiện tượng mất đồng bộ khi cuộn:
- **Thao tác kéo trực tiếp**: Trải nghiệm kéo chuột qua lại giữa vùng đóng băng (ví dụ cột A, B hoặc hàng 1, 2, 3) và vùng tự do diễn ra mượt mà, phản hồi con trỏ `cursor: grabbing` tốt, bóng đổ nổi rõ ràng (`box-shadow: 0 12px 28px rgba(15, 23, 42, 0.35)`).
- **Hiện tượng trực quan bất thường (Visual Desynchronization)**:
  - Khi một ảnh được thả neo vào ô thuộc vùng đóng băng (ví dụ ô A1): Ô chữ A1 được giữ cố định trên màn hình qua CSS `position: sticky`. Nhưng thẻ ảnh `.vno-sheet-image` nằm trong lớp `imageLayer` vốn gắn vào vùng cuộn chung của viewport (`.vno-grid-viewport`). Khi người dùng cuộn chuột, **ảnh neo tại A1 trôi đi mất dạng**, trong khi ô A1 vẫn đứng yên tại góc màn hình! (Minh chứng: `docs/screenshots/visual-qa-round-2/sheet-frozen-a1-scrolled.png`).
  - Ngược lại, nếu ảnh neo tại ô C6 (vùng tự do): Khi cuộn trang lên, thẻ ảnh **trượt đè lên trên các hàng và tiêu đề đóng băng** thay vì lặn xuống dưới đường ranh giới cố định (Minh chứng: `sheet-freeze-scroll-after.png`).

#### B. Kéo ảnh ra ngoài vùng nhìn thấy (Viewport Overflow):
- Khi người dùng kéo ảnh sát mép phải hoặc mép dưới của lưới bảng tính, khung nhìn không tự động cuộn (thiếu tính năng Edge Auto-scroll).
- Khi nhả chuột ngoài biên nhìn thấy: Hàm `_getAnchorFromPixel` vẫn chuyển đổi pixel thành tọa độ ô ngoài màn hình (ví dụ ô `O18`). Ảnh lập tức được gán neo mới tại `O18`. Tuy nhiên, do màn hình không tự cuộn theo, thẻ ảnh **ngay lập tức biến mất khỏi tầm mắt người dùng** (Minh chứng: `docs/screenshots/visual-qa-round-2/sheet-image-after-drop-past-edge.png`). Người dùng không biết ảnh đã đi đâu trừ khi tự cuộn thanh cuộn ngang/dọc để tìm lại.

---

## 3. Các thay đổi mã nguồn đã thực hiện

### Tệp đã sửa: `apps/writer/writer-illustrations.js`
1. **Tối ưu hóa lưới hộp thoại Chèn hình khối**:
   - Thêm kiểm tra `isLastOdd = SHAPE_TYPES.length % 2 === 1 && idx === SHAPE_TYPES.length - 1;`.
   - Nếu là phần tử lẻ cuối cùng: Áp dụng `grid-column: 1 / -1; flex-direction: row; justify-content: center; gap: 16px;`.
2. **Khắc phục token màu Dark Mode**:
   - Thay thế `var(--vno-sheet-light, #eff6ff)` bằng `var(--vno-writer-light, var(--vno-bg-selected, #eff6ff))` tại cả CSS nội dòng khởi tạo và trong sự kiện `click` của các thẻ.
3. **Xem trước đường thẳng tương thích Dark Mode**:
   - Bổ sung `stroke: s.id === "line" ? "var(--vno-text-primary, #0f172a)" : undefined` vào lệnh gọi `renderShapeSvg` trong hộp thoại.

---

## 4. Bảng kết quả kiểm thử (Verification & Test Results)

| Bộ kiểm thử | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|:---:|---|
| **Kiểm tra cú pháp toàn dự án** | `node scripts/check-syntax.js` | **89/89 PASS** | 100% tệp JavaScript hợp lệ, 0 lỗi cú pháp |
| **Bộ kiểm thử đơn vị toàn hệ thống** | `node tests/run-tests.js` | **1480/1480 PASS** | 134 test suites đạt 100%, không thoái lui |
| **Ribbon Audit 1280px Laptop** | `node tests/live/ribbon-audit-1280.playwright.mjs` | **104/104 PASS** | 26 tabs x 2 resolutions x 2 languages, 0px tràn ngang |
| **Kiểm thử live Hộp thoại Writer** | `node tests/live/writer-illustration-dialogs.playwright.mjs` | **100% PASS** | Toàn bộ 23 assertions live click/chèn đạt |
| **Kịch bản thăm dò Visual QA Vòng 2** | `node scratch/visual-qa-round2-probe.mjs` | **100% PASS** | Đã ghi nhận đầy đủ số liệu và xuất 19 ảnh chụp màn hình |

---

## 5. Bằng chứng trực quan (Screenshots Repository)

Toàn bộ ảnh chụp màn hình kiểm chứng được lưu trữ tại thư mục:  
`docs/screenshots/visual-qa-round-2/`

- `slides-shape-45deg.png` & `slides-shape-45deg-after-resize.png`: Hình khối xoay 45° trước và sau khi kéo co giãn.
- `slides-shape-90deg.png` & `slides-shape-90deg-after-resize.png`: Hình khối xoay 90°, tay cầm xoay quay sang hướng Đông, co giãn theo trục màn hình.
- `slides-shape-135deg.png` & `slides-shape-135deg-after-resize.png`: Hình khối xoay 135°.
- `writer-shape-dialog-light.png`: Bố cục hộp thoại 7 hình khối mới cân đối, thẻ thứ 7 full width.
- `writer-shape-dialog-dark.png` & `writer-shape-dialog-dark-selected.png`: Dark mode chuẩn xanh navy Writer, nét vẽ đường thẳng tương phản rõ nét.
- `writer-shapes-canvas-light.png` & `writer-shapes-canvas-dark.png`: Các hình khối tam giác, hình thoi, chữ nhật trên trang văn bản Writer.
- `sheet-image-dragging-over-frozen.png`: Kéo ảnh qua vùng đóng băng (Freeze Panes).
- `sheet-freeze-scroll-after.png`: Ảnh vùng tự do đè lên vùng đóng băng khi cuộn chuột.
- `sheet-frozen-a1-scrolled.png`: Ảnh neo tại ô đóng băng A1 bị cuộn trôi mất.
- `sheet-image-after-drop-past-edge.png`: Ảnh thả ngoài biên biến mất khỏi màn hình.

---

## 6. Đề xuất hành động tiếp theo cho Claude / Lead Engineering Agent

1. **VN Slides — Toán học co giãn hình xoay (Rotated Shape Resizing Math)**:
   - Cần bổ sung ma trận xoay góc $\theta$ khi tính toán vector kéo co giãn: $\Delta x_{local} = \Delta x \cos(-\theta) - \Delta y \sin(-\theta)$, $\Delta y_{local} = \Delta x \sin(-\theta) + \Delta y \cos(-\theta)$.
   - Cập nhật con trỏ chuột quay theo góc gần nhất của 8 hướng (ví dụ xoay góc con trỏ tương ứng).
2. **VN Writer — Thống nhất màu sắc chủ đề cho Hình khối (Shape Theme Cohesion)**:
   - Cân nhắc chuyển màu mặc định của tất cả các hình khối sang màu chủ đạo của tài liệu (`#2563eb` hoặc Theme Primary), thay vì mỗi hình một màu sặc sỡ.
3. **VN Sheet — Tích hợp Freeze Panes & Auto-scroll cho Ảnh**:
   - Xem xét kiến trúc đưa các phần tử ảnh thuộc vùng đóng băng vào container riêng (sticky layer), hoặc áp dụng CSS `clip-path` để xén ảnh theo đường biên Freeze Panes khi cuộn.
   - Thêm tính năng Auto-scroll trong `_attachImageDrag` khi con trỏ chuột di chuyển cách mép ngoài của viewport dưới 30px.
