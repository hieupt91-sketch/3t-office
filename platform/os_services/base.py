"""OS service contract (P1 of docs/PLAN-OS-SERVICES.md).

Neutral types and Protocols that the rest of the app may depend on. Nothing here names a system library,
registry, shell or automation API of any operating system: a backend (windows.py now, macos.py later)
implements these and keeps the OS details to itself. Operational failures come back as ServiceResult/ServiceError (Vietnamese message,
safe to show); ValueError is only for programming errors / inputs that break the contract.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Generic, Literal, Mapping, Protocol, Sequence, TypeVar, runtime_checkable

T = TypeVar("T")

ErrorCode = Literal[
    "not_supported", "not_available", "permission_denied", "busy",
    "timeout", "invalid_state", "invalid_input", "io_error",
]
_ERROR_CODES = frozenset(ErrorCode.__args__)  # type: ignore[attr-defined]


@dataclass(frozen=True)
class ServiceError:
    code: ErrorCode
    message: str  # Vietnamese, safe to show to the user
    retryable: bool = False

    def __post_init__(self) -> None:
        if self.code not in _ERROR_CODES:
            raise ValueError(f"Unknown service error code: {self.code!r}")
        if not str(self.message or "").strip():
            raise ValueError("ServiceError needs a non-empty message")


@dataclass(frozen=True)
class ServiceResult(Generic[T]):
    """Exactly one of value / error. A successful call without data uses value=None via ok()."""

    value: T | None = None
    error: ServiceError | None = None
    _ok: bool = False

    @classmethod
    def ok(cls, value: T | None = None) -> "ServiceResult[T]":
        return cls(value=value, error=None, _ok=True)

    @classmethod
    def fail(cls, code: ErrorCode, message: str, *, retryable: bool = False) -> "ServiceResult[T]":
        return cls(value=None, error=ServiceError(code, message, retryable), _ok=False)

    def __post_init__(self) -> None:
        if self._ok and self.error is not None:
            raise ValueError("ServiceResult cannot hold both a value and an error")
        if not self._ok and self.error is None:
            raise ValueError("ServiceResult needs ok() or fail(); use those constructors")

    @property
    def is_ok(self) -> bool:
        return self._ok

    def unwrap(self) -> T | None:
        if not self._ok:
            raise RuntimeError(self.error.message if self.error else "Service call failed")
        return self.value


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


@dataclass(frozen=True)
class FontSubstitution:
    """A font a document may ask for, and what the document engine uses when it is not installed.

    substitutes are tried in order; the first one installed wins. The requested font itself always stays first,
    so a user who installs the real font gets it. metric_compatible=True means same advance widths and line
    height (same line and page breaks); False is a best-effort look-alike.
    """

    font: str
    substitutes: tuple[str, ...]
    metric_compatible: bool = False


@dataclass(frozen=True)
class DocumentFontSources:
    """Font folders of the OS that the document engine may read at runtime (fonts are used in place, never copied).

    accept_globs / reject_globs narrow what is read inside those folders (accept wins over reject).
    """

    directories: tuple[Path, ...]
    accept_globs: tuple[str, ...] = ()
    reject_globs: tuple[str, ...] = ()


# Closed set of purposes for start_child(): the backend alone decides OS flags (window, priority, session).
CHILD_PURPOSES = frozenset({"uno-worker", "document-engine", "print", "update-helper", "open-path"})


class DataDirs(Protocol):
    def user_data_dir(self) -> Path: ...
    def updates_dir(self) -> Path: ...
    def logs_dir(self) -> Path: ...
    def document_profile_dir(self, app_kind: str) -> Path: ...


class SingleInstanceHandle(Protocol):
    @property
    def owns_lock(self) -> bool: ...
    def start(self) -> ServiceResult[None]: ...
    def take_over_unresponsive(self, *, timeout: float, allow_missing: bool = False) -> ServiceResult[bool]: ...
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


class ChildProcess(Protocol):
    """Minimal neutral process handle returned by start_child(); never a Popen with OS flags."""

    @property
    def pid(self) -> int: ...
    def poll(self) -> int | None: ...
    def wait(self, timeout: float | None = None) -> int: ...
    def communicate(self, input: bytes | None = None, timeout: float | None = None) -> tuple[bytes, bytes]: ...
    def terminate(self) -> None: ...
    def kill(self) -> None: ...


class Launcher(Protocol):
    def detect_installation(self, app_root: Path) -> Path | None: ...
    def find_document_engine(self, app_root: Path, override: str | None = None) -> Path | None: ...
    def document_worker_command(self, engine: Path, worker: Path, profile_uri: str, endpoint: str,
                                app_kind: str) -> ServiceResult[LaunchSpec]: ...
    def start_child(self, spec: LaunchSpec, *, purpose: str, pipe_stdin: bool = False,
                    pipe_stdout: bool = False) -> ServiceResult[ChildProcess]: ...
    def open_path(self, path: Path) -> ServiceResult[None]: ...
    def show_error(self, title: str, message: str) -> ServiceResult[None]: ...
    def native_io_path(self, path: Path) -> Path: ...
    def reveal_path(self, path: Path) -> ServiceResult[None]: ...  # mở thư mục chứa tệp và chọn tệp nếu hệ điều hành hỗ trợ


class UpdateApplier(Protocol):
    def validate_package_path(self, relative_path: str) -> ServiceResult[str]: ...
    def create_apply_task(self, request: Mapping[str, object]) -> ServiceResult[Path]: ...
    def launch(self, task_path: Path) -> ServiceResult[int]: ...  # PID only, no OS flags leak


class ClipboardExtras(Protocol):
    def read(self) -> ServiceResult[ClipboardPayload]: ...
    def write(self, payload: ClipboardPayload) -> ServiceResult[None]: ...


class DeviceId(Protocol):
    def platform_name(self) -> Literal["windows", "macos", "linux"]: ...
    def machine_id(self) -> ServiceResult[str]: ...
    def device_name(self) -> str: ...


class DocumentFonts(Protocol):
    """Fonts for layout/pagination in the document engine (MAC-9). Optional: only OSes that need it provide it."""

    def substitutions(self) -> tuple[FontSubstitution, ...]: ...
    def sources(self) -> DocumentFontSources: ...


class OfficeAutomation(Protocol):
    def availability(self, app_kind: str) -> ServiceResult[OfficeEngineInfo]: ...
    def export_pdf(self, request: OfficeExportRequest) -> ServiceResult[Path]: ...


@dataclass(frozen=True)
class OSServices:
    """The set of services a backend provides. Fields are filled by the backend (windows.py, macos.py...)."""

    # Services migrate one step at a time (see the plan): a backend fills only what it already provides, the
    # rest stay None until their step lands. get_services(strict=True) requires all of them.
    data_dirs: DataDirs | None = None
    single_instance: SingleInstance | None = None
    process_tracker: ProcessTracker | None = None
    app_identity: AppIdentity | None = None
    file_associations: FileAssociations | None = None
    launcher: Launcher | None = None
    update_applier: UpdateApplier | None = None
    clipboard_extras: ClipboardExtras | None = None
    device_id: DeviceId | None = None
    office_automation: OfficeAutomation | None = None
    # Optional extra, not part of SERVICE_FIELDS: an OS whose document engine already sees every installed font
    # with suitable substitutes (Windows) leaves it None and nothing changes there.
    document_fonts: DocumentFonts | None = None
    # Optional extra (MAC-3-2610): what the OS's native Open/Save dialogs already do (file_dialogs.FileDialogPolicy).
    # None keeps main.py's previous dialog code path (Windows, Linux).
    file_dialogs: object | None = None


SERVICE_FIELDS = (
    "data_dirs", "single_instance", "process_tracker", "app_identity", "file_associations",
    "launcher", "update_applier", "clipboard_extras", "device_id", "office_automation",
)
