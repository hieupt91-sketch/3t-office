# BÁO CÁO BÀN GIAO (AGENT HANDOFF)

- **TASK**: Sửa lỗi co giãn hình BỊ SAI TRỤC khi hình đã xoay trên canvas VN Slides (Rotated Shape Resize Math & Anchor Invariance)
- **AGENT/ROLE**: agy (Canvas UI / Geometry & Interaction Specialist)
- **BRANCH**: `feat/slides-rotated-resize-math`
- **WORKTREE**: `E:\VNOffice-agy-rotated-resize`
- **ISSUE GỐC**: Visual QA Vòng 2 mục 2.1 (`docs/HANDOFF-VISUAL-QA-ROUND-2.md`): Khi hình đã xoay góc (ví dụ 45°, 90°, 135°), việc kéo 8 tay cầm co giãn (.vno-shape-resize-handle) dùng trực tiếp delta pixel màn hình `dx`/`dy` khiến hình bị biến dạng sai trục (ví dụ tại 90°, kéo ngang tay cầm đáy `e` làm hình phình dài về phía dưới).

---

## 1. Mục tiêu và Giải pháp

### 1.1. Nguyên nhân lỗi trước khi sửa
Trong `_attachResizeHandle()` của `apps/slides/slides-canvas.js`, delta chuột `dx = moveEvent.clientX - startClientX`, `dy = moveEvent.clientY - startClientY` là độ dịch chuyển theo trục tọa độ màn hình (viewport).
Khi `shape.rotation` bằng 0/undefined, trục màn hình trùng trục cục bộ của hình. Nhưng khi hình đã xoay một góc $\theta \ne 0$, các tay cầm xoay theo hình khối trên màn hình, trong khi logic cũ lại áp dụng trực tiếp `dx` vào chiều rộng `shape.w` và `dy` vào chiều cao `shape.h`. Ngoài ra, góc neo đối diện (anchor corner) bị trôi dạt trên màn hình vì chỉ gán `newX = origX + (origW - newW)` theo hệ trục không xoay.

### 1.2. Thuật toán chuẩn công nghiệp (PowerPoint / Figma) đã áp dụng
Áp dụng đầy đủ 4 bước hình học giải tích trong hàm `move` của `_attachResizeHandle`:

#### Bước 1: Chiếu delta chuột (màn hình) về hệ trục CỤC BỘ của hình
```js
const theta = (shape.rotation || 0) * Math.PI / 180; // độ -> radian
const cosT = Math.cos(theta), sinT = Math.sin(theta);
// dx, dy là delta chuột màn hình (moveEvent.clientX - startClientX, ...)
// Xoay NGƯỢC theta (-theta) để chiếu delta màn hình về hệ trục cục bộ của hình:
const localDx = dx * cosT + dy * sinT;
const localDy = -dx * sinT + dy * cosT;
```
*Ghi chú*: Khi `shape.rotation = 0/undefined`, $\theta = 0 \implies \cos\theta = 1, \sin\theta = 0 \implies localDx = dx, localDy = dy$. Đảm bảo 100% không thoái lui cho hình không xoay.

#### Bước 2: Dùng `localDx` / `localDy` tính toán `newW` / `newH`
Thay thế biến `dx` bằng `localDx`, `dy` bằng `localDy` trong các phép cộng/trừ theo hướng kéo (`dir`):
- `dir.includes("e")`: `newW = Math.max(20, origW + localDx);`
- `dir.includes("s")`: `newH = Math.max(20, origH + localDy);`
- `dir.includes("w")`: `newW = Math.max(20, origW - localDx);`
- `dir.includes("n")`: `newH = Math.max(20, origH - localDy);`
- Hỗ trợ `keepAspect` (giữ Shift): `newH = Math.max(20, Math.round(newW / aspect));` cho 4 góc (`nw`, `ne`, `se`, `sw`).

#### Bước 3: Giữ ĐÚNG góc neo (anchor corner) cố định trên MÀN HÌNH sau khi xoay lại
Góc neo đối diện với hướng kéo phải đứng yên tuyệt đối trên màn hình:
```js
// Tâm hình CŨ:
const oldCenterX = origX + origW / 2;
const oldCenterY = origY + origH / 2;

// Offset góc neo đối diện so với tâm CŨ:
const anchorOffsetMap = {
  nw: [1, 1], n: [0, 1], ne: [-1, 1], e: [-1, 0],
  se: [-1, -1], s: [0, -1], sw: [1, -1], w: [1, 0]
};
const [ox, oy] = anchorOffsetMap[dir] || [0, 0];
const anchorLocalX = oldCenterX + ox * (origW / 2);
const anchorLocalY = oldCenterY + oy * (origH / 2);

// Xoay góc neo quanh tâm CŨ để xác định tọa độ cố định trên màn hình:
const anchorOffsetX = anchorLocalX - oldCenterX;
const anchorOffsetY = anchorLocalY - oldCenterY;
const anchorScreenX = oldCenterX + (anchorOffsetX * cosT - anchorOffsetY * sinT);
const anchorScreenY = oldCenterY + (anchorOffsetX * sinT + anchorOffsetY * cosT);

// Tính offset góc neo MỚI theo kích thước mới (newW, newH):
const newAnchorOffsetX = ox * (newW / 2);
const newAnchorOffsetY = oy * (newH / 2);

// Giải ngược ra tâm MỚI để góc neo trên màn hình trùng khớp hoàn hảo anchorScreen:
const newCenterX = anchorScreenX - (newAnchorOffsetX * cosT - newAnchorOffsetY * sinT);
const newCenterY = anchorScreenY - (newAnchorOffsetX * sinT + newAnchorOffsetY * cosT);

let newX = newCenterX - newW / 2;
let newY = newCenterY - newH / 2;
```

