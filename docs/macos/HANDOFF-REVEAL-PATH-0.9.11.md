# Agent Handoff

TASK: macOS 0.9.11 — `Launcher.reveal_path`

AGENT/ROLE: Codex / macOS OS Services

BRANCH: `codex/macos-reveal-0911`

WORKTREE: `/Users/hieupc/.codex/worktrees/macos-reveal-0911/3t-office`

OBJECTIVE: Triển khai backend macOS mở Finder và chọn đúng tệp cho API `open_containing_folder`, dùng argv tương đương `open -R <path>`.

FINDINGS:
- Base `5def067` đã có contract `Launcher.reveal_path`, Windows implementation và portable fallback.
- Base này chưa chứa `platform/os_services/macos.py`; backend macOS đầy đủ đang nằm trên nhánh tích hợp cổng khác. Task giữ đúng phạm vi: thêm implementation macOS tối thiểu để review/cherry-pick method vào backend đầy đủ.
- `subprocess.run` với argv list giữ nguyên đường dẫn Unicode/khoảng trắng, không cần shell hoặc quoting thủ công.

IMPLEMENTATION SUMMARY:
- `MacOSLauncher` kế thừa `PortableLauncher`, chỉ override `reveal_path`.
- Kiểm target tồn tại trước khi gọi hệ thống.
- Chạy `open -R <absolute path>` bằng argv list, `shell=False` mặc định, timeout 15 giây.
- Map lỗi sang `ServiceResult`: `invalid_input`, `permission_denied`, retryable `timeout`, `not_available`; message tiếng Việt an toàn để hiển thị.
- `build_services()` giữ `PortableDataDirs` và cung cấp `MacOSLauncher`; không sửa app, updater, base, portable, Windows hoặc selector.

FILES CHANGED:
- `platform/os_services/macos.py`
- `tests/test_os_services_reveal.py`
- `docs/macos/PLAN-REVEAL-PATH-0.9.11.md`
- `docs/macos/HANDOFF-REVEAL-PATH-0.9.11.md`

COMMANDS RUN:
- `python3 -m unittest tests.test_os_services_reveal`
- `python3 -m py_compile platform/os_services/macos.py tests/test_os_services_reveal.py`
- `python3 -m unittest tests.test_os_services_contract tests.test_os_services_p2 tests.test_os_services_reveal`
- `/Volumes/Data/Projects/3t-office/.venv/bin/python -m unittest tests.test_os_services_contract tests.test_os_services_p2 tests.test_os_services_reveal`
- `git diff --check`

BUILD RESULT: NOT RUN — thay đổi Python backend không có build riêng.

TEST RESULTS:
- PASS — focused reveal suite sau thay đổi cuối: 8/8.
- PASS — syntax/compile và diff check.
- FAIL — relevant OS services bằng system Python: 17 tests, 1 import error vì system Python không cài `webview`.
- FAIL — relevant OS services bằng project venv: 25 tests, 2 failure có sẵn trong `test_os_services_p2`: test giả định `LOCALAPPDATA` kiểu Windows và giả định portable `show_error` trả fail; 22 pass, 1 skip. Không thay expected hoặc source ngoài scope.

KNOWN FAILURES: Hai test P2 nêu trên không portable khi chạy Darwin; không do diff này.

RISKS:
- `platform/os_services/__init__.py` tại base `5def067` vẫn map Darwin sang portable. Theo giới hạn task, commit không sửa selector; khi tích hợp với backend macOS đầy đủ phải giữ method này trong `MacOSLauncher` hiện hữu và mapping macOS hiện hữu.
- Finder/LaunchServices không sẵn sàng sẽ trả `not_available`; timeout cho phép retry.

DEPENDENCIES/BLOCKERS: Không có blocker cho method. Việc wiring backend thuộc nhánh tích hợp macOS, ngoài scope commit này.

CORE PATCH ID (if any): Không.

NEXT ACTION: Review/cherry-pick method/tests vào nhánh macOS có backend đầy đủ; chạy lại OS services suite sau integration và xác minh nút “Mở thư mục chứa tệp” bằng app desktop.
