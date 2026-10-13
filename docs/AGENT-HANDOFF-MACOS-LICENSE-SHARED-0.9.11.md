# Agent Handoff

TASK: macOS 0.9.11 — dùng chung license server/giao thức Windows
AGENT/ROLE: Codex / License integration & QA
BRANCH: codex/macos-license-shared-0911
WORKTREE: /Volumes/Data/Worktrees/macos-license-shared-0911
OBJECTIVE: Xác minh và hoàn thiện vòng đời license macOS dùng chung product, key, chữ ký và seat với Windows mà không gọi production hoặc dùng secret/key thật.
FINDINGS: Client macOS đã gửi `platform=macos` và dùng cùng `product=3t-office`, key format, public key Ed25519 và bộ đếm seat với Windows. Hai lỗi được tìm thấy: token macOS bị đổi thành `plat=windows` sau `/validate`, và kích hoạt ngoại tuyến luôn phát/lưu platform Windows. Trường quyền `platforms` hiện có trong commerce schema nhưng endpoint `/activate` chưa enforce; task giữ nguyên hành vi này để key Windows hiện hữu vẫn dùng chung được và tránh thay đổi quyền production trước khi có kế hoạch rollout.
IMPLEMENTATION SUMMARY: `/validate` bảo toàn platform từ token hoặc activation row; kích hoạt ngoại tuyến nhận/lưu/ký platform, với mặc định `windows` cho client cũ. Bổ sung HTTP E2E localhost cho Windows + macOS dùng chung key/seat, refresh bằng token và cặp license/fingerprint, offline cache, deactivate/trả slot và offline activation macOS. Cập nhật spec và plan.
FILES CHANGED: `server/3t-api/app.py`; `tests/test_license_client_e2e.py`; `docs/SPEC-LICENSE-KEYS.md`; `docs/PLAN-MACOS-LICENSE-SHARED-0.9.11.md`; `docs/AGENT-HANDOFF-MACOS-LICENSE-SHARED-0.9.11.md`.
COMMANDS RUN: `/tmp/vno-license-e2e-py312/bin/python -m unittest tests.test_license_client_e2e tests.test_license_client tests.test_license_device_macos -v`; `/tmp/vno-license-e2e-py312/bin/python -m pytest server/3t-api/tests/test_license.py server/3t-api/tests/test_admin_api.py -q`; `PYTHONPATH=/tmp/vno-license-e2e-py312/lib/python3.12/site-packages /Volumes/Data/Projects/3t-office/.venv/bin/python -m unittest discover -s tests`; `git diff --check`.
BUILD RESULT: NOT RUN — task chỉ đổi API license/server và test, không đổi desktop packaging/build.
TEST RESULTS: PASS — focused client + real HTTP E2E 30 tests, 1 Windows-only skip; server license/admin 19/19; full Python 926 tests OK, 12 skips. E2E chỉ dùng Uvicorn localhost, SQLite/key ký tạm và không gọi production.
KNOWN FAILURES: Không có failure trong phạm vi. Cảnh báo deprecation của FastAPI TestClient/httpx không ảnh hưởng kết quả.
RISKS: `license_keys.platforms` chưa được enforce ở `/activate`; vì vậy mọi key active vẫn có thể dùng seat trên cả Windows và macOS. Đây là hành vi mong muốn cho pilot dùng chung nhưng cần quyết định migration/rollout riêng nếu sau này bán quyền theo nền tảng. Offline admin/client cũ không gửi platform vẫn được ghi là Windows theo hợp đồng tương thích.
DEPENDENCIES/BLOCKERS: Không có blocker cho pilot nội bộ. Production phải tiếp tục dùng đúng private signing key đang quản lý ngoài repo; không có secret nào được thêm hoặc đọc trong task.
CORE PATCH ID (if any): None.
NEXT ACTION: Review và cherry-pick commit của branch này vào `platform/macos`; khi deploy server, chạy migration/schema hiện có rồi smoke test bằng key pilot nhiều seat, không dùng key khách hàng thật.
