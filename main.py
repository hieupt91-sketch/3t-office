"""
3T Office — Python Desktop Application Entrypoint
Khởi chạy 3T Office dưới dạng cửa sổ Native Desktop App độc lập,
và làm cầu nối thật (không mock) tới LibreOffice headless engine
cho các thao tác Mở/Lưu/Xuất PDF — cross-platform: Windows, Linux, macOS.
"""

import http.server
import inspect
import json
import os
import queue
import socket
import sys
import ctypes
import base64
import csv
import json
import secrets
from collections import Counter
import html
import importlib.util
import json
import logging
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
import platform
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlencode, unquote

_EARLY_SINGLE_INSTANCE_REQUEST_ID = None


def _early_forward_if_running(argv: list[str]) -> bool:
    """Forward a secondary launch before importing the desktop/engine stack."""
    global _EARLY_SINGLE_INSTANCE_REQUEST_ID
    if __name__ != "__main__":
        return False
    app_kind = None
    file_path = None
    app_by_extension = {
        ".docx": "writer", ".doc": "writer", ".odt": "writer", ".rtf": "writer", ".txt": "writer",
        ".xlsx": "sheet", ".xls": "sheet", ".ods": "sheet", ".csv": "sheet",
        ".pptx": "slides", ".ppt": "slides", ".odp": "slides",
    }
    for arg in argv:
        if arg.startswith("--app="):
            app_kind = arg.split("=", 1)[1].lower()
        elif not arg.startswith("-") and file_path is None:
            file_path = str(Path(arg).expanduser().resolve())
    if file_path:
        inferred_app = app_by_extension.get(Path(file_path).suffix.lower())
        if app_kind and app_kind != inferred_app:
            return False
        app_kind = inferred_app
    if app_kind not in {"writer", "sheet", "slides"}:
        return False

    system = platform.system()
    if system == "Windows":
        data_dir = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "VNOffice"
    elif system == "Darwin":
        data_dir = Path.home() / "Library" / "Application Support" / "VNOffice"
    else:
        data_dir = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share") / "VNOffice"
    endpoint_path = data_dir / f"single-instance-{app_kind}.json"
    if not endpoint_path.is_file():
        return False

    module_path = Path(__file__).resolve().parent / "platform" / "single_instance.py"
    spec = importlib.util.spec_from_file_location("_vno_single_instance_early", module_path)
    if spec is None or spec.loader is None:
        return False
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _EARLY_SINGLE_INSTANCE_REQUEST_ID = uuid.uuid4().hex
    result = module.forward_launch_request(
        data_dir,
        app_kind,
        file_path,
        timeout=0.75,
        request_id=_EARLY_SINGLE_INSTANCE_REQUEST_ID,
    )
    return bool(result and result.get("accepted") is True)


if _early_forward_if_running(sys.argv[1:]):
    raise SystemExit(0)

import webview
from adapters.error_reporting import ErrorReporter, load_client_config
from adapters.updater import UpdaterManager
from adapters.updater.trust import get_public_key
from adapters.updater.updater import queue_rollback_report, write_health_marker

# ``platform`` is also a Python standard-library module, so load the shared
# storage backend from its explicit path instead of shadowing that module.
_AUTORECOVER_STORE_PATH = Path(__file__).resolve().parent / "platform" / "autorecover" / "store.py"
_AUTORECOVER_STORE_SPEC = importlib.util.spec_from_file_location("_vno_autorecover_store", _AUTORECOVER_STORE_PATH)
if _AUTORECOVER_STORE_SPEC is None or _AUTORECOVER_STORE_SPEC.loader is None:
    raise ImportError(f"Cannot load AutoRecover storage: {_AUTORECOVER_STORE_PATH}")
_AUTORECOVER_STORE_MODULE = importlib.util.module_from_spec(_AUTORECOVER_STORE_SPEC)
sys.modules[_AUTORECOVER_STORE_SPEC.name] = _AUTORECOVER_STORE_MODULE
_AUTORECOVER_STORE_SPEC.loader.exec_module(_AUTORECOVER_STORE_MODULE)
AutoRecoverStore = _AUTORECOVER_STORE_MODULE.AutoRecoverStore

_SINGLE_INSTANCE_PATH = Path(__file__).resolve().parent / "platform" / "single_instance.py"
_SINGLE_INSTANCE_SPEC = importlib.util.spec_from_file_location("_vno_single_instance", _SINGLE_INSTANCE_PATH)
if _SINGLE_INSTANCE_SPEC is None or _SINGLE_INSTANCE_SPEC.loader is None:
    raise ImportError(f"Cannot load single-instance service: {_SINGLE_INSTANCE_PATH}")
_SINGLE_INSTANCE_MODULE = importlib.util.module_from_spec(_SINGLE_INSTANCE_SPEC)
sys.modules[_SINGLE_INSTANCE_SPEC.name] = _SINGLE_INSTANCE_MODULE
_SINGLE_INSTANCE_SPEC.loader.exec_module(_SINGLE_INSTANCE_MODULE)
SingleInstanceServer = _SINGLE_INSTANCE_MODULE.SingleInstanceServer
InstanceAlreadyRunning = _SINGLE_INSTANCE_MODULE.InstanceAlreadyRunning
forward_launch_request = _SINGLE_INSTANCE_MODULE.forward_launch_request

_PRINT_PIPELINE_PATH = Path(__file__).resolve().parent / "platform" / "print" / "print_pipeline.py"
_PRINT_PIPELINE_SPEC = importlib.util.spec_from_file_location("_vno_print_pipeline", _PRINT_PIPELINE_PATH)
if _PRINT_PIPELINE_SPEC is None or _PRINT_PIPELINE_SPEC.loader is None:
    raise ImportError(f"Cannot load print pipeline: {_PRINT_PIPELINE_PATH}")
_PRINT_PIPELINE_MODULE = importlib.util.module_from_spec(_PRINT_PIPELINE_SPEC)
sys.modules[_PRINT_PIPELINE_SPEC.name] = _PRINT_PIPELINE_MODULE
_PRINT_PIPELINE_SPEC.loader.exec_module(_PRINT_PIPELINE_MODULE)
PrintPipeline = _PRINT_PIPELINE_MODULE.PrintPipeline

_OFFICE_COM_PATH = Path(__file__).resolve().parent / "platform" / "print" / "office_com.py"
_OFFICE_COM_SPEC = importlib.util.spec_from_file_location("_vno_office_com", _OFFICE_COM_PATH)
if _OFFICE_COM_SPEC is None or _OFFICE_COM_SPEC.loader is None:
    raise ImportError(f"Cannot load Office COM print integration: {_OFFICE_COM_PATH}")
_OFFICE_COM_MODULE = importlib.util.module_from_spec(_OFFICE_COM_SPEC)
sys.modules[_OFFICE_COM_SPEC.name] = _OFFICE_COM_MODULE
_OFFICE_COM_SPEC.loader.exec_module(_OFFICE_COM_MODULE)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(ROOT_DIR, "index.html")
APP_VERSION = "0.9.0-pilot1"
_ERROR_REPORTER: ErrorReporter | None = None
_ERROR_REPORT_CONTEXT = threading.local()
_UPDATE_MANAGER: UpdaterManager | None = None
_UPDATE_DATA_DIR: Path | None = None
_APP_WINDOW_APIS: dict[str, object] = {}
_APP_WINDOW_LOCK = threading.RLock()
_NEW_WINDOW_CREATE_LOCK = threading.RLock()
_DOCUMENT_SEQUENCE: dict[str, int] = {}
_DOCUMENT_SEQUENCE_LOCK = threading.Lock()
_INSTANCE_LAUNCH_QUEUE: queue.Queue[tuple[dict[str, object], threading.Event]] = queue.Queue()
_INSTANCE_DISPATCH_READY = threading.Event()
_INSTANCE_DISPATCH_STOP = threading.Event()


def _load_update_config() -> dict[str, str]:
    config_path = Path(ROOT_DIR) / "vnoffice-config.json"
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {"source": "", "channel": "pilot"}
    update = config.get("update", {}) if isinstance(config, dict) else {}
    if not isinstance(update, dict):
        update = {}
    source = update.get("source", "")
    channel = update.get("channel", "pilot")
    if not isinstance(source, str):
        source = ""
    if not isinstance(channel, str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,31}", channel):
        channel = "pilot"
    return {"source": source.strip(), "channel": channel}


def _update_install_root() -> Path | None:
    app_dir = Path(ROOT_DIR)
    install_root = app_dir.parent
    required = (install_root / "python" / "pythonw.exe", install_root / "VERSION.txt")
    return install_root if app_dir.name.lower() == "app" and all(path.is_file() for path in required) else None


def _notify_update_ui(state: dict[str, object]) -> None:
    window = _active_window()
    if not window:
        return
    allowed = {key: state.get(key) for key in (
        "current_version", "available_version", "channel", "release_notes", "ready",
        "bytes_downloaded", "changed_files", "removed_files", "checked_at", "status",
    )}
    try:
        payload = json.dumps(allowed, ensure_ascii=False, separators=(",", ":"))
        window.evaluate_js(f"window.dispatchEvent(new CustomEvent('vno-office-update-state', {{detail:{payload}}}))")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Embedded static-file server (runs inside the Python process)
# ---------------------------------------------------------------------------

_STATIC_MIME_OVERRIDES = {
    ".js": "text/javascript; charset=UTF-8",
    ".mjs": "text/javascript; charset=UTF-8",
    ".css": "text/css; charset=UTF-8",
    ".json": "application/json; charset=UTF-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".html": "text/html; charset=UTF-8",
    ".htm": "text/html; charset=UTF-8",
    ".ico": "image/x-icon",
}

_DEFAULT_STATIC_PORT = 8080
_MAX_PORT_ATTEMPTS = 20
_SHEET_OPEN_SESSION_TTL_SECONDS = 600


