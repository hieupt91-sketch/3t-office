# Agent Handoff — Deep Undo/Redo History for VN Writer

TASK: Undo/Redo có lịch sử sâu thật cho VN Writer (chuẩn Word)
AGENT/ROLE: Antigravity (agy) / Implementation & Verification
BRANCH: `feature/writer-undo-redo`
WORKTREE: `E:\VNOffice-agy-undoredo-writer`
OBJECTIVE: Thay thế hoàn toàn cơ chế `document.execCommand("undo"/"redo")` mong manh bằng hệ thống ngăn xếp Snapshot thật ở tầng `WriterAdapter`, tương thích 100% Microsoft Word (Ctrl+Z / Ctrl+Y).

FINDINGS & ARCHITECTURE:
1. `document.execCommand("undo")` của trình duyệt không thể hoàn tác các thao tác đi qua Command Bus / DOM trực tiếp (chèn bảng, ngắt trang, đổi Page Setup, áp Style, Track Changes, Comments).
2. Xây dựng Undo/Redo Stack hoàn chỉnh tại `WriterAdapter`:
   - `undoStack` & `redoStack` lưu trữ snapshot đa chiều: `bodyHtml`, `headerHtml`, `footerHtml`, `pageSetup`, `comments`.
   - Cơ chế Debounce 600ms khi gõ chữ liên tục (gom cụm từ/khoảng dừng giống Word), đồng thời tự động cam kết snapshot khi gặp ranh giới đoạn văn (Enter / `insertParagraph`).
   - Thao tác rời rạc (chèn bảng, ngắt trang, đổi Page Setup, áp Style, chấp nhận/từ chối Track Changes, chèn/xóa comment) tự động `flushTyping()` và tạo bước hoàn tác độc lập ngay lập tức.
   - Giới hạn hợp lý `maxUndoStack = 100` bước chống tràn/phình bộ nhớ.
   - Tự động kích hoạt/vô hiệu hóa (enable/disable) nút Undo/Redo trên thanh Quick Access Toolbar và Command Bus khi stack rỗng hoặc có thể hoàn tác/làm lại.
   - Phím tắt Ctrl+Z / Ctrl+Y được bắt và điều phối mượt mà qua Command Bus (`.uno:Undo` / `.uno:Redo`) và bàn phím.
   - Trạng thái cô lập hoàn toàn giữa các tài liệu (Document Isolation).

FILES CHANGED:
- `adapters/libreoffice/writer/writer-adapter.js`: Tích hợp đầy đủ deep history engine (`undoStack`, `redoStack`, `canUndo`, `canRedo`, `flushTyping`, `recordSnapshot`, `undo`, `redo`, `clearUndoRedo`, `_createSnapshot`, `_restoreSnapshot`, `_isSnapshotEqual`, `_scheduleTypingSnapshot`, `_updateUndoRedoUI`, `setPageSetup`).
- `apps/writer/writer.css`: Thêm styling `.vno-quick-btn:disabled, .vno-quick-btn.is-disabled` làm xám nút chuẩn Word khi không còn gì để hoàn tác/làm lại.
- `tests/unit/writer-undo-redo.test.js`: Bộ 10 bài test hành vi chuyên sâu (gõ chữ debounce, chèn bảng rồi undo mất bảng, đổi Page Setup rồi undo về khổ/lề cũ, ngắt trang, track changes, phân nhánh lịch sử, giới hạn 100 bước, command bus, document isolation).
- `tests/unit/adapter-mapping.test.js`: Bổ sung kiểm thử dispatch lệnh `.uno:Undo` và `.uno:Redo` trên `WriterAdapter`.
- `tests/run-tests.js`: Bổ sung Suite 20 vào master runner.
- `docs/FEATURE-PARITY-ROADMAP.md`: Đánh dấu `[x]` hoàn thành hạng mục Undo/Redo Tier 1 của VN Writer.
- `docs/HANDOFF-WRITER-UNDO-REDO.md`: Handoff này.

TEST RESULTS:
- `node tests/run-tests.js`: 230/230 PASS (100%), 0 FAIL.
- `node tests/unit/syntax-check.test.js`: PASS.
- `node tests/smoke/html-smoke.test.js`: PASS.

BUILD RESULT: PASS (No build step required, pure ES modules).
KNOWN FAILURES / RISKS: Không có.
DEPENDENCIES: Không dùng bất kỳ thư viện ngoài hay SDK trả phí nào.
NEXT ACTION: Merge nhánh `feature/writer-undo-redo` vào `main` từ worktree `E:\VNOffice-agy-undoredo-writer`.
