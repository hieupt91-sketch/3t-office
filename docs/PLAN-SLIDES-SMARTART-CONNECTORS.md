# Plan — Slides SmartArt connectors

OBJECTIVE: Connector của diagram bám theo node ngay trong lúc kéo; xóa node loại bỏ đúng connector liên quan; cả hai thao tác Undo/Redo nguyên tử.

CURRENT CAPABILITY: `insertDiagram` tạo node/connector chung `diagramGroupId` và handler `_attachDiagramNodeDrag` đã kéo được node. Connector hiện chỉ lưu hình học `x1,y1,x2,y2`, chưa lưu ID hai đầu; `deleteShape` và history chỉ xử lý một shape.

FILES/MODULES:
- `apps/slides/slides-canvas.js`: bổ sung metadata liên kết, helper đồng bộ hình học/DOM, history move/delete.
- `tests/unit/slides-diagrams.test.js`: kiểm tra liên kết, cập nhật hình học, xóa chọn lọc và Undo/Redo.
- `tests/live/slides-diagrams.live.mjs`: kéo chuột thật và xóa/Undo/Redo trên Edge qua HTTP.
- `docs/FEATURE-PARITY-ROADMAP.md`, `docs/HANDOFF-SLIDES-SMARTART-CONNECTORS.md`: cập nhật trạng thái và bằng chứng.

DEPENDENCIES: Chỉ dùng model shape, drag pointer và Undo/Redo hiện có; không thêm package, không đổi Adapter/Core/build.

RISKS: Render lại toàn layer mỗi `pointermove` có thể giật; tránh bằng cách chỉ cập nhật connector DOM liên quan. Dữ liệu diagram cũ không có endpoint ID sẽ giữ nguyên và không bị xóa nhầm.

TEST PLAN: Unit test chuyên biệt; `node --check`; toàn bộ `node tests/run-tests.js` dưới 60 giây; live Edge/Playwright phục vụ bằng `python -m http.server`, thao tác `mouse.down/move/up`, xác minh giữa lúc giữ chuột và sau Undo/Redo; `git diff --check`.

ROLLBACK: Revert riêng các commit source/tests và docs; không có migration hay thay đổi format bắt buộc ngoài các trường metadata tương thích ngược.
