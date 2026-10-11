# Kiểm kê P4: API tiến trình riêng Windows

**Đính chính (Claude, 06/10):** các dòng `process_tracker.py:60-87` và `:114-146` ghi "chưa có nhánh POSIX" là cũ — từ 05/10 tệp này đã có nhánh macOS/POSIX dùng `ps -o lstart= -p PID` (định danh) và `ps -axo pid=,ppid=` (cây tiến trình), có test phần phân tích (`tests/test_process_tracker_ps.py`) nhưng **chưa chạy trên máy mac thật**. Phần còn thiếu thật của P4 là chuyển các điểm gọi trong `main.py`, `soffice_uno_worker.py` và `updater.py` sang qua Protocol.

Phạm vi: chỉ mã chạy thật trong `main.py`, `platform/process_lifecycle/`, worker UNO và updater. Không tính mã test, installer migration, UI input, clipboard, locale hay danh tính shell. Không thấy `wmic`, `tasklist` hoặc `psutil` trong phạm vi. Các dòng dưới là vị trí gọi trực tiếp; các dòng liền kề thuộc cùng một thao tác khi ghi chú có dải dòng.

| Tệp:dòng | Gọi gì | Mục đích | Đã có nhánh macOS/POSIX? | Đề xuất Protocol trong `platform/os_services/base.py` |
|---|---|---|---|---|
| `platform/process_lifecycle/process_tracker.py:60-87` | `os.name`, `ctypes.WinDLL`, `OpenProcess`, `GetProcessTimes`, `GetExitCodeProcess` | Đọc thời điểm tạo và trạng thái PID để định danh ổn định | Không; định danh POSIX khác ở :100 | `ProcessTracker.process_identity(pid: int) -> str | None` (đã khai báo) |
| `platform/process_lifecycle/process_tracker.py:100` | `os.kill(pid, 0)` | Kiểm tra PID còn tồn tại trên POSIX | Có | `ProcessTracker.process_alive(pid: int) -> bool` |
| `platform/process_lifecycle/process_tracker.py:114-146` | `os.name`, `CreateToolhelp32Snapshot`, `Process32FirstW/NextW` | Liệt kê PID cha/con để dựng cây tiến trình Windows | Không; cần backend duyệt cây POSIX | `ProcessTracker.register_tree(pid: int, role: str) -> tuple[int, ...]` (đã khai báo, backend cần POSIX) |
| `platform/process_lifecycle/process_tracker.py:182-198` | `os.name`, `OpenProcess`, `TerminateProcess`; POSIX `os.kill(SIGTERM)` | Dừng PID đã xác minh thuộc ứng dụng | Có nhánh POSIX; cách kết thúc khác | `ProcessTracker.stop_owned_tree(pid: int, expected_identity: str, *, grace_seconds: float) -> ServiceResult[CleanupReport]` (đã khai báo) |
| `platform/process_lifecycle/process_tracker.py:209` | `os.name == "nt"` | Rẽ nhánh kiểm tra tiến trình khi dọn ledger khởi động | Không; phần tương ứng chưa có backend macOS | `ProcessTracker.startup_sweep() -> CleanupReport` (đã khai báo) |
| `main.py:901,914-915` | `subprocess.Popen(creationflags=CREATE_NO_WINDOW, start_new_session=...)` | Khởi chạy worker UNO ẩn trên Windows, tạo session trên POSIX | Có POSIX `start_new_session`; abstraction chưa có nhánh OS trung lập | `Launcher.start_child(spec: LaunchSpec, *, purpose: str, pipe_stdin: bool = False, pipe_stdout: bool = False) -> ServiceResult[ChildProcess]` (đã khai báo) |
| `main.py:1068-1077` | `os.name`, `taskkill /PID /T /F`, `CREATE_NO_WINDOW` | Dừng worker theo PID cùng cây con | Không; taskkill Windows riêng | `ProcessTracker.stop_owned_tree(pid: int, expected_identity: str, *, grace_seconds: float) -> ServiceResult[CleanupReport]` (đã khai báo) |
| `main.py:2532` | `subprocess.run(creationflags=CREATE_NO_WINDOW)` | Chạy lệnh in nền, giấu cửa sổ console Windows | Chưa có cờ launch qua service | `Launcher.run_child(spec: LaunchSpec, *, timeout: float) -> ServiceResult[ProcessResult]` |
| `adapters/libreoffice/common/soffice_uno_worker.py:31-35,423-430` | `CREATE_NO_WINDOW`, `ABOVE_NORMAL_PRIORITY_CLASS`, `Popen(creationflags=...)` | Khởi chạy soffice với cờ ẩn và ưu tiên Windows | Không; nhánh POSIX chưa biểu đạt chính sách cờ qua service | `Launcher.start_child(spec: LaunchSpec, *, purpose: str, pipe_stdin: bool = False, pipe_stdout: bool = False) -> ServiceResult[ChildProcess]` (đã khai báo) |
| `adapters/libreoffice/common/soffice_uno_worker.py:368-376` | `os.name`, `taskkill /PID /T /F`, `CREATE_NO_WINDOW` | Dừng soffice và tiến trình con theo PID | Không; chỉ Windows gọi taskkill | `ProcessTracker.stop_owned_tree(pid: int, expected_identity: str, *, grace_seconds: float) -> ServiceResult[CleanupReport]` (đã khai báo) |
| `adapters/libreoffice/common/soffice_uno_worker.py:382-386` | `Popen.terminate()`, `Popen.kill()` | Fallback dừng tiến trình worker cụ thể | Có API Popen khả chuyển nhưng chưa qua service | `ChildProcess.terminate() -> None` (đã khai báo); thêm `ChildProcess.kill() -> None` |
| `adapters/updater/updater.py:549,552-567` | `os.name`, `powershell.exe`, `CREATE_NO_WINDOW`, `Popen(creationflags=...)` | Khởi chạy apply-helper PowerShell tách khỏi ứng dụng sau cập nhật | Không; helper và cờ chỉ dành Windows | `UpdateApplier.launch(task_path: Path) -> ServiceResult[int]` (đã khai báo; macOS implementation chưa có) |
| `adapters/updater/apply-helper.ps1:115-118` | `Get-CimInstance Win32_Process` | Tìm tiến trình theo đường dẫn và command line để trì hoãn cập nhật an toàn | Không; đây là PowerShell/Windows | `ProcessTracker.find_owned_processes(install_root: Path, executable_paths: Sequence[Path]) -> Sequence[ProcessIdentity]` |