class _StaticFileHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files from ROOT_DIR with correct MIME types for JS/CSS."""

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory or ROOT_DIR, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in _STATIC_MIME_OVERRIDES:
            return _STATIC_MIME_OVERRIDES[ext]
        return super().guess_type(path)

    def log_message(self, fmt, *args):
        pass  # quiet — do not spam console on every request


class _QuietTCPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 0)
        super().server_bind()


def _start_static_server():
    """Find a free port, start the embedded HTTP server on a daemon thread,
    wait until it is ready, and return (server, port).

    Raises RuntimeError if no port is available within _MAX_PORT_ATTEMPTS.
    """
    for attempt in range(_MAX_PORT_ATTEMPTS):
        port = _DEFAULT_STATIC_PORT + attempt
        try:
            server = _QuietTCPServer(("127.0.0.1", port), _StaticFileHandler)
        except OSError:
            continue  # port occupied, try next

        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        # Quick readiness check
        import time
        time.sleep(0.05)
        if thread.is_alive():
            return server, port
        # Thread died immediately — port was not truly free
        server.server_close()

    raise RuntimeError(
        f"Không tìm thấy cổng trống trong khoảng {_DEFAULT_STATIC_PORT}–"
        f"{_DEFAULT_STATIC_PORT + _MAX_PORT_ATTEMPTS - 1}"
    )

APP_DATA_DIR_NAME = "VNOffice"
VALID_APP_KINDS = ("writer", "sheet", "slides")
APP_TITLES = {
    "writer": "3T Doc — Soạn thảo văn bản",
    "sheet": "3T Sheet — Bảng tính",
    "slides": "3T Slide — Trình chiếu",
}
SUITE_TITLE = "3T Office — Bộ Ứng Dụng Văn Phòng Việt"
FILE_APP_KINDS = {
    ".docx": "writer", ".doc": "writer", ".odt": "writer", ".rtf": "writer", ".txt": "writer",
    ".xlsx": "sheet", ".xls": "sheet", ".ods": "sheet", ".csv": "sheet",
    ".pptx": "slides", ".ppt": "slides", ".odp": "slides",
}


def _user_data_dir() -> Path:
    """Thư mục dữ liệu người dùng theo từng hệ điều hành (Windows/Linux/macOS)."""
    system = platform.system()
    if system == "Windows":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / APP_DATA_DIR_NAME
    if system == "Darwin":
        return Path.home() / "Library" / "Application Support" / APP_DATA_DIR_NAME
    # Linux và các hệ Unix khác
    base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return Path(base) / APP_DATA_DIR_NAME


def find_soffice() -> str | None:
    """Tìm đường dẫn thực thi LibreOffice headless engine trên Windows/Linux/macOS."""
    env_override = os.environ.get("VNOFFICE_SOFFICE_PATH")
    system = platform.system()

    candidates = []
    if env_override:
        candidates.append(env_override)

    # tools/libreoffice cạnh main.py (bản đóng gói) được ưu tiên hơn LibreOffice cài sẵn trên máy:
    # bản cài sẵn có thể khác phiên bản đã kiểm thử và cho kết quả mở/lưu khác.
    for name in ("soffice.exe", "soffice"):
        candidates.append(str(Path(ROOT_DIR) / "tools" / "libreoffice" / "program" / name))

    if system == "Windows":
        candidates += [
            str(Path.home() / "tools" / "libreoffice" / "program" / "soffice.exe"),
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
    elif system == "Darwin":
        candidates += [
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        ]
    else:  # Linux
        candidates += [
            "/usr/bin/soffice",
            "/usr/lib/libreoffice/program/soffice",
            "/opt/libreoffice/program/soffice",
            "/snap/bin/libreoffice.soffice",
        ]

    for c in candidates:
        if c and os.path.isfile(c):
            return c

    return shutil.which("soffice") or shutil.which("soffice.exe")


SOFFICE_PATH = find_soffice()

# Filter LibreOffice chính thức tương ứng định dạng Microsoft Office / ODF
FORMAT_FILTERS = {
    "docx": "MS Word 2007 XML",
    "doc": "MS Word 97",
    "rtf": "Rich Text Format",
    "odt": "writer8",
    # Văn bản thuần: bộ lọc mặc định ghi bảng mã ANSI làm mất dấu tiếng Việt ("Ti?ng Vi?t");
    # "Text (encoded)" + UTF8 ghi UTF-8 có BOM, Word/Notepad đọc đúng (đo G7).
    "txt": "Text (encoded):UTF8",
    "html": "HTML (StarWriter)",
    "pdf": "writer_pdf_Export",
    "xlsx": "Calc MS Excel 2007 XML",
    "xls": "MS Excel 97",
    "ods": "calc8",
    "csv": "Text - txt - csv (StarCalc)",
    "fods": "OpenDocument Spreadsheet Flat XML",
    "pptx": "Impress MS PowerPoint 2007 XML",
    # PowerPoint 97-2003: thiếu dòng này, "Lưu thành *.ppt" rơi về định dạng mặc định pptx
    # và ghi nội dung ZIP/PPTX vào tệp đuôi .ppt (đo G8).
    "ppt": "MS PowerPoint 97",
    "odp": "impress8",
    # "fodp" cố ý KHÔNG có filter tường minh — đã thử nghiệm thật, mọi filter name
    # tường minh (kể cả "OpenDocument Presentation Flat XML" mà tài liệu LibreOffice
    # gợi ý) đều làm lệnh convert thất bại; để trống cho LibreOffice tự nhận diện
    # theo phần mở rộng lại hoạt động đúng 100%. Đừng "sửa" dòng này mà không tự
    # test bằng lệnh soffice --convert-to thật trước.
}

_convert_lock = threading.Lock()
_PERSISTENT_SOFFICE_ENABLED = False


def _open_perf_log(stage: str, elapsed_ms: float | None = None, **fields) -> None:
    if os.environ.get("VNO_PERF_DEBUG") != "1":
        return
    suffix = "" if elapsed_ms is None else f" {elapsed_ms:.1f} ms"
    details = "".join(f" {key}={value}" for key, value in fields.items())
    print(f"[VNO Open Perf] {stage}:{suffix}{details}", flush=True)


class _PersistentSofficeError(Exception):
    """Base class for local UNO helper failures."""


class _PersistentSofficeTransportError(_PersistentSofficeError):
    """The helper or its UNO connection stopped responding."""


class _PersistentSofficeConversionError(_PersistentSofficeError):
    """UNO reported a document/filter failure while the helper stayed alive."""


class _SofficeUnoWorker:
    def __init__(self, app_kind: str):
        self.app_kind = app_kind
        self.process: subprocess.Popen[str] | None = None
        self.responses: queue.Queue[dict | None] = queue.Queue()
        self._write_lock = threading.Lock()

    @staticmethod
    def _python_path() -> str | None:
        if not SOFFICE_PATH:
            return None
        candidate = Path(SOFFICE_PATH).resolve().parent / "python.exe"
        return str(candidate) if candidate.is_file() else None

    def start(self) -> None:
        python_path = self._python_path()
        if not python_path or not SOFFICE_PATH:
            raise _PersistentSofficeTransportError(
                "Không tìm thấy Python/UNO đi kèm LibreOffice."
            )
        worker_path = Path(ROOT_DIR) / "adapters" / "libreoffice" / "common" / "soffice_uno_worker.py"
        if not worker_path.is_file():
            raise _PersistentSofficeTransportError("Không tìm thấy helper UNO của 3T Office.")

        pipe_name = f"vnoffice_{os.getpid()}_{uuid.uuid4().hex}"
        profile_uri = _profile_uri(self.app_kind)
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        command = [python_path, "-u", str(worker_path), SOFFICE_PATH, profile_uri, pipe_name, self.app_kind]
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        started = time.perf_counter()
        try:
            self.process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                env=env,
                creationflags=flags,
                start_new_session=(os.name != "nt"),
            )
        except OSError as exc:
            raise _PersistentSofficeTransportError(str(exc)) from exc

        reader = threading.Thread(target=self._read_responses, daemon=True, name="VNO UNO helper reader")
        reader.start()
        try:
            handshake = self._next_response(timeout=100)
        except _PersistentSofficeTransportError:
            self.stop(grace_seconds=0.5)
            raise
        if not handshake.get("ready"):
            message = handshake.get("error") or "LibreOffice UNO helper did not start."
            self.stop(grace_seconds=0.5)
            raise _PersistentSofficeTransportError(str(message))
        _open_perf_log(
            "worker_start_and_profile_ready",
            (time.perf_counter() - started) * 1000,
            app=self.app_kind,
        )

    def _read_responses(self) -> None:
        process = self.process
        if process is None or process.stdout is None:
            self.responses.put(None)
            return
        try:
            for line in process.stdout:
                try:
                    payload = json.loads(line)
                    if isinstance(payload, dict):
                        self.responses.put(payload)
                except (json.JSONDecodeError, TypeError):
                    self.responses.put({"_protocol_error": "LibreOffice helper sent invalid JSON."})
        finally:
            self.responses.put(None)

    def _next_response(self, timeout: float) -> dict:
        try:
            response = self.responses.get(timeout=timeout)
        except queue.Empty as exc:
            raise _PersistentSofficeTransportError("Hết thời gian chờ phản hồi từ LibreOffice.") from exc
        if response is None:
            code = self.process.poll() if self.process else None
            raise _PersistentSofficeTransportError(
                f"LibreOffice UNO helper đã dừng (exit={code})."
            )
        if response.get("_protocol_error"):
            raise _PersistentSofficeTransportError(str(response["_protocol_error"]))
        return response

    def convert(
        self,
        source_path: str,
        output_path: str,
        filter_name: str | None,
        input_filter: str | None,
        input_filter_options: str | None,
    ) -> str:
        process = self.process
        if process is None or process.poll() is not None or process.stdin is None:
            raise _PersistentSofficeTransportError("LibreOffice UNO helper is not running.")
        request_id = uuid.uuid4().hex
        request = {
            "id": request_id,
            "op": "convert",
            "source_path": source_path,
            "output_path": output_path,
            "filter_name": filter_name,
            "input_filter": input_filter,
            "input_filter_options": input_filter_options,
        }
        started = time.perf_counter()
        try:
            with self._write_lock:
                process.stdin.write(json.dumps(request, ensure_ascii=False) + "\n")
                process.stdin.flush()
            response = self._next_response(timeout=120)
        except (OSError, BrokenPipeError) as exc:
            raise _PersistentSofficeTransportError(str(exc)) from exc
        if response.get("id") != request_id:
            raise _PersistentSofficeTransportError("LibreOffice UNO helper returned an unexpected response.")
        if not response.get("ok"):
            raise _PersistentSofficeConversionError(str(response.get("error") or "UNO conversion failed"))
        _open_perf_log(
            "uno_load_and_store",
            (time.perf_counter() - started) * 1000,
            app=self.app_kind,
            bytes=response.get("output_bytes", 0),
        )
        return str(response["output_path"])

    def operation(self, operation: str, payload: dict, timeout: float = 180) -> dict:
        process = self.process
        if process is None or process.poll() is not None or process.stdin is None:
            raise _PersistentSofficeTransportError("LibreOffice UNO helper is not running.")
        request_id = uuid.uuid4().hex
        request = {"id": request_id, "op": operation, **payload}
        started = time.perf_counter()
        try:
            with self._write_lock:
                process.stdin.write(json.dumps(request, ensure_ascii=False) + "\n")
                process.stdin.flush()
            response = self._next_response(timeout=timeout)
        except (OSError, BrokenPipeError) as exc:
            raise _PersistentSofficeTransportError(str(exc)) from exc
        if response.get("id") != request_id:
            raise _PersistentSofficeTransportError("LibreOffice UNO helper returned an unexpected response.")
        if not response.get("ok"):
            raise _PersistentSofficeConversionError(str(response.get("error") or "LibreOffice operation failed"))
        _open_perf_log(
            f"uno_{operation}",
            (time.perf_counter() - started) * 1000,
            app=self.app_kind,
        )
        return response

    def stop(self, grace_seconds: float = 2.0) -> None:
        process = self.process
        if process is None or process.poll() is not None:
            return
        if process.stdin is not None:
            try:
                with self._write_lock:
                    process.stdin.write('{"op":"shutdown"}\n')
                    process.stdin.flush()
            except (OSError, BrokenPipeError):
                pass
        try:
            process.wait(timeout=grace_seconds)
            return
        except subprocess.TimeoutExpired:
            pass

        if os.name == "nt":
            flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            try:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=3,
                    creationflags=flags,
                )
            except (OSError, subprocess.TimeoutExpired):
                pass
        else:
            try:
                os.killpg(process.pid, 9)
            except OSError:
                pass
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()


class _PersistentSofficeManager:
    def __init__(self):
        self._lock = threading.RLock()
        self._worker: _SofficeUnoWorker | None = None
        self._shutdown_requested = threading.Event()

    def _stop_locked(self) -> None:
        worker = self._worker
        self._worker = None
        if worker:
            worker.stop()

    def _ensure_locked(self, app_kind: str) -> _SofficeUnoWorker:
        if self._shutdown_requested.is_set():
            raise _PersistentSofficeTransportError("3T Office đang đóng.")
        if self._worker and self._worker.app_kind == app_kind:
            if self._worker.process and self._worker.process.poll() is None:
                return self._worker
            self._stop_locked()
        else:
            self._stop_locked()

        last_error: Exception | None = None
        for _ in range(2):
            if self._shutdown_requested.is_set():
                break
            worker = _SofficeUnoWorker(app_kind)
            self._worker = worker
            try:
                worker.start()
                if self._shutdown_requested.is_set():
                    worker.stop(grace_seconds=0.1)
                    self._worker = None
                    raise _PersistentSofficeTransportError("3T Office đang đóng.")
                return worker
            except Exception as exc:
                last_error = exc
                self._stop_locked()
        raise _PersistentSofficeTransportError(str(last_error or "LibreOffice helper is unavailable"))

    def prepare(self, app_kind: str) -> None:
        if app_kind not in {"writer", "sheet"} or not _PERSISTENT_SOFFICE_ENABLED:
            return
        try:
            with self._lock:
                self._ensure_locked(app_kind)
            if app_kind in {"writer", "sheet"}:
                _warmup_persistent_filter(app_kind)
        except Exception as exc:
            _open_perf_log("worker_background_start_failed", app=app_kind, error=str(exc)[:180])

    def release_for_cli_fallback(self, app_kind: str | None) -> None:
        """Release the profile lock before the original CLI conversion runs."""
        kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
        with self._lock:
            if self._worker and self._worker.app_kind == kind:
                self._stop_locked()

    def convert(
        self,
        app_kind: str | None,
        source_path: str,
        output_path: str,
        filter_name: str | None,
        input_filter: str | None,
        input_filter_options: str | None,
    ) -> str:
        kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
        with self._lock:
            worker = self._ensure_locked(kind)
            try:
                return worker.convert(
                    source_path,
                    output_path,
                    filter_name,
                    input_filter,
                    input_filter_options,
                )
            except _PersistentSofficeConversionError:
                # The local engine stayed alive but rejected this document/filter;
                # release its profile before the original CLI fallback runs.
                self._stop_locked()
                raise
            except _PersistentSofficeTransportError as first_error:
                self._stop_locked()
                if self._shutdown_requested.is_set():
                    raise
                try:
                    worker = self._ensure_locked(kind)
                    return worker.convert(
                        source_path,
                        output_path,
                        filter_name,
                        input_filter,
                        input_filter_options,
                    )
                except Exception as retry_error:
                    self._stop_locked()
                    raise _PersistentSofficeTransportError(
                        f"UNO helper restart failed: {retry_error} (first error: {first_error})"
                    ) from retry_error

    def operation(self, app_kind: str | None, operation: str, **payload) -> dict:
        kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
        with self._lock:
            worker = self._ensure_locked(kind)
            try:
                timeout = 300 if operation == "print_pdf" else 180
                return worker.operation(operation, payload, timeout=timeout)
            except (_PersistentSofficeConversionError, _PersistentSofficeTransportError) as first_error:
                self._stop_locked()
                # Read-only PDF inspection/rendering can safely restart once if
                # LibreOffice drops its UNO bridge. A print job may already have
                # reached the printer, so never retry that operation.
                if operation == "print_pdf" or self._shutdown_requested.is_set():
                    raise
                try:
                    worker = self._ensure_locked(kind)
                    return worker.operation(operation, payload, timeout=timeout)
                except Exception as retry_error:
                    self._stop_locked()
                    raise _PersistentSofficeTransportError(
                        f"LibreOffice could not recover for {operation}: {retry_error} "
                        f"(first error: {first_error})"
                    ) from retry_error
            finally:
                if operation == "print_pdf" and self._worker is worker:
                    # Some print drivers tear down LibreOffice's UNO bridge after the job.
                    # A fresh helper is cheap compared with risking a second/spurious print.
                    self._stop_locked()

    def shutdown(self) -> None:
        self._shutdown_requested.set()
        # Wait briefly for an in-progress prepare/conversion to publish its
        # worker, then stop it directly if the manager lock is still occupied.
        # This lets window close interrupt long conversions without racing past
        # a helper that is just being spawned.
        acquired = self._lock.acquire(timeout=1.0)
        if acquired:
            try:
                self._stop_locked()
            finally:
                self._lock.release()
            return
        worker = self._worker
        self._worker = None
        if worker:
            worker.stop(grace_seconds=0.5)


_PERSISTENT_SOFFICE = _PersistentSofficeManager()


class DocumentEngineError(Exception):
    pass


_CSV_DELIMITER_CODES = {",": 44, ";": 59, "\t": 9}
_CSV_UTF8_CODE = 76
_CSV_CP1258_CODE = 40
_CSV_SAMPLE_BYTES = 64 * 1024


_CSV_VN_LANG = 1066
_CSV_EN_LANG = 1033
_CSV_DESCRIPTION_MAX_FIELDS = 3


def _detect_csv_import_options(src_path: str) -> tuple[str, str]:
    """Detect delimiter/encoding and return (encoding name, LO FilterOptions).

    UTF-8 is validated strictly (with or without BOM). Files that are not valid
    UTF-8 use Windows-1258, the ANSI code page used by Vietnamese Windows/Excel.

    The delimiter is detected by counting field splits across many lines (not just
    the first few), which avoids mis-detection when description/blank rows precede
    the real header.  The language code is set to English (1033) when US-style
    decimal numbers are detected (e.g. ``1234.56`` or ``1,234.56``), so
    LibreOffice recognises the dot as a decimal separator instead of a thousands
    separator.
    """
    try:
        with open(src_path, "rb") as csv_file:
            sample_bytes = csv_file.read(_CSV_SAMPLE_BYTES)
    except OSError as exc:
        raise DocumentEngineError(f"Không đọc được tệp CSV: {exc}") from exc

    if sample_bytes.startswith(b"\xef\xbb\xbf"):
        encoding = "utf-8-sig"
        charset_code = _CSV_UTF8_CODE
    else:
        try:
            sample_bytes.decode("utf-8", errors="strict")
            encoding = "utf-8"
            charset_code = _CSV_UTF8_CODE
        except UnicodeDecodeError:
            encoding = "cp1258"
            charset_code = _CSV_CP1258_CODE

    try:
        sample_text = sample_bytes.decode(encoding, errors="strict")
    except UnicodeDecodeError as exc:
        raise DocumentEngineError(
            "Tệp CSV không phải UTF-8 hợp lệ và cũng không giải mã được bằng Windows-1258."
        ) from exc

    # --- delimiter detection -------------------------------------------------
    # Take many non-empty lines so that leading description/blank rows do not
    # skew the detection.  Then pick the delimiter that produces the highest
    # *consistent* field count (mode), falling back to csv.Sniffer as a last
    # resort.
    nonempty_lines = [line for line in sample_text.splitlines() if line.strip()][:200]
    delimiter = ","

    if nonempty_lines:
        best_delim = ","
        best_score = 0
        for delim in (",", ";", "\t"):
            counts = [len(line.split(delim)) for line in nonempty_lines]
            if not counts:
                continue
            mode_count = Counter(counts).most_common(1)[0][1]
            max_fields = max(counts)
            # Require at least 2 fields in the majority of lines to be useful.
            if mode_count > best_score and max_fields >= 2:
                best_score = mode_count
                best_delim = delim
        if best_score > 0:
            delimiter = best_delim
        else:
            # Fallback: single-column or malformed – let Sniffer have a try.
            try:
                delimiter = csv.Sniffer().sniff(
                    "\n".join(nonempty_lines[:50]), delimiters=",;\t"
                ).delimiter
            except csv.Error:
                delimiter = ","

    # --- number format / language detection ----------------------------------
    # If the data contains US-style decimal numbers (e.g. 1234.56 or 1,234.56)
    # without VN-style digit-dot grouping (1.234), switch the language to
    # English so that LibreOffice interprets the dot as a decimal separator.
    lang_code = _CSV_VN_LANG
    if _looks_like_us_numbers(sample_text, delimiter):
        lang_code = _CSV_EN_LANG

    # LibreOffice CSV import tokens: field separator, text delimiter, charset,
    # first row, column formats, language, quoted-as-text, detect numbers.
    filter_options = (
        f"{_CSV_DELIMITER_CODES[delimiter]},34,{charset_code},1,,{lang_code},false,true"
    )
    return encoding, filter_options


def _looks_like_us_numbers(text: str, delimiter: str) -> bool:
    """Return True when the text likely contains US-style decimal numbers.

    US style: ``1234.56`` or ``1,234.56`` (comma = thousands, dot = decimal).
    VN style: ``1.234,56`` (dot = thousands, comma = decimal).
    """
    # US thousands+decimal: 1,234.56 — comma must be followed by exactly 3
    # digits so that short ambiguous fragments (12,34) are excluded.
    us_grouped_re = re.compile(r"[-+]?\d{1,3}(?:,\d{3})+\.\d+")
    # VN grouped: 1.234 or 1.234,56 — three digits after each dot.
    vn_grouped_re = re.compile(r"[-+]?\d{1,3}(?:\.\d{3})+(?:,\d+)?")
    us_count = len(us_grouped_re.findall(text))
    vn_count = len(vn_grouped_re.findall(text))
    # Simple US decimals like 1234.56 (no thousands separator) — only count
    # when there is no VN-style grouping in the file at all.
    if vn_count == 0:
        simple_us_re = re.compile(r"(?:^|(?<=" + re.escape(delimiter) + r"))[-+]?\d+\.\d+(?=" + re.escape(delimiter) + r"|$)")
        us_count += len(simple_us_re.findall(text))
    return us_count > vn_count


def _profile_uri(app_kind: str | None = None) -> str:
    """Return the LibreOffice profile dedicated to this desktop app kind."""
    profile_kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
    profile_dir = _user_data_dir() / f"lo-profile-{profile_kind}"
    profile_dir.mkdir(parents=True, exist_ok=True)
    return profile_dir.as_uri()


def _run_soffice_convert(src_path: str, target_ext: str, out_dir: str, app_kind: str | None = None) -> str:
    """Chạy LibreOffice headless để chuyển đổi thật một tệp. Trả về đường dẫn tệp kết quả."""
    started_at = time.monotonic()

    def report_conversion_failure(error_type: str, message: str) -> None:
        if _ERROR_REPORTER is None:
            return
        event_id = _ERROR_REPORTER.record_error(
            error_type=error_type,
            message=message,
            operation=f"convert.{target_ext}",
            file_path=src_path,
            duration_ms=(time.monotonic() - started_at) * 1000,
            app_kind=app_kind,
        )
        if event_id and getattr(_ERROR_REPORT_CONTEXT, "active", False):
            _ERROR_REPORT_CONTEXT.failure_reported = True

    if not SOFFICE_PATH:
        error = DocumentEngineError(
            "Không tìm thấy LibreOffice engine (soffice). Vui lòng cài đặt LibreOffice "
            "hoặc đặt biến môi trường VNOFFICE_SOFFICE_PATH trỏ tới soffice."
        )
        report_conversion_failure(type(error).__name__, str(error))
        raise error

    if target_ext == "pdf" and app_kind:
        if app_kind == "sheet":
            filter_name = "calc_pdf_Export"
        elif app_kind == "slides":
            filter_name = "impress_pdf_Export"
        else:
            filter_name = "writer_pdf_Export"
    else:
        filter_name = FORMAT_FILTERS.get(target_ext)

    convert_to = f"{target_ext}:{filter_name}" if filter_name else target_ext

    cmd = [
        SOFFICE_PATH,
        "--headless",
        "--invisible",
        "--nocrashreport",
        "--nodefault",
        "--nolockcheck",
        "--nologo",
        "--norestore",
        f"-env:UserInstallation={_profile_uri(app_kind)}",
    ]

    input_filter = None
    csv_filter_options = None
    if Path(src_path).suffix.lower() == ".csv":
        _, csv_filter_options = _detect_csv_import_options(src_path)
        input_filter = "Text - txt - csv (StarCalc)"
        cmd.extend([
            f"--infilter={input_filter}:{csv_filter_options}",
        ])

    cmd.extend([
        "--convert-to",
        convert_to,
        "--outdir",
        out_dir,
        src_path,
    ])

    out_path = Path(out_dir) / f"{Path(src_path).stem}.{target_ext}"

    def finalize_output(output_path: str | Path) -> str:
        if app_kind == "sheet" and target_ext == "fods":
            try:
                with open(output_path, "r", encoding="utf-8", errors="replace") as handle:
                    fods_xml = handle.read()
                canonical = _ooxml_zip_patch().canonicalize_fods_style_names(fods_xml)
                if canonical != fods_xml:
                    with open(output_path, "w", encoding="utf-8", newline="") as handle:
                        handle.write(canonical)
            except Exception as exc:
                raise DocumentEngineError(
                    f"KhÃ´ng chuáº©n hÃ³a Ä‘Æ°á»£c style FODS sau khi má»Ÿ: {exc}"
                ) from exc
        return str(output_path)

    # Reuse UNO only for the open-import pairs whose output was compared with
    # the existing CLI path. Other import/export filters keep the proven CLI.
    source_ext = Path(src_path).suffix.lower()
    persistent_pair_is_validated = (
        (app_kind == "writer" and target_ext == "html" and source_ext == ".docx")
        or (app_kind == "writer" and target_ext == "docx" and source_ext == ".doc")
        or (app_kind == "sheet" and target_ext == "fods" and source_ext in {".xlsx", ".xls"})
    )
    use_persistent_worker = (
        _PERSISTENT_SOFFICE_ENABLED
        and persistent_pair_is_validated
        and not out_path.exists()
    )
    with _convert_lock:
        if _PERSISTENT_SOFFICE_ENABLED and not use_persistent_worker:
            # A persistent instance holds the profile lock. Preserve the old
            # CLI path for unvalidated open/save/export filters without
            # contending with the helper using that same user profile.
            _PERSISTENT_SOFFICE.release_for_cli_fallback(app_kind)
        if use_persistent_worker:
            try:
                persistent_path = _PERSISTENT_SOFFICE.convert(
                    app_kind,
                    src_path,
                    str(out_path),
                    filter_name,
                    input_filter,
                    csv_filter_options,
                )
                if Path(persistent_path).is_file():
                    return finalize_output(persistent_path)
                raise _PersistentSofficeTransportError("UNO helper did not create its output file.")
            except Exception as exc:
                _open_perf_log("uno_fallback_to_convert_to", app=app_kind or "shared", error=str(exc)[:180])
                # The output path was absent before UNO was called, so a partial
                # file here belongs only to the failed helper attempt.
                try:
                    out_path.unlink(missing_ok=True)
                except OSError:
                    pass

        # LibreOffice CLI remains the source of truth if UNO is missing, crashes,
        # times out, or rejects a filter/document.
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=120, check=False
            )
        except subprocess.TimeoutExpired as exc:
            error = DocumentEngineError("Hết thời gian chờ khi chuyển đổi tài liệu.")
            report_conversion_failure("SofficeTimeout", str(error))
            raise error from exc

    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()[:500]
        message = f"LibreOffice báo lỗi khi chuyển đổi: {detail or 'không rõ nguyên nhân'}"
        report_conversion_failure("SofficeExitError", message)
        raise DocumentEngineError(message)

    if not out_path.is_file():
        detail = (result.stdout or "").strip()[:500]
        message = f"Không tạo được tệp đầu ra. Chi tiết: {detail or 'không rõ'}"
        report_conversion_failure("SofficeOutputMissing", message)
        raise DocumentEngineError(message)

    return finalize_output(out_path)


_OOXML_ZIP_PATCH = None


def _ooxml_zip_patch():
    """Load adapters/libreoffice/common/ooxml_zip_patch.py without making adapters a package."""
    global _OOXML_ZIP_PATCH
    if _OOXML_ZIP_PATCH is None:
        module_path = os.path.join(ROOT_DIR, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
        spec = importlib.util.spec_from_file_location("vno_ooxml_zip_patch", module_path)
        if spec is None or spec.loader is None:
            raise DocumentEngineError("Không tải được module hậu-kỳ OOXML.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _OOXML_ZIP_PATCH = module
    return _OOXML_ZIP_PATCH


def _apply_native_export_postprocess(
    src_path: str,
    out_path: str,
    app_kind: str | None,
    target_format: str,
    source_path: str | None = None,
    *,
    pristine_docx_source: bool | None = None,
) -> None:
    """Patch native OOXML that LibreOffice omitted, after soffice convert.

    Why here (main.py), not the JS adapters: File → Lưu serializes FODS/FODP in
    JS, then this process converts and writes the dest path. The JS adapter
    never receives XLSX/PPTX bytes. The post-process must run on the converted
    ZIP before shutil.copyfile.

    Sheet XLSX: FODS already has table:structure-protected. LibreOffice writes
    <workbookProtection lockWindows="false"/> but not lockStructure="1".
    Excel's Protect Workbook structure lock IS that standard attribute — not a
    custom namespace. We add it in-place on the existing element.

    Slides PPTX: FODP already has the master-page logo (vno:master-theme +
    draw:frame), named sections (vno:section-* on draw:page), and Set Up
    Show flags (presentation:endless + vno:without-narration /
    vno:pointer-color). LibreOffice drops the logo, does not emit
    p14:sectionLst, and writes p:showPr in ppt/presProps.xml with
    showNarration="1" and no p:penClr. PowerPoint's slots are a p:sp
    without p:ph on slideMaster1.xml, p:extLst/p14:sectionLst in
    ppt/presentation.xml, and CT_ShowProperties on presentationPr.
    """
    fmt = str(target_format).lower()
    if pristine_docx_source is None:
        pristine_docx_source = bool(
            source_path and Path(source_path).suffix.lower() == ".docx"
        )
    if app_kind == "sheet" and fmt == "xlsx":
        if not src_path or not str(src_path).lower().endswith(".fods"):
            return
        try:
            with open(src_path, "r", encoding="utf-8", errors="replace") as handle:
                fods = handle.read()
            patcher = _ooxml_zip_patch()
            # LƯU Ý: KHÔNG early-return khi thiếu structure-protected — trường
            # hợp đó chỉ tắt phần lockStructure; postprocess_sheet_xlsx() còn
            # tự kiểm tra Freeze Panes ĐỘC LẬP (vno:frozen-rows/cols), việc
            # nào cũng phổ biến hơn nhiều so với khóa cấu trúc workbook. Luôn
            # gọi và để hàm tự quyết định không cần vá gì (trả về bytes y hệt).
            with open(out_path, "rb") as handle:
                original = handle.read()
            # Read original XLSX for font/column width restoration
            source_xlsx_bytes = None
            if source_path and os.path.isfile(source_path) and source_path.lower().endswith(".xlsx"):
                with open(source_path, "rb") as handle:
                    source_xlsx_bytes = handle.read()
            # Read source FODS for activeTab preservation
            if source_xlsx_bytes is not None and "<!-- vno-pristine-xlsx-source -->" in fods:
                # An untouched imported XLSX is the exact Save-pipeline source
                # after conversion. Restore its package so formatting-only
                # blank ranges and other Excel-native print state survive.
                patched = source_xlsx_bytes
            else:
                patched = patcher.postprocess_sheet_xlsx(
                    original, source_fods=fods, source_xlsx_bytes=source_xlsx_bytes,
                )
            if patched != original:
                with open(out_path, "wb") as handle:
                    handle.write(patched)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(
                f"Không bổ sung được khóa cấu trúc workbook vào XLSX: {exc}"
            ) from exc
        return
    if app_kind == "slides" and fmt == "pptx":
        if not src_path or not str(src_path).lower().endswith(".fodp"):
            return
        try:
            with open(src_path, "r", encoding="utf-8", errors="replace") as handle:
                fodp = handle.read()
            patcher = _ooxml_zip_patch()
            # Không còn early-return khi thiếu logo/sections/show-setup: soffice
            # --convert-to pptx BỎ QUA style:page-layout-properties của FODP và
            # luôn tự ghi <p:sldSz> mặc định 28cm x 15.75cm - postprocess_slides_pptx
            # giờ LUÔN cần được gọi để có cơ hội khôi phục khổ trang thật, kể cả
            # khi tài liệu không dùng logo/sections/show-setup nào (trường hợp
            # phổ biến nhất). Bản thân postprocess_slides_pptx đã tự kiểm tra và
            # trả về nguyên bytes gốc nếu thực sự không cần sửa gì.
            with open(out_path, "rb") as handle:
                original = handle.read()
            patched = patcher.postprocess_slides_pptx(original, source_fodp=fodp)
            if patched != original:
                with open(out_path, "wb") as handle:
                    handle.write(patched)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(
                f"Không bổ sung được thuộc tính native PPTX (khổ trang / logo / Sections / Set Up Show): {exc}"
            ) from exc
    if app_kind == "writer" and fmt == "docx":
        try:
            with open(out_path, "rb") as handle:
                converted_docx = handle.read()
            patcher = _ooxml_zip_patch()
            source_html = None
            if src_path and str(src_path).lower().endswith(".html"):
                with open(src_path, "r", encoding="utf-8", errors="replace") as handle:
                    source_html = handle.read()
            patched = patcher.postprocess_created_writer_docx(converted_docx, source_html=source_html)
            if source_path and os.path.isfile(source_path):
                if Path(source_path).suffix.lower() == ".doc":
                    source_dir = os.path.join(os.path.dirname(out_path), "legacy_source")
                    os.makedirs(source_dir, exist_ok=True)
                    source_docx_path = _run_soffice_convert(source_path, "docx", source_dir, app_kind="writer")
                    with open(source_docx_path, "rb") as handle:
                        original_docx = handle.read()
                else:
                    with open(source_path, "rb") as handle:
                        original_docx = handle.read()
                patched = patcher.postprocess_writer_docx(
                    patched,
                    source_docx=original_docx,
                    preserve_pristine_source=pristine_docx_source,
                )
            if source_html:
                patched = patcher.postprocess_writer_section_metadata(
                    patched,
                    source_html=source_html,
                    source_docx=original_docx if source_path and os.path.isfile(source_path) else None,
                )
            if patched != converted_docx:
                with open(out_path, "wb") as handle:
                    handle.write(patched)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(
                f"Không khôi phục được section/header/footer cho DOCX: {exc}"
            ) from exc


# Bật lại 29/9/2026 (agy): đã khắc phục lỗi LibreOffice MS Word 97 filter xuất tệp .doc hỏng
# bằng cách làm phẳng <mc:AlternateContent> về <mc:Fallback> VML trước khi gọi LibreOffice xuất .doc.
WRITER_DOC_EXPORT_VIA_DOCX = True


def _convert_writer_html_to_doc(src_html: str, out_dir: str, source_path: str | None = None) -> str:
    """Export Writer HTML through the source-aware DOCX overlay before legacy DOC."""
    intermediate_docx = _run_soffice_convert(src_html, "docx", out_dir, app_kind="writer")
    pristine_docx_source = bool(
        source_path and Path(source_path).suffix.lower() == ".docx"
    )
    source_docx = source_path
    if source_path and os.path.isfile(source_path) and Path(source_path).suffix.lower() == ".doc":
        source_dir = os.path.join(out_dir, "legacy_source")
        os.makedirs(source_dir, exist_ok=True)
        source_docx = _run_soffice_convert(source_path, "docx", source_dir, app_kind="writer")
    _apply_native_export_postprocess(
        src_html,
        intermediate_docx,
        "writer",
        "docx",
        source_path=source_docx,
        pristine_docx_source=pristine_docx_source,
    )
    if os.path.isfile(intermediate_docx):
        patcher = _ooxml_zip_patch()
        with open(intermediate_docx, "rb") as handle:
            raw_intermediate = handle.read()
        prepared_intermediate = patcher.prepare_writer_docx_for_legacy_doc_export(raw_intermediate)
        if prepared_intermediate != raw_intermediate:
            with open(intermediate_docx, "wb") as handle:
                handle.write(prepared_intermediate)
    return _run_soffice_convert(intermediate_docx, "doc", out_dir, app_kind="writer")


def _read_xlsx_workbook_xml(src_path: str) -> str | None:
    """Read xl/workbook.xml from the original .xlsx via the shared ZIP helper.

    Writer's File → Mở forwards word/document.xml as ooxmlDocumentXml. Sheet
    does the same for workbook.xml so the adapter can overlay lockStructure
    if the FODS path missed it. Missing/corrupt packages return None so
    File → Mở still loads the soffice FODS body.
    """
    if not src_path or not str(src_path).lower().endswith(".xlsx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "xl/workbook.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _read_pptx_presentation_xml(src_path: str) -> str | None:
    """Read ppt/presentation.xml from the original .pptx via the shared ZIP helper.

    Sheet forwards xl/workbook.xml as ooxmlWorkbookXml. Slides does the same
    for presentation.xml so the adapter can overlay p14:sectionLst if the
    FODP path missed it. Missing/corrupt packages return None so File → Mở
    still loads the soffice FODP body when overlay already ran in Python.
    """
    if not src_path or not str(src_path).lower().endswith(".pptx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "ppt/presentation.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _read_pptx_slide_master_xml(src_path: str) -> str | None:
    """Read ppt/slideMasters/slideMaster1.xml from the original .pptx.

    File → Mở already overlays vno:master-theme in Python. The adapter still
    receives the original master XML so loadFromFodp can overlay again
    (belt-and-suspenders, same pattern as ooxmlPresentationXml).
    """
    if not src_path or not str(src_path).lower().endswith(".pptx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "ppt/slideMasters/slideMaster1.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _read_pptx_pres_props_xml(src_path: str) -> str | None:
    """Read ppt/presProps.xml from the original .pptx.

    File → Mở already overlays vno:without-narration / vno:pointer-color in
    Python. The adapter still receives the original presProps so loadFromFodp
    can overlay again (belt-and-suspenders).
    """
    if not src_path or not str(src_path).lower().endswith(".pptx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "ppt/presProps.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _apply_native_import_overlay(
    src_path: str,
    fods: str,
    app_kind: str | None,
    source_bytes: bytes | None = None,
    *,
    skip_initial_xf: bool = False,
) -> str:
    """After soffice convert, restore native flags LibreOffice dropped.

    Sheet XLSX: lockStructure → table:structure-protected. Failures return
    the original FODS so open still succeeds (optional UI lock).

    Slides PPTX: p14:sectionLst → vno:section-* on draw:page,
    VNOfficeMasterLogo → vno:master-theme on style:master-page, and
    p:showPr showNarration=0 / p:penClr → vno:without-narration /
    vno:pointer-color on presentation:settings (not @loop). Count
    mismatch / ambiguous logo shapes raise DocumentEngineError — never guess.
    """
    if app_kind == "sheet":
        if not src_path or not str(src_path).lower().endswith(".xlsx"):
            return fods
        try:
            original = source_bytes
            if original is None:
                with open(src_path, "rb") as handle:
                    original = handle.read()
            return _ooxml_zip_patch().overlay_sheet_xlsx_fods(
                original,
                fods,
                skip_initial_xf=skip_initial_xf or _sheet_open_skip_initial_xf_enabled(),
            )
        except Exception:
            return fods
    if app_kind == "slides":
        if not src_path or not str(src_path).lower().endswith(".pptx"):
            return fods
        try:
            with open(src_path, "rb") as handle:
                original = handle.read()
            return _ooxml_zip_patch().overlay_slides_pptx_fodp(original, fods)
        except DocumentEngineError:
            raise
        except ValueError as exc:
            raise DocumentEngineError(str(exc)) from exc
        except Exception as exc:
            raise DocumentEngineError(
                f"Không khôi phục được thuộc tính native PPTX (logo / Sections / Set Up Show) từ PPTX gốc: {exc}"
            ) from exc
    return fods


def _sheet_open_skip_initial_xf_enabled() -> bool:
    """Return the explicit opt-in for skipping the redundant first XF overlay.

    The default remains off until the phase-1 fidelity and regression gates pass.
    """
    value = os.environ.get("SHEET_OPEN_SKIP_INITIAL_XF", "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _sheet_open_payload_enabled() -> bool:
    """Use the compact Sheet XLSX payload only when its audit gate is opted into."""
    value = os.environ.get("SHEET_OPEN_PAYLOAD", "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _optimize_fods_for_sheet(fods_xml: str) -> str:
    """Optimize FODS for Sheet: merge repeated empty cells, trim style-only tail.
    
    Delegates to the shared implementation in ooxml_zip_patch.
    """
    return _ooxml_zip_patch().optimize_fods_streaming(fods_xml)


_IMG_TAG_RE = re.compile(r"<img\b([^>]*?)(\s*/?)>", re.IGNORECASE)
_SRC_ATTR_RE = re.compile(r"""\bsrc=["']([^"']+)["']""", re.IGNORECASE)
_SRC_ATTR_REPLACE_RE = re.compile(r"""\bsrc=["'][^"']*["']""", re.IGNORECASE)


def _probe_pixel_dimensions(raw: bytes, ext: str) -> tuple[int, int] | None:
    """Đọc kích thước pixel THẬT từ bytes ảnh (không tin cậy thuộc tính HTML
    width/height, có thể bị soffice ghi lệch tỷ lệ). Chỉ hỗ trợ GIF/PNG —
    đủ cho mục đích lọc hairline bên dưới; định dạng khác trả về None (an
    toàn, không đoán)."""
    if ext == ".gif" and len(raw) >= 10 and raw[:6] in (b"GIF87a", b"GIF89a"):
        width = raw[6] | (raw[7] << 8)
        height = raw[8] | (raw[9] << 8)
        return (width, height)
    if ext == ".png" and len(raw) >= 24 and raw[:8] == b"\x89PNG\r\n\x1a\n":
        width = int.from_bytes(raw[16:20], "big")
        height = int.from_bytes(raw[20:24], "big")
        return (width, height)
    return None


def _is_decorative_hairline_image(raw: bytes, ext: str) -> bool:
    """Loi that phat hien qua file .docx that ("1. QD thanh lap TO MUA
    SAM.docx"): LibreOffice StarWriter HTML xuat hinh ve duong ke ngang
    trang tri (Word "Insert Shapes" -> duong thang mong) thanh anh GIF
    THAT SU 1px cao (vi du 126x1, 203x1) voi align="left", va vi tri anh
    trong luong HTML giu nguyen dung vi tri ky tu trong van ban goc - CO
    THE nam GIUA mot tu (vi du "P<img...>HONG" thay vi "PHONG"). Anh noi
    (float) 1px lam vo bo cuc dong chu, tao khoang trang/ngat tu nhin
    thay duoc, trong khi ban than duong ke nay khong mang thong tin gi
    (thuan tuy trang tri, thuong khong con nhin thay duoc trong ngu canh
    HTML). Danh cho: chieu cao (hoac chieu rong) <=2px VA chieu con lai
    >=10px (hinh dang duong ke, khong phai icon nho that su)."""
    dims = _probe_pixel_dimensions(raw, ext)
    if not dims:
        return False
    width, height = dims
    return (height <= 2 and width >= 10) or (width <= 2 and height >= 10)


def _inline_html_images(html_text: str, html_path: str) -> str:
    """Replace <img src> sidecar files with data URIs while the convert temp dir still exists.

    LibreOffice HTML (StarWriter) writes images as files next to the .html (not data URIs).
    open_document_dialog() must inline those bytes before TemporaryDirectory deletes them.
    Missing files (http/https, already-gone sidecars) leave the original tag unchanged.
    """
    if not html_text:
        return html_text or ""
    html_dir = os.path.dirname(html_path or "")

    def replace_tag(match: re.Match) -> str:
        original = match.group(0)
        attrs = match.group(1)
        src_match = _SRC_ATTR_RE.search(attrs)
        if not src_match:
            return original
        src = src_match.group(1)
        if re.match(r"^data:", src, re.IGNORECASE):
            return f"<img{attrs}>"
        # Loi that phat hien qua file .docx that co dau tieng Viet/khoang trang
        # trong ten: LibreOffice StarWriter HTML ghi src bi URL-encode
        # (vi du "h%E1%BB%A3p%20..."), truoc day chi html.unescape() ma
        # QUEN unquote() nen os.path.isfile() luon False -> anh vo vinh vien.
        decoded = unquote(html.unescape(src))
        candidates = [
            os.path.join(html_dir, decoded),
            re.sub(r"^/([A-Za-z]:)", r"\1", decoded),
            re.sub(r"^file:///", "", decoded, flags=re.IGNORECASE),
        ]
        file_path = next(
            (candidate for candidate in candidates if candidate and os.path.isfile(candidate)),
            None,
        )
        if not file_path:
            return f"<img{attrs}>"
        try:
            with open(file_path, "rb") as image_file:
                raw = image_file.read()
        except OSError:
            return original
        ext = os.path.splitext(file_path)[1].lower()
        if _is_decorative_hairline_image(raw, ext):
            # Duong ke trang tri 1px that su (xac nhan qua pixel that, khong
            # phai thuoc tinh HTML) - bo qua hoan toan thay vi nhung, vi
            # align="left" cua no co the roi giua mot tu trong van ban va
            # lam vo dong chu nhin thay duoc (xem _is_decorative_hairline_image).
            return ""
        encoded = base64.b64encode(raw).decode("ascii")
        if ext in (".jpg", ".jpeg"):
            mime = "image/jpeg"
        elif ext == ".gif":
            mime = "image/gif"
        else:
            mime = "image/png"
        data_uri = f"data:{mime};base64,{encoded}"
        next_attrs = _SRC_ATTR_REPLACE_RE.sub(f'src="{data_uri}"', attrs, count=1)
        return f"<img{next_attrs}>"

    return _IMG_TAG_RE.sub(replace_tag, html_text)


OPEN_FILE_TYPES = {
    "writer": ("Tài liệu Word (*.docx;*.doc;*.odt;*.rtf;*.txt)", "Tất cả tệp (*.*)"),
    "sheet": ("Bảng tính Excel (*.xlsx;*.xls;*.ods;*.csv;*.tsv)", "Tất cả tệp (*.*)"),
    "slides": ("Bản trình chiếu PowerPoint (*.pptx;*.ppt;*.odp)", "Tất cả tệp (*.*)"),
}

DEFAULT_SAVE_FORMAT = {
    "writer": "docx",
    "sheet": "xlsx",
    "slides": "pptx",
}

SAVE_FILE_TYPES = {
    "writer": (
        "Tài liệu Word (*.docx)",
        "Văn bản Word 97-2003 (*.doc)",
        "Tài liệu ODF (*.odt)",
        "Định dạng Rich Text (*.rtf)",
        "Văn bản thuần (*.txt)",
        "Tài liệu PDF (*.pdf)",
        "Tất cả tệp (*.*)",
    ),
    "sheet": (
        "Bảng tính Excel (*.xlsx)",
        "Bảng tính Excel 97-2003 (*.xls)",
        "Bảng tính ODF (*.ods)",
        "Văn bản phân tách dấu phẩy (*.csv)",
        "Tài liệu PDF (*.pdf)",
        "Tất cả tệp (*.*)",
    ),
    "slides": (
        "Bản trình chiếu PowerPoint (*.pptx)",
        "Bản trình chiếu PowerPoint 97-2003 (*.ppt)",
        "Bản trình chiếu ODF (*.odp)",
        "Tài liệu PDF (*.pdf)",
        "Tất cả tệp (*.*)",
    ),
}


def _save_file_types_for_format(app_kind: str | None, current_ext: str | None) -> tuple[str, ...]:
    """Save As filters with the current document format selected first (as Office does)."""
    file_types = SAVE_FILE_TYPES.get(app_kind, ("Tất cả tệp (*.*)",))
    marker = f"(*.{(current_ext or '').lower()})"
    current = [item for item in file_types if item.lower().endswith(marker)]
    if not current:
        return file_types
    return tuple(current + [item for item in file_types if item not in current])


def _fods_sheet_count(fods: str | None) -> int:
    """Count sheet table elements without parsing the potentially large FODS payload."""
    return len(re.findall(r"<table:table(?=[\s>])", str(fods or ""), re.IGNORECASE))


def _infer_save_format_from_path(file_path: str, app_kind: str | None = None) -> tuple[str, str]:
    """Suy luận định dạng đích và chuẩn hóa đường dẫn tệp.
    Trả về (đường_dẫn_chuẩn_hóa, định_dạng_viết_thường).
    Nếu đường dẫn chưa có phần mở rộng, tự động bổ sung phần mở rộng mặc định.
    """
    path_obj = Path(file_path)
    suffix = path_obj.suffix.lower()
    default_ext = DEFAULT_SAVE_FORMAT.get(app_kind, "docx")

    if not suffix:
        resolved_path = f"{file_path}.{default_ext}"
        return resolved_path, default_ext

    ext = suffix.lstrip(".")
    if ext in FORMAT_FILTERS or ext in {"doc", "xls", "rtf", "txt", "docx", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "pdf", "csv"}:
        return file_path, ext

    return file_path, default_ext


def _sheet_fods_for_export(fods: str, target_format: str | None) -> str:
    """Adjust the FODS the app sent before LibreOffice exports it.

    Excel 97-2003 (.xls) cannot carry the VND() add-in call through LibreOffice — it
    becomes a #N/A formula and the amount-in-words text is lost. Keep the text as a
    value there (Excel shows the same words); .xlsx keeps the formula (see
    postprocess_sheet_xlsx).
    """
    if (target_format or "").lower() != "xls" or "VND" not in (fods or "").upper():
        return fods
    return _ooxml_zip_patch().fods_vnd_cells_as_text(fods)


_PRINT_NATIVE_FORMAT = {"writer": "docx", "sheet": "xlsx", "slides": "pptx"}


def _write_save_source(content: str, app_kind: str, temp_dir: str, target_format: str) -> str:
    """Write the same interchange file that the native Save pipeline consumes."""
    suffix = {"writer": "html", "sheet": "fods", "slides": "fodp"}.get(app_kind)
    if not suffix:
        raise ValueError(f"Loại ứng dụng không hợp lệ: {app_kind}")
    source_path = os.path.join(temp_dir, f"draft.{suffix}")
    if app_kind == "writer":
        source = f"<html><head><meta charset='utf-8'></head><body>{content}</body></html>"
    elif app_kind == "sheet":
        source = _sheet_fods_for_export(content, target_format)
    else:
        source = content
    with open(source_path, "w", encoding="utf-8") as source_file:
        source_file.write(source)
    return source_path


def _convert_save_source_to_native(
    source_path: str,
    app_kind: str,
    target_format: str,
    source_document_path: str | None = None,
) -> str:
    """Run the Save conversion and native-format postprocessing shared by all save routes.

    save_document_in_place, save_document_dialog, Export PDF and Print all call
    this one function, so what is printed is exactly what Save writes to disk
    (ROADMAP-V1 3b: display, save and print come from the same conversion).
    ``source_document_path`` is the opened .docx/.xlsx (or legacy .doc, which
    the postprocess converts to its intermediate .docx) whose OOXML
    adapters/libreoffice/common/ooxml_zip_patch.py restores.
    """
    if app_kind == "writer" and target_format == "doc" and WRITER_DOC_EXPORT_VIA_DOCX:
        return _convert_writer_html_to_doc(source_path, os.path.dirname(source_path), source_path=source_document_path)
    out_path = _run_soffice_convert(source_path, target_format, os.path.dirname(source_path), app_kind=app_kind)
    _apply_native_export_postprocess(
        source_path, out_path, app_kind, target_format, source_path=source_document_path,
    )
    return out_path


def _write_print_source(
    content: str,
    app_kind: str,
    temp_dir: str,
    source_document_path: str | None = None,
    print_options: dict | None = None,
) -> str:
    """Build the print source through the same source-aware Save path as its native format."""
    target_format = _PRINT_NATIVE_FORMAT.get(app_kind)
    if not target_format:
        raise ValueError(f"Loại ứng dụng không hợp lệ: {app_kind}")
    interchange_path = _write_save_source(content, app_kind, temp_dir, target_format)
    native_path = _convert_save_source_to_native(
        interchange_path, app_kind, target_format, source_document_path=source_document_path,
    )
    if app_kind == "sheet" and target_format == "xlsx":
        try:
            options = print_options if isinstance(print_options, dict) else {}
            print_scope = str(options.get("sheetScope") or "active").strip().casefold()
            if print_scope not in {"active", "workbook", "selection"}:
                raise DocumentEngineError("Phạm vi in sổ làm việc không hợp lệ.")
            fods = Path(interchange_path).read_text(encoding="utf-8", errors="replace")
            source_bytes = None
            if source_document_path and str(source_document_path).lower().endswith(".xlsx"):
                source_path = Path(source_document_path)
                if source_path.is_file():
                    source_bytes = source_path.read_bytes()
            patcher = _ooxml_zip_patch()
            active_sheet = patcher.parse_active_sheet_from_fods(fods)
            selected_sheets = None
            if "<!-- vno-pristine-xlsx-source -->" in fods and source_bytes:
                source_workbook = patcher.read_zip_entry(source_bytes, "xl/workbook.xml") or b""
                source_active = patcher.parse_active_sheet_from_workbook(
                    source_workbook.decode("utf-8", errors="replace")
                )
                # An untouched import carries the original grouped-tab selection
                # only while the active tab still matches. If the user changed
                # tabs, print the newly active tab alone.
                if active_sheet is None or active_sheet == source_active:
                    active_sheet = active_sheet or source_active
                    selected_sheets = patcher.parse_selected_sheet_names_from_xlsx(source_bytes)
            native_bytes = Path(native_path).read_bytes()
            if print_scope == "workbook":
                scoped_bytes = patcher.make_print_scope_xlsx(
                    native_bytes,
                    active_sheet_name=active_sheet,
                    include_all_sheets=True,
                )
            elif print_scope == "selection":
                selected_ranges = options.get("selectionRanges")
                if not isinstance(selected_ranges, (list, tuple)) or not selected_ranges:
                    raise DocumentEngineError("Hãy chọn ít nhất một vùng ô trước khi in vùng chọn.")
                scoped_bytes = patcher.make_print_scope_xlsx(
                    native_bytes,
                    active_sheet_name=active_sheet,
                    selected_sheet_names=[active_sheet] if active_sheet else None,
                    print_area_ranges=selected_ranges,
                )
            else:
                scoped_bytes = patcher.make_print_scope_xlsx(
                    native_bytes,
                    active_sheet_name=active_sheet,
                    selected_sheet_names=selected_sheets,
                )
            if scoped_bytes != native_bytes:
                Path(native_path).write_bytes(scoped_bytes)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(f"3T Sheet không chuẩn bị được phạm vi in: {exc}") from exc
    return native_path


def _convert_print_source_to_pdf(source_path: str, app_kind: str, output_dir: str) -> str:
    """Convert the saved native print source to PDF with the matching LibreOffice filter."""
    return _run_soffice_convert(source_path, "pdf", output_dir, app_kind=app_kind)


def _convert_print_source_with_office(
    source_path: str, app_kind: str, output_dir: str, candidate: dict[str, str],
) -> str:
    return _OFFICE_COM_MODULE.export_pdf_with_office(
        source_path,
        app_kind,
        output_dir,
        engine_info=candidate["engine_info"],
    )


def _office_candidates_for_print(app_kind: str) -> tuple[dict[str, str], ...]:
    info = _OFFICE_COM_MODULE.get_office_engine_info(app_kind)
    if not info.get("available"):
        return ()
    return ({
        "engine": str(info["engine"]),
        "progid": str(info["progId"]),
        "engine_info": info,
    },)


def _render_print_source_to_pdf(
    source_path: str, app_kind: str, output_dir: str, *, use_office: bool = True,
) -> tuple[str, str]:
    info = _OFFICE_COM_MODULE.get_office_engine_info(app_kind)
    return _OFFICE_COM_MODULE.convert_pdf_with_office_fallback(
        source_path,
        app_kind,
        output_dir,
        _convert_print_source_to_pdf,
        use_office=use_office,
        office_info=info,
        office_exporter=lambda source, kind, out, *, engine_info=None: _OFFICE_COM_MODULE.export_pdf_with_office(
            source, kind, out, engine_info=engine_info,
        ),
    )


def _export_content_to_pdf(
    content: str,
    app_kind: str,
    temp_dir: str,
    source_document_path: str | None = None,
    *,
    use_office: bool = True,
    return_engine: bool = False,
) -> str | tuple[str, str]:
    """Export PDF only after running the source-aware native Save conversion."""
    native_path = _write_print_source(content, app_kind, temp_dir, source_document_path)
    pdf_path, engine_name = _render_print_source_to_pdf(
        native_path, app_kind, temp_dir, use_office=use_office,
    )
    return (pdf_path, engine_name) if return_engine else pdf_path


def _print_pdf_to_target_file(pdf_path: str, printer: str, destination_path: str, app_kind: str) -> dict:
    """Use LibreOffice batch print-to-file for the Microsoft PDF printer without its prompt."""
    if not SOFFICE_PATH:
        raise DocumentEngineError("Không tìm thấy LibreOffice engine để gửi lệnh in.")
    destination = Path(destination_path).expanduser().resolve()
    if destination.suffix.lower() != ".pdf":
        destination = destination.with_suffix(".pdf")
    destination.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="vnoffice_print_file_") as temp_dir:
        root = Path(temp_dir)
        source_dir = root / "source"
        output_dir = root / "output"
        source_dir.mkdir()
        output_dir.mkdir()
        source_copy = source_dir / "VNOfficePrintJob.pdf"
        shutil.copyfile(pdf_path, source_copy)

        _PERSISTENT_SOFFICE.release_for_cli_fallback(app_kind)
        command = [
            SOFFICE_PATH,
            "--headless",
            "--invisible",
            "--nocrashreport",
            "--nodefault",
            "--nolockcheck",
            "--nologo",
            "--norestore",
            f"-env:UserInstallation={_profile_uri(app_kind)}",
            "--print-to-file",
            "--printer-name",
            printer,
            "--outdir",
            str(output_dir),
            str(source_copy),
        ]
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=300,
                check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RuntimeError(f"LibreOffice không hoàn tất lệnh in: {exc}") from exc
        generated_pdf = output_dir / source_copy.name
        if completed.returncode != 0 or not generated_pdf.is_file() or generated_pdf.stat().st_size <= 0:
            detail = (completed.stderr or completed.stdout or "").strip()
            raise RuntimeError(detail or "Máy in PDF không tạo được tệp đầu ra.")
        _atomic_replace_file(str(generated_pdf), str(destination))
        _verify_saved_file(str(destination))
    return {"ok": True, "printer": printer, "output_path": str(destination)}


def _print_pdf_job(app_kind: str, pdf_path: str, printer: str, copies: int, pages: str, output_path: str | None) -> dict:
    if (
        printer.casefold() == "microsoft print to pdf"
        and output_path
        and copies == 1
        and not pages
    ):
        return _print_pdf_to_target_file(pdf_path, printer, output_path, app_kind)
    return _PERSISTENT_SOFFICE.operation(
        app_kind,
        "print_pdf",
        pdf_path=pdf_path,
        printer=printer,
        copies=copies,
        pages=pages,
    )


def _atomic_replace_file(src_temp_file: str, dest_path: str) -> None:
    """Thay thế nguyên tử tệp đích bằng tệp tạm đã được tạo và hậu kỳ thành công.
    Nếu có lỗi xảy ra trong quá trình convert hoặc ghi đè, tệp gốc không bị ảnh hưởng.
    """
    dest = Path(dest_path).resolve()

    if dest.is_file():
        # Kiểm tra quyền ghi trước để báo lỗi sớm nếu tệp có thuộc tính read-only
        if not os.access(dest, os.W_OK):
            raise DocumentEngineError(
                "Tệp đang ở chế độ chỉ đọc. Vui lòng chọn Lưu bản sao với tên khác."
            )

    dest.parent.mkdir(parents=True, exist_ok=True)

    staging_file = None
    try:
        import uuid
        staging_name = f".{dest.name}.{uuid.uuid4().hex[:8]}.vno_tmp"
        staging_path = dest.parent / staging_name
        staging_file = str(staging_path)

        shutil.copyfile(src_temp_file, staging_file)
        os.replace(staging_file, str(dest))
        staging_file = None
    except PermissionError as exc:
        raise DocumentEngineError(
            f"Không thể ghi đè tệp: tệp đang được mở bởi ứng dụng khác hoặc bị khóa ({exc}). "
            "Vui lòng đóng ứng dụng đang mở tệp hoặc chọn Lưu bản sao."
        ) from exc
    except OSError as exc:
        raise DocumentEngineError(f"Không thể ghi tệp vào đĩa: {exc}") from exc
    finally:
        if staging_file and os.path.isfile(staging_file):
            try:
                os.remove(staging_file)
            except OSError:
                pass


def _verify_saved_file(dest_path: str) -> None:
    """Catch a failed/empty atomic write before the UI reports Save as successful."""
    try:
        destination = Path(dest_path)
        if not destination.is_file() or destination.stat().st_size <= 0:
            raise DocumentEngineError("Kiểm tra sau khi lưu thất bại: tệp đầu ra rỗng hoặc không tồn tại.")
    except OSError as exc:
        raise DocumentEngineError("Kiểm tra sau khi lưu thất bại: không thể đọc tệp đầu ra.") from exc


def _read_docx_zip_entry(src_path: str, entry_name: str) -> str | None:
    """Read one XML member from a real .docx (OOXML zip).

    StarWriter HTML drops w:ins/w:del, comment ranges, and comment authors;
    the Writer adapter overlays those from word/document.xml + word/comments.xml.
    Missing/corrupt packages return None so File → Mở still loads the HTML body.
    """
    if not src_path or not str(src_path).lower().endswith(".docx"):
        return None
    if not entry_name or ".." in entry_name or entry_name.startswith(("/", "\\")):
        return None
    try:
        with zipfile.ZipFile(src_path) as package:
            return package.read(entry_name).decode("utf-8", errors="replace")
    except (OSError, zipfile.BadZipFile, KeyError, UnicodeError):
        return None


def _read_docx_document_xml(src_path: str) -> str | None:
    """Read word/document.xml (revision marks + commentRange/commentReference)."""
    return _read_docx_zip_entry(src_path, "word/document.xml")


def _read_docx_comments_xml(src_path: str) -> str | None:
    """Read word/comments.xml (comment author, date, and body)."""
    return _read_docx_zip_entry(src_path, "word/comments.xml")


def _read_docx_header_footer_xmls(src_path: str) -> tuple[str | None, str | None]:
    """Quy ước W26b: Đọc các part header/footer XML từ DOCX theo thứ tự rels của sectPr đầu (default trước, first/even sau)."""
    if not src_path or not str(src_path).lower().endswith(".docx"):
        return None, None
    try:
        with zipfile.ZipFile(src_path) as z:
            namelist = set(z.namelist())
            if "word/document.xml" not in namelist:
                return None, None
            doc_xml = z.read("word/document.xml").decode("utf-8", errors="replace")

            rels = {}
            if "word/_rels/document.xml.rels" in namelist:
                rels_xml = z.read("word/_rels/document.xml.rels").decode("utf-8", errors="replace")
                for match in re.finditer(r"<Relationship\b([^>]*?)/?>", rels_xml, re.IGNORECASE):
                    attrs = match.group(1) or ""
                    id_match = re.search(r'\bId\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                    target_match = re.search(r'\bTarget\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                    if id_match and target_match:
                        rels[id_match.group(1)] = target_match.group(1)

            sect_match = re.search(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", doc_xml, re.IGNORECASE)
            sect_xml = sect_match.group(0) if sect_match else doc_xml

            type_order = {"default": 0, "first": 1, "even": 2}

            def extract_parts(tag_name: str) -> str | None:
                pattern = rf"<w:{tag_name}Reference\b([^>]*?)(?:/\s*>|>([\s\S]*?)</w:{tag_name}Reference\s*>)"
                refs = []
                for m in re.finditer(pattern, sect_xml, re.IGNORECASE):
                    attrs_str = m.group(1) or ""
                    id_match = re.search(r'r:id\s*=\s*["\']([^"\']+)["\']', attrs_str, re.IGNORECASE)
                    type_match = re.search(r'w:type\s*=\s*["\']([^"\']+)["\']', attrs_str, re.IGNORECASE)
                    if id_match:
                        r_id = id_match.group(1)
                        w_type = (type_match.group(1) if type_match else "default").lower()
                        refs.append((type_order.get(w_type, 3), w_type, r_id))

                refs.sort(key=lambda x: x[0])

                parts = []
                used_entries = set()
                for _, _, r_id in refs:
                    target = rels.get(r_id, "")
                    if target:
                        entry = f"word/{target}" if not target.startswith(("word/", "/")) else target.lstrip("/")
                        if entry in namelist and entry not in used_entries:
                            used_entries.add(entry)
                            parts.append(z.read(entry).decode("utf-8", errors="replace"))

                if not parts:
                    prefix = f"word/{tag_name}"
                    matching_entries = sorted([n for n in namelist if n.startswith(prefix) and n.endswith(".xml")])
                    for entry in matching_entries:
                        parts.append(z.read(entry).decode("utf-8", errors="replace"))

                return "\n".join(parts) if parts else None

            header_xml = extract_parts("header")
            footer_xml = extract_parts("footer")
            return header_xml, footer_xml
    except Exception:
        return None, None


def _read_all_docx_headers_footers(src_path: str) -> tuple[str | None, str | None, dict[str, str], dict[str, str], dict[str, str]]:
    """Đọc toàn bộ các part header/footer XML và rels từ DOCX cho tất cả các section.
    Trả về: (default_header_xml, default_footer_xml, headers_dict, footers_dict, rels_dict)
    Trong đó headers_dict và footers_dict ánh xạ theo cả tên part (e.g. 'header1.xml', 'word/header1.xml') và rId.
    """
    if not src_path or not str(src_path).lower().endswith(".docx"):
        return None, None, {}, {}, {}
    try:
        with zipfile.ZipFile(src_path) as z:
            namelist = set(z.namelist())
            if "word/document.xml" not in namelist:
                return None, None, {}, {}, {}

            rels: dict[str, str] = {}
            if "word/_rels/document.xml.rels" in namelist:
                rels_xml = z.read("word/_rels/document.xml.rels").decode("utf-8", errors="replace")
                for match in re.finditer(r"<Relationship\b([^>]*?)/?>", rels_xml, re.IGNORECASE):
                    attrs = match.group(1) or ""
                    id_match = re.search(r'\bId\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                    target_match = re.search(r'\bTarget\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                    if id_match and target_match:
                        rels[id_match.group(1)] = target_match.group(1)

            headers_dict: dict[str, str] = {}
            footers_dict: dict[str, str] = {}

            for name in namelist:
                if re.match(r"word/header\d+\.xml$", name, re.IGNORECASE):
                    content = z.read(name).decode("utf-8", errors="replace")
                    headers_dict[name] = content
                    base_name = name.replace("word/", "")
                    headers_dict[base_name] = content
                elif re.match(r"word/footer\d+\.xml$", name, re.IGNORECASE):
                    content = z.read(name).decode("utf-8", errors="replace")
                    footers_dict[name] = content
                    base_name = name.replace("word/", "")
                    footers_dict[base_name] = content

            for r_id, target in rels.items():
                norm_target = target if target.startswith("word/") else f"word/{target.lstrip('/')}"
                base_target = norm_target.replace("word/", "")
                if norm_target in headers_dict:
                    headers_dict[r_id] = headers_dict[norm_target]
                elif base_target in headers_dict:
                    headers_dict[r_id] = headers_dict[base_target]
                if norm_target in footers_dict:
                    footers_dict[r_id] = footers_dict[norm_target]
                elif base_target in footers_dict:
                    footers_dict[r_id] = footers_dict[base_target]

            default_header, default_footer = _read_docx_header_footer_xmls(src_path)
            return default_header, default_footer, headers_dict, footers_dict, rels
    except Exception:
        return None, None, {}, {}, {}


def _active_window(api=None):
    """Find a window without exposing a pywebview Window object through its JS API."""
    window_uid = getattr(api, "_window_uid", None) if api is not None else None
    if window_uid:
        for window in webview.windows:
            if getattr(window, "uid", None) == window_uid:
                return window
        return None
    try:
        active = webview.active_window()
        if active is not None:
            return active
    except Exception:
        pass
    return webview.windows[0] if webview.windows else None


def _queue_single_instance_request(request: dict[str, object]) -> bool:
    """Queue a path-only launch request for a fresh, independent app window."""
    if _INSTANCE_DISPATCH_STOP.is_set():
        raise RuntimeError("The application is shutting down.")
    completion = threading.Event()
    _INSTANCE_LAUNCH_QUEUE.put_nowait((request, completion))
    # During startup, accept into the queue immediately. Once the GUI loop is
    # live, wait briefly for create_window so a hung router can be detected.
    if not _INSTANCE_DISPATCH_READY.is_set():
        return True
    if completion.wait(timeout=0.6):
        return request.get("_dispatch_ok") is True
    return False


def _ping_single_instance_router() -> bool:
    """Use the same serialized router queue as window creation for liveness."""
    if _INSTANCE_DISPATCH_STOP.is_set():
        return False
    if not _INSTANCE_DISPATCH_READY.is_set():
        return True
    completion = threading.Event()
    request: dict[str, object] = {"action": "ping"}
    _INSTANCE_LAUNCH_QUEUE.put_nowait((request, completion))
    return completion.wait(timeout=0.3) and request.get("_dispatch_ok") is True


def _dispatch_single_instance_requests() -> None:
    """Create secondary windows after pywebview's GUI loop is ready."""
    while not _INSTANCE_DISPATCH_STOP.is_set():
        try:
            request, completion = _INSTANCE_LAUNCH_QUEUE.get(timeout=0.2)
        except queue.Empty:
            continue
        if not _INSTANCE_DISPATCH_READY.wait(timeout=60):
            logging.getLogger("vnoffice.single_instance").warning(
                "A launch request expired before the desktop window loop became ready."
            )
            request["_dispatch_ok"] = False
            completion.set()
            continue
        if _INSTANCE_DISPATCH_STOP.is_set():
            request["_dispatch_ok"] = False
            completion.set()
            continue
        if request.get("action") == "ping":
            request["_dispatch_ok"] = True
            completion.set()
            continue

        app_kind = request.get("app_kind")
        file_path = request.get("path")
        with _APP_WINDOW_LOCK:
            api = next(
                (item for item in _APP_WINDOW_APIS.values() if getattr(item, "_app_kind", None) == app_kind),
                None,
            )
        if api is None:
            logging.getLogger("vnoffice.single_instance").warning(
                "Could not route a launch request because no %s window remains.", app_kind
            )
            request["_dispatch_ok"] = False
            completion.set()
            continue
        try:
            if file_path is None:
                result = api.create_new_document_window(app_kind)
            else:
                result = api.open_file_in_new_window(file_path, app_kind)
            if not isinstance(result, dict) or result.get("status") != "ok":
                logging.getLogger("vnoffice.single_instance").warning(
                    "Could not create a requested %s window.", app_kind
                )
                request["_dispatch_ok"] = False
            else:
                request["_dispatch_ok"] = True
        except Exception as exc:
            logging.getLogger("vnoffice.single_instance").warning(
                "Could not create a requested %s window (%s).", app_kind, type(exc).__name__
            )
            request["_dispatch_ok"] = False
        finally:
            completion.set()


def _on_single_instance_ownership_lost() -> None:
    """Stop a fenced old owner after another launch has taken over its endpoint."""
    logging.getLogger("vnoffice.single_instance").warning(
        "This app session lost its single-instance endpoint; preserving recovery data and exiting."
    )
    _INSTANCE_DISPATCH_STOP.set()
    with _APP_WINDOW_LOCK:
        active_apis = list(_APP_WINDOW_APIS.values())
    for api in active_apis:
        try:
            api.close_print_sessions()
        except Exception:
            pass
    try:
        _PERSISTENT_SOFFICE.shutdown()
    finally:
        os._exit(0)


def _notify_document_open_progress(api=None) -> None:
    """Tell the WebView that the user has selected a file and conversion began."""
    window = _active_window(api)
    if not window:
        return
    try:
        window.evaluate_js("window.dispatchEvent(new Event('vno:document-open-progress'))")
    except Exception:
        # Progress is supplementary; a WebView timing issue must not block open.
        pass


def _notify_sheet_open_progress(message: str, start_timing: bool = False, api=None) -> None:
    """Update the Sheet status line while the desktop bridge converts a file."""
    window = _active_window(api)
    if not window:
        return
    try:
        window.evaluate_js(
            "window.__vnoSheetOpenProgress?.("
            + json.dumps(str(message), ensure_ascii=False)
            + ","
            + ("true" if start_timing else "false")
            + ")"
        )
    except Exception:
        # Progress UI must never prevent the normal open/fallback flow.
        pass


def _extract_clipboard_html_fragment(raw: bytes) -> str:
    """Read the fragment offsets from Windows' registered ``HTML Format`` payload."""
    if not raw:
        return ""
    data = raw.rstrip(b"\x00")
    start_match = re.search(rb"(?im)^StartFragment:\s*(\d+)\s*$", data)
    end_match = re.search(rb"(?im)^EndFragment:\s*(\d+)\s*$", data)
    if start_match and end_match:
        start, end = int(start_match.group(1)), int(end_match.group(1))
        if 0 <= start <= end <= len(data):
            return data[start:end].decode("utf-8", errors="replace")
    start_marker = b"<!--StartFragment-->"
    end_marker = b"<!--EndFragment-->"
    start = data.find(start_marker)
    end = data.find(end_marker, start + len(start_marker)) if start >= 0 else -1
    if start >= 0 and end >= 0:
        return data[start + len(start_marker):end].decode("utf-8", errors="replace")
    return ""


def _read_windows_clipboard_data() -> dict[str, object]:
    """Read plain text and HTML locally from the Windows clipboard via Win32."""
    if os.name != "nt":
        return {"status": "error", "message": "Đọc bộ nhớ tạm hệ thống cần chạy 3T Office Desktop trên Windows."}

    user32 = ctypes.WinDLL("user32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    user32.OpenClipboard.argtypes = [ctypes.c_void_p]
    user32.OpenClipboard.restype = ctypes.c_int
    user32.CloseClipboard.argtypes = []
    user32.CloseClipboard.restype = ctypes.c_int
    user32.GetClipboardData.argtypes = [ctypes.c_uint]
    user32.GetClipboardData.restype = ctypes.c_void_p
    user32.RegisterClipboardFormatW.argtypes = [ctypes.c_wchar_p]
    user32.RegisterClipboardFormatW.restype = ctypes.c_uint
    kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalLock.restype = ctypes.c_void_p
    kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalUnlock.restype = ctypes.c_int
    kernel32.GlobalSize.argtypes = [ctypes.c_void_p]
    kernel32.GlobalSize.restype = ctypes.c_size_t

    if not user32.OpenClipboard(None):
        return {"status": "error", "message": "Không mở được bộ nhớ tạm Windows. Hãy thử lại."}

    def read_format(format_id: int) -> bytes:
        handle = user32.GetClipboardData(format_id)
        if not handle:
            return b""
        pointer = kernel32.GlobalLock(handle)
        if not pointer:
            return b""
        try:
            size = int(kernel32.GlobalSize(handle) or 0)
            return ctypes.string_at(pointer, size) if size else b""
        finally:
            kernel32.GlobalUnlock(handle)

    try:
        text_bytes = read_format(13)  # CF_UNICODETEXT
        text = text_bytes.decode("utf-16-le", errors="replace").split("\x00", 1)[0] if text_bytes else ""
        html_format = int(user32.RegisterClipboardFormatW("HTML Format"))
        html_bytes = read_format(html_format) if html_format else b""
        return {
            "status": "ok",
            "text": text,
            "html": _extract_clipboard_html_fragment(html_bytes),
        }
    finally:
        user32.CloseClipboard()


class VnOfficeApi:
    """Python API phơi ra cho JavaScript giao tiếp (Bridge) — cầu nối thật tới LibreOffice."""

    def __init__(self, app_kind: str | None = None, initial_file: str | None = None, server_port: int | None = None):
        self._app_kind = app_kind
        self._initial_file = initial_file
        self._server_port = server_port
        self._window_uid: str | None = None
        self._allow_window_close = False
        self._reporter = _ERROR_REPORTER
        self._current_file_path: str | None = None
        self._current_xlsx_snapshot: bytes | None = None
        self._reporting_file_path: str | None = initial_file
        self._reporting_operation: str | None = None
        self._reporting_app_kind = app_kind if app_kind in VALID_APP_KINDS else None
        self._api_report_depth = 0
        self._updater = _UPDATE_MANAGER
        self._sheet_open_sessions: dict[str, dict[str, object]] = {}
        self._sheet_open_session_lock = threading.RLock()
        self._last_sheet_open_id: str | None = None
        self._print_pipeline = PrintPipeline(
            write_source=_write_print_source,
            convert_pdf=_convert_print_source_to_pdf,
            office_candidates=_office_candidates_for_print,
            convert_office_pdf=_convert_print_source_with_office,
            inspect_pdf=lambda kind, pdf_path: int(
                _PERSISTENT_SOFFICE.operation(kind, "inspect_pdf", pdf_path=pdf_path)["page_count"]
            ),
            render_page=lambda kind, pdf_path, page_index, output_path: _PERSISTENT_SOFFICE.operation(
                kind,
                "render_pdf_page",
                pdf_path=pdf_path,
                page_index=page_index,
                output_path=output_path,
            ),
            print_pdf=_print_pdf_job,
        )
        try:
            self._autorecover_store = AutoRecoverStore(_user_data_dir())
        except OSError:
            # AutoRecover storage failure must never prevent opening the editor.
            self._autorecover_store = None
        self._autorecover_session_closed = False

    def get_app_version(self) -> str:
        """Trả về phiên bản ứng dụng hiện tại."""
        return APP_VERSION

    def read_clipboard_data(self) -> dict[str, object]:
        """Đọc CF_UNICODETEXT và HTML Format từ clipboard Windows cục bộ."""
        try:
            return _read_windows_clipboard_data()
        except Exception as exc:
            return {"status": "error", "message": f"Không đọc được bộ nhớ tạm: {exc}"}

    def get_about_info(self) -> dict[str, object]:
        """Trả về thông tin bản quyền và danh sách phần mềm nguồn mở bên thứ ba."""
        notices_text = ""
        candidates = [
            Path(ROOT_DIR) / "THIRD-PARTY-NOTICES",
            Path(ROOT_DIR) / "THIRD-PARTY-NOTICES.txt",
            Path(ROOT_DIR).parent / "THIRD-PARTY-NOTICES",
        ]
        for candidate in candidates:
            if candidate.is_file():
                try:
                    notices_text = candidate.read_text(encoding="utf-8")
                    break
                except Exception:
                    pass
            elif candidate.is_dir():
                try:
                    parts = []
                    for f in sorted(candidate.glob("*")):
                        if f.is_file():
                            parts.append(f"=== {f.name} ===\n" + f.read_text(encoding="utf-8", errors="replace"))
                    if parts:
                        notices_text = "\n\n".join(parts)
                        break
                except Exception:
                    pass

        return {
            "app_version": APP_VERSION,
            "product_name": "3T Office",
            "developer": "3T Technology",
            "copyright": "© 2024–2026 3T Technology. All rights reserved.",
            "suite_components": [
                {"name": "3T Doc", "role": "Soạn thảo văn bản và tài liệu hành chính"},
                {"name": "3T Sheet", "role": "Bảng tính điện tử và phân tích số liệu"},
                {"name": "3T Slide", "role": "Trình chiếu và thuyết trình đa phương tiện"}
            ],
            "third_party_notices": notices_text,
            "components": [
                {"name": "Python", "version": "3.12", "license": "PSF License", "purpose": "Ngôn ngữ nền tảng & logic ứng dụng"},
                {"name": "LibreOffice", "version": "7.6+", "license": "MPL-2.0", "purpose": "Lõi xử lý định dạng tài liệu ODF và OOXML"},
                {"name": "pywebview", "version": "5.x", "license": "BSD-3-Clause", "purpose": "Khung hiển thị cửa sổ desktop native độc lập"},
                {"name": "pythonnet & clr_loader", "version": "3.x", "license": "MIT", "purpose": "Cầu nối Windows .NET / WebView2"},
                {"name": "cffi & pycparser", "version": "1.x", "license": "MIT / BSD-3-Clause", "purpose": "Giao tiếp nhị phân C native"},
                {"name": "bottle & proxy_tools", "version": "0.12+", "license": "MIT", "purpose": "Máy chủ HTTP tĩnh cục bộ nội bộ offline"},
                {"name": "typing_extensions", "version": "4.x", "license": "PSF License", "purpose": "Hỗ trợ kiểu dữ liệu mở rộng"},
                {"name": "Be Vietnam Pro", "version": "1.002", "license": "SIL Open Font License 1.1", "purpose": "Bộ phông chữ tiếng Việt chuẩn quốc gia"}
            ]
        }

    def get_autorecover_settings(self):
        return self._autorecover_store.get_settings() if self._autorecover_store else {"enabled": True, "interval_minutes": 5}

    def set_autorecover_settings(self, settings):
        try:
            if not self._autorecover_store:
                return {"status": "error", "message": "Không thể mở thư mục dữ liệu AutoRecover."}
            return self._autorecover_store.set_settings(settings)
        except OSError as exc:
            return {"status": "error", "message": f"Không thể lưu cài đặt AutoRecover: {exc}"}

    def list_autorecover_snapshots(self):
        return self._autorecover_store.list_leftovers() if self._autorecover_store else []

    def read_autorecover_snapshot(self, snapshot_id):
        return self._autorecover_store.read_snapshot(snapshot_id) if self._autorecover_store else {"status": "error", "message": "Không thể đọc thư mục AutoRecover cục bộ."}

    def write_autorecover_snapshot(self, doc_id, app_kind, content, original_path="", title="", file_format=None):
        if not self._autorecover_store:
            return {"status": "error", "message": "Không thể mở thư mục lưu AutoRecover cục bộ."}
        return self._autorecover_store.write_snapshot(
            doc_id=doc_id,
            app_kind=app_kind,
            content=content,
            original_path=original_path,
            title=title,
            file_format=file_format,
        )

    def delete_autorecover_snapshot(self, snapshot_id):
        return self._autorecover_store.delete_snapshot(snapshot_id) if self._autorecover_store else False

    def delete_autorecover_document(self, doc_id):
        return self._autorecover_store.delete_document_snapshot(doc_id) if self._autorecover_store else False

    def close_autorecover_session(self):
        if self._autorecover_session_closed:
            return True
        self._clear_sheet_open_sessions()
        if self._autorecover_store:
            try:
                self._autorecover_store.cleanup_session()
            except OSError:
                return False
        self._autorecover_session_closed = True
        return True

    def _prune_sheet_open_sessions(self):
        now = time.monotonic()
        with self._sheet_open_session_lock:
            expired = [
                open_id for open_id, entry in self._sheet_open_sessions.items()
                if float(entry.get("expires_at", 0)) <= now
            ]
            for open_id in expired:
                self._remove_sheet_open_session_locked(open_id)

    def _remove_sheet_open_session_locked(self, open_id):
        entry = self._sheet_open_sessions.pop(open_id, None)
        if self._last_sheet_open_id == open_id:
            self._last_sheet_open_id = next(reversed(self._sheet_open_sessions), None) if self._sheet_open_sessions else None
        if entry:
            timer = entry.get("timer")
            if isinstance(timer, threading.Timer):
                timer.cancel()
            paths = [path for path in [entry.get("path"), *(entry.get("chunk_paths") or [])] if path]
            for path in paths:
                try:
                    Path(str(path)).unlink(missing_ok=True)
                except (OSError, TypeError, ValueError):
                    pass

    def _clear_sheet_open_sessions(self):
        with self._sheet_open_session_lock:
            for open_id in list(self._sheet_open_sessions):
                self._remove_sheet_open_session_locked(open_id)

    def _store_sheet_open_fallback(
        self, fods_content: str, source_path: str, workbook_xml: str | None, payload_chunks=None,
        *, open_id=None, payload_metadata=None, error=False
    ) -> str:
        self._prune_sheet_open_sessions()
        folder = _user_data_dir() / "sheet-open-sessions"
        folder.mkdir(parents=True, exist_ok=True)
        open_id = open_id or secrets.token_urlsafe(32)
        target = folder / f"{open_id}.fods"
        temporary = folder / f".{open_id}.tmp"
        chunk_paths = []
        chunk_temporary_paths = []
        try:
            with temporary.open("w", encoding="utf-8", newline="") as handle:
                handle.write(fods_content)
            os.replace(temporary, target)
            for index, chunk in enumerate(payload_chunks or []):
                chunk_path = folder / f"{open_id}.{index:06d}.chunk"
                chunk_temporary = folder / f".{open_id}.{index:06d}.tmp"
                chunk_temporary_paths.append(chunk_temporary)
                with chunk_temporary.open("w", encoding="ascii", newline="") as handle:
                    handle.write(str(chunk.get("data", "")))
                os.replace(chunk_temporary, chunk_path)
                chunk_paths.append(chunk_path)
        except Exception:
            for path in [temporary, target, *chunk_temporary_paths, *chunk_paths]:
                try:
                    path.unlink(missing_ok=True)
                except OSError:
                    pass
            raise
        now = time.monotonic()
        with self._sheet_open_session_lock:
            existing = self._sheet_open_sessions.get(open_id)
            session = existing if existing is not None else {}
            session.update({
                "path": target,
                "expires_at": now + _SHEET_OPEN_SESSION_TTL_SECONDS,
                "source_path": source_path,
                "file_name": Path(source_path).name,
                "workbook_xml": workbook_xml,
                "chunk_paths": chunk_paths,
                "chunk_rows": [int(chunk.get("rows", 0)) for chunk in (payload_chunks or [])],
                "payload_metadata": payload_metadata,
                "error": bool(error),
                "phase": "error" if error else "ready",
                "ready": True,
            })
            self._sheet_open_sessions[open_id] = session
            self._last_sheet_open_id = open_id
            expiry_timer = session.get("timer")
            if not isinstance(expiry_timer, threading.Timer):
                expiry_timer = threading.Timer(
                    _SHEET_OPEN_SESSION_TTL_SECONDS,
                    self._expire_sheet_open_session,
                    args=(open_id,),
                )
                expiry_timer.daemon = True
                session["timer"] = expiry_timer
            while len(self._sheet_open_sessions) > 2:
                oldest = next(iter(self._sheet_open_sessions))
                if oldest == open_id:
                    break
                self._remove_sheet_open_session_locked(oldest)
        if not expiry_timer.is_alive():
            expiry_timer.start()
        return open_id

    def _reserve_sheet_open_payload_session(self, source_path, workbook_xml):
        self._prune_sheet_open_sessions()
        open_id = secrets.token_urlsafe(32)
        expiry_timer = threading.Timer(
            _SHEET_OPEN_SESSION_TTL_SECONDS,
            self._expire_sheet_open_session,
            args=(open_id,),
        )
        expiry_timer.daemon = True
        with self._sheet_open_session_lock:
            self._sheet_open_sessions[open_id] = {
                "path": None,
                "expires_at": time.monotonic() + _SHEET_OPEN_SESSION_TTL_SECONDS,
                "source_path": source_path,
                "file_name": Path(source_path).name,
                "workbook_xml": workbook_xml,
                "chunk_paths": [],
                "chunk_rows": [],
                "payload_metadata": None,
                "phase": "preparing",
                "ready": False,
                "error": False,
                "timer": expiry_timer,
            }
            self._last_sheet_open_id = open_id
            while len(self._sheet_open_sessions) > 2:
                oldest = next(iter(self._sheet_open_sessions))
                if oldest == open_id:
                    break
                self._remove_sheet_open_session_locked(oldest)
        expiry_timer.start()
        return open_id

    def _set_sheet_open_payload_phase(self, open_id, phase):
        with self._sheet_open_session_lock:
            entry = self._sheet_open_sessions.get(open_id)
            if entry and not entry.get("ready"):
                entry["phase"] = str(phase)

    def _read_sheet_open_payload_status(self, open_id):
        if not isinstance(open_id, str) or not open_id or len(open_id) > 128:
            return {"status": "error", "message": "Mã phiên nạp bảng tính không hợp lệ."}
        self._prune_sheet_open_sessions()
        with self._sheet_open_session_lock:
            entry = self._sheet_open_sessions.get(open_id)
            if not entry:
                return {"status": "error", "message": "Phiên nạp bảng tính đã hết hạn."}
            if not entry.get("ready"):
                return {"status": "building", "phase": entry.get("phase", "preparing")}
            if entry.get("error"):
                return {"status": "error", "message": "Không thể hoàn tất payload; đang dùng dữ liệu FODS dự phòng."}
            return {"status": "ready", "metadata": entry.get("payload_metadata") or {}}

    def get_sheet_open_payload_status(self, open_id):
        return self._invoke_reported_api(
            "get_sheet_open_payload_status", self._read_sheet_open_payload_status, open_id
        )

    def _read_sheet_open_payload_chunk(self, open_id, index):
        if not isinstance(open_id, str) or not open_id or len(open_id) > 128:
            return {"status": "error", "message": "Mã phiên nạp bảng tính không hợp lệ."}
        try:
            index = int(index)
        except (TypeError, ValueError):
            return {"status": "error", "message": "Số thứ tự phần dữ liệu không hợp lệ."}
        self._prune_sheet_open_sessions()
        with self._sheet_open_session_lock:
            entry = self._sheet_open_sessions.get(open_id)
            paths = entry.get("chunk_paths", []) if entry else []
            if not entry or index < 0 or index >= len(paths):
                return {"status": "error", "message": "Không còn phần dữ liệu bảng tính này. Hãy mở lại tệp."}
            chunk_path = Path(str(paths[index]))
            chunk_rows = entry.get("chunk_rows", [])
            row_count = int(chunk_rows[index]) if index < len(chunk_rows) else 0
        try:
            data = chunk_path.read_text(encoding="ascii")
        except OSError:
            return {"status": "error", "message": "Không đọc được phần dữ liệu bảng tính."}
        return {"status": "ok", "openId": open_id, "index": index, "rows": row_count, "data": data}

    def get_sheet_open_payload_chunk(self, open_id, index):
        return self._invoke_reported_api(
            "get_sheet_open_payload_chunk", self._read_sheet_open_payload_chunk, open_id, index
        )

    def _expire_sheet_open_session(self, open_id):
        with self._sheet_open_session_lock:
            entry = self._sheet_open_sessions.get(open_id)
            if entry and float(entry.get("expires_at", 0)) <= time.monotonic():
                self._remove_sheet_open_session_locked(open_id)

    def _read_sheet_open_fallback(self, open_id=None):
        self._prune_sheet_open_sessions()
        with self._sheet_open_session_lock:
            selected_id = open_id or self._last_sheet_open_id
            entry = self._sheet_open_sessions.get(selected_id) if selected_id else None
            path = Path(str(entry["path"])) if entry else None
            metadata = dict(entry) if entry else {}
        if not path or not path.is_file():
            return {"status": "error", "message": "Không còn dữ liệu dự phòng cho lần mở này. Hãy mở lại tệp."}
        try:
            with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
                content = handle.read()
        except OSError:
            return {"status": "error", "message": "Không đọc được dữ liệu dự phòng. Hãy mở lại tệp."}
        return {
            "status": "ok",
            "openId": selected_id,
            "content": content,
            "sourcePath": metadata.get("source_path", ""),
            "fileName": metadata.get("file_name", "BangTinh.xlsx"),
            "ooxmlWorkbookXml": metadata.get("workbook_xml"),
        }

    def get_sheet_open_fallback(self, open_id):
        return self._invoke_reported_api(
            "get_sheet_open_fallback", self._read_sheet_open_fallback, open_id
        )

    def get_latest_sheet_open_fallback(self):
        return self._invoke_reported_api(
            "get_latest_sheet_open_fallback", self._read_sheet_open_fallback, None
        )

    def release_sheet_open_fallback(self, open_id):
        if not isinstance(open_id, str) or not open_id or len(open_id) > 128:
            return False
        self._prune_sheet_open_sessions()
        with self._sheet_open_session_lock:
            existed = open_id in self._sheet_open_sessions
            self._remove_sheet_open_session_locked(open_id)
        return existed

    def _invoke_reported_api(self, method_name, method, *args, **kwargs):
        outermost = self._api_report_depth == 0
        self._api_report_depth += 1
        started_at = time.monotonic()
        self._reporting_file_path = self._current_file_path or self._initial_file
        self._reporting_operation = self._default_operation(method_name, method, args, kwargs)
        if outermost:
            _ERROR_REPORT_CONTEXT.active = True
            _ERROR_REPORT_CONTEXT.failure_reported = False
        try:
            try:
                result = method(*args, **kwargs)
            except Exception as exc:
                if outermost and not getattr(_ERROR_REPORT_CONTEXT, "failure_reported", False):
                    self._record_api_failure(exc, started_at)
                raise
            if (
                outermost
                and isinstance(result, dict)
                and result.get("status") == "error"
                and not getattr(_ERROR_REPORT_CONTEXT, "failure_reported", False)
            ):
                self._record_api_failure(
                    RuntimeError(result.get("message") or "Thao tác tài liệu thất bại."),
                    started_at,
                )
            return result
        finally:
            self._api_report_depth -= 1
            if outermost:
                _ERROR_REPORT_CONTEXT.active = False
                _ERROR_REPORT_CONTEXT.failure_reported = False

    def open_document_dialog(self, app_kind="writer"):
        return self._invoke_reported_api("open_document_dialog", self._open_document_dialog_impl, app_kind)

    def open_mail_merge_data_dialog(self):
        return self._invoke_reported_api("open_mail_merge_data_dialog", self._open_mail_merge_data_dialog_impl)

    def save_document_in_place(self, content, app_kind="writer", target_path=None, source_path=None):
        return self._invoke_reported_api(
            "save_document_in_place", self._save_document_in_place_impl,
            content, app_kind, target_path, source_path,
        )

    def save_document_dialog(self, content, app_kind="writer", target_format=None, suggested_name="TaiLieu", source_path=None):
        return self._invoke_reported_api(
            "save_document_dialog", self._save_document_dialog_impl,
            content, app_kind, target_format, suggested_name, source_path,
        )

    def export_pdf_dialog(self, content, app_kind="writer", suggested_name="TaiLieu", source_path=None):
        return self._invoke_reported_api(
            "export_pdf_dialog", self._export_pdf_dialog_impl,
            content, app_kind, suggested_name, source_path,
        )

    def prepare_print_document(
        self, app_kind, content, suggested_name="TaiLieu", source_path=None,
        use_office=True, print_options=None,
    ):
        return self._invoke_reported_api(
            "prepare_print_document",
            self._print_pipeline.prepare,
            app_kind,
            content,
            suggested_name,
            source_path,
            use_office,
            print_options,
        )

    def get_print_engine_status(self, app_kind):
        return self._print_pipeline.engine_status(str(app_kind or ""))

    def get_print_preview_page(self, session_id, page_number):
        try:
            return self._print_pipeline.preview_page(session_id, page_number)
        except Exception as exc:
            return {"status": "error", "message": f"Không tải được trang xem trước: {exc}"}

    def get_installed_printers(self):
        return _PRINT_PIPELINE_MODULE.list_installed_printers()

    def print_document(self, session_id, settings):
        return self._invoke_reported_api(
            "print_document",
            self._print_document_impl,
            session_id,
            settings,
        )

    def _print_document_impl(self, session_id, settings):
        options = settings if isinstance(settings, dict) else {}
        printer = str(options.get("printer") or "").strip()
        destination_path = options.get("destinationPath")
        copies = options.get("copies")
        page_range = str(options.get("pageRange", "") or "").strip()
        if (
            printer.casefold() == "microsoft print to pdf"
            and not destination_path
            and copies == 1
            and not page_range
        ):
            window = _active_window()
            if not window:
                return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng để chọn nơi lưu PDF."}
            suggested_name = self._print_pipeline.suggested_name(session_id)
            try:
                save_result = window.create_file_dialog(
                    webview.SAVE_DIALOG,
                    save_filename=f"{suggested_name}.pdf",
                    file_types=("Tài liệu PDF (*.pdf)", "Tất cả tệp (*.*)"),
                )
            except Exception as exc:
                return {"status": "error", "message": f"Không mở được hộp thoại lưu PDF: {exc}"}
            if not save_result:
                return {"status": "cancelled"}
            destination_path = save_result if isinstance(save_result, str) else save_result[0]
            if not str(destination_path).lower().endswith(".pdf"):
                destination_path = f"{destination_path}.pdf"
        result = self._print_pipeline.print_document(
            session_id,
            printer,
            copies,
            page_range,
            str(destination_path) if destination_path else None,
        )
        if result.get("status") == "ok" and destination_path:
            result["path"] = str(destination_path)
        return result

    def cancel_print_document(self, session_id):
        return self._print_pipeline.cancel(session_id)

    def close_print_sessions(self):
        self._print_pipeline.close()

    def _default_operation(self, method_name, method, args, kwargs):
        if method_name == "open_mail_merge_data_dialog":
            return "open.mailmerge.dialog"
        if method_name == "open_document_dialog":
            self._reporting_app_kind = args[0] if args and args[0] in VALID_APP_KINDS else self._app_kind
            path = self._initial_file
            if path:
                self._reporting_file_path = path
                return f"open.{Path(path).suffix.lower().lstrip('.') or 'unknown'}"
            return "open.dialog"
        try:
            bound = inspect.signature(method).bind_partial(*args, **kwargs)
            values = bound.arguments
        except (TypeError, ValueError):
            values = kwargs
        app_kind = values.get("app_kind", self._app_kind or "writer")
        self._reporting_app_kind = app_kind if app_kind in VALID_APP_KINDS else self._app_kind
        target_path = values.get("target_path") or values.get("source_path")
        target_format = values.get("target_format")
        if method_name == "export_pdf_dialog":
            return "export.pdf"
        if method_name == "save_document_dialog":
            fmt = target_format or Path(str(values.get("suggested_name") or "")).suffix.lstrip(".")
            return f"{'export' if fmt == 'pdf' else 'save'}.{fmt or {'writer':'docx','sheet':'xlsx','slides':'pptx'}.get(app_kind, 'file')}"
        if target_path:
            self._reporting_file_path = target_path
            ext = Path(str(target_path)).suffix.lower().lstrip(".")
        else:
            ext = target_format or {"writer": "docx", "sheet": "xlsx", "slides": "pptx"}.get(app_kind, "file")
        return f"save.{ext or 'file'}"

    def _record_api_failure(self, exception, started_at):
        if self._reporter is None:
            return
        self._reporter.capture_exception(
            type(exception),
            exception,
            exception.__traceback__,
            operation=self._reporting_operation or "document.operation",
            file_path=self._reporting_file_path,
            duration_ms=(time.monotonic() - started_at) * 1000,
            app_kind=self._reporting_app_kind,
        )

    def _record_sheet_open_payload_failure(self, phase):
        """Report a payload-path issue without recording workbook contents."""
        self._reporting_operation = "open.xlsx.payload"
        self._reporting_app_kind = "sheet"
        try:
            self._record_api_failure(
                RuntimeError(f"Sheet compact open payload {phase} failed."),
                time.monotonic(),
            )
        except Exception:
            # Reporting is best-effort and cannot disable the FODS fallback.
            pass

    def _finish_sheet_open_payload_in_background(
        self, open_id, src_path, raw_fods, original_xlsx, workbook_xml
    ):
        """Finish fidelity overlays while the compact converted viewport is visible."""
        try:
            self._set_sheet_open_payload_phase(open_id, "overlay")
            content = _apply_native_import_overlay(
                src_path,
                raw_fods,
                "sheet",
                source_bytes=original_xlsx,
                # The fused payload pass below applies the final XF mapping
                # after FODS compaction, so applying it before compaction is
                # redundant and traverses every populated cell twice.
                skip_initial_xf=True,
            )
            self._set_sheet_open_payload_phase(open_id, "optimize")
            content = _optimize_fods_for_sheet(content)
            self._set_sheet_open_payload_phase(open_id, "payload")
            from adapters.libreoffice.sheet.sheet_open_payload import build_sheet_open_payload
            final_fods, full_payload = build_sheet_open_payload(
                original_xlsx, content, _ooxml_zip_patch()
            )
            payload_chunks = full_payload.pop("rowChunks", [])
            full_payload.pop("previewRows", None)
            full_payload.pop("previewRowsDeflateBase64", None)
            full_payload["totalRows"] = full_payload["rows"]
            full_payload["chunkCount"] = len(payload_chunks)
            self._store_sheet_open_fallback(
                final_fods,
                src_path,
                workbook_xml,
                payload_chunks,
                open_id=open_id,
                payload_metadata=full_payload,
            )
        except Exception:
            self._record_sheet_open_payload_failure("background-build")
            try:
                fallback = _apply_native_import_overlay(
                    src_path, raw_fods, "sheet", source_bytes=original_xlsx
                )
                fallback = _optimize_fods_for_sheet(fallback)
                fallback = _ooxml_zip_patch().reoverlay_sheet_xf_indices(
                    original_xlsx, fallback
                )
                self._store_sheet_open_fallback(
                    fallback, src_path, workbook_xml, open_id=open_id, error=True
                )
            except Exception:
                try:
                    self._store_sheet_open_fallback(
                        raw_fods, src_path, workbook_xml, open_id=open_id, error=True
                    )
                except Exception:
                    with self._sheet_open_session_lock:
                        entry = self._sheet_open_sessions.get(open_id)
                        if entry:
                            entry.update({"ready": True, "error": True, "phase": "error"})

    def get_error_reporting_state(self):
        if self._reporter is None:
            return {"enabled": False, "consent": "unknown", "endpoint_configured": False, "queue_count": 0, "has_current_file": bool(self._current_file_path)}
        state = self._reporter.get_state()
        state["has_current_file"] = bool(self._current_file_path and os.path.isfile(self._current_file_path))
        return state

    def get_update_status(self):
        if self._updater is None:
            return {
                "current_version": APP_VERSION,
                "available_version": None,
                "channel": "pilot",
                "release_notes": "",
                "ready": False,
                "bytes_downloaded": 0,
                "status": "disabled",
            }
        return self._updater.get_state()

    def start_update_checks(self):
        if self._updater is None:
            return {"started": False, "state": self.get_update_status()}
        return {"started": self._updater.start(), "state": self._updater.get_state()}

    def check_for_updates(self):
        if self._updater is None:
            return {"queued": False, "state": self.get_update_status()}
        queued = self._updater.schedule_check()
        return {"queued": queued, "state": self._updater.get_state()}

    def request_update_restart(self):
        if self._updater is None or not self._updater.get_state().get("ready"):
            return {"started": False, "error": "Chưa có bản cập nhật sẵn sàng."}
        if self._app_kind not in VALID_APP_KINDS:
            return {"started": False, "error": "Không xác định được ứng dụng cần khởi động lại."}
        install_root = _update_install_root()
        if install_root is None:
            return {"started": False, "error": "Không tìm thấy thư mục cài đặt 3T Office."}
        try:
            task_path = self._updater.create_apply_task(app_kind=self._app_kind, install_root=install_root)
            if not self._updater.launch_apply_helper(task_path):
                return {"started": False, "error": "Trình cập nhật chỉ áp dụng được trên Windows."}
        except Exception as exc:
            return {"started": False, "error": f"Không thể chuẩn bị cập nhật: {type(exc).__name__}"}
        def exit_for_update():
            # The apply helper waits for every process of this install; stop the warm LibreOffice worker first.
            try:
                self.close_print_sessions()
                _PERSISTENT_SOFFICE.shutdown()
            finally:
                os._exit(0)

        timer = threading.Timer(0.4, exit_for_update)
        timer.daemon = True
        timer.start()
        return {"started": True}

    def set_error_reporting_consent(self, granted):
        if self._reporter is None:
            return self.get_error_reporting_state()
        if type(granted) is not bool:
            return self.get_error_reporting_state()
        return self._reporter.set_consent(granted)

    def report_frontend_error(self, payload):
        if self._reporter is None:
            return {"queued": False}
        return self._reporter.report_frontend_error(payload)

    def submit_user_feedback(self, description, attach_current_file=False, app_kind=None):
        if self._reporter is None:
            return {"queued": False, "error": "Không thể lưu báo cáo lỗi ở thời điểm này."}
        return self._reporter.submit_user_feedback(
            description,
            attach_current_file=(attach_current_file is True),
            current_file=self._current_file_path,
            app_kind=app_kind if app_kind in VALID_APP_KINDS else self._reporting_app_kind,
        )

    def engine_status(self):
        """Cho UI biết document engine thật có sẵn sàng hay không (không giả vờ)."""
        return {"available": SOFFICE_PATH is not None, "path": SOFFICE_PATH or ""}

    def set_window_title(self, title):
        window = _active_window(self)
        if not window:
            return False
        try:
            window.set_title(str(title or "3T Office")[:512])
            return True
        except Exception:
            return False

    def close_current_window(self):
        window = _active_window(self)
        if not window:
            return {"status": "error", "message": "Cửa sổ tài liệu không còn mở."}
        self._allow_window_close = True

        def destroy_window():
            time.sleep(0.1)
            try:
                window.destroy()
            except Exception:
                self._allow_window_close = False

        threading.Thread(target=destroy_window, daemon=True, name="3T Office close window").start()
        return {"status": "ok"}

    def create_new_document_window(self, app_kind=None):
        kind = app_kind if app_kind in VALID_APP_KINDS else self._app_kind
        if kind not in VALID_APP_KINDS:
            return {"status": "error", "message": "Không xác định được ứng dụng cần tạo tài liệu."}
        if not self._server_port:
            return {"status": "error", "message": "Máy chủ giao diện của 3T Office chưa sẵn sàng."}

        prefixes = {"writer": "Tài liệu", "sheet": "Bảng tính", "slides": "Bản trình bày"}
        extensions = {"writer": "docx", "sheet": "xlsx", "slides": "pptx"}
        with _DOCUMENT_SEQUENCE_LOCK:
            next_number = _DOCUMENT_SEQUENCE.get(kind, 1) + 1
            _DOCUMENT_SEQUENCE[kind] = next_number
        document_name = f"{prefixes[kind]} {next_number}.{extensions[kind]}"
        child_api = VnOfficeApi(app_kind=kind, server_port=self._server_port)
        try:
            with _NEW_WINDOW_CREATE_LOCK:
                child_window = webview.create_window(
                    title=f"{document_name} — {APP_TITLES[kind]}",
                    url=build_launch_url(kind, None, port=self._server_port, document_name=document_name),
                    width=1366,
                    height=820,
                    min_size=(960, 640),
                    js_api=child_api,
                    text_select=True,
                )
                if child_window is None:
                    return {"status": "error", "message": "Không tạo được cửa sổ tài liệu mới."}
                _register_app_window(child_api, child_window)
            return {"status": "ok", "documentName": document_name}
        except Exception as exc:
            return {"status": "error", "message": f"Không mở được cửa sổ tài liệu mới: {exc}"}

    def open_file_in_new_window(self, file_path, app_kind):
        if app_kind not in VALID_APP_KINDS:
            return {"status": "error", "message": "Loại ứng dụng không hợp lệ."}
        try:
            source_path = Path(str(file_path or "")).expanduser().resolve()
            if not source_path.is_file():
                return {"status": "error", "message": "Không tìm thấy tệp gần đây tại đường dẫn đã lưu."}
            if FILE_APP_KINDS.get(source_path.suffix.lower()) != app_kind:
                return {"status": "error", "message": "Định dạng tệp không phù hợp với ứng dụng hiện tại."}
        except (OSError, ValueError):
            return {"status": "error", "message": "Đường dẫn tệp gần đây không hợp lệ."}
        if not self._server_port:
            return {"status": "error", "message": "Máy chủ giao diện của 3T Office chưa sẵn sàng."}

        file_name = source_path.name
        child_api = VnOfficeApi(app_kind=app_kind, initial_file=str(source_path), server_port=self._server_port)
        try:
            with _NEW_WINDOW_CREATE_LOCK:
                child_window = webview.create_window(
                    title=f"{file_name} — {APP_TITLES[app_kind]}",
                    url=build_launch_url(app_kind, str(source_path), port=self._server_port),
                    width=1366,
                    height=820,
                    min_size=(960, 640),
                    js_api=child_api,
                    text_select=True,
                )
                if child_window is None:
                    return {"status": "error", "message": "Không tạo được cửa sổ để mở tệp gần đây."}
                _register_app_window(child_api, child_window)
            return {"status": "ok", "fileName": file_name}
        except Exception as exc:
            return {"status": "error", "message": f"Không mở được tệp gần đây: {exc}"}

    def report_perf_metric(self, name, elapsed_ms):
        """Emit opt-in renderer timing to the foreground desktop launch console."""
        if os.environ.get("VNO_PERF_DEBUG") != "1":
            return False
        allowed_metrics = {
            "parseFods", "loadFromFods", "buildSheetPayloadModel", "loadFromPayload",
            "first grid render", "first layout", "selection-to-first-grid", "first viewport paint",
            "writer.parseHtml", "writer.render", "writer.firstPaint",
        }
        if name not in allowed_metrics and not name.startswith("parseFods:"):
            return False
        try:
            value = float(elapsed_ms)
        except (TypeError, ValueError):
            return False
        print(f"[VNO Sheet Perf] {name}: {value:.1f} ms", flush=True)
        return True

    def _validate_open_package(self, source_path, app_kind):
        """Reject malformed ZIP-based Office/ODF packages before conversion mutates UI state.

        Only the small package manifests are read (never the main document part), so this
        check costs a few milliseconds even for very large workbooks (open-speed rule).
        """
        extension = Path(str(source_path)).suffix.lower()
        ooxml = {("writer", ".docx"), ("sheet", ".xlsx"), ("slides", ".pptx")}
        odf_media_types = {
            ("writer", ".odt"): "application/vnd.oasis.opendocument.text",
            ("sheet", ".ods"): "application/vnd.oasis.opendocument.spreadsheet",
            ("slides", ".odp"): "application/vnd.oasis.opendocument.presentation",
        }
        key = (app_kind, extension)
        if key not in ooxml and key not in odf_media_types:
            return

        try:
            with open(source_path, "rb") as handle:
                signature = handle.read(8)
            # A legacy binary file saved with an OOXML/ODF extension: Word/Excel and
            # LibreOffice detect the real format, so let the engine decide.
            if signature == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
                return
            with zipfile.ZipFile(source_path) as package:
                members = set(package.namelist())
                if key in ooxml:
                    if "[Content_Types].xml" not in members:
                        raise ValueError("thiếu thành phần [Content_Types].xml")
                    ET.fromstring(package.read("[Content_Types].xml"))
                    conventional_main = {
                        "writer": "word/document.xml", "sheet": "xl/workbook.xml", "slides": "ppt/presentation.xml",
                    }[app_kind]
                    main_parts = {conventional_main}
                    if "_rels/.rels" in members:
                        rels = ET.fromstring(package.read("_rels/.rels"))
                        main_parts.update(
                            (rel.get("Target") or "").lstrip("/")
                            for rel in rels
                            if (rel.get("Type") or "").endswith("/officeDocument")
                        )
                    if not main_parts & members:
                        raise ValueError("thiếu phần tài liệu chính")
                else:
                    if "content.xml" not in members:
                        raise ValueError("thiếu thành phần content.xml")
                    if "mimetype" in members:
                        media_type = package.read("mimetype").decode("ascii", errors="replace").strip()
                        if media_type != odf_media_types[key]:
                            raise ValueError("sai kiểu tài liệu ODF")
        except (OSError, zipfile.BadZipFile, KeyError, ET.ParseError, ValueError, RuntimeError) as exc:
            raise DocumentEngineError(
                "Không thể mở tệp vì gói Office bị hỏng hoặc không đúng định dạng. "
                "Tài liệu đang mở được giữ nguyên."
            ) from exc
    def _open_document_dialog_impl(self, app_kind="writer"):
        """Mở hộp thoại chọn tệp NATIVE thật của hệ điều hành, chuyển đổi tệp thật sang
        định dạng trung gian mà UI có thể hiển thị."""
        if self._initial_file:
            if self._app_kind and app_kind != self._app_kind:
                return {"status": "error", "message": "Tệp khởi động không thuộc ứng dụng hiện tại."}
            src_path = self._initial_file
            self._initial_file = None
        else:
            window = _active_window(self)
            if not window:
                return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}

            file_types = OPEN_FILE_TYPES.get(app_kind, ("Tất cả tệp (*.*)",))
            try:
                result = window.create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
            except Exception as exc:  # lỗi hệ thống khi mở hộp thoại
                return {"status": "error", "message": f"Không mở được hộp thoại: {exc}"}

            if not result:
                return {"status": "cancelled"}
            src_path = result[0]

        _notify_document_open_progress(self)

        self._reporting_file_path = src_path
        self._reporting_operation = f"open.{Path(src_path).suffix.lower().lstrip('.') or 'unknown'}"
        if app_kind == "sheet" and src_path.lower().endswith(".xlsx"):
            _notify_sheet_open_progress("Đã chọn tệp. Đang chuẩn bị mở bảng tính lớn…", True, self)

        try:
            self._validate_open_package(src_path, app_kind)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        if app_kind == "writer":
            target_ext = "html"
        elif app_kind == "sheet":
            target_ext = "fods"
        elif app_kind == "slides":
            target_ext = "fodp"
        else:
            return {"status": "error", "message": f"Loại ứng dụng không hợp lệ: {app_kind}"}

        writer_ooxml_metadata = None
        sheet_open_payload = None
        sheet_open_id = None
        sheet_ooxml_workbook_xml = None
        original_xlsx = None
        try:
            with tempfile.TemporaryDirectory(prefix="vnoffice_open_") as tmp:
                convert_src_path = src_path
                if app_kind == "writer" and src_path.lower().endswith(".doc"):
                    # Legacy binary DOC imported directly to StarWriter HTML can
                    # lose/alter default font and language metadata used by the
                    # canvas. Normalize through LibreOffice's DOCX filter, then
                    # reuse the existing DOCX-to-HTML import path and overlays.
                    legacy_docx_dir = os.path.join(tmp, "legacy-docx")
                    os.makedirs(legacy_docx_dir, exist_ok=True)
                    convert_src_path = _run_soffice_convert(
                        src_path, "docx", legacy_docx_dir, app_kind=app_kind
                    )
                if app_kind == "sheet" and src_path.lower().endswith(".xlsx") and os.path.isfile(src_path):
                    with open(src_path, "rb") as source_file:
                        original_xlsx = source_file.read()
                    import_xlsx = _ooxml_zip_patch().make_all_sheets_visible_for_import(original_xlsx)
                    if import_xlsx != original_xlsx:
                        convert_src_path = os.path.join(tmp, "import-visible.xlsx")
                        with open(convert_src_path, "wb") as import_file:
                            import_file.write(import_xlsx)
                if app_kind == "sheet" and src_path.lower().endswith(".xlsx"):
                    _notify_sheet_open_progress("Đang chuyển workbook Excel sang dữ liệu bảng tính…", api=self)
                out_path = _run_soffice_convert(convert_src_path, target_ext, tmp, app_kind=app_kind)
                with open(out_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                if app_kind == "writer":
                    content = _inline_html_images(content, out_path)
                    # Quy ước W9: font/cỡ mặc định từ docDefaults + theme khi LibreOffice không ghi p.western.
                    if convert_src_path.lower().endswith(".docx"):
                        try:
                            with open(convert_src_path, "rb") as f:
                                docx_bytes = f.read()
                            patcher = _ooxml_zip_patch()
                            # W12b: font theme của tài liệu tiếng Việt = typeface script="Viet" (Word), không phải latin
                            content = patcher.apply_docx_theme_script_fonts(docx_bytes, content)
                            content = patcher.inject_docx_default_font_css(docx_bytes, content)
                            # W25a: cỡ chữ style nửa điểm (w:sz lẻ: 8,5 / 11,5 / 14,5 pt) bị LibreOffice làm tròn
                            content = patcher.inject_docx_half_point_styles_css(docx_bytes, content)
                            # W32: font/cỡ/đậm/nghiêng của heading 1..6 theo chuỗi style Word (LibreOffice bỏ trống)
                            content = patcher.inject_docx_heading_styles_css(docx_bytes, content)
                            content = patcher.restore_docx_html_half_points_and_empty_paras(docx_bytes, content)
                        except OSError:
                            pass
                    if convert_src_path.lower().endswith(".docx"):
                        # The intermediate DOCX is temporary; collect its
                        # OOXML sidecars before TemporaryDirectory removes it.
                        writer_ooxml_metadata = {
                            "ooxmlDocumentXml": _read_docx_document_xml(convert_src_path),
                            "ooxmlCommentsXml": _read_docx_comments_xml(convert_src_path),
                            "ooxmlStylesXml": _read_docx_zip_entry(convert_src_path, "word/styles.xml"),
                            "ooxmlNumberingXml": _read_docx_zip_entry(convert_src_path, "word/numbering.xml"),
                            "ooxmlSettingsXml": _read_docx_zip_entry(convert_src_path, "word/settings.xml"),
                        }
                        header_xml, footer_xml, all_hdrs, all_ftrs, all_rels = _read_all_docx_headers_footers(convert_src_path)
                        writer_ooxml_metadata["ooxmlHeaderXml"] = header_xml
                        writer_ooxml_metadata["ooxmlFooterXml"] = footer_xml
                        writer_ooxml_metadata["ooxmlHeaders"] = all_hdrs
                        writer_ooxml_metadata["ooxmlFooters"] = all_ftrs
                        writer_ooxml_metadata["ooxmlRels"] = all_rels
                elif app_kind == "sheet":
                    if (
                        src_path.lower().endswith(".xlsx")
                        and original_xlsx is not None
                        and _sheet_open_payload_enabled()
                    ):
                        from adapters.libreoffice.sheet.sheet_open_payload import build_sheet_open_preview
                        raw_fods = content
                        sheet_open_payload = build_sheet_open_preview(raw_fods)
                        sheet_ooxml_workbook_xml = _read_xlsx_workbook_xml(src_path)
                        sheet_open_id = self._reserve_sheet_open_payload_session(
                            src_path, sheet_ooxml_workbook_xml
                        )
                        content = None
                        worker = threading.Thread(
                            target=self._finish_sheet_open_payload_in_background,
                            args=(
                                sheet_open_id,
                                src_path,
                                raw_fods,
                                original_xlsx,
                                sheet_ooxml_workbook_xml,
                            ),
                            name="3t-sheet-open-payload",
                            daemon=True,
                        )
                        worker.start()
                    else:
                        # Preserve the native workbook protection overlay before the FODS leaves Python.
                        content = _apply_native_import_overlay(
                            src_path, content, app_kind, source_bytes=original_xlsx
                        )
                        if src_path.lower().endswith(".xlsx"):
                            _notify_sheet_open_progress(
                                "\u0110ang t\u1ed1i \u01b0u d\u1eef li\u1ec7u, c\u00f4ng th\u1ee9c v\u00e0 \u0111\u1ecbnh d\u1ea1ng\u2026", api=self
                            )
                        content = _optimize_fods_for_sheet(content)
                        if src_path.lower().endswith(".xlsx") and os.path.isfile(src_path) and original_xlsx is None:
                            with open(src_path, "rb") as source_file:
                                original_xlsx = source_file.read()
                        if src_path.lower().endswith(".xlsx") and original_xlsx is not None:
                            content = _ooxml_zip_patch().reoverlay_sheet_xf_indices(
                                original_xlsx, content
                            )
                elif app_kind == "slides":
                    # Overlay BEFORE the FODP leaves this process — SlidesAdapter.parseFodp
                    # must see vno:section-*, vno:master-theme, and Set Up Show vno:*
                    # when the original PTTX has p14:sectionLst / VNOfficeMasterLogo /
                    # p:showPr showNarration=0 or p:penClr.
                    content = _apply_native_import_overlay(src_path, content, app_kind)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        payload = {
            "status": "ok",
            "sourcePath": src_path,
            "fileName": Path(src_path).name,
            "format": target_ext,
        }
        if sheet_open_payload is not None and sheet_open_id:
            payload["sheetPayload"] = sheet_open_payload
            payload["openId"] = sheet_open_id
        else:
            payload["content"] = content
        self._current_file_path = src_path
        self._current_xlsx_snapshot = original_xlsx if app_kind == "sheet" and src_path.lower().endswith(".xlsx") else None
        if app_kind == "writer":
            ooxml = (
                writer_ooxml_metadata["ooxmlDocumentXml"]
                if writer_ooxml_metadata is not None
                else _read_docx_document_xml(src_path)
            )
            if ooxml:
                payload["ooxmlDocumentXml"] = ooxml
            comments_xml = (
                writer_ooxml_metadata["ooxmlCommentsXml"]
                if writer_ooxml_metadata is not None
                else _read_docx_comments_xml(src_path)
            )
            if comments_xml:
                payload["ooxmlCommentsXml"] = comments_xml
            # Quy ước W11: style bảng (TableGrid: spacing after=0, line=240) nằm trong styles.xml.
            styles_xml = (
                writer_ooxml_metadata["ooxmlStylesXml"]
                if writer_ooxml_metadata is not None
                else _read_docx_zip_entry(src_path, "word/styles.xml")
            )
            if styles_xml:
                payload["ooxmlStylesXml"] = styles_xml
            # Quy ước W21b: định dạng danh sách/bullet nằm trong numbering.xml.
            numbering_xml = (
                writer_ooxml_metadata["ooxmlNumberingXml"]
                if writer_ooxml_metadata is not None
                else _read_docx_zip_entry(src_path, "word/numbering.xml")
            )
            if numbering_xml:
                payload["ooxmlNumberingXml"] = numbering_xml
            # Quy ước W26b: header/footer XML để chuẩn hóa đoạn rỗng theo cỡ dấu đoạn zone.
            if writer_ooxml_metadata is not None:
                header_xml = writer_ooxml_metadata.get("ooxmlHeaderXml")
                footer_xml = writer_ooxml_metadata.get("ooxmlFooterXml")
                payload["ooxmlHeaders"] = writer_ooxml_metadata.get("ooxmlHeaders", {})
                payload["ooxmlFooters"] = writer_ooxml_metadata.get("ooxmlFooters", {})
                payload["ooxmlRels"] = writer_ooxml_metadata.get("ooxmlRels", {})
                if writer_ooxml_metadata.get("ooxmlSettingsXml"):
                    payload["ooxmlSettingsXml"] = writer_ooxml_metadata["ooxmlSettingsXml"]
            else:
                hdr_xml, ftr_xml, all_hdrs, all_ftrs, all_rels = _read_all_docx_headers_footers(src_path)
                header_xml, footer_xml = hdr_xml, ftr_xml
                payload["ooxmlHeaders"] = all_hdrs
                payload["ooxmlFooters"] = all_ftrs
                payload["ooxmlRels"] = all_rels
                settings_xml = _read_docx_zip_entry(src_path, "word/settings.xml")
                if settings_xml:
                    payload["ooxmlSettingsXml"] = settings_xml
            if header_xml:
                payload["ooxmlHeaderXml"] = header_xml
            if footer_xml:
                payload["ooxmlFooterXml"] = footer_xml
        elif app_kind == "sheet":
            workbook_xml = sheet_ooxml_workbook_xml or _read_xlsx_workbook_xml(src_path)
            if workbook_xml:
                payload["ooxmlWorkbookXml"] = workbook_xml
        elif app_kind == "slides":
            presentation_xml = _read_pptx_presentation_xml(src_path)
            if presentation_xml:
                payload["ooxmlPresentationXml"] = presentation_xml
            slide_master_xml = _read_pptx_slide_master_xml(src_path)
            if slide_master_xml:
                payload["ooxmlSlideMasterXml"] = slide_master_xml
            pres_props_xml = _read_pptx_pres_props_xml(src_path)
            if pres_props_xml:
                payload["ooxmlPresPropsXml"] = pres_props_xml
        return payload

    def _open_mail_merge_data_dialog_impl(self):
        """Mở hộp thoại chọn tệp nguồn dữ liệu trộn thư (Excel .xlsx/.xls hoặc CSV/TSV).
        Chuyển đổi Excel sang FODS qua LibreOffice để bảo toàn định dạng hiển thị,
        ngày tháng, số tiền và tiếng Việt."""
        window = _active_window()
        if not window:
            return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}

        file_types = (
            "Nguồn dữ liệu trộn thư (*.xlsx;*.xls;*.csv;*.tsv;*.ods)",
            "Bảng tính Excel (*.xlsx;*.xls;*.ods)",
            "Tệp văn bản phân tách (*.csv;*.tsv;*.txt)",
            "Tất cả tệp (*.*)",
        )
        try:
            result = window.create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
        except Exception as exc:
            return {"status": "error", "message": f"Không mở được hộp thoại: {exc}"}

        if not result:
            return {"status": "cancelled"}

        src_path = result[0]
        ext = Path(src_path).suffix.lower()
        file_name = Path(src_path).name
        self._reporting_file_path = src_path
        self._reporting_operation = f"open.mailmerge.{ext.lstrip('.') or 'unknown'}"

        if ext in (".csv", ".tsv", ".txt"):
            try:
                with open(src_path, "rb") as f:
                    raw = f.read()
                try:
                    text = raw.decode("utf-8-sig")
                except UnicodeDecodeError:
                    try:
                        text = raw.decode("utf-8")
                    except UnicodeDecodeError:
                        text = raw.decode("cp1258", errors="replace")
                return {
                    "status": "ok",
                    "format": "tsv" if ext == ".tsv" else "csv",
                    "fileName": file_name,
                    "sourcePath": src_path,
                    "content": text,
                }
            except Exception as exc:
                return {"status": "error", "message": f"Không đọc được tệp {file_name}: {exc}"}

        if ext in (".xlsx", ".xls", ".ods"):
            try:
                with tempfile.TemporaryDirectory(prefix="vnoffice_mailmerge_") as tmp:
                    out_path = _run_soffice_convert(src_path, "fods", tmp, app_kind="sheet")
                    with open(out_path, "r", encoding="utf-8", errors="replace") as f:
                        fods_content = f.read()
                return {
                    "status": "ok",
                    "format": "fods",
                    "fileName": file_name,
                    "sourcePath": src_path,
                    "content": fods_content,
                }
            except Exception as exc:
                return {"status": "error", "message": f"Không chuyển đổi được tệp {file_name}: {exc}"}

        return {"status": "error", "message": f"Định dạng tệp không được hỗ trợ: {ext}"}

    def _is_pristine_sheet_xlsx_save(self, content, app_kind, source_path):
        if (
            app_kind != "sheet"
            or "<!-- vno-pristine-xlsx-source -->" not in str(content or "")
            or not source_path
            or not str(source_path).lower().endswith(".xlsx")
            or not self._current_xlsx_snapshot
            or not self._current_file_path
        ):
            return False
        try:
            return os.path.normcase(os.path.realpath(source_path)) == os.path.normcase(
                os.path.realpath(self._current_file_path)
            )
        except OSError:
            return False

    def _refresh_current_xlsx_snapshot(self, file_path, app_kind):
        self._current_xlsx_snapshot = None
        if app_kind != "sheet" or not str(file_path or "").lower().endswith(".xlsx"):
            return
        try:
            with open(file_path, "rb") as source_file:
                self._current_xlsx_snapshot = source_file.read()
        except OSError:
            self._current_xlsx_snapshot = None

    def _save_document_in_place_impl(self, content, app_kind="writer", target_path=None, source_path=None):
        """Lưu nội dung trực tiếp vào tệp đích (Ctrl+S / Save-in-place),
        giữ nguyên định dạng gốc và thay thế nguyên tử an toàn."""
        if not target_path:
            return {"status": "error", "message": "Đường dẫn tệp không hợp lệ."}

        target_path, target_format = _infer_save_format_from_path(target_path, app_kind=app_kind)
        source_path = source_path or target_path
        self._reporting_file_path = target_path
        self._reporting_operation = f"save.{target_format}"
        pristine_xlsx_save = (
            target_format == "xlsx"
            and self._is_pristine_sheet_xlsx_save(content, app_kind, source_path)
            and os.path.normcase(os.path.realpath(target_path)) == os.path.normcase(os.path.realpath(source_path))
        )

        try:
            with tempfile.TemporaryDirectory(prefix="vnoffice_save_inplace_") as tmp:
                if pristine_xlsx_save:
                    out_path = os.path.join(tmp, "source.xlsx")
                    with open(out_path, "wb") as source_file:
                        source_file.write(self._current_xlsx_snapshot)
                else:
                    src_path = _write_save_source(content, app_kind, tmp, target_format)
                    out_path = _convert_save_source_to_native(
                        src_path, app_kind, target_format, source_document_path=source_path,
                    )
                _atomic_replace_file(out_path, target_path)
                _verify_saved_file(target_path)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}
        except Exception as exc:
            return {"status": "error", "message": f"Lỗi không xác định khi lưu tệp: {exc}"}

        self._current_file_path = target_path
        self._refresh_current_xlsx_snapshot(target_path, app_kind)
        return {"status": "ok", "message": f"Đã lưu tại {target_path}", "path": target_path}

    def _save_document_dialog_impl(self, content, app_kind="writer", target_format=None, suggested_name="TaiLieu", source_path=None):
        """Mở hộp thoại lưu tệp NATIVE thật, chuyển đổi nội dung soạn thảo hiện tại
        sang định dạng Office/ODF thật và ghi ra đĩa thật."""
        window = _active_window(self)
        if not window:
            return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}

        default_ext = target_format or DEFAULT_SAVE_FORMAT.get(app_kind, "docx")
        default_stem = suggested_name or "TaiLieu"
        if target_format == "pdf":
            default_ext = "pdf"
            if suggested_name:
                default_stem = Path(suggested_name).stem or suggested_name
        elif suggested_name:
            s_ext = Path(suggested_name).suffix.lower().lstrip(".")
            if s_ext in FORMAT_FILTERS or s_ext in {"doc", "xls", "rtf", "txt", "docx", "xlsx", "ppt", "pptx"}:
                default_ext = s_ext
                default_stem = Path(suggested_name).stem

        if target_format == "pdf":
            file_types = ("Tài liệu PDF (*.pdf)", "Tất cả tệp (*.*)")
        else:
            file_types = _save_file_types_for_format(app_kind, default_ext)

        # Leave the extension off so the native dialog can append the extension
        # for whichever file type the user selects, including a different format.
        dialog_kwargs = {"save_filename": default_stem, "file_types": file_types}
        # Like Word/Excel/PowerPoint, Save As starts in the folder of the file being edited.
        source_dir = os.path.dirname(str(source_path)) if source_path else ""
        if source_dir and os.path.isdir(source_dir):
            dialog_kwargs["directory"] = source_dir

        try:
            # pywebview's Windows SaveFileDialog uses the native overwrite prompt; if
            # the user declines/cancels it, create_file_dialog returns an empty result.
            save_result = window.create_file_dialog(webview.SAVE_DIALOG, **dialog_kwargs)
        except Exception as exc:
            return {"status": "error", "message": f"Không mở được hộp thoại lưu: {exc}"}

        if not save_result:
            return {"status": "cancelled"}
        dest_path = save_result if isinstance(save_result, str) else save_result[0]

        dest_path, actual_format = _infer_save_format_from_path(dest_path, app_kind=app_kind)
        target_format = actual_format
        if app_kind == "sheet" and target_format == "csv" and _fods_sheet_count(content) > 1:
            try:
                confirmed = window.create_confirmation_dialog(
                    "Xuất CSV chỉ lưu một trang tính",
                    "Tệp CSV chỉ lưu trang tính đang hoạt động; các trang tính khác sẽ không có trong tệp. Bạn có muốn tiếp tục không?",
                )
            except Exception as exc:
                return {"status": "error", "message": f"Không mở được xác nhận xuất CSV: {exc}"}
            if not confirmed:
                return {"status": "cancelled"}
        self._reporting_file_path = dest_path
        self._reporting_operation = f"{'export' if target_format == 'pdf' else 'save'}.{target_format}"
        pdf_engine = None
        pristine_xlsx_save = self._is_pristine_sheet_xlsx_save(content, app_kind, source_path)

        try:
            with tempfile.TemporaryDirectory(prefix="vnoffice_save_") as tmp:
                if pristine_xlsx_save:
                    native_source = os.path.join(tmp, "source.xlsx")
                    with open(native_source, "wb") as source_file:
                        source_file.write(self._current_xlsx_snapshot)
                    if target_format == "xlsx":
                        out_path = native_source
                    elif target_format == "pdf":
                        out_path, pdf_engine = _render_print_source_to_pdf(
                            native_source, app_kind, tmp, use_office=True,
                        )
                    else:
                        out_path = _run_soffice_convert(native_source, target_format, tmp, app_kind=app_kind)
                elif target_format == "pdf":
                    out_path, pdf_engine = _export_content_to_pdf(
                        content, app_kind, tmp, source_document_path=source_path,
                        return_engine=True,
                    )
                else:
                    src_path = _write_save_source(content, app_kind, tmp, target_format)
                    out_path = _convert_save_source_to_native(
                        src_path, app_kind, target_format, source_document_path=source_path,
                    )
                _atomic_replace_file(out_path, dest_path)
                _verify_saved_file(dest_path)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}
        except Exception as exc:
            return {"status": "error", "message": f"Lỗi không xác định khi lưu tệp: {exc}"}

        if target_format != "pdf":
            self._current_file_path = dest_path
            self._refresh_current_xlsx_snapshot(dest_path, app_kind)
        response = {"status": "ok", "message": f"Đã lưu tại {dest_path}", "path": dest_path}
        if target_format == "pdf":
            response["engine"] = pdf_engine or "LibreOffice"
        return response

    def _export_pdf_dialog_impl(self, content, app_kind="writer", suggested_name="TaiLieu", source_path=None):
        return self.save_document_dialog(
            content, app_kind=app_kind, target_format="pdf", suggested_name=suggested_name, source_path=source_path
        )


