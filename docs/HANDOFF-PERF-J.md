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

## Plan gate Việc 2 — P1b Python Sheet

- Objective: giữ byte-identical bốn checkpoint `overlay`, `optimize`, `final_fods`, `payload_stable_json` trên LAN01–LAN28; giảm trung vị tổng ba khâu của lan06/lan14 ít nhất 40%, mục tiêu không quá 55 giây.
- Current capability: main mặc định dùng overlay/optimizer/payload P1; `VNO_OPEN_LEGACY=1` còn nguyên đường cũ. Hot path vẫn quét khoảng 1,5–3,5 triệu ô bằng nhiều regex/search/sub.
- Files/modules dự kiến: `adapters/libreoffice/common/ooxml_zip_patch.py`; `adapters/libreoffice/sheet/sheet_open_payload.py`; test Python hẹp; `scripts/perf-proto/compare_sheet_open_p1.py` chỉ bổ sung đo/đối chiếu nếu cần; handoff này.
- Dependency: chỉ Python stdlib `concurrent.futures.ProcessPoolExecutor`; không thêm gói, không đổi UI/Core/build/file-format semantics.
- Implementation: giới hạn visibility/freeze vào thẻ mở của từng sheet; phân tích thuộc tính/cell một lượt thay vì nhiều regex trên cùng ô; song song theo sheet/khối tối đa 4 worker chỉ khi FODS lớn hơn 20 MiB và luôn ghép theo thứ tự gốc.
- Risk: thay whitespace/thứ tự thuộc tính làm khác byte; pickle/process startup triệt tiêu lợi ích; tiến trình con tăng RAM. Phải đo peak RAM và không vượt 1,5 lần đường hiện tại.
- Test plan: test hẹp sau mỗi bước; compare 28 file PASS trước full gate; lan06/lan14 đo ba lần lấy trung vị; cuối cùng đúng một lượt Node 0 FAIL, Python chỉ định+cập nhật, desktop CDP 27 PASS.
- Rollback: giữ nguyên các hàm cũ với comment `superseded by P1b - xoa chi khi chu so huu duyet`; `VNO_OPEN_LEGACY=1` chọn đường cũ.

## Kiem chung boi Claude (04/10/2026, tu chay lai) - P1b
- compare_sheet_open_p1.py: 28/28 file PASS byte-identical (4 checkpoint). lan14 legacy 92,0 s -> p1b 57,1 s; lan06 116,1 s -> 53,5 s; lan01 74,8 -> 44,5 s.
- Ung dung that (desktop CDP, lan14): native_overlay 45,7 -> 22,3 s; optimize 19,6 -> 14,0 s; payload 26,4 -> 18,1 s (tong 3 khau Python 91,7 -> 54,4 s, -41%); tong mo 125 -> 106 s. Khong con tien trinh python con sau khi mo.
- Dieu kien: chi song song khi FODS > 20 MiB (4 tien trinh, ProcessPoolExecutor, dong pool trong finally cua build_sheet_open_payload); VNO_OPEN_LEGACY=1 chon duong cu.
