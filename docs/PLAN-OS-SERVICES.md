# Kế hoạch tách dịch vụ hệ điều hành (platform/os_services)

Ngày lập: 04/10/2026

Nhánh: plan/os-services-codex

Mốc nguồn: main tại 951f4e22ad164950c4fa92620fa4b0a2d4cf8e98

Trạng thái: **ĐÃ DUYỆT 05/10/2026 (chủ sở hữu cho làm theo khuyến nghị, kèm hai đề xuất thay thế cho Q4 và Q6 bên dưới). P1 hoàn thành trên nhánh `refactor/os-services-contract-claude`; P2 trở đi làm tuần tự, mỗi bước một nhánh.**

### Quyết định 05/10/2026
| Q | Quyết định |
|---|---|
| Q1 | Có: thêm PrinterServices, SystemLocale, SystemMetrics, FileLock. |
| Q2 | Giữ nhánh portable (`portable.py`) cho đến khi có `macos.py`; không âm thầm chọn Windows. Trong P1, `get_services()` trên nền tảng chưa đăng ký backend ném `NotImplementedError`. |
| Q3 | Giữ Toolhelp32 + TerminateProcess; Job Object là kế hoạch riêng. |
| Q4 | **Đổi so với khuyến nghị gốc:** không viết lại bằng Python. Giữ `apply-helper.ps1`, lớp OS chỉ lo "chạy helper tách rời"; thêm số phiên bản vào `apply-task.json`, test file mẫu cố định theo phiên bản và chế độ `--dry-run`. macOS có `apply-helper.sh` riêng trong `ports/macos`. |
| Q5 | Không đổi đường dẫn build sang `ports/windows/**` ở đợt này (P11 hoãn). |
| Q6 | **Đã làm theo hướng khác:** bảng số đo font dựng sẵn `adapters/libreoffice/common/font_descent_table.json` (28/28 file giống bản cũ), GDI chỉ còn là đường dự phòng; không cần inject callback. Cờ `VNO_FONT_TABLE_LEGACY=1`. |
| Q7 | Duyệt loader `_vno_os_services` bằng `spec_from_file_location` + `submodule_search_locations` (đã có test ở P1). |
| Q8 | Duyệt ngưỡng nhiễu max(100 ms, 5%) và 100 ms/stage. |
| Q9 | Giữ nguyên chuỗi và thư mục hiện tại (VNOffice, 3T Office, Doc/Sheet/Slide). |

**P1 (xong):** `platform/os_services/base.py` (kiểu trung tính + 10 Protocol + `OSServices`), `__init__.py` (bộ chọn backend, chưa có backend nào đăng ký), `tests/test_os_services_contract.py` (9 test, gồm kiểm "hợp đồng không nhắc tên API hệ điều hành"). Khác kế hoạch: chưa tạo `windows.py` rỗng; nó được thêm ở P2 cùng với dịch vụ thật đầu tiên để không có mã chết.

**P2 (xong, 05/10):** `platform/os_services/windows.py` và `portable.py` (macOS/Linux dùng tạm theo Q2) cung cấp `DataDirs.user_data_dir/document_profile_dir` và `Launcher.find_document_engine/native_io_path/show_error`. `main.py` gọi qua `_os_services()` (nạp dưới tên riêng `_vno_os_services`, lỗi nạp tự rơi về mã cũ): `_user_data_dir`, `find_soffice`, tiền tố đường dẫn dài khi chép hồ sơ seed, hộp lỗi khởi động. Mã cũ giữ nguyên thành `_legacy_user_data_dir`/`_legacy_find_soffice`; `VNO_OS_SERVICES_LEGACY=1` bật lại. Chưa chuyển `open_path` (cần ProcessTracker của P4 để đăng ký tiến trình con). `OSServices` cho phép backend thiếu dịch vụ trong lúc chuyển dần; `get_services(strict=True)` bắt buộc đủ ở bước cuối. Kiểm: `tests/test_os_services_p2.py` (9 test, so bản mới với bản cũ), node 2762 PASS, hồi quy desktop 27 PASS, Python 708/709 (1 lỗi do Word đang bận gọi COM, không phải sản phẩm).

## 1. Mục tiêu, phạm vi và căn cứ

Mục tiêu là gom thao tác phụ thuộc hệ điều hành của desktop vào platform/os_services/, định nghĩa hợp đồng bằng Python Protocol, giữ nguyên hành vi Windows và để macOS về sau chỉ cần hiện thực macos.py cùng mã đóng gói trong ports/macos/. UI/JavaScript không được biết tên hệ điều hành hay gọi Win32/COM trực tiếp.

~~~text
main.py / Platform / Adapter
        ↓ chỉ dùng kiểu và Protocol trung lập