#### Bước 4: Áp dụng vị trí và kích thước mới
- Đối với hình không xoay (`!shape.rotation`): Giữ nguyên cơ chế kẹp biên slide (`slideSize.width - 20`, v.v.).
- Gán `shape.x = newX; shape.y = newY; shape.w = newW; shape.h = newH;` và cập nhật DOM styles (`style.left`, `style.top`, `style.width`, `style.height`).
- Giữ nguyên undo/redo stack (`type: "shape-resize"`).

---

## 2. Ranh giới an toàn & Tuân thủ quy tắc

- **Phạm vi mã nguồn**: CHỈ chỉnh sửa đúng hàm `_attachResizeHandle()` trong `apps/slides/slides-canvas.js`.
- **Không xâm lấn**:
  - Không đụng vào `_attachRotateHandle()`.
  - Không đổi cursor CSS (thuộc phạm vi thẩm mỹ riêng).
  - Không đổi vị trí nút xóa đỏ.
  - Không đụng sang codebase VN Writer hoặc VN Sheet.

---

## 3. Danh mục tệp thay đổi và tạo mới

1. **`apps/slides/slides-canvas.js`** (Đã sửa): Cập nhật `_attachResizeHandle` theo thuật toán 4 bước chuẩn chiếu vector ma trận xoay và giải vị trí tâm mới.
2. **`tests/unit/slides-shape-rotated-resize.test.js`** (Tạo mới): 9 bài unit test bao phủ toàn diện:
   - Hồi quy 8 hướng cho hình không xoay (khớp kết quả số học tuyệt đối).
   - Hồi quy phím Shift giữ tỷ lệ (keepAspect).
   - Tính bất biến của góc neo trên màn hình (Anchor Invariance) ở các góc 0°, 30°, 45°, 60°, 90°, 135°, 180°, 270°, -45°.
   - Sửa lỗi sai trục tại góc 90°: Kéo 'e' xuống dưới làm tăng `shape.w`, kéo 'e' sang phải KHÔNG làm tăng `shape.w`, kéo 'n' sang phải làm tăng `shape.h`.
   - Chiếu vector tại 45° và 135°.
   - Giới hạn kích thước tối thiểu 20px.
   - Hoàn tác / Làm lại (Undo / Redo).
3. **`tests/run-tests.js`** (Đã sửa): Đăng ký Suite 135 vào bộ test tự động runner.
4. **`tests/live/slides-shape-rotated-resize.playwright.mjs`** (Tạo mới): Kiểm thử live Playwright với Chromium/Edge trên canvas thật:
   - Kéo co giãn hình không xoay.
   - Kéo co giãn hình xoay 90°: kiểm tra `getBoundingClientRect()` xác nhận cạnh hình mở rộng đúng hướng thị giác của người dùng, không sai trục.
   - Kéo co giãn hình xoay 45° và 135°.
   - Kiểm tra tương tác hoàn tác Ctrl+Z và làm lại Ctrl+Y.
5. **`docs/screenshots/slides-rotated-resize-live.png`** (Tạo mới): Ảnh chụp màn hình kiểm chứng Playwright live.
6. **`docs/HANDOFF-SLIDES-ROTATED-RESIZE-MATH.md`** (Tệp này): Tài liệu báo cáo chi tiết.

---

## 4. Kết quả kiểm thử thực tế

1. **Kiểm tra cú pháp (`node scripts/check-syntax.js`)**:
   - Kết quả: **89/89 PASS | 0 lỗi cú pháp**.
2. **Toàn bộ bộ kiểm thử tự động (`node tests/run-tests.js`)**:
   - Kết quả: **1497/1497 PASS | 0 FAIL** (100% PASS, tăng 9 tests so với baseline 1488/1488).
3. **Kiểm thử live Playwright xoay hình (`node tests/live/slides-shape-rotation-handle.playwright.mjs`)**:
   - Kết quả: **100% PASS** (Không thoái lui tính năng xoay đã có).
4. **Kiểm thử live Playwright co giãn hình xoay (`node tests/live/slides-shape-rotated-resize.playwright.mjs`)**:
   - Kết quả: **100% PASS** (Cả 4 test case đều đạt, xác nhận đúng bounding box thị giác).
5. **Kiểm thử Ribbon Audit 1280px (`node tests/live/ribbon-audit-1280.playwright.mjs`)**:
   - Kết quả: **104/104 audits PASS** (100% PASS trên cả 3 ứng dụng).