def _register_app_window(api: VnOfficeApi, window) -> None:
    """Bind window events while keeping the Window object out of pywebview's JS API scan."""
    api._window_uid = str(window.uid)
    with _APP_WINDOW_LOCK:
        _APP_WINDOW_APIS[api._window_uid] = api

    def on_closing(window=None, *_args):
        if api._allow_window_close:
            return None
        target = window or _active_window(api)

        def request_close_in_webview():
            if not target:
                return
            try:
                target.evaluate_js(
                    "if (typeof window.__vnoHandleNativeClose === 'function') "
                    "{ window.__vnoHandleNativeClose(); } "
                    "else { window.pywebview?.api?.close_current_window?.(); }"
                )
            except Exception:
                # If the renderer is gone, allow native shutdown rather than trap an unusable window.
                api._allow_window_close = True
                try:
                    target.destroy()
                except Exception:
                    pass

        threading.Thread(target=request_close_in_webview, daemon=True, name="3T Office close prompt").start()
        return False

    def on_closed(*_args):
        api.close_autorecover_session()
        api.close_print_sessions()
        with _APP_WINDOW_LOCK:
            _APP_WINDOW_APIS.pop(api._window_uid or "", None)

    window.events.closing += on_closing
    window.events.closed += on_closed


def parse_launch_args(argv: list[str]) -> tuple[str | None, str | None]:
    """Parse the app shortcut or Explorer file-association launch arguments."""
    app_kind = None
    file_path = None
    for arg in argv:
        if arg.startswith("--app="):
            candidate = arg.split("=", 1)[1].lower()
            if candidate not in VALID_APP_KINDS:
                raise ValueError(f"Ứng dụng không hợp lệ: {candidate}")
            app_kind = candidate
        elif not arg.startswith("-") and file_path is None:
            file_path = str(Path(arg).expanduser().resolve())

    if file_path:
        inferred_app = FILE_APP_KINDS.get(Path(file_path).suffix.lower())
        if not inferred_app:
            raise ValueError(f"Định dạng tệp chưa được hỗ trợ: {Path(file_path).suffix or '(không có)'}")
        if app_kind and app_kind != inferred_app:
            raise ValueError("Tham số --app không khớp với định dạng tệp.")
        app_kind = inferred_app

    return app_kind, file_path


