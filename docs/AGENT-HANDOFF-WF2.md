# Agent Handoff
TASK: WF2 — Sửa 3 lỗi D30 của Writer trên app desktop
AGENT/ROLE: Codex / Writer + Shared Platform
BRANCH: fix/writer-d30-three-codex
WORKTREE: E:\VNOffice-codex-wf2
OBJECTIVE: Sửa Cửa sổ mới desktop, áp nội dung Mẫu hành chính và chỉ số trang hiện tại theo caret; giữ fallback web; thêm test và hướng dẫn tiếng Việt.
FINDINGS: Cả ba là lỗi thật. Cửa sổ mới bỏ qua bridge desktop; mẫu chỉ đổi tên tab; status hard-code Trang 1. Assertion D30 cũng có giả định sai rằng `TRANG KÝ TÊN` luôn ở trang cuối, trong khi lần chạy hiện tại từ `saiiichinhta` mới bắt đầu trang 4.
IMPLEMENTATION SUMMARY: Writer View dùng `AppShell.requestNewDocumentWindow()`; AppShell có callback template trung lập và Writer tái dùng nội dung mẫu sẵn có sau khi reset tài liệu; WriterAdapter cung cấp `getCurrentPage()` dùng dải live-pagination cho status và Print; selectionchange cập nhật status; acceptance tính trang kỳ vọng theo vị trí caret; cập nhật Help tiếng Việt.
FILES CHANGED: `apps/writer/writer-view-controller.js`; `apps/writer/writer-app.js`; `adapters/libreoffice/writer/writer-adapter.js`; `platform/shell/app-shell.js`; `platform/help/entries-writer.js`; `tests/unit/writer-zoom-wheel.test.js`; `tests/unit/blank-default.test.js`; `tests/unit/writer-print-preview.test.js`; `scripts/audit-0610/doc_matrix_verify2.mjs`; `docs/GAP-DOC-VS-WORD-0610.md`; `docs/AGENT-HANDOFF-WF2.md`.
COMMANDS RUN: `node --check` cho 4 source chính; ba targeted unit runners; `node tests/run-tests.js`; `node --experimental-websocket scripts/audit-0610/doc_matrix_verify2.mjs`; kiểm tra tiến trình theo command line worktree trước/sau acceptance.
BUILD RESULT: NOT RUN — repository/task không quy định lệnh build riêng; syntax check và toàn bộ test runner đã chạy.
TEST RESULTS: Targeted tests PASS. Full suite **2863/2863 PASS, 0 FAIL**. Desktop acceptance cuối **25 PASS, 0 FAIL, 0 BLOCKED**; mẫu `chars=1570`, status `Trang 3 / 4` với caret expected page 3, target cửa sổ `1 → 2`.
KNOWN FAILURES: Không có trong phạm vi WF2. Hai lần acceptance chẩn đoán trước bản sửa assertion đạt 24/25 và cho thấy assertion “current === total” sai; lần cuối sau khi kiểm chứng DOM đạt 25/25.
RISKS: Chỉ số trang phụ thuộc các dải live-pagination hiện có; nếu thuật toán pagination thay đổi cấu trúc marker thì `getCurrentPage()` và acceptance cần được cập nhật cùng nhau. Không sửa LibreOffice Core.
DEPENDENCIES/BLOCKERS: Không có. Không dùng Word COM; không còn tiến trình `main.py` của worktree sau test.
CORE PATCH ID (if any): N/A
NEXT ACTION: Review/cherry-pick các commit WF2, sau đó smoke thủ công nút Chế độ xem → Cửa sổ mới nếu cần trước khi nhập nhánh chính.
