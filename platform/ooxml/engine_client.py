"""Small, local-only JSON Lines client for the optional OOXML engine process."""

from __future__ import annotations

import atexit
import json
import logging
import os
import queue
import subprocess
import threading
from pathlib import Path
from typing import Any


LOGGER = logging.getLogger("vnoffice.ooxml_engine")
DEFAULT_TIMEOUT = 5.0


def find_engine_path(root: str | Path | None = None) -> str | None:
    """Resolve an explicitly configured engine or a packaged/local build."""
    configured = os.environ.get("OOXML_ENGINE_PATH")
    if configured:
        candidate = Path(configured).expanduser()
        return str(candidate.resolve()) if candidate.is_file() else None

    base = Path(root or Path(__file__).resolve().parents[2])
    names = ("ooxml-engine.exe", "ooxml-engine")
    directories = (
        base / "bin",
        base / "bin" / "ooxml-engine",
        base / "ports" / "ios" / "OOXMLKit" / ".build" / "out" / "Products" / "Release-windows-x86_64",
        base / "ports" / "ios" / "OOXMLKit" / ".build" / "release",
    )
    for directory in directories:
        for name in names:
            candidate = directory / name
            if candidate.is_file():
                return str(candidate.resolve())
    return None


class OOXMLUnsupportedError(RuntimeError):
    """The engine explicitly declined one or more delta fields or operations."""

    def __init__(self, unsupported: list[Any], response: dict[str, Any] | None = None):
        self.unsupported = unsupported
        self.response = response or {}
        super().__init__(", ".join(map(str, unsupported)) or "Thao tác OOXML không được hỗ trợ")


class OOXMLProtocolError(RuntimeError):
    """The engine process or JSON Lines protocol failed."""


class EngineClient:
    """Own one engine child; requests are serialized and process restart is lazy."""

    def __init__(self, executable: str | None = None, *, timeout: float = DEFAULT_TIMEOUT, popen=subprocess.Popen) -> None:
        self.executable = executable
        self.timeout = max(0.05, float(timeout))
        self._popen = popen
        self._process: subprocess.Popen[str] | None = None
        self._responses: queue.Queue[str | BaseException | None] | None = None
        self._counter = 0
        self._lock = threading.RLock()
        atexit.register(self.close)

    @property
    def available(self) -> bool:
        if self.executable:
            return Path(self.executable).is_file()
        return bool(find_engine_path())

    def _resolve_executable(self) -> str:
        path = self.executable or find_engine_path()
        if not path:
            raise OOXMLProtocolError("Không tìm thấy ooxml-engine")
        return path

    def _start(self) -> subprocess.Popen[str]:
        process = self._process
        if process is not None and process.poll() is None:
            return process
        self._stop_process()
        env = os.environ.copy()
        runtime = env.get("OOXML_SWIFT_RUNTIME", "").strip()
        if runtime:
            env["PATH"] = runtime + (os.pathsep + env["PATH"] if env.get("PATH") else "")
        process = self._popen(
            [self._resolve_executable()], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, encoding="utf-8", errors="replace",
            bufsize=1, env=env,
        )
        responses: queue.Queue[str | BaseException | None] = queue.Queue()

        def read_responses() -> None:
            try:
                assert process.stdout is not None
                for line in process.stdout:
                    responses.put(line)
            except BaseException as exc:
                responses.put(exc)
            finally:
                responses.put(None)

        threading.Thread(target=read_responses, name="VN Office OOXML engine reader", daemon=True).start()
        self._process = process
        self._responses = responses
        return process

    def request(self, op: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
        with self._lock:
            process = self._start()
            self._counter += 1
            request_id = self._counter
            try:
                assert process.stdin is not None and self._responses is not None
                payload = {"id": request_id, "op": str(op), "args": args or {}}
                process.stdin.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
                process.stdin.flush()
                line = self._responses.get(timeout=self.timeout)
                if isinstance(line, BaseException):
                    raise OOXMLProtocolError(f"Lỗi đọc phản hồi engine: {type(line).__name__}")
                if line is None:
                    raise OOXMLProtocolError("Engine đã đóng stdout trước khi phản hồi")
                response = json.loads(line)
                if not isinstance(response, dict) or response.get("id") != request_id:
                    raise OOXMLProtocolError("Phản hồi engine không khớp yêu cầu")
                if response.get("ok") is not True:
                    error = response.get("error") or {}
                    unsupported = error.get("unsupported", []) if isinstance(error, dict) else []
                    if unsupported:
                        raise OOXMLUnsupportedError(unsupported, response)
                    return {"ok": False, **(error if isinstance(error, dict) else {"error": error})}
                result = response.get("result", {})
                if isinstance(result, dict) and result.get("ok") is False:
                    unsupported = result.get("unsupported") or []
                    if unsupported:
                        raise OOXMLUnsupportedError(unsupported, result)
                    return result
                return {"ok": True, **(result if isinstance(result, dict) else {"result": result})}
            except queue.Empty as exc:
                self._stop_process()
                raise OOXMLProtocolError(f"Engine quá thời gian chờ ({self.timeout:g}s)") from exc
            except (BrokenPipeError, OSError, json.JSONDecodeError, OOXMLProtocolError):
                self._stop_process()
                raise

    def open(self, path: str | Path) -> dict[str, Any]:
        return self.request("open", {"path": str(path)})

    def read(self, handle: str, *, kind: str = "xlsx", **args: Any) -> dict[str, Any]:
        operation = {"xlsx": "sheet.read", "docx": "doc.read", "pptx": "slide.read"}.get(kind)
        if not operation:
            return {"ok": False, "unsupported": [f"kind:{kind}"]}
        return self.request(operation, {"handle": handle, **args})

    def save(self, kind: str, *, source_path: str | Path, target_path: str | Path, delta: dict[str, Any]) -> dict[str, Any]:
        operation = {"xlsx": "xlsx.save", "docx": "docx.save", "pptx": "pptx.save"}.get(kind)
        if not operation:
            return {"ok": False, "unsupported": [f"kind:{kind}"]}
        return self.request(operation, {
            "source_document_path": str(source_path), "target_path": str(target_path), "delta": delta,
        })

    def xlsx_save(self, **kwargs: Any) -> dict[str, Any]:
        return self.save("xlsx", **kwargs)

    def docx_save(self, **kwargs: Any) -> dict[str, Any]:
        return self.save("docx", **kwargs)

    def pptx_save(self, **kwargs: Any) -> dict[str, Any]:
        return self.save("pptx", **kwargs)

    def _stop_process(self) -> None:
        process, self._process = self._process, None
        self._responses = None
        if process is None:
            return
        try:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=0.5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=0.5)
        except (OSError, subprocess.SubprocessError):
            pass
        for stream in (process.stdin, process.stdout):
            try:
                if stream:
                    stream.close()
            except OSError:
                pass

    def close(self) -> None:
        with self._lock:
            self._stop_process()


