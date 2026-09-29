# Agent Handoff

TASK: Part A — Báo lỗi cho đợt phát hành pilot nội bộ
AGENT/ROLE: Codex / implementation + verification
BRANCH: `feature/pilot-error-reporting-codex`
WORKTREE: `E:\VNOffice-codex-error-reporting`
OBJECTIVE: Triển khai báo lỗi offline-first theo ranh giới dữ liệu trong `docs/PLAN-INTERNAL-PILOT-RELEASE.md`, dùng chung cho Writer, Sheet và Slides; thêm receiver Python chuẩn, hướng dẫn trong ứng dụng và kiểm thử. Không merge vào `main`.
FINDINGS: App chưa có cơ chế báo lỗi và Help panel dùng chung nằm trong `platform/help/`. pywebview lấy chữ ký tham số từ các callable API; wrapper báo lỗi phải giữ nguyên chữ ký của API tài liệu. Template handoff không có ở `/09-templates/AGENT-HANDOFF.md` tại root; nội dung handoff theo template cùng tên trong `VN-Office-AI-Engineering-Standard-V2/.../09-templates/AGENT-HANDOFF.md`.
IMPLEMENTATION SUMMARY:
- Thêm `APP_VERSION = "0.9.0-pilot1"`, config tùy chọn cạnh `main.py`, env override, `.gitignore` cho config thật và file config mẫu không có token.
- Thêm Python reporter chuẩn: consent unknown/granted/denied trong app data dir; sanitizer cho message/stack, đường dẫn Windows/UNC/file URI, tên tệp và username; chỉ ghi extension/kích thước đã làm tròn; queue có giới hạn số lượng/dung lượng; sender nền có timeout và exponential backoff; lỗi reporter không thoát ra app.
- Bọc các API mở/lưu/xuất bằng wrapper giữ nguyên chữ ký pywebview; ghi operation/duration, soffice timeout/exit, lỗi lưu và lỗi hậu kiểm. Lỗi convert bên trong thao tác lưu chỉ được ghi một lần.
- Thêm API consent, frontend error và feedback. Tệp chỉ được copy khi feedback do người dùng gửi và chọn đính kèm; client gửi JSON trước, multipart attachment ở request riêng, giới hạn 5 MiB.
- Thêm hook `window.onerror`/`unhandledrejection` dùng chung có dedupe/rate limit; dialog đồng ý và feedback tiếng Việt có focus management, bàn phím, trạng thái lỗi; thêm toggle và hướng dẫn cụ thể trong Help dùng chung cho cả ba app.
- Thêm receiver `http.server`/`ThreadingHTTPServer`, Bearer auth cho POST, giới hạn body, kiểm tra schema, JSONL theo ngày, attachment tách riêng, trang gom nhóm được bảo vệ; README có hướng dẫn systemd + nginx HTTPS. Không thêm third-party dependency và không sửa LibreOffice Core.
- Các commit trên branch: `c3b9a44` (Python client), `6272f95` (receiver), `154859b` (shared UI/Help).
FILES CHANGED: `.gitignore`; `main.py`; `vnoffice-config.example.json`; `adapters/error_reporting/{__init__.py,reporter.py}`; `platform/error_reporting/{error-reporting-ui.js,error-reporting.css,frontend-reporter.js}`; `platform/help/{help-catalog.js,help-panel.js,entries-error-reporting.js}`; `index.html`; `tools/error-report-server/{server.py,README.md}`; `tests/test_error_reporting.py`; `tests/test_error_report_server.py`; `tests/unit/error-reporting.test.js`; `tests/run-tests.js`; file handoff này.
COMMANDS RUN:
- `node tests/run-tests.js`
- `python -m unittest discover -s tests -v`
- `python -m unittest tests.test_writer_save_roundtrip.WriterSaveRoundtripTests.test_all_fixtures_roundtrip -v` (rerun riêng sau lần full suite)
- `python -m unittest tests.test_error_reporting tests.test_error_report_server -v`
- `python -m py_compile main.py adapters/error_reporting/reporter.py tools/error-report-server/server.py`
- `git diff --check`
- Offline startup smoke với `main.main`, pywebview được stub, app data tạm: endpoint unset và `http://127.0.0.1:9/api/v1/reports`.
BUILD RESULT: NOT RUN — Part A không có bước build/đóng gói; chưa chạy bản desktop đã đóng gói.
TEST RESULTS:
- PASS — `node tests/run-tests.js`: `KẾT QUẢ KIỂM THỬ: 1919/1919 PASS | 0 FAIL`.
- FAIL — full `python -m unittest discover -s tests -v`: `Ran 418 tests in 296.459s`, `FAILED (failures=1)`. Lỗi duy nhất là soffice trả exit khác 0, không có diagnostic, trong `test_all_fixtures_roundtrip`.
- PASS — chạy riêng test thất bại: `Ran 1 test in 80.439s`, `OK`.
- PASS — focused reporter/receiver: `Ran 24 tests in 7.828s`, `OK`.
- PASS — `py_compile`; PASS — `git diff --check` (Git chỉ cảnh báo chuyển LF/CRLF trên Windows).
- PASS — offline startup smoke: `endpoint=unset queued=1`; `endpoint=unreachable queued=1`. Smoke dùng pywebview stub nên không xác nhận tương tác với GUI desktop thật.
KNOWN FAILURES: `tests/test_writer_save_roundtrip.py::WriterSaveRoundtripTests.test_all_fixtures_roundtrip` thất bại trong full suite vì thao tác lưu nhận `LibreOffice báo lỗi khi chuyển đổi: không rõ nguyên nhân`; chạy riêng cùng test thì pass. Đây là lỗi không tái hiện khi cô lập; tải máy có thể là yếu tố nhưng chưa xác định nguyên nhân. Không đổi timeout/expected output. Chưa kiểm thử receiver trên VPS hoặc TLS/proxy đã triển khai.
RISKS: Chưa chạy bản đóng gói hoặc phiên GUI pywebview thật. Endpoint/token production phải được cấu hình ngoài repo và chỉ bật gửi sau khi owner xác minh HTTPS, token và chính sách lưu dữ liệu. Mô tả feedback do người dùng nhập và tệp đính kèm được gửi khi người dùng chủ động gửi/chọn; attachment được cảnh báo rõ và gửi riêng.
DEPENDENCIES/BLOCKERS: Không thêm dependency; không có blocker code. Config server mẫu được hướng dẫn bằng placeholder trong README, không chứa secret.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Owner review ba commit trên branch này và handoff; không merge vào `main` trong task này. Trước khi pilot thật, triển khai receiver sau HTTPS, cấp token qua config ngoài repo và thực hiện smoke trên bản đóng gói thuộc Part B.
