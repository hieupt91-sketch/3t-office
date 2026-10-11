# Agent Handoff

TASK: SmartArt connector lifecycle khi kéo/xóa node.

AGENT/ROLE: Codex — Slides owner.

BRANCH: `feature/slides-smartart-connectors`

WORKTREE: `E:\VNOffice-codex-smartart-connectors`

OBJECTIVE: Connector cập nhật mượt ngay trong drag; xóa node loại đúng connector liên quan; Undo/Redo đồng bộ node và connector.

FINDINGS: `insertDiagram` trước đây chỉ lưu hình học connector (`x1,y1,x2,y2`), không lưu endpoint ID. Handler `_attachDiagramNodeDrag` chỉ đổi node và DOM node; `deleteShape`/history chỉ ghi một shape. Không cần Adapter, Shared Platform hay LibreOffice Core.

IMPLEMENTATION SUMMARY:
- Connector mới lưu `sourceId` và `targetId` bên cạnh `diagramGroupId`.
- Tái sử dụng pointer drag hiện có; mỗi `pointermove` tính lại tâm hai node, cập nhật `x1,y1,x2,y2,x,y,w,h` và chỉ render DOM connector liên quan, không render lại toàn layer.
- Xóa diagram node tạo một action `diagram-node-delete` chứa node và đúng các connector kề cùng index; Undo/Redo phục hồi/xóa nguyên tử và giữ nguyên connector không liên quan.
- Undo/Redo `diagram-node-move` tính lại connector sau khi phục hồi/áp dụng tọa độ node.
- Unit và live test bao phủ liên kết, kéo, xóa chọn lọc, orphan prevention và Undo/Redo.

FILES CHANGED: `apps/slides/slides-canvas.js`; `tests/unit/slides-diagrams.test.js`; `tests/live/slides-diagrams.live.mjs`; `docs/PLAN-SLIDES-SMARTART-CONNECTORS.md`; `docs/FEATURE-PARITY-ROADMAP.md`; tài liệu này.

COMMANDS RUN: `node --check apps/slides/slides-canvas.js`; `node --check tests/unit/slides-diagrams.test.js`; `node --check tests/live/slides-diagrams.live.mjs`; unit Slides diagram trực tiếp; `python -m http.server 8765 --bind 127.0.0.1`; `node tests/live/slides-diagrams.live.mjs` với Edge/Playwright Core; `node tests/run-tests.js` có stopwatch; `git diff --check`.

BUILD RESULT: NOT RUN — dự án không có build script; syntax check PASS.

TEST RESULTS:
- PASS unit Slides SmartArt: 8/8.
- PASS live Microsoft Edge tại `http://127.0.0.1:8765/`: kéo thật bằng `mouse.down/move/up`; trong lúc giữ chuột node `(170,225) → (240,270)`, endpoint connector khớp tâm mới `(304,306)` và DOM đổi ngay; Undo khôi phục node + connector. Xóa còn 3 node/2 connector, 0 orphan; Undo/Redo đúng; 0 `pageerror`.
- PASS toàn suite: 480/480, 0 FAIL, 11.077 giây (<60 giây).

KNOWN FAILURES: Không có.

RISKS: Diagram được tạo bởi phiên bản cũ không có `sourceId`/`targetId` vẫn render như trước và không bị xóa nhầm, nhưng connector cũ không thể tự cập nhật theo node vì không có thông tin endpoint. Không có migration ngầm.

DEPENDENCIES/BLOCKERS: Không thêm dependency; live test dùng Edge hệ thống và `playwright-core` ngoài repo. Không blocker.

CORE PATCH ID (if any): Không có; không sửa Core/Adapter/Platform.

NEXT ACTION: Claude review các commit trên branch; không merge tự động vào `main`.