def shadow_save(*, kind: str, source_path: str | Path | None, delta: dict[str, Any] | None,
                reference_path: str | Path, client: EngineClient | None = None) -> dict[str, Any]:
    """Run an available delta into a separate temp file and compare normalized XML parts."""
    if not source_path or not Path(source_path).is_file():
        LOGGER.info("event=shadow_skip reason=source_unavailable kind=%s", kind)
        return {"ok": False, "skipped": "source_unavailable"}
    if not isinstance(delta, dict):
        LOGGER.info("event=shadow_skip reason=delta_unavailable kind=%s", kind)
        return {"ok": False, "skipped": "delta_unavailable"}
    engine = client or EngineClient()
    if not engine.available:
        LOGGER.info("event=shadow_skip reason=engine_unavailable kind=%s", kind)
        return {"ok": False, "skipped": "engine_unavailable"}

    import tempfile
    import zipfile
    from xml.etree import ElementTree

    suffix = {"xlsx": ".xlsx", "docx": ".docx", "pptx": ".pptx"}.get(kind, ".ooxml")

    def normalized_xml(data: bytes) -> bytes:
        root = ElementTree.fromstring(data)

        def clear_formatting_whitespace(element) -> None:
            if len(element) and element.text is not None and not element.text.strip():
                element.text = None
            for child in element:
                if child.tail is not None and not child.tail.strip():
                    child.tail = None
                clear_formatting_whitespace(child)

        clear_formatting_whitespace(root)
        return ElementTree.tostring(root, encoding="utf-8")

    try:
        with tempfile.TemporaryDirectory(prefix="vno_ooxml_shadow_") as temp_dir:
            candidate = Path(temp_dir) / ("engine" + suffix)
            response = engine.save(kind, source_path=source_path, target_path=candidate, delta=delta)
            if response.get("ok") is not True or not candidate.is_file():
                LOGGER.info("event=shadow_engine_error kind=%s", kind)
                return {"ok": False, "unsupported": response.get("unsupported", [])}
            reference = Path(reference_path)
            changed: list[str] = []
            with zipfile.ZipFile(reference) as left, zipfile.ZipFile(candidate) as right:
                left_names, right_names = set(left.namelist()), set(right.namelist())
                for name in sorted(left_names | right_names):
                    if name not in left_names or name not in right_names:
                        changed.append(name)
                        continue
                    old, new = left.read(name), right.read(name)
                    if old != new and name.endswith((".xml", ".rels")):
                        try:
                            old = normalized_xml(old)
                            new = normalized_xml(new)
                        except ElementTree.ParseError:
                            pass
                    if old != new:
                        changed.append(name)
            LOGGER.info("event=shadow_compare kind=%s equal=%s changed_parts=%s",
                        kind, not changed, ",".join(changed))
            return {"ok": True, "equal": not changed, "changed_parts": changed}
    except OOXMLUnsupportedError as exc:
        LOGGER.info("event=shadow_unsupported kind=%s count=%d", kind, len(exc.unsupported))
        return {"ok": False, "unsupported": exc.unsupported}
    except Exception as exc:
        LOGGER.info("event=shadow_engine_error kind=%s error=%s", kind, type(exc).__name__)
        return {"ok": False, "error": type(exc).__name__}
    finally:
        if client is None:
            engine.close()
