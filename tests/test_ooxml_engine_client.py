"""Fake-stdio contract coverage for the optional OOXML engine client."""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import textwrap
import zipfile
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
CLIENT_PATH = ROOT / "platform" / "ooxml" / "engine_client.py"


def load_client():
    name = "_vno_ooxml_engine_client_test"
    sys.modules.pop(name, None)
    spec = importlib.util.spec_from_file_location(name, CLIENT_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def fake_engine(tmp_path: Path, *, delay: float = 0) -> Path:
    script = tmp_path / "fake_engine.py"
    script.write_text(textwrap.dedent(f"""
        import json, os, sys, time
        for line in sys.stdin:
            request = json.loads(line)
            op = request.get("op")
            if op == "hang":
                time.sleep({delay})
            if op == "open":
                result = {{"handle": "fake-h1", "kind": "xlsx", "runtime_path": os.environ.get("PATH", "")}}
            elif op == "sheet.read":
                result = {{"cells": [{{"ref": "A1", "value": "ok"}}]}}
            elif op in ("xlsx.save", "docx.save", "pptx.save"):
                result = {{"ok": True, "changedParts": ["document.xml"]}}
            elif op == "unsupported":
                result = {{"ok": False, "unsupported": ["delta.cells[0].style"]}}
            else:
                result = {{}}
            print(json.dumps({{"id": request["id"], "ok": True, "result": result}}), flush=True)
    """), encoding="utf-8")
    return script


def fake_popen(script: Path):
    def launch(_command, **kwargs):
        return subprocess.Popen([sys.executable, str(script)], **kwargs)
    return launch


def test_fake_stdio_open_read_and_save_operations(tmp_path, monkeypatch):
    client_module = load_client()
    runtime = tmp_path / "swift-runtime"
    runtime.mkdir()
    monkeypatch.setenv("OOXML_SWIFT_RUNTIME", str(runtime))
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=2, popen=fake_popen(script))
    try:
        opened = client.open(tmp_path / "input.xlsx")
        assert opened["ok"] is True
        assert opened["handle"] == "fake-h1"
        assert str(runtime) in opened["runtime_path"].split(os.pathsep)[0]
        read = client.read("fake-h1", range="A1:A1")
        assert read["cells"][0]["value"] == "ok"
        for kind in ("xlsx", "docx", "pptx"):
            saved = client.save(kind, source_path="source." + kind, target_path="out." + kind, delta={})
            assert saved["ok"] is True
            assert saved["changedParts"] == ["document.xml"]
    finally:
        client.close()


def test_fake_stdio_unsupported_is_reported_without_throwing_protocol_error(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=2, popen=fake_popen(script))
    try:
        with pytest.raises(client_module.OOXMLUnsupportedError) as caught:
            client.request("unsupported")
        assert caught.value.unsupported == ["delta.cells[0].style"]
    finally:
        client.close()


def test_fake_stdio_timeout_terminates_only_owned_process(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path, delay=0.4)
    client = client_module.EngineClient(str(script), timeout=0.08, popen=fake_popen(script))
    try:
        with pytest.raises(client_module.OOXMLProtocolError, match="quá thời gian"):
            client.request("hang")
        assert client._process is None
    finally:
        client.close()


def test_shadow_is_noop_when_delta_is_unavailable(tmp_path, caplog):
    client_module = load_client()
    source = tmp_path / "source.xlsx"
    output = tmp_path / "saved.xlsx"
    source.write_bytes(b"source")
    output.write_bytes(b"reference")
    with caplog.at_level("INFO", logger="vnoffice.ooxml_engine"):
        result = client_module.shadow_save(
            kind="xlsx", source_path=source, delta=None, reference_path=output,
        )
    assert result == {"ok": False, "skipped": "delta_unavailable"}
    assert "event=shadow_skip reason=delta_unavailable" in caplog.text


def test_shadow_compares_xml_parts_without_touching_saved_file(tmp_path):
    client_module = load_client()
    source = tmp_path / "source.xlsx"
    reference = tmp_path / "libreoffice.xlsx"
    source.write_bytes(b"source")
    with zipfile.ZipFile(reference, "w") as archive:
        archive.writestr("xl/workbook.xml", "<workbook><sheet/></workbook>")
        archive.writestr("xl/untouched.bin", b"same")

    class FakeClient:
        available = True

        def save(self, kind, *, source_path, target_path, delta):
            assert kind == "xlsx"
            assert Path(source_path) == source
            assert delta == {"cells": []}
            with zipfile.ZipFile(target_path, "w") as archive:
                archive.writestr("xl/workbook.xml", "<workbook>\n  <sheet />\n</workbook>")
                archive.writestr("xl/untouched.bin", b"same")
            return {"ok": True}

    original_bytes = reference.read_bytes()
    result = client_module.shadow_save(
        kind="xlsx", source_path=source, delta={"cells": []},
        reference_path=reference, client=FakeClient(),
    )
    assert result == {"ok": True, "equal": True, "changed_parts": []}
    assert reference.read_bytes() == original_bytes
