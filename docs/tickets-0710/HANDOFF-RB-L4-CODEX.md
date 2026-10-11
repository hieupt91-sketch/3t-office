# Agent Handoff

TASK: RB-L4 — Slides: đối chiếu song song PowerPoint
AGENT/ROLE: Codex / audit harness
BRANCH: audit/slides-office-parity-codex
WORKTREE: E:\VNOffice-codex-rl4
OBJECTIVE: Tạo harness Slides PowerPoint COM và đo parity theo ticket.
FINDINGS: PowerPoint COM khởi tạo được PID mới nhưng không dùng được `TextFrame.TextRange`; COM trả null / RPC_E_CALL_REJECTED khi tạo nội dung textbox. Không tạo được template nên không thể mở app, so sánh hoặc xác minh lệch.
IMPLEMENTATION SUMMARY: Thêm khung harness COM/CDP và báo cáo ghi rõ các phép thử chưa chạy. Không có sửa hành vi sản phẩm vì chưa xác minh được lệch thật.
FILES CHANGED: `scripts/audit-0610/office_parallel/slides/*`; `docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md`; handoff này.
COMMANDS RUN: Đọc plan/ticket/README khung; thử chạy `make-template.ps1` với `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-rl4`; `npm test`; `python -m unittest discover`.
BUILD RESULT: NOT RUN.
TEST RESULTS: make-template FAIL; app-ops NOT RUN (thiếu template); compare NOT RUN; Slides CDP smoke PASS (port 62591, profile riêng, đúng worktree); npm test PASS 3053/3053; Python unittest NOT RUN (0 tests discovered, exit code 1).
KNOWN FAILURES: PowerPoint COM trên máy báo “Product Activation Failed”; `TextRange` không dùng được qua COM.
RISKS: Chưa có dữ liệu so sánh; không được coi parity là đạt.
DEPENDENCIES/BLOCKERS: Cần PowerPoint COM hoạt động trên máy kiểm thử.
CORE PATCH ID (if any): N/A.
NEXT ACTION: Khắc phục trạng thái COM/activation PowerPoint; chạy đủ các nhóm thao tác; ghi lệch đã xác minh và sửa tối thiểu kèm test.
