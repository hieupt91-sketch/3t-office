"""Per-user, per-app single-instance routing over authenticated loopback TCP.

The endpoint metadata contains a random session token and is kept in the app's
user-data directory. A locked file provides owner election; the operating
system releases the lock when its process exits, so a crash-left endpoint file
does not prevent the next launch from taking ownership.
"""

from __future__ import annotations

import hmac
import json
import os
import secrets
import socket
import socketserver
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Callable

PROTOCOL_VERSION = 1
MAX_MESSAGE_BYTES = 131072
VALID_APP_KINDS = {"writer", "sheet", "slides"}
LOOPBACK_HOST = "127.0.0.1"


class InstanceAlreadyRunning(RuntimeError):
    """Raised when another process currently holds this app's owner lock."""


def _lock_file_nonblocking(lock_file) -> bool:
    lock_file.seek(0, os.SEEK_END)
    if lock_file.tell() == 0:
        lock_file.write(b"\0")
        lock_file.flush()
        os.fsync(lock_file.fileno())
    lock_file.seek(0)
    try:
        if os.name == "nt":
            import msvcrt

            msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (OSError, BlockingIOError):
        return False
    return True


def _unlock_file(lock_file) -> None:
    lock_file.seek(0)
    if os.name == "nt":
        import msvcrt

        msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl

        fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _atomic_json_write(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        if os.name != "nt":
            os.chmod(temp_name, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, separators=(",", ":"))
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


def _read_endpoint(path: Path, expected_app_kind: str) -> dict[str, object] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return None
    if not isinstance(value, dict):
        return None
    host = value.get("host")
    port = value.get("port")
    token = value.get("token")
    session_id = value.get("session_id")
    if (
        value.get("protocol") != PROTOCOL_VERSION
        or value.get("app_kind") != expected_app_kind
        or host != LOOPBACK_HOST
        or type(port) is not int
        or not 1 <= port <= 65535
        or not isinstance(token, str)
        or len(token) != 64
        or not isinstance(session_id, str)
    ):
        return None
    return value


def forward_launch_request(
    app_data_dir: str | Path,
    app_kind: str,
    file_path: str | None,
    *,
    timeout: float = 0.35,
    request_id: str | None = None,
    ping: bool = False,
) -> dict[str, object] | None:
    """Forward a file-open or new-document request to the current owner.

    Returns the owner's response, or ``None`` when the endpoint is stale or
    unreachable. The message carries a path only; document contents never pass
    through this IPC channel.
    """
    if app_kind not in VALID_APP_KINDS:
        return None
    endpoint_path = Path(app_data_dir) / f"single-instance-{app_kind}.json"
    endpoint = _read_endpoint(endpoint_path, app_kind)
    if endpoint is None:
        return None
    message = {
        "protocol": PROTOCOL_VERSION,
        "app_kind": app_kind,
        "token": endpoint["token"],
        "request_id": request_id or uuid.uuid4().hex,
        "action": "ping" if ping else ("open" if file_path is not None else "new"),
        "path": None if ping else file_path,
    }
    try:
        payload = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
        if len(payload) > MAX_MESSAGE_BYTES:
            return {"accepted": False, "error": "request_too_large"}
        with socket.create_connection((LOOPBACK_HOST, int(endpoint["port"])), timeout=timeout) as connection:
            connection.settimeout(timeout)
            connection.sendall(payload)
            with connection.makefile("rb") as response_stream:
                response_line = response_stream.readline(8192)
        response = json.loads(response_line.decode("utf-8"))
        return response if isinstance(response, dict) else None
    except (OSError, UnicodeError, ValueError, TypeError):
        return None


class _ThreadingLoopbackServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = False
    daemon_threads = True
    block_on_close = False

    def __init__(self, address, handler, *, owner):
        self.owner = owner
        super().__init__(address, handler)


class _RequestHandler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        self.request.settimeout(1.0)
        line = self.rfile.readline(MAX_MESSAGE_BYTES + 1)
        if not line or len(line) > MAX_MESSAGE_BYTES or not line.endswith(b"\n"):
            self._respond({"accepted": False, "error": "invalid_message"})
            return
        try:
            message = json.loads(line.decode("utf-8"))
        except (UnicodeError, ValueError):
            self._respond({"accepted": False, "error": "invalid_json"})
            return
        response = self.server.owner.accept_message(message)
        self._respond(response)

    def _respond(self, value: dict[str, object]) -> None:
        try:
            payload = json.dumps(value, separators=(",", ":")).encode("utf-8") + b"\n"
            self.wfile.write(payload[:8192])
            self.wfile.flush()
        except OSError:
            pass


class SingleInstanceServer:
    """Own one app-kind endpoint and enqueue authenticated launch requests."""

    def __init__(
        self,
        app_kind: str,
        app_data_dir: str | Path,
        on_request: Callable[[dict[str, object]], object],
        on_ownership_lost: Callable[[], object] | None = None,
        on_ping: Callable[[], bool] | None = None,
    ):
        if app_kind not in VALID_APP_KINDS:
            raise ValueError(f"Unknown app kind: {app_kind}")
        self.app_kind = app_kind
        self.app_data_dir = Path(app_data_dir)
        self.lock_path = self.app_data_dir / f"single-instance-{app_kind}.lock"
        self.election_lock_path = self.app_data_dir / f"single-instance-{app_kind}.election.lock"
        self.endpoint_path = self.app_data_dir / f"single-instance-{app_kind}.json"
        self.on_request = on_request
        self.on_ownership_lost = on_ownership_lost
        self.on_ping = on_ping
        self.session_id = uuid.uuid4().hex
        self.token = secrets.token_hex(32)
        self._lock_file = None
        self._server: _ThreadingLoopbackServer | None = None
        self._server_thread: threading.Thread | None = None
        self._watcher_stop = threading.Event()
        self._watcher_thread: threading.Thread | None = None
        self._owns_lock = False
        self._owns_endpoint = False
        self._request_lock = threading.Lock()
        self._request_responses: dict[str, dict[str, object]] = {}

    @property
    def owns_lock(self) -> bool:
        return self._owns_lock

    def start(self) -> None:
        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        lock_file = self.lock_path.open("a+b")
        if os.name != "nt":
            try:
                os.chmod(self.lock_path, 0o600)
            except OSError:
                pass
        if not _lock_file_nonblocking(lock_file):
            lock_file.close()
            raise InstanceAlreadyRunning(self.app_kind)
        self._lock_file = lock_file
        self._owns_lock = True
        try:
            self._publish_endpoint()
        except BaseException:
            self.stop()
            raise

    def _publish_endpoint(self) -> None:
        self._server = _ThreadingLoopbackServer((LOOPBACK_HOST, 0), _RequestHandler, owner=self)
        port = int(self._server.server_address[1])
        self._server_thread = threading.Thread(
            target=self._server.serve_forever,
            name=f"VN Office {self.app_kind} IPC",
            daemon=True,
        )
        self._server_thread.start()
        _atomic_json_write(
            self.endpoint_path,
            {
                "protocol": PROTOCOL_VERSION,
                "app_kind": self.app_kind,
                "host": LOOPBACK_HOST,
                "port": port,
                "token": self.token,
                "session_id": self.session_id,
                "pid": os.getpid(),
            },
        )
        self._owns_endpoint = True
        self._watcher_stop.clear()
        self._watcher_thread = threading.Thread(
            target=self._watch_endpoint,
            name=f"VN Office {self.app_kind} IPC ownership watcher",
            daemon=True,
        )
        self._watcher_thread.start()

    def take_over_unresponsive(self, *, timeout: float = 0.15, allow_missing: bool = False) -> bool:
        """Publish a new endpoint after an owner has stopped answering.

        The election lock is held only while checking and replacing the endpoint,
        so launchers that race takeover either forward to the winner or elect the
        next owner if that endpoint is already stale.
        """
        if self._owns_endpoint:
            return True
        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        election_file = self.election_lock_path.open("a+b")
        if not _lock_file_nonblocking(election_file):
            election_file.close()
            return False
        try:
            # A missing endpoint is also used during the current owner's normal
            # shutdown. Wait for its held owner lock to release instead of racing
            # its LibreOffice shutdown with an unnecessary takeover.
            if not self.endpoint_path.exists() and not allow_missing:
                return False
            endpoint = _read_endpoint(self.endpoint_path, self.app_kind)
            if endpoint is not None:
                forwarded = forward_launch_request(
                    self.app_data_dir, self.app_kind, None, timeout=timeout, ping=True
                )
                if forwarded and forwarded.get("accepted") is True:
                    return False
            try:
                self._publish_endpoint()
            except BaseException:
                self.stop_listener()
                raise
            return True
        finally:
            try:
                _unlock_file(election_file)
            except OSError:
                pass
            election_file.close()

    def _watch_endpoint(self) -> None:
        while not self._watcher_stop.wait(0.25):
            endpoint = _read_endpoint(self.endpoint_path, self.app_kind)
            if endpoint is not None and endpoint.get("session_id") == self.session_id:
                continue
            self._owns_endpoint = False
            self._watcher_stop.set()
            if self.on_ownership_lost is not None:
                try:
                    self.on_ownership_lost()
                except Exception:
                    pass
            return

    def accept_message(self, message: object) -> dict[str, object]:
        if not isinstance(message, dict):
            return {"accepted": False, "error": "invalid_message"}
        token = message.get("token")
        request_id = message.get("request_id")
        action = message.get("action")
        path = message.get("path")
        if (
            message.get("protocol") != PROTOCOL_VERSION
            or message.get("app_kind") != self.app_kind
            or not isinstance(token, str)
            or not hmac.compare_digest(token, self.token)
            or not isinstance(request_id, str)
            or len(request_id) != 32
            or action not in {"open", "new", "ping"}
            or (path is not None and (not isinstance(path, str) or len(path) > 32767))
            or (action == "open" and path is None)
            or (action != "open" and path is not None)
        ):
            return {"accepted": False, "error": "unauthorized_or_invalid_request"}
        endpoint = _read_endpoint(self.endpoint_path, self.app_kind)
        if endpoint is None or endpoint.get("session_id") != self.session_id:
            return {"accepted": False, "error": "owner_replaced"}
        if action == "ping":
            try:
                responsive = self.on_ping() if self.on_ping is not None else True
            except Exception:
                responsive = False
            return {"accepted": bool(responsive), "pong": bool(responsive), "request_id": request_id}
        with self._request_lock:
            cached = self._request_responses.get(request_id)
            if cached is not None:
                return cached
            request = {"app_kind": self.app_kind, "request_id": request_id, "action": action, "path": path}
            try:
                result = self.on_request(request)
            except Exception:
                result = {"accepted": False, "error": "request_not_queued"}
            if result is False or (isinstance(result, dict) and result.get("accepted") is False):
                response = result if isinstance(result, dict) else {"accepted": False, "error": "request_not_queued"}
            else:
                response = {"accepted": True, "request_id": request_id}
            self._request_responses[request_id] = response
            if len(self._request_responses) > 1024:
                self._request_responses.pop(next(iter(self._request_responses)))
            return response

    def stop(self) -> None:
        self.stop_listener()
        self.release_owner_lock()

    def stop_listener(self) -> None:
        self._watcher_stop.set()
        watcher = self._watcher_thread
        self._watcher_thread = None
        if watcher is not None and watcher is not threading.current_thread():
            watcher.join(timeout=1.0)
        server = self._server
        self._server = None
        if server is not None:
            try:
                server.shutdown()
            except (OSError, RuntimeError):
                pass
            try:
                server.server_close()
            except OSError:
                pass
        thread = self._server_thread
        self._server_thread = None
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=1.0)

        if self._owns_endpoint:
            endpoint = _read_endpoint(self.endpoint_path, self.app_kind)
            if endpoint and endpoint.get("session_id") == self.session_id:
                try:
                    self.endpoint_path.unlink(missing_ok=True)
                except OSError:
                    pass
            self._owns_endpoint = False

    def release_owner_lock(self) -> None:
        if self._owns_lock:
            lock_file = self._lock_file
            self._lock_file = None
            self._owns_lock = False
            if lock_file is not None:
                try:
                    _unlock_file(lock_file)
                except OSError:
                    pass
                try:
                    lock_file.close()
                except OSError:
                    pass