## Protocol P4 tối thiểu và thứ tự triển khai an toàn

Các Protocol hiện có `ProcessTracker`, `Launcher`, `ChildProcess`, `UpdateApplier` đã đáp ứng phần lớn ranh giới. Cần tối đa ba bổ sung trung lập nền tảng:

1. `ProcessTracker.process_alive(pid: int) -> bool` — hiện trạng PID, không dò theo tên.
2. `Launcher.run_child(spec: LaunchSpec, *, timeout: float) -> ServiceResult[ProcessResult]` — chạy lệnh đồng bộ và trả kết quả trung lập.
3. `ProcessTracker.find_owned_processes(install_root: Path, executable_paths: Sequence[Path]) -> Sequence[ProcessIdentity]` — xác minh tiến trình updater thuộc cài đặt qua danh tính/đường dẫn.

Thứ tự: (1) thêm POSIX identity/alive và unit test; (2) thêm duyệt cây + register ledger, test cây cha/con và PID tái sử dụng; (3) chuyển kết thúc có kiểm tra identity, test không tác động PID ngoài; (4) chuyển worker UNO start/stop, test launch/exit; (5) chuyển cờ chạy lệnh in, test stdout/stderr/timeout; (6) chuyển launch updater và kiểm tra tiến trình cài đặt, test cập nhật trì hoãn khi app còn chạy. Mỗi bước một commit riêng, giữ nguyên ledger/environment, không thêm Job Object, không gửi OS input, không kết thúc theo tên. Có thể hoàn tác từng commit theo thứ tự ngược.

## Kiểm thử cần bổ sung

- Unit đa nền tảng: identity, PID không tồn tại/tái sử dụng, duyệt cây, timeout và terminate chỉ PID/cây đã sở hữu.
- POSIX/macOS: worker chạy session riêng, kết thúc nhóm tiến trình đã sở hữu, updater tìm đúng executable theo đường dẫn.
- Windows regression: cờ ẩn/ưu tiên, taskkill theo PID/cây, worker UNO, helper updater và cập nhật trì hoãn.
- Tích hợp hiện hữu: process tests, CH9 startup cleanup, 20 vòng launch/exit (theo kế hoạch P4).
