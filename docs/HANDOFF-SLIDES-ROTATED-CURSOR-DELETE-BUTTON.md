# Báo Cáo Bàn Giao: Con Trỏ Chuột Động Theo Góc Xoay & Nút Xóa Thẳng Đứng (VN Slides)

- **TASK**: Sửa 2 vấn đề thị giác ghi nhận tại Visual QA Vòng 2 (`docs/HANDOFF-VISUAL-QA-ROUND-2.md` mục 2.1):
  1. Con trỏ chuột của 8 tay cầm co giãn tự động định hướng trực quan theo góc xoay thực tế.
  2. Nút xóa tròn đỏ (`.vno-shape-delete-btn`) luôn giữ tư thế thẳng đứng (counter-rotate) bất kể góc xoay của hình cha.
- **AGENT/ROLE**: agy (Frontend / Canvas UI / Visual QA Polish)
- **BRANCH**: `polish/slides-rotated-shape-cursor-delete`
- **WORKTREE**: `E:\VNOffice-agy-rotated-polish`

---

## 1. Mục tiêu & Bối cảnh

Tại Visual QA Vòng 2, hai vấn đề trải nghiệm thị giác đã được ghi nhận:
1. **Lệch con trỏ chuột (Cursor mismatch)**:
   - Các tay cầm co giãn có CSS cursor tĩnh theo tên: `.vno-handle-n` dùng `ns-resize`, `.vno-handle-e` dùng `ew-resize`.
   - Khi hình xoay 90°, tay cầm `n` xoay sang mép phải màn hình nhưng vẫn hiện con trỏ kéo dọc (`ns-resize`), gây nhầm lẫn thị giác nghiêm trọng vì người dùng đang nhìn thấy mép cạnh bên (lẽ ra phải là kéo ngang `ew-resize`).
2. **Nút xóa đỏ xoay lệch hướng (Delete button rotation distortion)**:
   - Nút xóa `.vno-shape-delete-btn` là phần tử con của DOM hình bị xoay (`.vno-slide-shape-item`), do đó nó xoay cùng phần tử cha.
   - Khi xoay 90°, nút xóa bị lộn ngược từ góc trên-phải xuống góc dưới-phải, chữ "×" và kiểu dáng bị nghiêng lệch, khó bấm và mất tính nhất quán.

---

## 2. Giải pháp kỹ thuật

### 2.1. Con trỏ chuột động theo góc xoay (`cursorForHandle`)

Định nghĩa chu kỳ con trỏ CSS đối xứng 180° và góc cơ sở của 8 tay cầm trong `apps/slides/slides-canvas.js`:

```javascript
// 8 hướng cursor CSS chuẩn theo thứ tự vòng tròn (0°, 45°, 90°...):
export const CURSOR_CYCLE = ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"];
// Góc cơ sở (độ) của mỗi handle khi KHÔNG xoay (0° = hướng lên/n):
export const BASE_ANGLE = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };

export function cursorForHandle(dir, rotationDeg) {
  const angle = (BASE_ANGLE[dir] + (rotationDeg || 0)) % 180; // resize cursor đối xứng 180°
  const normalized = ((angle % 180) + 180) % 180;
  const idx = Math.round(normalized / 45) % 4;
  return CURSOR_CYCLE[idx];
}
```

- **Khi tạo / cập nhật tay cầm (`_ensureShapeSelectionHandles`)**:
  - Gán `h.style.cursor = cursorForHandle(dir, shape.rotation);` cho cả 8 tay cầm co giãn.
  - Cập nhật lại toàn bộ tay cầm hiện có khi phương thức được gọi lại.
- **Cập nhật thời gian thực khi đang kéo xoay (`_attachRotateHandle`)**:
  - Trong sự kiện `pointermove` của thao tác kéo xoay, duyệt qua 8 tay cầm `.vno-shape-resize-handle` và gán lại `h.style.cursor = cursorForHandle(dir, currentRot)` ngay lập tức.
  - Thao tác gán thuộc tính `style.cursor` trên 8 phần tử DOM cực nhẹ (~0.05ms), hoàn toàn mượt mà 60fps.

### 2.2. Nút xóa luôn giữ tư thế thẳng đứng (Counter-Rotate)

- **Khi tạo / dựng nút xóa (`_ensureShapeSelectionHandles`)**:
  - Gán `delBtn.style.transform = shape.rotation ? \`rotate(${-shape.rotation}deg)\` : "";`.
  - Giữ nguyên vị trí neo `top: -10px; left: -10px;`, chỉ xoay ngược góc quay của phần tử cha để biểu tượng "×" và hình dáng nút luôn nhìn thẳng đứng với người dùng.
- **Cập nhật thời gian thực khi đang kéo xoay (`_attachRotateHandle`)**:
  - Trong sự kiện `pointermove`, cập nhật ngay `delBtn.style.transform = targetRot ? \`rotate(${-targetRot}deg)\` : "";`.
  - Khi góc xoay đưa về 0° hoặc xóa xoay, gỡ bỏ thuộc tính `transform` (`""`).
