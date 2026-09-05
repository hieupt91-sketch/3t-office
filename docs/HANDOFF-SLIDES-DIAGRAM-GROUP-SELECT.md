# Agent Handoff

TASK: Slides diagram/SmartArt group select — click một node chọn cả nhóm, kéo dịch cả nhóm, Delete xóa cả nhóm (một bước Undo)

AGENT/ROLE: Grok / implementation & verification

BRANCH: `feature/slides-diagram-group-select`

WORKTREE: `E:\VNOffice-grok-smartart-group-select`

OBJECTIVE: Canvas chọn/di chuyển/xóa SmartArt-like diagram (và nhóm import `diagramGroupId`) như một đối tượng, gần PowerPoint: click 1 lần chọn cả khối.

**Không merge vào `main`.** Không đụng Writer/Sheet.

---

## Plan gate

Thay đổi canvas Slides + test. Không đụng Core, Writer, Sheet, adapter, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** Click shape có `diagramGroupId` chọn cả nhóm; bounding box nét đứt; kéo/Delete/Undo nguyên tử.
- **Current capability trước task:** `selectedShapeIds` + marquee + `groupId` (Ctrl+G). Click diagram chỉ chọn 1 node. `deleteShape` xóa lẻ node + connector kề. Delete phím = xóa trang (`slides.slide.delete`).
- **Files/modules:** `apps/slides/slides-canvas.js`, `apps/slides/slides.css`, unit/live tests, roadmap, handoff này.
- **Dependency:** Playwright Core + Edge hệ thống cho live test. Unit suite không gọi soffice.
- **Risk:** Delete khi đang chọn shape giờ xóa shape chứ không xóa slide (đúng PowerPoint). Slide Sorter vẫn xóa trang.
- **Test plan:** unit group-select; `node tests/run-tests.js` < 60s; live Playwright chuột/phím trên canvas.
- **Rollback:** revert branch; click lẻ node như trước.

---

## FINDINGS (đọc cơ chế chọn/kéo/xóa trước khi thêm)

1. **Single-click:** `el.click` → `setSelectedTarget(shape.id)` chỉ 1 id. Ctrl/Shift toggle `selectedShapeIds`.
2. **Kéo:** `_attachShapeDrag` pointerdown/move/up. Multi-select và `groupId` (Ctrl+G) đã dịch nhiều shape; connector bị loại khỏi `shapesToMove`, cập nhật qua `_updateDiagramConnectorsForNode`. Clamp từng shape — có thể gãy khoảng cách tương đối ở mép slide.
3. **Marquee:** pointerdown trên canvas trống, giao hình chữ nhật với node (không connector).
4. **Xóa:** nút × gọi `deleteShape`. Node diagram → action `diagram-node-delete` (node + connector kề). Phím Delete → `slides.slide.delete` → `deleteCurrentSlide()` (xóa trang).
5. **Undo nguyên tử sẵn có:** `diagram-insert`, `shapes-move`, `shapes-delete`, `diagram-node-delete`.

Giới hạn đã công khai ở task import SmartArt: cùng `diagramGroupId` nhưng canvas chưa chọn cả nhóm.

---

## IMPLEMENTATION SUMMARY

UX (tham khảo PowerPoint, Ctrl+Click để vào shape con):

| Thao tác | Hành vi |
| --- | --- |
| Click thường vào node có `diagramGroupId` | Chọn **cả nhóm** (mọi shape cùng id, gồm connector) |
| Kéo một node khi nhóm đang chọn | Dịch **cả nhóm** cùng offset, giữ vị trí tương đối; clamp theo bbox nhóm |
| Delete / nút × trên khung nhóm | Xóa **cả nhóm**, 1 action `diagram-group-delete` |
| Double-click node | Sửa text node đó; group selection không bị phá cho thao tác khác |
| Ctrl+Click | Chọn **lẻ** 1 shape trong nhóm (kéo/xóa lẻ như cũ) |
| Shift+Click | Multi-select shape thường như trước |
| Click shape không có `diagramGroupId` | Chọn 1 shape như trước |

Chi tiết:

