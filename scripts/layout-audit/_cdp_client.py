"""Small standard-library CDP client for the desktop audit scripts."""

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
from urllib.parse import urlsplit


def free_local_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


def _read_exact(sock: socket.socket, count: int) -> bytes:
    chunks = []
    remaining = count
    while remaining:
        chunk = sock.recv(remaining)
        if not chunk:
            raise ConnectionError("WebView2 CDP socket closed")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


class CDPClient:
    def __init__(self, websocket_url: str, timeout: float = 60.0):
        parsed = urlsplit(websocket_url)
        if parsed.scheme != "ws" or not parsed.hostname or not parsed.port:
            raise ValueError("Invalid WebView2 CDP websocket URL")
        self.socket = socket.create_connection((parsed.hostname, parsed.port), timeout=timeout)
        self.socket.settimeout(timeout)
        key = base64.b64encode(secrets.token_bytes(16)).decode("ascii")
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        host = parsed.hostname if parsed.port in (80, 443) else f"{parsed.hostname}:{parsed.port}"
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.socket.sendall(request.encode("ascii"))
        response = bytearray()
        while b"\r\n\r\n" not in response:
            chunk = self.socket.recv(4096)
            if not chunk:
                raise ConnectionError("WebView2 CDP handshake ended early")
            response.extend(chunk)
            if len(response) > 16384:
                raise ConnectionError("WebView2 CDP handshake was too large")
        header, remainder = bytes(response).split(b"\r\n\r\n", 1)
        if remainder:
            raise ConnectionError("Unexpected bytes after WebView2 CDP handshake")
        lines = header.decode("latin-1").split("\r\n")
        if not lines[0].startswith("HTTP/1.1 101"):
            raise ConnectionError(f"WebView2 CDP handshake failed: {lines[0]}")
        headers = {}
        for line in lines[1:]:
            if ":" in line:
                name, value = line.split(":", 1)
                headers[name.strip().lower()] = value.strip()
        expected = base64.b64encode(hashlib.sha1(
            (key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")
        ).digest()).decode("ascii")
        if headers.get("sec-websocket-accept") != expected:
            raise ConnectionError("WebView2 CDP websocket accept key did not match")
        self.next_id = 0
        self._fragments = bytearray()

    def close(self):
        try:
            self.socket.close()
        except OSError:
            pass

    def _send_frame(self, opcode: int, payload: bytes):
        mask = secrets.token_bytes(4)
        length = len(payload)
        if length < 126:
            header = bytes((0x80 | opcode, 0x80 | length))
        elif length < 65536:
            header = bytes((0x80 | opcode, 0x80 | 126)) + struct.pack("!H", length)
        else:
            header = bytes((0x80 | opcode, 0x80 | 127)) + struct.pack("!Q", length)
        masked = bytes(byte ^ mask[index & 3] for index, byte in enumerate(payload))
        self.socket.sendall(header + mask + masked)

    def _receive_message(self) -> str:
        while True:
            first, second = _read_exact(self.socket, 2)
            opcode = first & 0x0F
            length = second & 0x7F
            if length == 126:
                length = struct.unpack("!H", _read_exact(self.socket, 2))[0]
            elif length == 127:
                length = struct.unpack("!Q", _read_exact(self.socket, 8))[0]
            mask = _read_exact(self.socket, 4) if second & 0x80 else None
            payload = _read_exact(self.socket, length) if length else b""
            if mask:
                payload = bytes(byte ^ mask[index & 3] for index, byte in enumerate(payload))
            if opcode == 0x8:
                raise ConnectionError("WebView2 CDP websocket closed by browser")
            if opcode == 0x9:
                self._send_frame(0xA, payload)
                continue
            if opcode == 0xA:
                continue
            if opcode == 0x1:
                self._fragments = bytearray(payload)
                if first & 0x80:
                    return self._fragments.decode("utf-8")
            elif opcode == 0x0:
                self._fragments.extend(payload)
                if first & 0x80:
                    return self._fragments.decode("utf-8")

    def call(self, method: str, params: dict | None = None, timeout: float = 60.0) -> dict:
        self.next_id += 1
        command_id = self.next_id
        message = {"id": command_id, "method": method, "params": params or {}}
        self._send_frame(0x1, json.dumps(message, separators=(",", ":")).encode("utf-8"))
        self.socket.settimeout(timeout)
        while True:
            response = json.loads(self._receive_message())
            if response.get("id") != command_id:
                continue
            if "error" in response:
                raise RuntimeError(f"CDP {method} failed: {response['error']}")
            return response.get("result", {})

    def evaluate(self, expression: str, timeout: float = 120.0):
        response = self.call("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True,
            "userGesture": True,
        }, timeout=timeout)
        if response.get("exceptionDetails"):
            detail = response["exceptionDetails"].get("text") or "Runtime.evaluate threw"
            raise RuntimeError(detail)
        result = response.get("result", {})
        if result.get("subtype") == "error":
            raise RuntimeError(result.get("description") or "Runtime.evaluate returned an error")
        return result.get("value")


