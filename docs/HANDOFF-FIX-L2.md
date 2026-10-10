# Agent Handoff

TASK: FIX-L2 — Slides giữ shapes/transition sau lưu-mở lại và nhân đôi slide ổn định.
AGENT/ROLE: Codex / Slides adapter, hồi quy import và CDP desktop.
BRANCH: `fix/slides-save-reopen-l2-codex`
WORKTREE: `E:\VNOffice-codex-fl2`
OBJECTIVE: Khôi phục đúng thứ tự layer khi nhập FODP/PPTX và bảo đảm lệnh ribbon Nhân đôi luôn nhân đôi slide đang chọn.
FINDINGS: FODP đầu vào có đủ textbox, shape và fade. Parser trước đây gom custom-shape trước frame, làm đổi thứ tự lớp khi mở lại. Lệnh ribbon gọi `duplicateCurrentSlide()` không force slide; nếu shape đang chọn, hàm chỉ nhân đôi shape. Phép đo cũ chờ mỗi `slides.length > 0`, nên có thể đọc slide trống trước khi mở xong.
IMPLEMENTATION SUMMARY: Parser ghi nhận vị trí XML của các shape/frame và khôi phục thứ tự khi nhập, kể cả nội dung nhóm. Ribbon duplicate gọi `duplicateCurrentSlide(true, true)`; nếu thất bại, status bar hướng dẫn người dùng. Thêm unit regression và desktop CDP save→reopen.
FILES CHANGED: `adapters/libreoffice/slides/slides-adapter.js`, `tests/run-tests.js`, `tests/unit/slides-fix-l2-roundtrip.test.js`, `tests/unit/slides-fix-l2-duplicate.test.js`, `tests/live/cdp/slides-fix-l2.desktop.mjs`, `docs/HANDOFF-FIX-L2.md`.
COMMANDS RUN: `node --check adapters/libreoffice/slides/slides-adapter.js`; `node --check tests/live/cdp/slides-fix-l2.desktop.mjs`; `node --experimental-websocket tests/live/cdp/slides-fix-l2.desktop.mjs` với `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl2`; `npm test`; `python -m unittest`; `python -m unittest discover -s tests`.
BUILD RESULT: NOT RUN (ticket yêu cầu npm/Python tests, không yêu cầu build riêng).
TEST RESULTS: Desktop CDP 20/20 PASS; mẫu kinh doanh giữ 17 slide và số objects từng slide `[3,2,2,2,2,2,2,2,1,1,2,1,1,2,1,1,1]`; `npm test` 3031/3031 PASS; `python -m unittest discover -s tests` 811 tests, OK. Lệnh `python -m unittest` thuần không discover test trong repo (0 tests, exit 1); đã chạy discovery chuẩn.
KNOWN FAILURES: None in final test runs. Python emitted existing `ResourceWarning` messages for unclosed TextIOWrapper streams.
RISKS: Shape type của một custom shape có text có thể được LibreOffice chuẩn hóa khi ghi PPTX; regression xác nhận nội dung, số shape, thứ tự hiển thị và transition, không yêu cầu type string giữ nguyên.
DEPENDENCIES/BLOCKERS: LibreOffice headless cài cục bộ; mẫu `sample-3.pptx` và PPTX báo cáo kinh doanh trong `E:\VN OFice\file test\lan`.
CORE PATCH ID (if any): None.
NEXT ACTION: Không còn; commits: `f8069f2c`, `0473218f`, `6b79e0d0`.