- `selectShapeFromUserClick` / `selectDiagramGroup` / `getDiagramGroupBounds`.
- Khung `.vno-diagram-group-bounds` nét đứt `#16a34a` bao ngoài mọi node+connector; ẩn handle resize từng node khi đang chọn nhóm.
- Kéo nhóm ghi `diagram-group-move` (snapshot from/to từng shape, gồm connector) — 1 bước Undo/Redo.
- `deleteCurrentSlide`: nếu **không** ở Slide Sorter và đang có shape được chọn → `deleteSelectedShapes()` (nhóm → `deleteDiagramGroup`). Không xóa trang.
- `insertDiagram` sau khi chèn tự chọn cả nhóm.
- `deleteShape(id)` **giữ** xóa lẻ node + connector kề (Ctrl+Click rồi ×, test cũ).

Không sửa LibreOffice Core. Không merge `main`.

---

## FILES CHANGED

- `apps/slides/slides-canvas.js` — group select, bounds, group move/delete, undo
- `apps/slides/slides.css` — khung nhóm xanh lá, member highlight
- `tests/unit/slides-diagram-group-select.test.js` — 12 test thật
- `tests/live/slides-diagram-group-select.live.mjs` — Playwright Edge, chuột thật
- `tests/live/slides-diagrams.live.mjs` — xóa lẻ dùng Ctrl+Click
- `tests/run-tests.js` — suite 73
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SLIDES-DIAGRAM-GROUP-SELECT.md`

Không đụng `apps/writer/**`, `apps/sheet/**`, adapter, `main.py`.

---

## COMMANDS RUN

- `node --check apps/slides/slides-canvas.js`
- `node --check tests/unit/slides-diagram-group-select.test.js`
- `node tests/run-tests.js`
- `node tests/live/slides-diagram-group-select.live.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` `slides-canvas.js` PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| Suite 73 group-select (chạy riêng) | **PASS** 12/12 | Click cả nhóm; Ctrl+Click lẻ; bbox; move cùng offset; Undo/Redo 1 bước; Delete không xóa slide; imported-like không connector; text edit; regression xóa lẻ |
| `node tests/run-tests.js` | **PASS** 778/778, 0 FAIL, **52.63s** (< 60s) | Gồm suite 73 |
| `node tests/live/slides-diagram-group-select.live.mjs` | **PASS** | Edge headless, HTTP local, **không SendKeys**. Click node 3 → 7 shape selected, bbox 636×88. Kéo chuột +64,+36: 4 node + 3 connector cùng offset. Undo `diagram-group-move`. Delete: 0 shape, vẫn 3 slide, `diagram-group-delete` 7 shape; Ctrl+Z trả đúng vị trí. Ctrl+Click → 1 shape. 0 pageerror. |

Không claim PASS cho test chưa chạy. Không disable test. Không SendKeys.

## KNOWN FAILURES / LIMITATIONS

1. **Chưa resize cả nhóm** như một đối tượng (8 handle trên bbox nhóm). Ngoài scope; handle từng node ẩn khi đang chọn nhóm.
2. **Click lần 2 không vào child-select** (PowerPoint: click 2 lần vào shape con). Escape hatch là **Ctrl+Click**. Double-click dành cho sửa text theo spec.
3. **Phím Delete khi đang chọn shape** xóa shape/nhóm, không xóa trang — đúng PowerPoint. Xóa trang khi không chọn shape, hoặc trong Slide Sorter.
4. **Connector `pointer-events: none`** — không click trực tiếp connector; click node vẫn chọn cả nhóm gồm connector.

## RISKS

Thấp. Selection/drag/delete cũ của shape không-diagram giữ nguyên. `deleteShape` lẻ không đổi. Clamp nhóm tránh gãy layout ở mép slide.

## DEPENDENCIES/BLOCKERS

Không thêm dependency. Live test dùng Edge hệ thống và `playwright-core` ngoài repo. Không thư viện trả phí.

## CORE PATCH ID (if any)

Không có. Không sửa Core/Adapter/Platform (ngoài canvas Slides).

## NEXT ACTION

**KHÔNG merge vào `main`.** Review trên `feature/slides-diagram-group-select`. Follow-up tùy chọn: resize cả nhóm; click lần 2 vào child như PowerPoint.
