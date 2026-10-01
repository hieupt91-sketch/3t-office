"""Authenticated loopback RPC used by the optional per-user Office Quick Start service."""

from __future__ import annotations

import hmac
import json
import os
import secrets
import socket
import socketserver
import threading
import uuid
from pathlib import Path
from typing import Callable

_PROTOCOL = 1
_MAX_REQUEST_BYTES = 2 * 1024 * 1024
_HOST = "127.0.0.1"


class QuickStartUnavailable(RuntimeError):
    """The optional local warm-worker service is not running or did not respond."""


class _ThreadingRpcServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = False
    daemon_threads = True
    block_on_close = False

    def __init__(self, address, handler, *, owner):
        self.owner = owner
        super().__init__(address, handler)


class _RequestHandler(socketserver.StreamRequestHandler):
    def handle(self):
        line = self.rfile.readline(_MAX_REQUEST_BYTES + 1)
        if len(line) > _MAX_REQUEST_BYTES or not line.endswith(b"\n"):
            self._send({"ok": False, "error": "request_too_large"})
            return
        try:
            request = json.loads(line.decode("utf-8"))
        except (UnicodeError, ValueError):
            self._send({"ok": False, "error": "invalid_json"})
            return
        if not isinstance(request, dict) or request.get("protocol") != _PROTOCOL:
            self._send({"ok": False, "error": "invalid_protocol"})
            return
        if not hmac.compare_digest(str(request.get("token", "")), self.server.owner.token):
            self._send({"ok": False, "error": "unauthorized"})
            return
        try:
            response = self.server.owner.on_request(request)
        except Exception as exc:
            response = {"ok": False, "error": str(exc)[:500]}
        self._send(response if isinstance(response, dict) else {"ok": True, "result": response})

    def _send(self, value):
        try:
            payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
            self.wfile.write(payload[:_MAX_REQUEST_BYTES])
            self.wfile.flush()
        except OSError:
            pass


class QuickStartServer:
    """Own an authenticated loopback endpoint for one long-lived UNO worker."""

    def __init__(self, app_data_dir: str | Path, on_request: Callable[[dict], dict]):
        self.app_data_dir = Path(app_data_dir)
        self.endpoint_path = self.app_data_dir / "quick-start-endpoint.json"
        self.lock_path = self.app_data_dir / "quick-start.lock"
        self.on_request = on_request
        self.token = secrets.token_hex(32)
        self.session_id = uuid.uuid4().hex
        self._lock_file = None
        self._server: _ThreadingRpcServer | None = None
        self._thread: threading.Thread | None = None
        self._stopped = threading.Event()

    def start(self) -> None:
        from _vno_single_instance import _atomic_json_write, _lock_file_nonblocking

        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        lock_file = self.lock_path.open("a+b")
        if os.name != "nt":
            try:
                os.chmod(self.lock_path, 0o600)
            except OSError:
                pass
        if not _lock_file_nonblocking(lock_file):
            lock_file.close()
            raise QuickStartUnavailable("Quick Start is already running.")
        self._lock_file = lock_file
        try:
            self._server = _ThreadingRpcServer((_HOST, 0), _RequestHandler, owner=self)
            port = int(self._server.server_address[1])
            _atomic_json_write(
                self.endpoint_path,
                {
                    "protocol": _PROTOCOL,
                    "host": _HOST,
                    "port": port,
                    "token": self.token,
                    "session_id": self.session_id,
                    "pid": os.getpid(),
                },
            )
            self._thread = threading.Thread(
                target=self._server.serve_forever,
                daemon=True,
                name="3T Office Quick Start RPC",
            )
            self._thread.start()
        except BaseException:
            self.stop()
            raise

    def serve_forever(self) -> None:
        if self._thread:
            self._stopped.wait()

    def stop(self) -> None:
        from _vno_single_instance import _unlock_file

        if self._stopped.is_set():
            return
        self._stopped.set()
        server = self._server
        self._server = None
        if server:
            # socketserver.shutdown() waits for serve_forever(); during a failed
            # start that loop may never have started, so only call it when live.
            thread = self._thread
            if thread and thread.is_alive():
                try:
                    server.shutdown()
                except (RuntimeError, OSError):
                    pass
            server.server_close()
        try:
            value = json.loads(self.endpoint_path.read_text(encoding="utf-8"))
            if value.get("session_id") == self.session_id:
                self.endpoint_path.unlink(missing_ok=True)
        except (OSError, ValueError, AttributeError):
            pass
        if self._lock_file:
            try:
                _unlock_file(self._lock_file)
            except OSError:
                pass
            self._lock_file.close()
            self._lock_file = None


class QuickStartClient:
    def __init__(self, app_data_dir: str | Path):
        self.endpoint_path = Path(app_data_dir) / "quick-start-endpoint.json"

    def request(self, action: str, payload: dict | None = None, *, timeout: float = 180) -> dict:
        try:
            endpoint = json.loads(self.endpoint_path.read_text(encoding="utf-8"))
            if (
                endpoint.get("protocol") != _PROTOCOL
                or endpoint.get("host") != _HOST
                or type(endpoint.get("port")) is not int
                or not 1 <= endpoint["port"] <= 65535
                or not isinstance(endpoint.get("token"), str)
            ):
                raise QuickStartUnavailable("Quick Start endpoint is invalid.")
            message = {
                "protocol": _PROTOCOL,
                "token": endpoint["token"],
                "action": action,
                "payload": payload or {},
            }
            data = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
            if len(data) > _MAX_REQUEST_BYTES:
                raise QuickStartUnavailable("Quick Start request is too large.")
            with socket.create_connection((_HOST, endpoint["port"]), timeout=min(timeout, 2.0)) as connection:
                connection.settimeout(timeout)
                connection.sendall(data)
                with connection.makefile("rb") as response_stream:
                    response_line = response_stream.readline(_MAX_REQUEST_BYTES + 1)
            response = json.loads(response_line.decode("utf-8"))
            if not isinstance(response, dict) or response.get("ok") is not True:
                raise QuickStartUnavailable(str(response.get("error", "Quick Start request failed.")))
            return response
        except QuickStartUnavailable:
            raise
        except (OSError, ValueError, KeyError, UnicodeError, TypeError) as exc:
            raise QuickStartUnavailable(str(exc)) from exc

    def is_available(self) -> bool:
        try:
            return self.request("status", timeout=2).get("ok") is True
        except QuickStartUnavailable:
            return False