def build_launch_url(
    app_kind: str | None,
    initial_file: str | None,
    port: int = _DEFAULT_STATIC_PORT,
    document_name: str | None = None,
) -> str:
    if not app_kind:
        return f"http://localhost:{port}"
    query = {"app": app_kind, "singleApp": "1"}
    if initial_file:
        query["openFile"] = "1"
    if document_name:
        query["documentName"] = document_name
    if os.environ.get("VNO_PERF_DEBUG") == "1":
        query["perfDebug"] = "1"
    return f"http://localhost:{port}/?{urlencode(query)}"


def _update_token_from_args(argv: list[str]) -> str | None:
    for arg in argv:
        if arg.startswith("--update-health-token="):
            token = arg.split("=", 1)[1].lower()
            if re.fullmatch(r"[0-9a-f]{32}", token):
                return token
    return None


def _write_profile_warmup_docx(path: str) -> None:
    members = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>""",
        "word/document.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>3T Office local profile warm-up</w:t></w:r></w:p>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>""",
        "word/styles.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr/></w:pPrDefault></w:docDefaults></w:styles>""",
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name, content in members.items():
            package.writestr(name, content)


def _write_profile_warmup_xlsx(path: str) -> None:
    members = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
        "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>""",
        "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""",
        "xl/worksheets/sheet1.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>3T Office local profile warm-up</t></is></c></row>
