"""Private JSON-lines UNO worker for the bundled LibreOffice runtime.

The desktop process owns this helper and its LibreOffice child.  UNO uses a
per-process local pipe; no TCP listener is opened.  Standard output is reserved
for the JSON protocol so the parent can detect crashes and restart cleanly.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from typing import Any


def _write(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _property(property_type: Any, name: str, value: Any) -> Any:
    prop = property_type()
    prop.Name = name
    prop.Value = value
    return prop


def _docx_contains_textboxes(source_path: str) -> bool:
    """Return whether a DOCX has Word text-box content in any OOXML part."""
    if Path(source_path).suffix.lower() != ".docx":
        return False
    try:
        with zipfile.ZipFile(source_path) as archive:
            for name in archive.namelist():
                if not (name.startswith("word/") and name.endswith(".xml")):
                    continue
                with archive.open(name) as entry:
                    if b"txbxContent" in entry.read():
                        return True
    except (OSError, zipfile.BadZipFile):
        # If preflight cannot read the package, avoid the hidden import path;
        # LibreOffice will surface the actual load error below.
        return True
    return False


def _connect(uno: Any, pipe_name: str, process: subprocess.Popen[str]) -> Any:
    local_context = uno.getComponentContext()
    resolver = local_context.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_context
    )
    connection_url = f"uno:pipe,name={pipe_name};urp;StarOffice.ComponentContext"
    deadline = time.monotonic() + 90
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"soffice exited during startup ({process.returncode})")
        try:
            return resolver.resolve(connection_url)
        except Exception as exc:  # pipe listener is not ready yet
            last_error = exc
            time.sleep(0.1)
    raise TimeoutError(f"LibreOffice UNO pipe did not become ready: {last_error}")


def _convert(desktop: Any, uno: Any, property_type: Any, request: dict[str, Any]) -> dict[str, Any]:
    source_path = str(Path(request["source_path"]).resolve())
    output_path = str(Path(request["output_path"]).resolve())
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    load_properties = []
    # Writer imports DOCX text boxes differently when Hidden=True, which
    # changes StarWriter HTML output even though the same filter is selected.
    # Keep the faster hidden import for DOCX files without text boxes; for
    # documents that contain them, match the CLI's non-hidden load path.
    html_writer_textboxes = (
        request.get("filter_name") == "HTML (StarWriter)"
        and _docx_contains_textboxes(source_path)
    )
    if not html_writer_textboxes:
        load_properties.append(_property(property_type, "Hidden", True))
    load_properties.extend([
        _property(property_type, "Silent", True),
        # These conversions only import the source into an intermediate file;
        # opening read-only matches the CLI converter and handles DOCX files
        # that LibreOffice's interactive UNO loader otherwise declines.
        _property(property_type, "ReadOnly", True),
    ])
    input_filter = request.get("input_filter")
    if input_filter:
        load_properties.append(_property(property_type, "FilterName", str(input_filter)))
    input_filter_options = request.get("input_filter_options")
    if input_filter_options:
        load_properties.append(
            _property(property_type, "FilterOptions", str(input_filter_options))
        )

    started = time.monotonic()
    document = desktop.loadComponentFromURL(
        uno.systemPathToFileUrl(source_path), "_blank", 0, tuple(load_properties)
    )
    if document is None:
        raise RuntimeError("LibreOffice could not load the source document")

    try:
        store_properties = [_property(property_type, "Overwrite", True)]
        filter_name = request.get("filter_name")
        if filter_name:
            store_properties.append(
                _property(property_type, "FilterName", str(filter_name))
            )
        document.storeToURL(
            uno.systemPathToFileUrl(output_path), tuple(store_properties)
        )
    finally:
        try:
            document.close(True)
        except Exception:
            try:
                document.dispose()
            except Exception:
                pass

    if not os.path.isfile(output_path):
        raise RuntimeError("LibreOffice did not create the requested output file")
    if request.get("filter_name") == "HTML (StarWriter)":
        # The CLI HTML filter serializes PAGE fields as page 1 because HTML
        # has no pagination. A headless UNO view can retain the DOCX's saved
        # current page (for example 20), so normalize that field result to the
        # same CLI representation without refreshing or mutating document data.
        html_bytes = Path(output_path).read_bytes()
        normalized_html = re.sub(
            rb'(<sdfield\b[^>]*\btype=PAGE\b[^>]*>)[^<]*(</sdfield>)',
            rb"\g<1>1\g<2>",
            html_bytes,
            flags=re.IGNORECASE,
        )
        if normalized_html != html_bytes:
            Path(output_path).write_bytes(normalized_html)
    return {
        "ok": True,
        "output_path": output_path,
        "output_bytes": os.path.getsize(output_path),
        "elapsed_ms": round((time.monotonic() - started) * 1000, 1),
    }


def _stop_server(desktop: Any, process: subprocess.Popen[str] | None) -> None:
    if desktop is not None:
        try:
            desktop.terminate()
        except Exception:
            pass
    if process is None or process.poll() is not None:
        return
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            try:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=3,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
            except (OSError, subprocess.TimeoutExpired):
                pass
        if process.poll() is not None:
            return
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 4:
        _write({"ready": False, "error": "expected soffice path, profile URI, pipe name, and app kind"})
        return 2

    soffice_path, profile_uri, pipe_name, app_kind = args
    program_dir = Path(soffice_path).resolve().parent
    os.environ["UNO_PATH"] = str(program_dir)
    os.environ["URE_BOOTSTRAP"] = f"vnd.sun.star.pathname:{program_dir / 'fundamental.ini'}"
    sys.path.insert(0, str(program_dir))

    process: subprocess.Popen[str] | None = None
    desktop = None
    try:
        import uno  # provided by the adjacent LibreOffice program directory
        from com.sun.star.beans import PropertyValue

        command = [
            soffice_path,
            "--headless",
            "--invisible",
            "--nocrashreport",
            "--nodefault",
            "--nolockcheck",
            "--nologo",
            "--norestore",
            "--nofirststartwizard",
            f"--accept=pipe,name={pipe_name};urp;StarOffice.ServiceManager",
            f"-env:UserInstallation={profile_uri}",
        ]
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            creationflags=creationflags,
        )
        context = _connect(uno, pipe_name, process)
        desktop = context.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", context
        )
        _write({"ready": True, "app_kind": app_kind, "soffice_pid": process.pid})

        for line in sys.stdin:
            request = None
            try:
                request = json.loads(line)
                if request.get("op") == "shutdown":
                    _write({"ok": True, "shutdown": True})
                    return 0
                if request.get("op") != "convert":
                    raise ValueError("unsupported worker operation")
                _write({"id": request.get("id"), **_convert(desktop, uno, PropertyValue, request)})
            except Exception as exc:
                _write({
                    "id": request.get("id") if isinstance(request, dict) else None,
                    "ok": False,
                    "error": str(exc)[:1000],
                })
    except Exception as exc:
        _write({"ready": False, "error": str(exc)[:1000]})
        return 1
    finally:
        _stop_server(desktop, process)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
