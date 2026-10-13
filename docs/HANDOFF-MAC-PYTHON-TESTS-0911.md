# Agent Handoff

TASK: Khắc phục bộ kiểm thử Python 0.9.11 portable trên macOS
AGENT/ROLE: Antigravity / Python & macOS QA Agent
BRANCH: codex/macos-python-tests-0911
WORKTREE: /Users/hieupc/.codex/worktrees/macos-python-tests-0911/3t-office
OBJECTIVE: Đưa toàn bộ bộ kiểm thử Python 0.9.11 trên macOS về 100% PASS trên các bài kiểm tra được hỗ trợ (với skip đúng điều kiện nền tảng), xử lý dứt điểm các lỗi mock Win32, PowerShell Word COM, stale metadata 0.9.10, stale contract OS services darwin/macos, và bug process lifecycle zombie trên Darwin.

FINDINGS:
1. `tests/test_desktop_launch.py`: mock trực tiếp `ctypes.windll.user32.MessageBoxW` gây lỗi AttributeError trên Darwin vì ctypes Unix không có windll.
2. `tests/test_writer_create_new_readback.py`: gọi powershell kiểm tra Word COM trên macOS gây FileNotFoundError. Cần skipUnless khi không có Windows PowerShell.
3. `tests/test_3t_web.py`: kiểm tra stale file_size_bytes và sha256 của bản 0.9.10 trong khi `releases.json` đã cập nhật sang 0.9.11.
4. `tests/test_os_services_contract.py`: kiểm tra stale `backend_name_for("darwin") == "portable"` (đây là mốc tạm thời trước khi có `platform/os_services/macos.py`). Sau khi macOS có launcher Finder reveal riêng, darwin trỏ về "macos".
5. `tests/test_os_services_p2.py`: giả định LOCALAPPDATA trên macOS và mock ctypes.windll ép kết quả thất bại lên portable show_error.
6. `tests/test_p1_pool_orphans.py`: `_p1_parent_alive` trên Unix kiểm tra `os.getppid() == parent_pid`. Việc gọi từ chính process của test với PID của test dẫn đến kiểm tra cha sai. Cần chạy từ tiến trình con để phản ánh đúng semantics gọi của worker trên POSIX.
7. `platform/process_lifecycle/process_tracker.py`: khi tiến trình con bị SIGTERM, nó thành zombie (`Z+`) trên macOS trước khi được reap. `_ps_start_time` vẫn in thời gian bắt đầu của zombie process, khiến `_stop_recorded_process` coi nó còn sống (`still_alive=True`) và giữ lại bản ghi trong ledger.

IMPLEMENTATION SUMMARY:
- `platform/process_lifecycle/process_tracker.py`: Bổ sung kiểm tra trạng thái tiến trình qua `_ps_state` (và trường state trên `/proc/*/stat` Linux). Nếu tiến trình ở trạng thái Zombie (`Z`), `process_identity` trả về `None`, cho phép `cleanup()` gặt sạch bản ghi khỏi ledger.
- `tests/test_desktop_launch.py`: Mock `_os_services().launcher.show_error` và `SingleInstanceServer` thay vì Win32 API.
- `tests/test_writer_create_new_readback.py`: Đặt `@unittest.skipUnless(sys.platform == "win32" and shutil.which("powershell"), ...)` cho test Word COM.
- `tests/test_3t_web.py`: Cập nhật `file_size_bytes` (401718681) và `sha256` (41cc7db664203d8a15a2e9f030f50a6f28e09f17b6de139c194b9114d7a274be) khớp với 0.9.11 trong `server/3t-web/data/releases.json`.
- `tests/test_os_services_contract.py`: Cập nhật assertion `backend_name_for("darwin") == "macos"`.
- `tests/test_os_services_p2.py`: Phản ánh đúng đường dẫn user data dir theo từng platform và hành vi show_error portable.
- `tests/test_p1_pool_orphans.py`: Chạy probe `_p1_parent_alive` qua tiến trình con trên POSIX để kiểm tra chính xác tính còn sống của process cha.

FILES CHANGED:
- `platform/process_lifecycle/process_tracker.py`
- `tests/test_desktop_launch.py`
- `tests/test_os_services_p2.py`
- `tests/test_writer_create_new_readback.py`
- `tests/test_3t_web.py`
- `tests/test_os_services_contract.py`
- `tests/test_p1_pool_orphans.py`
- `docs/HANDOFF-MAC-PYTHON-TESTS-0911.md`

COMMANDS RUN:
- `/Volumes/Data/Projects/3t-office/.venv/bin/python -m unittest -v tests/test_desktop_launch.py tests/test_writer_create_new_readback.py tests/test_3t_web.py tests/test_os_services_contract.py tests/test_os_services_p2.py tests/test_p1_pool_orphans.py tests/test_process_tracker.py` (chạy 3 lần liên tiếp)
- `VNOFFICE_SOFFICE_PATH=/Applications/LibreOffice.app/Contents/MacOS/soffice /Volumes/Data/Projects/3t-office/.venv/bin/python -m unittest discover -s tests -p 'test_*.py'`
- `git diff --check`

BUILD RESULT: NOT RUN (không có thay đổi build system/native binary).
TEST RESULTS: PASS
- Targeted suite (42 tests): 40 passed, 2 skipped đúng nền tảng (Word COM powershell, Windows extended-length path). Đạt 100% trong 3 lần chạy liên tiếp.
- Full Python test suite (923 tests): 893 passed, 0 failed, 0 error, 30 skipped (chủ yếu là các bài test Windows-only COM/PowerShell/Registry đã được guard đúng điều kiện).

KNOWN FAILURES: None.
RISKS: Thao tác kiểm tra zombie process dựa trên `ps -o state=`. Cột state trên macOS/BSD và Linux đều chuẩn hóa 'Z' cho zombie/defunct.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None (không chạm vào `ooxml_zip_patch.py`, updater newest-source, apps hay LibreOffice upstream).
NEXT ACTION: Đã commit vào nhánh `codex/macos-python-tests-0911`. Sẵn sàng cho QA và tích hợp vào `platform/macos`.