platform/os_services/base.py
        ↓ factory chọn đúng một lần ở biên khởi động
platform/os_services/windows.py
        ↓
Win32 / Registry / PowerShell / Windows shell / Office COM
~~~

Đợt này không tạo macos.py, không đổi hành vi, không thêm dependency, không sửa apps/** hay platform/*.js, không sửa LibreOffice Core và không đổi ngữ nghĩa định dạng. main.py vẫn tự quản lý server tĩnh/dịch vụ production trong tiến trình Python; scripts/serve.js chỉ dành cho test. Đây là refactor nội bộ nên không phát sinh nội dung Hướng dẫn sử dụng.

Đã đọc docs/SPEC-PLATFORMS-AND-BRANCHES.md mục 2–3 và toàn bộ docs/SPEC-MACOS-PORT.md. Hai spec yêu cầu tách trên main trước, kiểm chứng Windows, không rải if mac trong app/shared JS.

## 2. Phương pháp và kết quả kiểm kê

Các lệnh kiểm kê tĩnh chính (không chạy script cài/phát hành):

~~~powershell
rg -n -i --glob '*.py' --glob '!tests/**' --glob '!scripts/**' 'os\.name|sys\.platform|platform\.system|ctypes\.(windll|WinDLL|WINFUNCTYPE)|winreg|CREATE_NO_WINDOW|ABOVE_NORMAL_PRIORITY_CLASS|taskkill|powershell|pythonw\.exe|LOCALAPPDATA|soffice\.exe' .
git ls-files '*.ps1'
rg -n -i 'RegisterApplication|RegisterOpenWith|RegisterFileType|WriteReg|CreateShortCut|pythonw|PowerShell' scripts/installer/vnoffice.nsi
rg -n -i 'SendKeys|SendWait|keybd_event' . --glob '!docs/**'
~~~

Có 58 tệp PowerShell thuộc dự án sau khi loại bản sao bộ tiêu chuẩn: 1 runtime updater, 8 đóng gói/phát hành, 37 test/audit, 12 branding/visual. Không có lời gọi SendKeys; kết quả tìm thấy chỉ là chú thích/cổng cấm. Hai lời gọi taskkill production đều dùng /PID của tiến trình con do app tạo, không kill theo tên. scripts/install-pilot.ps1:47,68 có tìm pythonw theo tên rồi lọc đường dẫn cài; kế hoạch không tái sử dụng cách đó trong runtime.

Ký hiệu: **W** chỉ Windows; **W/P** có Windows và POSIX nhưng macOS chưa đủ/kiểm chứng; **ĐC** đã có nhánh đa nền tảng trong cùng hàm; **Tool-W** là build/test Windows.

| Tệp:dòng | Chức năng/bằng chứng | Hiện trạng | Phương thức đề xuất |
|---|---|---:|---|
| main.py:70-120,667-677 | Tính user-data hai lần; LOCALAPPDATA/Darwin/XDG | ĐC | DataDirs.user_data_dir() |
| main.py:333-337 | Nhận biết bản cài qua python/pythonw.exe | W | Launcher.detect_installation() |
| main.py:541-570 | Command/icon relaunch .exe/.ico | W | AppIdentity.relaunch_spec() |
| main.py:573-665 | SHGetPropertyStoreForWindow, WINFUNCTYPE, AppUserModelID cửa sổ | W | AppIdentity.apply_window_identity() |
| main.py:680-682 | Tên platform gửi bản quyền | ĐC | DeviceId.platform_name() |
| main.py:685-724 | Tìm soffice.exe/soffice; đã có Darwin/Linux | ĐC | Launcher.find_document_engine() |
| main.py:785-821 | Giả định program/python.exe; CREATE_NO_WINDOW; start_new_session | W/P | Launcher.document_worker_command(), start_child() |
| main.py:957-997 | Dừng worker: taskkill /PID /T /F hoặc killpg | W/P | ProcessTracker.stop_owned_tree() |
| main.py:1325-1329 | Tiền tố đường dẫn dài \\?\ | W | Launcher.native_io_path() |
| main.py:2307-2353 | In qua soffice có CREATE_NO_WINDOW | W/P | Launcher.run_child() |
| main.py:2777-2892,3098-3118 | CF_UNICODETEXT/HTML Format bằng user32/kernel32 | W | ClipboardExtras.read()/write() |
| main.py:3248-3264 | os.startfile/open/xdg-open | ĐC | Launcher.open_path() |
| main.py:3763-3878 | Restart áp dụng update; hiện báo “chỉ Windows” | W | UpdateApplier.prepare_and_launch() |
| main.py:4737-4764 | GetLocaleInfoEx, fallback localeconv | W/P | SystemLocale.number_separators() — cần duyệt |
| main.py:4989-5011 | MessageBoxW khi server nội bộ lỗi | W | Launcher.show_error() |
| main.py:5057-5077 | SetCurrentProcessExplicitAppUserModelID | W | AppIdentity.apply_process_identity() |
| platform/single_instance.py:33-87,193-428 | msvcrt/fcntl; IPC loopback + token dùng chung | W/P | SingleInstance.forward()/create_server(); khóa ẩn trong backend |
| platform/process_lifecycle/process_tracker.py:14-55 | Identity PID: GetProcessTimes, Linux /proc; macOS chỉ token “alive” | W/P, macOS chưa chống PID reuse | ProcessTracker.process_identity() |
| platform/process_lifecycle/process_tracker.py:58-125 | Cây PID: Toolhelp32, Linux /proc; macOS trả rỗng | W/P, chưa có macOS | ProcessTracker.descendants() |
| platform/process_lifecycle/process_tracker.py:128-176 | TerminateProcess/SIGTERM; msvcrt/fcntl ledger lock | W/P | ProcessTracker.stop_owned_tree(); FileLock nội bộ |
| platform/process_lifecycle/process_tracker.py:179-388 | Ledger, startup sweep/cleanup theo PID + creation token | Logic dùng chung | register*(), startup_sweep(), cleanup() |
| platform/performance/performance_log.py:21-78 | msvcrt/fcntl; psapi, /proc, Darwin resource | W/P | SystemMetrics.current_memory_bytes() — cần duyệt |
| platform/autorecover/store.py:147-171 | msvcrt/fcntl storage lock | W/P | FileLock nội bộ |
| platform/print/print_pipeline.py:63-121 | Liệt kê máy in bằng PowerShell/WMI | W | PrinterServices.list_installed() — cần duyệt |
| platform/print/office_com.py:1,20-27,202-272 | Dò ProgID Word/Excel/PowerPoint/WPS qua Registry | W | OfficeAutomation.availability() |
| platform/print/office_com.py:286-376 | PowerShell STA COM export; cleanup PID; CREATE_NO_WINDOW | W | OfficeAutomation.export_pdf() |
| adapters/license/device.py:31-48 | MachineGuid; ngoài Windows fallback MAC | W/P, chưa đạt IOPlatformUUID | DeviceId.machine_id()/device_name() |
| adapters/install_migration.py:23-27,75-113 | Registry Open with cho ba app | W | FileAssociations.ensure_registered() |
| adapters/install_migration.py:132-174 | PowerShell/WScript retarget .lnk khỏi pythonw.exe | W | FileAssociations.migrate_launch_entries() |
| adapters/updater/updater.py:475-582 | Stage apply-helper.ps1, pythonw.exe, launch PowerShell ẩn | W | UpdateApplier.create_apply_task()/launch() |
| adapters/updater/manifest.py:19-21 | Reserved names Windows, managed root chứa .ps1 | W trong schema hiện tại | UpdateApplier.validate_package_path() |
| adapters/updater/apply-helper.ps1:1-32,99-157,280 | Apply/rollback; nhận diện install/profile; Stop-Process -Id | W | Chi tiết WindowsUpdateApplier; bước đầu wrap nguyên trạng |
| adapters/libreoffice/common/soffice_uno_worker.py:31-35,356-387,410-431 | CREATE_NO_WINDOW, ABOVE_NORMAL_PRIORITY_CLASS, taskkill /PID, UNO pipe | W/P, transport hiện Windows | Launcher.start_document_engine(), ProcessTracker.stop_owned_tree() |
| adapters/libreoffice/common/ooxml_zip_patch.py:8030-8067 | GDI tmDescent giữ row-height Excel; ngoài Windows trả None | W có fallback bảng đo | FontMetrics.font_descent() hoặc callback — cần duyệt đặc biệt |
| scripts/installer/vnoffice.nsi:32-72,117,149-199,253-327,390-420 | NSIS, Registry, shortcut, association, preflight | Tool-W | ports/windows/installer/**; không qua runtime Protocol |
| scripts/installer/build-launchers.ps1:1-22,66-128 | Build Doc.exe/Sheet.exe/Slide.exe gọi pythonw.exe | Tool-W | ports/windows/launchers/** |
| scripts/build-pilot.ps1:35,98-110; scripts/build-installer.ps1:1-3,26-34,53-120 | Đóng gói runtime/LO/launcher, gọi NSIS | Tool-W | Chỉ chuyển sau cổng đổi build system |
| scripts/install-pilot.ps1:3-10,47-68,84-124 | Cài pilot, shortcut, name-scan pythonw | Tool-W | Ngoài runtime; bỏ name-scan nếu P11 được duyệt |
| scripts/installer/SetupPreflight.ps1:15-51; scripts/register-file-associations.ps1:8-53 | Process/Registry và association | Tool-W | ports/windows/installer/** |
| scripts/release/release-pilot.ps1:28,42-71; scripts/release/sync-updates-to-vps.ps1:28-43 | NSIS, ssh/scp, phát hành Windows | Tool-W | ports/windows/release/** hoặc giữ Windows-only |
| scripts/measure-cold-start.ps1:1-94; scripts/verify-desktop-multiprocess.ps1 | Đo startup/desktop Windows | Tool-W/test | Giữ làm oracle Windows |
| scripts/layout-audit/**/*.ps1; tests/live/*.ps1 (37 tệp kiểm kê) | Oracle Office COM/fidelity | Tool-W/test | Giữ chạy Windows; macOS dùng kết quả chuẩn |
| branding/**/*.ps1; scripts/visual/*.ps1 (12 tệp) | Sinh tài sản/ảnh bằng Windows/Office | Tool-W | Ngoài runtime |
| VN-Office.bat:1-5 | Dev helper có LOCALAPPDATA/đường dẫn Windows | Tool-W | Đánh dấu Windows-only |

Phát hiện quan trọng: spec mô tả process_tracker dùng Job Object, nhưng commit kiểm kê không có CreateJobObject, AssignProcessToJobObject hay SetInformationJobObject. Hiện thực thật dùng Toolhelp32 + TerminateProcess và ledger PID/creation token (process_tracker.py:14-176). Vì yêu cầu Windows không đổi hành vi, refactor không được tự thêm Job Object.

## 3. Hợp đồng đề xuất trong base.py

### 3.1. Kiểu trả về và lỗi

Không trả HRESULT, Registry key, ProgID, PowerShell path, creationflags, HWND hay tên Win32 lên lớp trên. Chi tiết chỉ vào log cục bộ đã lọc. Lỗi vận hành dùng kiểu chung; ValueError chỉ cho lỗi lập trình/đầu vào sai hợp đồng.

~~~python
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Generic, Literal, Mapping, Protocol, Sequence, TypeVar

T = TypeVar("T")
ErrorCode = Literal[
    "not_supported", "not_available", "permission_denied", "busy",
    "timeout", "invalid_state", "invalid_input", "io_error",
]

@dataclass(frozen=True)
class ServiceError:
    code: ErrorCode
    message: str          # tiếng Việt, an toàn để hiển thị
    retryable: bool = False

@dataclass(frozen=True)
class ServiceResult(Generic[T]):
    value: T | None = None
    error: ServiceError | None = None

@dataclass(frozen=True)
class CleanupReport:
    stopped: int = 0
    retained: int = 0
    removed: int = 0

@dataclass(frozen=True)
class ClipboardPayload:
    text: str = ""
    html: str = ""

@dataclass(frozen=True)
class LaunchSpec:
    executable: Path
    arguments: tuple[str, ...]
    working_directory: Path | None = None

@dataclass(frozen=True)
class RegistrationReport:
    changed: bool
    registered_apps: tuple[str, ...] = ()
~~~

ServiceResult phải có đúng một trạng thái: value hoặc error. Presenter trong main.py chuyển nó sang dict {status, message, ...} để hợp đồng JS không đổi.

### 3.2. Mười Protocol bắt buộc

~~~python
class DataDirs(Protocol):
    def user_data_dir(self) -> Path: ...
    def updates_dir(self) -> Path: ...
    def logs_dir(self) -> Path: ...
    def document_profile_dir(self, app_kind: str) -> Path: ...

class SingleInstanceHandle(Protocol):
    @property
    def owns_lock(self) -> bool: ...
    def start(self) -> ServiceResult[None]: ...
    def take_over_unresponsive(self, *, timeout: float,
                               allow_missing: bool = False) -> ServiceResult[bool]: ...
    def stop_listener(self) -> None: ...
    def release_owner_lock(self) -> None: ...
    def stop(self) -> None: ...

class SingleInstance(Protocol):
    def forward(self, app_kind: str, file_path: Path | None, *, timeout: float,
                request_id: str | None = None,
                ping: bool = False) -> ServiceResult[Mapping[str, object] | None]: ...
    def create_server(self, app_kind: str,
                      on_request: Callable[[Mapping[str, object]], object],
                      on_ownership_lost: Callable[[], object] | None = None,
                      on_ping: Callable[[], bool] | None = None) -> SingleInstanceHandle: ...

class ProcessTracker(Protocol):
    @property
    def state_path(self) -> Path: ...
    def process_identity(self, pid: int) -> str | None: ...
    def register(self, pid: int, role: str, *, created_at: str | None = None,
                 parent_pid: int | None = None) -> bool: ...
    def register_tree(self, pid: int, role: str) -> tuple[int, ...]: ...
    def record_external(self, pid: int, created_at: str, role: str,
                        owner_pid: int, owner_created_at: str,
                        *, parent_pid: int | None = None) -> bool: ...
    def stop_owned_tree(self, pid: int, expected_identity: str,
                        *, grace_seconds: float) -> ServiceResult[CleanupReport]: ...
    def startup_sweep(self) -> CleanupReport: ...
    def cleanup(self) -> CleanupReport: ...

class AppIdentity(Protocol):
    def relaunch_spec(self, app_kind: str, app_root: Path,
                      fallback_argv: Sequence[str]) -> ServiceResult[LaunchSpec]: ...
    def apply_process_identity(self, app_kind: str) -> ServiceResult[None]: ...
    def apply_window_identity(self, window: object, app_kind: str,
                              relaunch: LaunchSpec) -> ServiceResult[None]: ...

class FileAssociations(Protocol):
    def ensure_registered(self, install_root: Path) -> ServiceResult[RegistrationReport]: ...
    def migrate_launch_entries(self, install_root: Path) -> ServiceResult[RegistrationReport]: ...

class Launcher(Protocol):
    def detect_installation(self, app_root: Path) -> Path | None: ...
    def find_document_engine(self, app_root: Path,
                             override: str | None = None) -> Path | None: ...
    def document_worker_command(self, engine: Path, worker: Path,
                                profile_uri: str, endpoint: str,
                                app_kind: str) -> ServiceResult[LaunchSpec]: ...
    def start_child(self, spec: LaunchSpec, *, purpose: str,
                    pipe_stdin: bool = False,
                    pipe_stdout: bool = False) -> ServiceResult[object]: ...
    def open_path(self, path: Path) -> ServiceResult[None]: ...
    def show_error(self, title: str, message: str) -> ServiceResult[None]: ...
    def native_io_path(self, path: Path) -> Path: ...

class UpdateApplier(Protocol):
    def validate_package_path(self, relative_path: str) -> ServiceResult[str]: ...
    def create_apply_task(self, request: Mapping[str, object]) -> ServiceResult[Path]: ...
    def launch(self, task_path: Path) -> ServiceResult[int]: ...  # PID, không lộ cờ OS

class ClipboardExtras(Protocol):
    def read(self) -> ServiceResult[ClipboardPayload]: ...
    def write(self, payload: ClipboardPayload) -> ServiceResult[None]: ...

class DeviceId(Protocol):
    def platform_name(self) -> Literal["windows", "macos", "linux"]: ...
    def machine_id(self) -> ServiceResult[str]: ...
    def device_name(self) -> str: ...

@dataclass(frozen=True)
class OfficeEngineInfo:
    available: bool
    display_name: str = "LibreOffice"

@dataclass(frozen=True)
class OfficeExportRequest:
    source: Path
    app_kind: str
    output_dir: Path
    timeout_seconds: int = 60

class OfficeAutomation(Protocol):
    def availability(self, app_kind: str) -> ServiceResult[OfficeEngineInfo]: ...
    def export_pdf(self, request: OfficeExportRequest) -> ServiceResult[Path]: ...
~~~

start_child() thực tế phải trả wrapper process trung lập tối thiểu (pid, poll, wait, communicate, terminate, kill), không trả Popen flags. purpose là tập giá trị đóng như uno-worker, document-engine, print, update-helper, open-path để windows.py tự chọn CREATE_NO_WINDOW/priority/session.

### 3.3. Factory và xung đột tên platform

~~~python
@dataclass(frozen=True)
class OSServices:
    data_dirs: DataDirs
    single_instance: SingleInstance
    process_tracker: ProcessTracker
    app_identity: AppIdentity
    file_associations: FileAssociations
    launcher: Launcher
    update_applier: UpdateApplier
    clipboard_extras: ClipboardExtras
    device_id: DeviceId
    office_automation: OfficeAutomation

def get_services() -> OSServices: ...
~~~

Repo không có platform/__init__.py và platform trùng mô-đun chuẩn Python. main.py:131-159,198-207 hiện đã nạp module bằng importlib.util.spec_from_file_location. Vì vậy không dùng from platform.os_services import .... Bootstrap phải nạp platform/os_services/__init__.py dưới tên riêng (ví dụ _vno_os_services) với submodule_search_locations, rồi import tương đối base.py/windows.py. Cần test cả source tree và layout đóng gói.

Không tạo macos.py trong đợt Windows. Hành vi factory trên hệ chưa có backend phải được duyệt ở Q2, không âm thầm chọn Windows.

### 3.4. Capability phát hiện thêm

Bốn nhóm không nên nhét vào mười Protocol trên:

1. PrinterServices.list_installed() cho PowerShell/WMI.
2. SystemLocale.number_separators() cho GetLocaleInfoEx.
3. SystemMetrics.current_memory_bytes() và FileLock cho performance/autorecover.
4. FontMetrics.font_descent() cho GDI trong OOXML; nhóm này chạm fidelity.

Khuyến nghị thêm ba Protocol công khai đầu tiên và inject callback FontMetrics vào adapter OOXML, không để Adapter import ngược Platform. Q1/Q6 là cổng phê duyệt.

## 4. Thứ tự tách an toàn — mỗi bước một nhánh/PR

Mỗi PR tách từ main xanh mới nhất trong worktree riêng. Không hai agent cùng sửa base.py/windows.py; PR sau chỉ bắt đầu sau khi PR trước được duyệt/merge hoặc người phụ trách chỉ rõ cách đồng bộ.

| Bước / nhánh gợi ý | Phạm vi không đổi hành vi | Tệp dự kiến | Gate/rollback |
|---|---|---:|---|
| P0 plan/os-services-* | Chốt Q1–Q9, baseline | 1–2 docs | Hiện tại; bỏ docs là hết thay đổi |
| P1 refactor/os-services-contract | base.py, __init__.py, windows.py; chưa chuyển caller | 3 source + 2 test | Import source/packaged; revert PR |
| P2 refactor/os-services-dirs-launcher | user-data, find_soffice, open folder, startup alert, long path | 3–4 source + 3 test | Golden env/path; blank launch 3 app |
| P3 refactor/os-services-single-instance | Giữ TCP/token/file/timeout/thứ tự stop-release; chỉ đổi backend lock | 3–4 source + 2 test | Unit + live single-instance/multiprocess |
| P4 refactor/os-services-processes | Identity/tree/terminate/launch flags; giữ ledger/env; không Job Object, không kill tên | 4–5 source + 3 test | Process tests, CH9, 20 launch/exit |
| P5 refactor/os-services-shell-identity | AUMID/property store/relaunch; command/icon byte-for-byte | 3 source + 3 test | App launcher/desktop launch + kiểm tay taskbar |
| P6 refactor/os-services-clipboard-locale | Win32 clipboard; locale nếu Q1 duyệt | 3–4 source + 3 test | Clipboard unit + cross-app CDP 7/7 |
| P7 refactor/os-services-device-assoc | MachineGuid, Registry/shortcut; fingerprint/hash/API không đổi | 4 source + 3 test | License + install migration + Registry snapshot |
| P8 refactor/os-services-office-print | Wrap COM STA và WMI; giữ LO fallback/timeout/PID cleanup | 4–5 source + 3 test | Print/COM, Office có/không/timeout |
| P9 refactor/os-services-update-applier | **Rủi ro cao nhất**; wrap nguyên ps1/task/health/rollback/relaunch | 4–5 source + 3 test | Disposable install, success/hash fail/health rollback |
| P10 refactor/os-services-final-sweep | UNO flags/transport hook, locks/perf, GDI theo Q6; grep sạch | 5–7 source + 4 test | 28 Excel + Writer/Slides, UNO/profile, full gates |
| P11 refactor/ports-windows-packaging | Chỉ sau duyệt build: chuyển NSIS/launcher/release sang ports/windows | 8–12 build + 3 test | Artifact/package hash, máy sạch install/update/uninstall |

P9 là rủi ro vận hành cao nhất; P10/GDI là rủi ro fidelity cao nhất; P11 là cổng build-system riêng và không gộp runtime.

## 5. Chứng minh Windows không đổi hành vi

### 5.1. Baseline và full gate

1. node tests/run-tests.js — baseline task yêu cầu **2753 PASS, 0 FAIL**.
2. python -m unittest discover -s tests.
3. node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs — **27 PASS, 0 FAIL, 0 BLOCKED**; giữ N/A như baseline.
4. CDP liên quan: cross-app-paste, ch9-cleanup-performance, ctx-menu, ruler, formula-hints, sheet-format-state, doc-format-state.
5. Fidelity: 28 workbook LAN và bộ Writer/Slides theo docs/TESTING-DESKTOP.md; COM chỉ là oracle Windows, không đóng Office có sẵn.
6. Bản cài disposable: install → ba app → stage update → relaunch → health; lặp hash sai/health timeout để chứng minh rollback.

### 5.2. Characterization theo dịch vụ

- DataDirs: env có/không LOCALAPPDATA, Unicode/dấu cách/đường dài; Path bằng baseline.
- SingleInstance: giữ tên lock/json, protocol 1, token 64, cap 131072 byte, timeout và thứ tự release.
- ProcessTracker: golden ledger JSONL, PID reuse, child đến muộn, owner khác còn sống; source guard cấm kill theo tên.
- AppIdentity/FileAssociations: snapshot command/icon/AUMID/HKCU; không tự chiếm app mặc định.
- Clipboard: CF_UNICODETEXT + CF_HTML thật; offsets StartHTML/EndHTML/StartFragment/EndFragment không đổi.
- DeviceId: MachineGuid/name giả lập cho fingerprint/device code y hệt; raw machine id không ra log/cloud.
- OfficeAutomation: ProgID/PowerShell nằm trong backend; caller chỉ thấy available/display_name; fallback/text lỗi không đổi.
- UpdateApplier: golden task JSON, signature/hash, removals, path có dấu cách, health/rollback không đổi.

### 5.3. Không tăng thời gian mở/khởi động

Dùng scripts/measure-cold-start.ps1 và scripts/cdp-cold-start-probe.mjs trên cùng máy/layout installed-like/profile/file. Đo trước/sau mỗi PR chạm startup: 5 cold blank mỗi app và 5 lượt mở file nhỏ mỗi app; Sheet ghi worker_ready lẫn document_open. Báo mọi lượt, median, p95, không chọn lượt đẹp nhất.

Gate đề xuất: chặn nếu median tăng quá max(100 ms, 5%) hoặc một stage mới tăng trên 100 ms. Nếu “không tăng” phải hiểu tuyệt đối, chủ sở hữu chốt Q8 vì desktop có nhiễu nền. Mốc lịch sử docs/HANDOFF-OPEN-WARM-START.md là Sheet document-open median 4,598 s và worker-ready 3,194 s, nhưng phải đo lại cùng máy; không so chéo máy.

Chỉ ghi PASS khi đã chạy. Chưa chạy = NOT RUN; thiếu môi trường = BLOCKED kèm lý do; không sửa expected/disable test.

## 6. Rủi ro và giảm thiểu

| Rủi ro | Tác động | Gate |
|---|---|---|
| platform đụng stdlib | Không khởi động source/package | Loader đường dẫn + test hai layout |
| Factory/import quá sớm | Tăng startup, dò COM/Registry khi import | Singleton lazy + perf gate |
| API rò creationflags/HWND/ProgID | Lớp trên vẫn Windows-specific | Kiểu trung lập + source guard |
| Single-instance lệch timing | Tranh owner/mất open request | Stress concurrent + multiprocess |
| Cleanup nhầm PID | Mất dữ liệu app khác | PID + creation token + parent chain; cấm kill tên |
| Update sai | Bản cài hỏng/rollback sai | P9 riêng, fault injection, giữ ps1 trước |
| COM cleanup nhầm Office | Đóng tài liệu người dùng | Chỉ PID mới sở hữu; test Office đang mở |
| GDI di chuyển lệch Sheet | Sai row height/fidelity | Q6 + 28-file parity; không đổi bảng đo |
| MachineGuid lọt log/cloud | Rủi ro riêng tư | Hash nội bộ + reporter test |
| Dời NSIS đổi artifact | Cài/nâng cấp/gỡ lỗi | P11 riêng + compare manifest/máy sạch |
| Vô hiệu partial macOS | Source launch đổi hành vi | Q2; không xóa fallback âm thầm |

## 7. Rollback

- Revert từng PR; không reset --hard, không xóa worktree/dữ liệu.
- Refactor không đổi schema endpoint, process ledger, updater task/manifest, profile hay data dir nên rollback không cần migration.
- P9 fail: bản cài disposable dùng backup/health rollback hiện tại; nhánh chính revert cả P9 về helper cũ.
- P10 fidelity lệch: ngắt wiring mới, dùng đường GDI cũ; không đổi fixture chuẩn để che lỗi.
- P11 giữ wrapper đường dẫn script cũ một release; artifact khác thì bỏ PR và build vị trí cũ.

## 8. Câu hỏi chủ sở hữu phải quyết định

1. **Q1:** Duyệt thêm PrinterServices, SystemLocale, SystemMetrics và FileLock? Khuyến nghị tách đúng trách nhiệm.
2. **Q2:** Trước macos.py, factory trên macOS/Linux báo not_supported hay giữ nhánh portable qua portable.py? Khuyến nghị giữ portable để không mất hành vi đang có.
3. **Q3:** Xác nhận giữ Toolhelp32 + TerminateProcess trong refactor. Job Object nếu cần là thay đổi hành vi/plan riêng.
4. **Q4:** P9 chỉ wrap apply-helper.ps1 hay đồng thời viết apply_helper.py? Khuyến nghị wrap trước, rewrite sau.
5. **Q5:** Có duyệt đổi build/đường dẫn sang ports/windows/** ở P11 không? Không duyệt thì giữ vị trí, chỉ đánh dấu Windows-only.
6. **Q6:** Có inject FontMetrics callback cho _gdi_font_descent trong P10 không? Khuyến nghị có sau baseline fidelity; Adapter không import ngược Platform.
7. **Q7:** Duyệt loader _vno_os_services bằng spec_from_file_location + submodule_search_locations? Khuyến nghị giữ path theo spec.
8. **Q8:** Duyệt ngưỡng nhiễu max(100 ms, 5%) và 100 ms/stage, hay ngưỡng khác?
9. **Q9:** Xác nhận giữ nguyên chuỗi/dir hiện tại (VNOffice, 3T Office, Doc/Sheet/Slide); branding ngoài scope.

Không bắt đầu P1 trước khi Q1–Q9 được trả lời hoặc chủ sở hữu cho phép dùng phương án khuyến nghị.

## 9. Ước lượng và phần có thể giao agent khác

- 11 bước triển khai sau plan (P1–P11), mỗi bước 1 PR; bỏ P11 nếu không duyệt build.
- Runtime/shared hiện hữu dự kiến 14–18 tệp; tệp mới 3–6; build/ports 8–12; test/docs 18–24. Tổng khoảng 43–60 đường dẫn, nhưng từng PR chỉ theo bảng trên.
- Ước lượng: P1–P2 2–3 ngày; P3–P5 4–6; P6–P8 4–6; P9 3–5; P10 4–7; P11 3–5. Tổng 20–32 ngày kỹ thuật, chưa tính corpus/máy sạch/ký duyệt.

Sau khi Platform owner khóa contract:

- QA agent: baseline node/Python/CDP/perf/fidelity, chỉ đo và lưu artifact.
- Platform owner: P1–P6, sở hữu duy nhất base.py/__init__.py/windows.py.
- Integration/Core owner: characterization DeviceId/UNO/GDI và handoff dependency, không tự sửa platform/**.
- Print owner: test/adapter OfficeAutomation + PrinterServices sau P6.
- Updater owner: P9 ở worktree riêng.
- Release/Brand owner: P11 sau duyệt build-system.

Không giao hai coding agent cùng sửa windows.py; agent miền khác chuẩn bị test/characterization hoặc patch đúng vùng sở hữu rồi handoff.

## 10. Handoff chính (theo AGENT-HANDOFF)

**TASK:** Lập kế hoạch tách Windows vào platform/os_services; không sửa ứng dụng.

**AGENT/ROLE:** Codex / Architecture planning.

**BRANCH:** plan/os-services-codex.

**WORKTREE:** E:\VNOffice-codex-os.

**OBJECTIVE:** Inventory bằng chứng, Protocol, chuỗi PR, test/perf gate, rollback và câu hỏi phê duyệt.

**FINDINGS:** Windows code nằm ở main/Platform/Adapter/updater/installer; process_tracker chưa dùng Job Object; platform đụng tên stdlib; có bốn capability ngoài danh sách ban đầu.

**IMPLEMENTATION SUMMARY:** Chỉ thêm tài liệu kế hoạch; không tạo os_services, không sửa source/build/app, không thêm dependency.

**FILES CHANGED:** docs/PLAN-OS-SERVICES.md.

**COMMANDS RUN:** Đọc hai spec; rg/git ls-files kiểm kê; kiểm tra branch/base/status; công kiểm ghi dưới.

**BUILD RESULT:** NOT RUN — chỉ thay docs, không có build artifact.

**TEST RESULTS:** PASS — lần chạy lại node tests/run-tests.js đạt 2753/2753, 0 FAIL. Lần đầu FAIL 2751/2753 do hai ca Browser Headless cùng không mount DOM/switcher; không đổi source/expected, chạy lại nguyên lệnh thì xanh. Python/CDP/build: NOT RUN vì task chỉ sửa tài liệu.

**KNOWN FAILURES:** Hai lỗi Browser Headless không tái lập ở lần chạy thứ hai; cần coi đây là dấu hiệu flake môi trường Edge nếu tái xuất hiện ở baseline triển khai.

**RISKS:** Cao nhất là update rollback, cleanup PID, GDI fidelity.

**DEPENDENCIES/BLOCKERS:** Cần chủ sở hữu trả lời Q1–Q9 và duyệt plan trước P1.

**CORE PATCH ID:** Không có.

**NEXT ACTION:** Chủ sở hữu duyệt/chỉnh plan; sau đó tạo branch/worktree riêng cho P1.

### Đã làm

- Đọc spec nền tảng/macOS và AGENTS.md.
- Kiểm kê runtime, adapter, PowerShell, NSIS, launcher bằng tệp:dòng.
- Đề xuất Protocol, thứ tự PR, test/perf gate, rollback, ước lượng và phân công.

### Chưa làm

- Chưa refactor/tạo windows.py hay macos.py.
- Chưa thay updater, installer, launcher, process cleanup, clipboard, COM hoặc fidelity.
- Chưa push, chưa merge main, chưa thao tác Git phá hủy.
