"""Small stdlib-only WebView2 CDP client for desktop layout audits."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import socket
import struct
import time
import urllib.request


def available_debug_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as candidate:
        candidate.bind(("127.0.0.1", 0))
        return int(candidate.getsockname()[1])


def enable_webview2_debugging(port: int | None = None) -> int:
    port = int(port or available_debug_port())
    current = os.environ.get("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "").strip()
    argument = f"--remote-debugging-port={port}"
    os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = f"{current} {argument}".strip()
    return port


class WebView2Cdp:
    def __init__(self, connection: socket.socket, buffered: bytes = b""):
        self.connection = connection
        self.buffer = bytearray(buffered)
        self.fragments: list[bytes] = []
        self.next_id = 0

    @classmethod
    def connect(cls, port: int, timeout: float = 30.0) -> "WebView2Cdp":
        deadline = time.monotonic() + timeout
        last_error: Exception | None = None
        target = None
        while time.monotonic() < deadline:
            try:
                request = urllib.request.Request(f"http://127.0.0.1:{int(port)}/json/list")
                with urllib.request.urlopen(request, timeout=1.0) as response:
                    targets = json.loads(response.read().decode("utf-8"))
                target = next((
                    item for item in targets
                    if item.get("type") == "page"
                    and item.get("webSocketDebuggerUrl")
                    and str(item.get("url") or "").lower().startswith(("http://localhost", "http://127.0.0.1", "https://localhost", "https://127.0.0.1"))
                ), None)
                if target:
                    break
            except Exception as exc:
                last_error = exc
            time.sleep(0.1)
        if not target:
            raise TimeoutError(f"WebView2 CDP target did not appear on port {port}: {last_error}")

        url = target["webSocketDebuggerUrl"]
        from urllib.parse import urlparse

        parsed = urlparse(url)
        connection = socket.create_connection((parsed.hostname or "127.0.0.1", parsed.port or 80), timeout=timeout)
        key = base64.b64encode(secrets.token_bytes(16)).decode("ascii")
        path = parsed.path + (("?" + parsed.query) if parsed.query else "")
        host = f"{parsed.hostname}:{parsed.port}"
        connection.sendall((
            f"GET {path} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        ).encode("ascii"))
        handshake = bytearray()
        while b"\r\n\r\n" not in handshake:
            chunk = connection.recv(4096)
            if not chunk:
                connection.close()
                raise ConnectionError("WebView2 CDP closed during WebSocket handshake")
            handshake.extend(chunk)
        end = handshake.index(b"\r\n\r\n") + 4
        headers = handshake[:end].decode("latin1", "replace")
        if " 101 " not in headers:
            connection.close()
            raise ConnectionError(f"WebView2 CDP WebSocket handshake failed: {headers.splitlines()[0]}")
        expected = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()).decode("ascii")
        if expected.lower() not in headers.lower():
            connection.close()
            raise ConnectionError("WebView2 CDP returned an invalid WebSocket accept key")
        return cls(connection, bytes(handshake[end:]))

    def _send_frame(self, payload: bytes, opcode: int = 1) -> None:
        mask = secrets.token_bytes(4)
        size = len(payload)
        if size < 126:
            header = bytes((0x80 | opcode, 0x80 | size))
        elif size < 65536:
            header = bytes((0x80 | opcode, 0x80 | 126)) + struct.pack(">H", size)
        else:
            header = bytes((0x80 | opcode, 0x80 | 127)) + struct.pack(">Q", size)
        masked = bytes(value ^ mask[index & 3] for index, value in enumerate(payload))
        self.connection.sendall(header + mask + masked)

    def _read_exact(self, size: int) -> bytes:
        while len(self.buffer) < size:
            chunk = self.connection.recv(max(4096, size - len(self.buffer)))
            if not chunk:
                raise ConnectionError("WebView2 CDP socket closed")
            self.buffer.extend(chunk)
        result = bytes(self.buffer[:size])
        del self.buffer[:size]
        return result

    def _read_frame(self) -> tuple[int, bytes, bool]:
        first, second = self._read_exact(2)
        final = bool(first & 0x80)
        opcode = first & 0x0F
        masked = bool(second & 0x80)
        size = second & 0x7F
        if size == 126:
            size = struct.unpack(">H", self._read_exact(2))[0]
        elif size == 127:
            size = struct.unpack(">Q", self._read_exact(8))[0]
        mask = self._read_exact(4) if masked else b""
        payload = self._read_exact(size)
        if masked:
            payload = bytes(value ^ mask[index & 3] for index, value in enumerate(payload))
        return opcode, payload, final

    def send(self, method: str, params: dict | None = None, timeout: float = 30.0) -> dict:
        self.next_id += 1
        request_id = self.next_id
        self.connection.settimeout(timeout)
        self._send_frame(json.dumps({"id": request_id, "method": method, "params": params or {}}).encode("utf-8"))
        while True:
            opcode, payload, final = self._read_frame()
            if opcode == 9:
                self._send_frame(payload, opcode=10)
                continue
            if opcode == 8:
                raise ConnectionError("WebView2 CDP closed")
            if opcode == 0:
                self.fragments.append(payload)
                if not final:
                    continue
                payload = b"".join(self.fragments)
                self.fragments.clear()
            elif not final:
                self.fragments = [payload]
                continue
            if opcode not in (0, 1):
                continue
            message = json.loads(payload.decode("utf-8"))
            if message.get("id") != request_id:
                continue
            if "error" in message:
                raise RuntimeError(message["error"].get("message") or "CDP command failed")
            return message.get("result") or {}

    def evaluate(self, expression: str, *, await_promise: bool = True, timeout: float = 60.0):
        result = self.send("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": bool(await_promise),
            "returnByValue": True,
            "userGesture": True,
        }, timeout=timeout)
        if result.get("exceptionDetails"):
            detail = result["exceptionDetails"]
            raise RuntimeError(detail.get("text") or "CDP Runtime.evaluate failed")
        return (result.get("result") or {}).get("value")

    def close(self) -> None:
        try:
            self._send_frame(b"", opcode=8)
        except OSError:
            pass
        try:
            self.connection.close()
        except OSError:
            pass