- **Tối ưu CSS chuyển động (`apps/slides/slides.css`)**:
  - Thêm quy tắc `.vno-slide-shape-item.is-rotating .vno-shape-delete-btn { transition: none; }` để triệt tiêu độ trễ 150ms khi đang kéo chuột, giúp nút xóa xoay ngược bám dính tức thì theo chuột kéo.

### 2.3. Hướng dẫn sử dụng trong ứng dụng (Tuân thủ Quy tắc 10 AGENTS.md)

Cập nhật mục trợ giúp `slides.shape.rotationHandle` trong `platform/help/entries-slides.js`:
- Bổ sung hướng dẫn chi tiết về tính năng con trỏ co giãn tự thích ứng theo góc nhìn người dùng và nút xóa thẳng đứng trực quan.

---

## 3. Ranh giới an toàn (Boundary Compliance)

- **Toán học co giãn**: Giữ nguyên toàn bộ logic ma trận vector và chiếu tọa độ màn hình trong `_attachResizeHandle` (không sửa đổi).
- **Ứng dụng khác**: Tuyệt đối không đụng vào mã nguồn của `apps/sheet/**` và `apps/writer/**`.
- **Adapter**: Không can thiệp `adapters/libreoffice/**`.

---

## 4. Danh sách tệp thay đổi & bổ sung

| Tệp | Hành động | Nội dung chính |
|---|---|---|
| `apps/slides/slides-canvas.js` | Sửa | Xuất `CURSOR_CYCLE`, `BASE_ANGLE`, `cursorForHandle`; cập nhật cursor động và counter-rotate delete button trong `_ensureShapeSelectionHandles` và `_attachRotateHandle`. |
| `apps/slides/slides.css` | Sửa | Thêm `.vno-slide-shape-item.is-rotating .vno-shape-delete-btn { transition: none; }`. |
| `platform/help/entries-slides.js` | Sửa | Cập nhật nội dung hướng dẫn sử dụng tiếng Việt theo Quy tắc 10. |
| `tests/unit/slides-shape-rotation-handle.test.js` | Sửa | Thêm 3 bài kiểm thử đơn vị cho `cursorForHandle`, `_ensureShapeSelectionHandles`, và `_attachRotateHandle` realtime. |
| `tests/live/slides-shape-rotated-cursor-delete.playwright.mjs` | Thêm mới | Bộ kiểm thử Playwright live tự động kiểm tra cursor `getComputedStyle()` và transform của nút xóa tại 0°, 90°, tương tác kéo chuột và hoàn tác Ctrl+Z. |
| `docs/screenshots/slides-rotated-cursor-delete-live.png` | Thêm mới | Ảnh chụp màn hình kiểm chứng kết quả chạy test Playwright live thật. |
| `docs/HANDOFF-SLIDES-ROTATED-CURSOR-DELETE-BUTTON.md` | Thêm mới | Tài liệu bàn giao này. |

---

## 5. Kết quả kiểm thử thực tế (Test Truthfulness)

Toàn bộ các lệnh kiểm thử đã được chạy trực tiếp trên môi trường và đạt kết quả:

1. **Kiểm tra cú pháp JavaScript**:
   ```powershell
   node scripts/check-syntax.js
   ```
   - **Kết quả**: `89/89 files hợp lệ | 0 lỗi cú pháp` (**PASS**)

2. **Bộ kiểm thử đơn vị tổng (Test Runner)**:
   ```powershell
   node tests/run-tests.js
   ```
   - **Kết quả**: `1500/1500 PASS | 0 FAIL` (**PASS**, tăng 3 test so với mốc 1497 ban đầu, 0 hồi quy)

3. **Kiểm thử hồi quy tay cầm xoay**:
   ```powershell
   node tests/live/slides-shape-rotation-handle.playwright.mjs
   ```
   - **Kết quả**: `100% PASS`

4. **Kiểm thử hồi quy co giãn hình đã xoay**:
   ```powershell
   node tests/live/slides-shape-rotated-resize.playwright.mjs
   ```
   - **Kết quả**: `100% PASS`

5. **Kiểm thử Playwright Live MỚI cho con trỏ động & nút xóa**:
   ```powershell
   node tests/live/slides-shape-rotated-cursor-delete.playwright.mjs
   ```
   - **Kết quả**: `100% PASS`
     - Test 1 (0°): Tay cầm 'n' có `ns-resize`, nút xóa không counter-rotate.
     - Test 2 (90°): Tay cầm 'n' (ở mép phải) có `ew-resize`, tay cầm 'e' (ở mép đáy) có `ns-resize`, nút xóa có `style.transform = "rotate(-90deg)"` và computed style `matrix(0, -1, 1, 0, 0, 0)`.
     - Test 3 (Live Drag): Kéo chuột xoay hình, con trỏ và nút xóa cập nhật ngay trong thời gian thực.
     - Test 4 (Undo): Nhấn Ctrl+Z khôi phục góc xoay và kiểu dáng ban đầu.

6. **Kiểm thử Ribbon Audit 1280px**:
   ```powershell
   node tests/live/ribbon-audit-1280.playwright.mjs
   ```
   - **Kết quả**: `104/104 PASS (0px tràn ngang tại 1280px trên cả 3 ứng dụng)`
