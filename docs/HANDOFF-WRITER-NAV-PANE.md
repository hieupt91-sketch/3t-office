# Agent Handoff
TASK: NAV1 — Làm Ngăn dẫn hướng cho Writer theo `docs/PLAN-WRITER-NAV-PANE.md`
AGENT/ROLE: Codex — Writer UI/logic/test
BRANCH: `feat/writer-navigation-pane-codex`
WORKTREE: `E:\VNOffice-codex-nav1`
OBJECTIVE: Hoàn thiện Ngăn dẫn hướng bên trái cho Heading 1–6 và đoạn có Mức đại cương, tìm kiếm, điều hướng, a11y, tối/sáng, VI/EN và Trợ giúp trong ứng dụng.
FINDINGS: Tái sử dụng DOM tiêu đề, `data-vno-outline`, dải `.vno-page-auto-gap`, command/ribbon/i18n/help hiện hữu; không cần sửa adapter, LibreOffice Core hay thêm dependency.
IMPLEMENTATION SUMMARY: Thêm pane flex 260 px ngoài vùng trang; quét tăng dần có debounce; cây ARIA, lọc không dấu, thu/mở nhánh, số trang, theo dõi con trỏ, Ctrl+Alt+N và điều hướng bàn phím; trạng thái mở được lưu cục bộ; Help tiếng Việt và i18n VI/EN đầy đủ.
FILES CHANGED: `apps/writer/writer-nav-pane.js`, `apps/writer/writer-view-controller.js`, `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `platform/commands/command-definitions.js`, `platform/help/entries-writer.js`, `platform/i18n/strings-{vi,en}.js`, `tests/unit/writer-nav-pane.test.js`, `tests/unit/help-coverage.test.js`, `tests/run-tests.js`, `scripts/audit-0610/doc_nav_pane_check.mjs`, `docs/GAP-DOC-VS-WORD-0610.md`, tài liệu này.
COMMANDS RUN: `node scripts/check-syntax.js`; unit NAV1; guard Help/handler; `node --experimental-websocket scripts/audit-0610/doc_nav_pane_check.mjs`; `doc_typing_latency_doc.mjs`; `doc_live_pages_vs_word.mjs`; `node tests/run-tests.js`.
BUILD RESULT: PASS — syntax 154/154; ứng dụng desktop khởi động qua `main.py` trong mọi vòng CDP.
TEST RESULTS: PASS — NAV1 desktop 9/9; unit NAV1 11/11; Help guard 12/12; handler guard 7/7; d24 0 sự kiện >100 ms (max 80 ms); số trang 43/43 khớp Word. Suite đầy đủ sẽ được ghi theo lần chạy cuối trước commit bàn giao.
KNOWN FAILURES: Không có lỗi NAV1 đã biết.
RISKS: Số trang trong pane là ước lượng từ dải phân trang sống; sẽ cập nhật sau sự kiện phân trang. Tài liệu cực dài được debounce 300–1200 ms và quét theo lô 160 node để không chặn gõ.
DEPENDENCIES/BLOCKERS: Không có.
CORE PATCH ID (if any): Không có — không sửa Core/adapter.
NEXT ACTION: Reviewer chạy lại lệnh CDP NAV1 với `VNO_CDP_LOCALAPPDATA` riêng và kiểm tra trực quan ở kích thước cửa sổ mục tiêu nếu cần.