def _json_endpoint(port: int, path: str, timeout: float = 2.0):
    url = f"http://127.0.0.1:{port}{path}"
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def connect_to_page(port: int, timeout: float = 60.0) -> CDPClient:
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            for target in _json_endpoint(port, "/json/list"):
                if target.get("type") == "page" and target.get("webSocketDebuggerUrl"):
                    return CDPClient(target["webSocketDebuggerUrl"])
        except Exception as exc:
            last_error = exc
        time.sleep(0.2)
    raise TimeoutError(f"Timed out connecting to WebView2 CDP page: {last_error}")


def connect_to_browser(port: int, timeout: float = 30.0) -> CDPClient:
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            version = _json_endpoint(port, "/json/version")
            url = version.get("webSocketDebuggerUrl")
            if url:
                return CDPClient(url)
        except Exception as exc:
            last_error = exc
        time.sleep(0.2)
    raise TimeoutError(f"Timed out connecting to WebView2 CDP browser: {last_error}")


def process_working_set_bytes(process_id: int) -> int | None:
    """Read a process working set through Win32 without desktop/UI automation."""
    if os.name != "nt" or process_id <= 0:
        return None

    import ctypes
    from ctypes import wintypes

    class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
        _fields_ = [
            ("cb", wintypes.DWORD),
            ("PageFaultCount", wintypes.DWORD),
            ("PeakWorkingSetSize", ctypes.c_size_t),
            ("WorkingSetSize", ctypes.c_size_t),
            ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
            ("QuotaPagedPoolUsage", ctypes.c_size_t),
            ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
            ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
            ("PagefileUsage", ctypes.c_size_t),
            ("PeakPagefileUsage", ctypes.c_size_t),
            ("PrivateUsage", ctypes.c_size_t),
        ]

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    psapi.GetProcessMemoryInfo.argtypes = [
        wintypes.HANDLE,
        ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),
        wintypes.DWORD,
    ]
    psapi.GetProcessMemoryInfo.restype = wintypes.BOOL
    handle = kernel32.OpenProcess(0x0400 | 0x0010, False, process_id)
    if not handle:
        return None
    try:
        counters = PROCESS_MEMORY_COUNTERS_EX()
        counters.cb = ctypes.sizeof(counters)
        if not psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
            return None
        return int(counters.WorkingSetSize)
    finally:
        kernel32.CloseHandle(handle)


def chromium_process_working_sets(client: CDPClient) -> dict:
    try:
        processes = client.call("SystemInfo.getProcessInfo").get("processInfo", [])
    except Exception as exc:
        return {"available": False, "error": str(exc), "processes": []}
    rows = []
    for process in processes:
        process_id = int(process.get("id", 0))
        working_set = process_working_set_bytes(process_id)
        rows.append({
            "id": process_id,
            "type": process.get("type", ""),
            "workingSetBytes": working_set,
        })
    def total(types):
        values = [row["workingSetBytes"] for row in rows if row["type"] in types and row["workingSetBytes"] is not None]
        return sum(values) if values else None
    return {
        "available": any(row["workingSetBytes"] is not None for row in rows),
        "rendererWorkingSetBytes": total({"renderer"}),
        "webviewWorkingSetBytes": total({"browser", "renderer", "gpu", "utility", "network.mojom.NetworkService"}),
        "processes": rows,
    }
