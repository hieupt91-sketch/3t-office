# Agent Handoff
TASK: RB-D5 — audit tab Danh giá + Chế độ xem
AGENT/ROLE: Codex / primary
BRANCH: audit/doc-ribbon-review-view-codex
WORKTREE: E:\VNOffice-codex-rbd5
OBJECTIVE: Chỉ kiểm tra Danh giá và Chế độ xem; hoãn Trợ giúp, AI, tab ngữ cảnh.
FINDINGS: Source khai báo 15 mục review và 14 mục view; ticket dự kiến lần lượt 14 và 13. Có Writer PID 9184, LibreOffice worker PIDs 16716/1236, Word COM PID 14132 nên không mở app audit khác để giữ giới hạn một app + một Word.
IMPLEMENTATION SUMMARY: Không sửa source. Tạo report audit, ghi rõ inventory source và tình trạng live BLOCKED/NOT RUN; không suy diễn PASS.
FILES CHANGED: docs/AUDIT-DOC-RIBBON-REVIEW-VIEW-1010.md; docs/AGENT-HANDOFF-RB-D5-1010.md
COMMANDS RUN: git status/branch/log; git merge main; đọc ticket/rules/source; kiểm tra tiến trình và corpus bằng PowerShell; tìm shortcut và test mẫu bằng rg/Get-Content.
BUILD RESULT: NOT RUN
TEST RESULTS: NOT RUN — live DOM, trạng thái nút, XML DOCX và Word COM chưa chạy vì đang có app + Word COM hoạt động.
KNOWN FAILURES: Chưa có kết luận chức năng; lệch inventory source/ticket cần xác minh từ DOM.
RISKS: Chưa xác thực thao tác thực tế, DOCX roundtrip, giao diện trên tài liệu dài hoặc shortcut. Không tương tác/đóng app đang chạy.
DEPENDENCIES/BLOCKERS: Cần app Writer và Word COM audit độc quyền/đã đóng từ phiên hiện tại.
CORE PATCH ID (if any): N/A
NEXT ACTION: Chạy probe review/view trên d07 bằng CDP khi phiên hiện tại đã kết thúc; lưu các thay đổi review vào DOCX, kiểm XML và mở lại bằng Word COM; chạy cả tab hai lượt.