</sheetData></worksheet>""",
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name, content in members.items():
            package.writestr(name, content)


def _profile_filter_warm_marker(app_kind: str) -> Path:
    return _user_data_dir() / f"lo-profile-{app_kind}" / ".vnoffice-open-filters-warm-v1"


def _warmup_persistent_filter(app_kind: str) -> None:
    """Prime the open filter while the window initializes, before the first user open."""
    marker = _profile_filter_warm_marker(app_kind)
    if marker.is_file():
        _open_perf_log("background_filter_warmup_skipped", app=app_kind, reason="profile-already-primed")
        return
    with tempfile.TemporaryDirectory(prefix="vnoffice_filter_warmup_") as temp_dir:
        if app_kind == "writer":
            source_path = os.path.join(temp_dir, "vnoffice-filter-warmup.docx")
            target_ext = "html"
            _write_profile_warmup_docx(source_path)
        elif app_kind == "sheet":
            source_path = os.path.join(temp_dir, "vnoffice-filter-warmup.xlsx")
            target_ext = "fods"
            _write_profile_warmup_xlsx(source_path)
        else:
            return
        started = time.perf_counter()
        _run_soffice_convert(source_path, target_ext, temp_dir, app_kind=app_kind)
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text("LibreOffice open import filter warmed by 3T Office.\n", encoding="utf-8")
        _open_perf_log(
            "background_filter_warmup",
            (time.perf_counter() - started) * 1000,
            app=app_kind,
        )


def _warmup_libreoffice_profiles() -> int:
    """Create the same local Writer/Sheet profiles used at runtime and prime their import filters."""
    global _PERSISTENT_SOFFICE_ENABLED
    if not SOFFICE_PATH:
        print("[3T Office] LibreOffice profile warm-up skipped: soffice was not found.", flush=True)
        return 1

    previous_persistent_state = _PERSISTENT_SOFFICE_ENABLED
    _PERSISTENT_SOFFICE_ENABLED = False
    try:
        with tempfile.TemporaryDirectory(prefix="vnoffice_lo_warmup_") as temp_dir:
            writer_input = os.path.join(temp_dir, "vnoffice-profile-warmup.docx")
            sheet_input = os.path.join(temp_dir, "vnoffice-profile-warmup.xlsx")
            _write_profile_warmup_docx(writer_input)
            _write_profile_warmup_xlsx(sheet_input)
            writer_started = time.perf_counter()
            _run_soffice_convert(writer_input, "html", temp_dir, app_kind="writer")
            writer_marker = _profile_filter_warm_marker("writer")
            writer_marker.parent.mkdir(parents=True, exist_ok=True)
            writer_marker.write_text("LibreOffice open import filter warmed by 3T Office.\n", encoding="utf-8")
            _open_perf_log("install_profile_warmup", (time.perf_counter() - writer_started) * 1000, app="writer")
            sheet_started = time.perf_counter()
            _run_soffice_convert(sheet_input, "fods", temp_dir, app_kind="sheet")
            sheet_marker = _profile_filter_warm_marker("sheet")
            sheet_marker.parent.mkdir(parents=True, exist_ok=True)
            sheet_marker.write_text("LibreOffice open import filter warmed by 3T Office.\n", encoding="utf-8")
            _open_perf_log("install_profile_warmup", (time.perf_counter() - sheet_started) * 1000, app="sheet")
        print("[3T Office] LibreOffice Writer and Sheet profiles are ready for first open.", flush=True)
        return 0
    except Exception as exc:
        print(f"[3T Office] LibreOffice profile warm-up failed: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        _PERSISTENT_SOFFICE_ENABLED = previous_persistent_state


def main(argv: list[str] | None = None):
    global _ERROR_REPORTER, _UPDATE_MANAGER, _UPDATE_DATA_DIR, _PERSISTENT_SOFFICE_ENABLED
    launch_argv = list(sys.argv[1:] if argv is None else argv)
    if launch_argv == ["--warmup-libreoffice-profiles"]:
        return _warmup_libreoffice_profiles()

    try:
        app_kind, initial_file = parse_launch_args(launch_argv)
    except ValueError as exc:
        print(f"[3T Office] {exc}", file=sys.stderr)
        return 2

    instance_server = None
    if app_kind in VALID_APP_KINDS:
        _INSTANCE_DISPATCH_READY.clear()
        _INSTANCE_DISPATCH_STOP.clear()
        request_id = _EARLY_SINGLE_INSTANCE_REQUEST_ID or uuid.uuid4().hex
        lock_contention_started = time.monotonic()
        for _attempt in range(200):
            candidate = SingleInstanceServer(
                app_kind,
                _user_data_dir(),
                _queue_single_instance_request,
                on_ownership_lost=_on_single_instance_ownership_lost,
                on_ping=_ping_single_instance_router,
            )
            try:
                candidate.start()
                instance_server = candidate
                break
            except InstanceAlreadyRunning:
                forwarded = forward_launch_request(
                    _user_data_dir(), app_kind, initial_file, timeout=0.75, request_id=request_id
                )
                if forwarded and forwarded.get("accepted") is True:
                    return 0
                if _attempt >= 3:
                    try:
                        missing_endpoint_grace_elapsed = time.monotonic() - lock_contention_started >= 8.0
                        if candidate.take_over_unresponsive(
                            timeout=0.45,
                            allow_missing=missing_endpoint_grace_elapsed,
                        ):
                            instance_server = candidate
                            break
                    except OSError as exc:
                        print(f"[3T Office] Không thể tiếp quản IPC cục bộ cho {app_kind}: {exc}", file=sys.stderr)
                        return 4
                time.sleep(0.05)
            except OSError as exc:
                print(f"[3T Office] Không thể mở IPC cục bộ cho {app_kind}: {exc}", file=sys.stderr)
                return 4
        if instance_server is None:
            print(
                f"[3T Office] Không thể kết nối phiên {app_kind} đang chạy và khóa IPC chưa được giải phóng.",
                file=sys.stderr,
            )
            return 4

    report_config = load_client_config(ROOT_DIR)
    _UPDATE_DATA_DIR = _user_data_dir() / "updates"
    try:
        _ERROR_REPORTER = ErrorReporter(
            APP_VERSION,
            app_kind,
            _user_data_dir(),
            endpoint=str(report_config["endpoint"]),
            token=str(report_config["token"]),
            enabled=bool(report_config["enabled"]),
        )
        _ERROR_REPORTER.install_exception_hooks()
    except Exception:
        # Reporting storage/configuration failures must never prevent offline startup.
        _ERROR_REPORTER = None

    install_root = _update_install_root()
    if install_root:
        try:
            installed_version = (install_root / "VERSION.txt").read_text(encoding="ascii").strip() or APP_VERSION
            update_config = _load_update_config()
            _UPDATE_MANAGER = UpdaterManager(
                install_dir=install_root,
                updates_dir=_UPDATE_DATA_DIR,
                current_version=installed_version,
                source=update_config["source"],
                channel=update_config["channel"],
                public_key=get_public_key(),
                on_state=_notify_update_ui,
            )
            _UPDATE_MANAGER.set_launch_args(launch_argv)
        except Exception as exc:
            # A malformed update config/version must never prevent offline document work.
            logging.getLogger("vnoffice.updater").debug("Updater initialization unavailable: %s", type(exc).__name__)
            _UPDATE_MANAGER = None
    else:
        _UPDATE_MANAGER = None
    queue_rollback_report(_ERROR_REPORTER, _UPDATE_DATA_DIR)

    # Start embedded static-file server BEFORE creating the webview window
    # so the UI is guaranteed to load without ERR_CONNECTION_REFUSED.
    try:
        server, port = _start_static_server()
    except RuntimeError as exc:
        msg = (
            f"3T Office không thể khởi động.\n\n"
            f"Nguyên nhân: {exc}\n\n"
            f"Vui lòng kiểm tra:\n"
            f"• Phần mềm diệt virus hoặc tường lửa có đang chặn ứng dụng không.\n"
            f"• Thử khởi động lại máy tính."
        )
        if platform.system() == "Windows":
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, msg, "3T Office — Lỗi khởi động", 0x10)
            except Exception:
                print(f"[3T Office] {msg}", file=sys.stderr)
        else:
            print(f"[3T Office] {msg}", file=sys.stderr)
        if instance_server is not None:
            _INSTANCE_DISPATCH_STOP.set()
            instance_server.stop()
        return 3

    print(f"[3T Office] Embedded server ready at http://localhost:{port}")

    _PERSISTENT_SOFFICE_ENABLED = os.environ.get("VNOFFICE_DISABLE_UNO") != "1"

    api = VnOfficeApi(app_kind=app_kind, initial_file=initial_file, server_port=port)
    if app_kind in VALID_APP_KINDS:
        with _DOCUMENT_SEQUENCE_LOCK:
            _DOCUMENT_SEQUENCE[app_kind] = 1

    window = webview.create_window(
        title=APP_TITLES.get(app_kind, SUITE_TITLE),
        url=build_launch_url(app_kind, initial_file, port=port),
        width=1366,
        height=820,
        min_size=(960, 640),
        # Office opens maximized; a fixed-size window ended up in a screen corner (pilot 30/9).
        # width/height remain the restore size when the user un-maximizes.
        maximized=True,
        js_api=api,
        text_select=True,
    )

    _register_app_window(api, window)

    if instance_server is not None:
        threading.Thread(
            target=_dispatch_single_instance_requests,
            daemon=True,
            name=f"3T Office {app_kind} window router",
        ).start()

    startup_worker_kind = app_kind if app_kind in {"writer", "sheet"} else None
    if _PERSISTENT_SOFFICE_ENABLED and startup_worker_kind:
        threading.Thread(
            target=_PERSISTENT_SOFFICE.prepare,
            args=(startup_worker_kind,),
            daemon=True,
            name="3T Office LibreOffice warm start",
        ).start()

    # Set Windows AppUserModelID so the taskbar groups and shows the app's specific icon
    if platform.system() == "Windows":
        try:
            import ctypes
            aumid = f"VNOffice.{app_kind.capitalize() if app_kind in VALID_APP_KINDS else 'Suite'}"
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(aumid)
        except Exception:
            pass

    icon_name = f"{app_kind}.ico" if app_kind in VALID_APP_KINDS else "vnoffice.ico"
    icon_path = os.path.join(ROOT_DIR, "branding", "icons", icon_name)
    if not os.path.isfile(icon_path):
        icon_path = os.path.join(ROOT_DIR, "branding", "icons", "vnoffice.ico")
    app_icon = icon_path if os.path.isfile(icon_path) else None

    health_token = _update_token_from_args(launch_argv) or os.environ.get("VNO_UPDATE_HEALTH_TOKEN", "").lower()
    expected_health_file = os.environ.get("VNO_UPDATE_HEALTH_FILE", "")

    def on_loaded(*_args):
        if not health_token or not re.fullmatch(r"[0-9a-f]{32}", health_token):
            return
        health_root = _UPDATE_DATA_DIR
        if expected_health_file:
            candidate = Path(expected_health_file)
            if candidate.name != f"health-{health_token}.ok":
                return
            try:
                if _UPDATE_DATA_DIR and candidate.parent.resolve() != _UPDATE_DATA_DIR.resolve():
                    return
            except OSError:
                return
            health_root = candidate.parent
        if health_root:
            write_health_marker(health_root, health_token)

    try:
        window.events.loaded += on_loaded
    except Exception:
        pass

    try:
        webview.start(
            lambda: _INSTANCE_DISPATCH_READY.set(),
            debug=os.environ.get("VNO_PERF_DEBUG") == "1",
            icon=app_icon,
        )
    except SystemExit:
        pass
    except Exception as exc:
        print(f"[3T Office] Thoát cửa sổ: {exc}")
    finally:
        _INSTANCE_DISPATCH_STOP.set()
        _INSTANCE_DISPATCH_READY.set()
        if instance_server is not None:
            # Stop accepting windows first, but keep the owner lock until the shared
            # LibreOffice worker has shut down so a replacement process cannot overlap it.
            instance_server.stop_listener()
        with _APP_WINDOW_LOCK:
            remaining_apis = list(_APP_WINDOW_APIS.values())
            _APP_WINDOW_APIS.clear()
        for active_api in remaining_apis:
            active_api.close_autorecover_session()
        try:
            _PERSISTENT_SOFFICE.shutdown()
        finally:
            if instance_server is not None:
                instance_server.release_owner_lock()
            try:
                server.shutdown()
                server.server_close()
            except Exception:
                pass
        os._exit(0)


if __name__ == "__main__":
    raise SystemExit(main())
