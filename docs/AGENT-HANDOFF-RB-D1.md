# Agent Handoff

TASK: RB-D1 — kiểm tra chức năng từng nút Ribbon VN Writer, tab Trang đầu
AGENT/ROLE: Codex tiếp quản phần dang dở của Claude; audit, fix tối thiểu và nghiệm thu
BRANCH: `fix/rb-d1-continuation-codex`
WORKTREE: `E:\VNOffice-codex-rbd1-takeover`
OBJECTIVE: Kiểm chứng hiệu quả thực tế của 53 control/mục con bằng CDP mouse click, XML DOCX và Word COM; sửa lỗi được tái hiện; ghi báo cáo tiếng Việt trong repo.

FINDINGS:

- Baseline có functional harness nhưng dùng `queryCommandState('underline')`, khiến CSS underline của marker chính tả và trạng thái Chromium stale tạo kết luận sai.
- `_readInlineCommandState` của Writer cũng coi CSS underline marker chính tả là định dạng tài liệu.
- `Tiếp tục đánh số` từng có một lần nhiễu trong lượt audit toàn tab; kiểm tra cô lập 5 lần đều PASS.
- Word COM có thể đối chiếu 53 mục; 11 mục được ghi CHẶN vì là nút cha/menu hoặc dialog/preset VN không có phép COM ẩn tương đương.

IMPLEMENTATION SUMMARY:

- Đồng bộ trạng thái Gạch chân theo DOM/định dạng vùng chọn thật.
- Bỏ qua `data-vno-spelling-uncertain` khi đọc computed underline, nhưng vẫn nhận `<u>`/inline underline thật.
- Harness đo underline theo DOM thật, không dùng browser command state stale.
- Thêm regression test cho marker chính tả và chạy debug 5× cho Tiếp tục đánh số.
- Lập bảng 53 dòng bằng chứng và hướng dẫn kết luận trong audit report.

FILES CHANGED:

- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/unit/writer-ribbon-breadth.test.js`
- `scripts/audit-0610/ribbon_functional.mjs`
- `docs/PLAN-RB-D1-CONTINUATION.md`
- `docs/AUDIT-DOC-RIBBON-HOME-0810.md`
- `docs/AGENT-HANDOFF-RB-D1.md`

COMMANDS RUN:

- `node --experimental-websocket scripts/audit-0610/ribbon_functional.mjs tests/live/ribbon-specs/doc-home.json --runs=2`
- `node --input-type=module -e "import('./tests/unit/writer-ribbon-breadth.test.js').then(async m=>{await m.runWriterRibbonBreadthTests(); console.log('writer-ribbon-breadth PASS')})"`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `git diff --check`

BUILD RESULT: NOT RUN (không đổi build system; test syntax đã được runner gọi trong suite).

TEST RESULTS:

- RB-D1 app audit: **PASS — 53/53 ở lượt 1, 53/53 ở lượt 2; stable=true**.
- Word COM oracle: **PASS — 53/53 có kết luận, blocked=false**.
- Debug Tiếp tục đánh số: **PASS — 5/5**.
- JavaScript regression: **PASS — 2957/2957, 0 FAIL**.
- Python regression: **PASS — 793 tests, OK, skipped=1, EXIT_CODE=0**.
- `git diff --check`: **PASS**.

KNOWN FAILURES: Không có FAIL trong lần chạy cuối. Các mục Word COM `CHẶN` được phân loại có chủ đích trong báo cáo, không phải lỗi app.

RISKS:

- Artifact ảnh/XML nằm ngoài Git tại `E:\VNOffice-profiles\ribbon-shots\doc-home-rbd1-complete\`; cần giữ thư mục khi review.
- Word COM và LibreOffice phụ thuộc môi trường desktop; chạy lại cần không có phiên Office/soffice cạnh tranh.
- Các preset style VN và mẫu NĐ30 không có ánh xạ một-một sang Word COM; không suy diễn parity ngoài bảng.

DEPENDENCIES/BLOCKERS: Không có blocker còn lại cho RB-D1. Không thêm dependency.

CORE PATCH ID (if any): None — không sửa LibreOffice Core.

NEXT ACTION: Claude/owner review `docs/AUDIT-DOC-RIBBON-HOME-0810.md`, sau đó mới quyết định merge nhánh này; RB-D2 (tab Chèn + Thiết kế) là ticket kế tiếp theo queue.
