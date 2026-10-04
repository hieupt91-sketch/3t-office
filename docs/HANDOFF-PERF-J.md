# Agent Handoff

TASK: Đối soát đường lưu thật (Việc 1) và P1b tăng tốc Python Sheet (Việc 2)
AGENT/ROLE: Codex / QA harness và Sheet performance
BRANCH: `perf/audit-harness-p1b-codex`
WORKTREE: `E:\VNOffice-codex-j`
OBJECTIVE: Đưa batch audit XLSX qua đúng `globalUnoBridge.saveRealFileInPlace`, sau đó giảm ít nhất 40% ba khâu Python của lan14/lan06 mà giữ đầu ra byte-identical.
FINDINGS: Batch cũ gọi thẳng `window.pywebview.api.save_document_in_place`, nên không kiểm tra staging nội dung lớn trong `uno-bridge.js`. Corpus không có trong worktree; lượt đo dùng corpus đọc từ `E:\VNOffice-agy-sheet-perf\file test\lan`, là nguồn đã ghi trong handoff P1.
IMPLEMENTATION SUMMARY: Việc 1 đổi roundtrip sang `globalThis.globalUnoBridge.saveRealFileInPlace`; batch XLSX bật cờ file lớn để riêng serialize/save dùng timeout 1.500.000 ms, các lượt thường giữ timeout cũ. Việc 2 chưa bắt đầu.
FILES CHANGED: `tests/live/cdp/roundtrip-file.mjs`; `scripts/layout-audit/batch_document_audit.py`; `docs/HANDOFF-PERF-J.md`.
COMMANDS RUN: `node --check tests/live/cdp/roundtrip-file.mjs`; `python -m py_compile scripts/layout-audit/batch_document_audit.py`; smoke lan02; batch 28 file; `node tests/run-tests.js`; `python -m unittest tests.test_content_stage tests.test_static_server_backlog tests.test_license_client`; `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs` với `LOCALAPPDATA=E:\VNOffice-profiles\codex-j`.
BUILD RESULT: Việc 1 — PASS (`node --check`, `py_compile`, `git diff --check`).
TEST RESULTS: Batch Việc 1: 28/28 `saved=yes`, `diffs=0`, `lint=clean`; lan14 đạt ba tiêu chí sau 333,2 s, FODS gửi 329.536.021 byte, XLSX lưu 9.742.160 byte. Excel thật: 3 PASS, 25 FAIL do cửa sổ kích hoạt Office/COM của môi trường; không tính là lỗi nội dung theo brief. Đối chiếu baseline: 27 file cũ không hồi quy. Cổng cuối: Node 2753/2753 PASS; Python 31 tests OK; desktop CDP 27 PASS, 0 FAIL, 0 BLOCKED.
KNOWN FAILURES: Excel COM môi trường báo FAIL ở 25/28 file; mọi file đó vẫn lưu được, sai lệch 0 và lint sạch.
RISKS: Timeout file lớn chỉ được bật qua cờ `--large-file true`; đường gọi roundtrip thường không bị nới timeout. Peak RAM được kiểm trước batch: 9,15 GiB trống; trước lan14: 8,11 GiB trống.
DEPENDENCIES/BLOCKERS: Không có blocker Việc 1. Việc 2 phụ thuộc corpus LAN ngoài worktree như trên.
CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.
NEXT ACTION: Commit riêng Việc 1; sau đó lập plan chi tiết và bắt đầu Việc 2.

## Bằng chứng Việc 1

- Report mới: `E:\VNOffice-baseline3\xlsx\batch_document_audit_report.md`.
- Report nền: `E:\VNOffice-baseline\xlsx\batch_document_audit_report.md`.
- Kết quả máy đọc report: 28 dòng mới, không có dòng sai `saved/diffs/lint`; 27 file ngoài lan14 không hồi quy.
- Batch chạy tuần tự; không chạy tải nặng khác trong lúc đo.
- Log cổng được giữ ngoài worktree tại `E:\VNOffice-baseline3\logs\perf-j`.
