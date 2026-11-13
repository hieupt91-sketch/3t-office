"""Fake-stdio contract coverage for P1 open measurement (issue #18)."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import measure_ooxml_open as measure_cli  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]
CLIENT_PATH = ROOT / "platform" / "ooxml" / "engine_client.py"


def load_client():
    name = "_vno_ooxml_engine_open_measure_test"
    sys.modules.pop(name, None)
    spec = importlib.util.spec_from_file_location(name, CLIENT_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def fake_engine(tmp_path: Path, *, fail_read: bool = False, fail_rows: bool = False) -> Path:
    script = tmp_path / "fake_engine_p1.py"
    script.write_text(textwrap.dedent(f"""
        import json, sys
        log_path = {str(tmp_path / "opens.log")!r}
        closed = []
        for line in sys.stdin:
            request = json.loads(line)
            op = request.get("op")
            args = request.get("args", {{}})
            if op == "open":
                with open(log_path, "a", encoding="utf-8") as log:
                    log.write(json.dumps(args) + "\\n")
                path = args.get("path", "")
                if path.endswith(".xlsx"):
                    result = {{"handle": "h1", "kind": "xlsx",
                               "sheets": [{{"name": "S1", "state": "visible"}},
                                          {{"name": "S2", "state": "visible"}}]}}
                elif path.endswith(".docx"):
                    result = {{"handle": "h2", "kind": "docx",
                               "paragraphs": 3, "tables": 1}}
                elif path.endswith(".pptx"):
                    result = {{"handle": "h3", "kind": "pptx", "slides": 2}}
                else:
                    print(json.dumps({{"id": request["id"], "ok": False,
                                       "error": {{"code": "args", "message": "khong mo duoc"}}}}), flush=True)
                    continue
            elif op == "sheet.read":
                if {fail_read}:
                    print(json.dumps({{"id": request["id"], "ok": False,
                                       "error": {{"code": "internal", "message": "doc loi"}}}}), flush=True)
                    continue
                result = {{"used": "A1:B2",
                           "cells": [{{"ref": "A1", "value": {{"t": "n", "v": 1}}}},
                                     {{"ref": "B2", "value": {{"t": "s", "v": "x"}}}}]}}
            elif op == "sheet.readRows":
                if {fail_rows}:
                    print(json.dumps({{"id": request["id"], "ok": False,
                                       "error": {{"code": "internal", "message": "doc loi"}}}}), flush=True)
                    continue
                result = {{"cells": [{{"ref": "A1", "value": {{"t": "n", "v": 1}}}},
                                     {{"ref": "B2", "value": {{"t": "s", "v": "x"}}}}],
                           "rowCount": 2, "lastRow": 2}}
            elif op == "doc.read":
                result = {{"total": 3, "paragraphs": [{{"index": 0, "text": "a"}}],
                           "tables": [[["o"]]]}}
            elif op == "slide.read":
                result = {{"index": args.get("index", 0), "shapes": [{{"name": "T"}}]}}
            elif op == "close":
                closed.append(args.get("handle"))
                result = {{}}
            else:
                result = {{}}
            print(json.dumps({{"id": request["id"], "ok": True, "result": result}}), flush=True)
    """), encoding="utf-8")
    return script


def read_open_log(tmp_path: Path) -> list[dict]:
    log = tmp_path / "opens.log"
    if not log.is_file():
        return []
    return [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines() if line.strip()]


def fake_popen(script: Path):
    def launch(_command, **kwargs):
        return subprocess.Popen([sys.executable, str(script)], **kwargs)
    return launch


def test_engine_open_enabled_flag(tmp_path, monkeypatch):
    client_module = load_client()
    monkeypatch.delenv("VNO_OOXML_ENGINE_OPEN", raising=False)
    assert client_module.engine_open_enabled() is False
    for value in ("1", "true", "YES", "on"):
        monkeypatch.setenv("VNO_OOXML_ENGINE_OPEN", value)
        assert client_module.engine_open_enabled() is True
    for value in ("0", "false", "off", ""):
        monkeypatch.setenv("VNO_OOXML_ENGINE_OPEN", value)
        assert client_module.engine_open_enabled() is False


def test_measure_open_xlsx_reads_every_sheet_and_closes(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        result = client.measure_open(tmp_path / "book.xlsx")
    finally:
        client.close()
    assert result["ok"] is True
    assert result["kind"] == "xlsx"
    assert result["counts"] == {"sheets": 2, "cells": 4}
    assert result["package_ms"] >= 0
    assert result["data_ms"] >= 0
    assert result["engine_total_ms"] == pytest.approx(
        result["package_ms"] + result["data_ms"])
    # Pha dựng hình chưa đo được ở VM: NOT RUN, phải là None, không bịa số.
    assert result["render_ms"] is None


def test_measure_open_first_screen_phase_xlsx(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        result = client.measure_open(tmp_path / "book.xlsx")
    finally:
        client.close()
    assert result["ok"] is True
    assert result["first_screen_ms"] is not None
    assert result["first_screen_ms"] >= 0
    assert result["first_screen_ms"] == pytest.approx(
        result["first_screen_package_ms"] + result["first_screen_data_ms"])
    assert result["first_screen_counts"] == {"cells": 2, "row_count": 2, "last_row": 2}
    assert result["first_screen_error"] is None
    opens = read_open_log(tmp_path)
    assert len(opens) == 2
    assert opens[0].get("lazy") is True  # pha màn hình đầu mở lazy
    assert "lazy" not in opens[1]  # pha đo toàn bộ mở eager như trước


def test_measure_open_first_screen_not_run_for_docx_pptx(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        docx = client.measure_open(tmp_path / "doc.docx")
        pptx = client.measure_open(tmp_path / "deck.pptx")
    finally:
        client.close()
    assert docx["ok"] is True
    assert docx["first_screen_ms"] is None
    assert docx["first_screen_counts"] == {}
    assert pptx["ok"] is True
    assert pptx["first_screen_ms"] is None


def test_measure_open_first_screen_failure_does_not_fail_full_measure(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path, fail_rows=True)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        result = client.measure_open(tmp_path / "book.xlsx")
    finally:
        client.close()
    assert result["ok"] is True
    assert result["first_screen_ms"] is None
    assert result["first_screen_error"] is not None


def test_measure_open_docx_and_pptx_counts(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        docx = client.measure_open(tmp_path / "doc.docx")
        pptx = client.measure_open(tmp_path / "deck.pptx")
    finally:
        client.close()
    assert docx["ok"] is True
    assert docx["counts"] == {"paragraphs": 3, "tables": 1}
    assert pptx["ok"] is True
    assert pptx["counts"] == {"slides": 2, "shapes": 2}


def test_measure_open_unsupported_kind_is_reported(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        result = client.measure_open(tmp_path / "notes.txt")
    finally:
        client.close()
    assert result["ok"] is False
    assert result["package_ms"] is None
    assert result["data_ms"] is None
    assert result["render_ms"] is None


def test_measure_open_read_failure_closes_handle_and_reports(tmp_path):
    client_module = load_client()
    script = fake_engine(tmp_path, fail_read=True)
    client = client_module.EngineClient(str(script), timeout=5, popen=fake_popen(script))
    try:
        result = client.measure_open(tmp_path / "book.xlsx")
    finally:
        client.close()
    assert result["ok"] is False
    assert result["package_ms"] >= 0
    assert result["data_ms"] is not None


def test_summarize_median_min_max():
    assert measure_cli.summarize([3.0, 1.0, 2.0]) == {
        "median": 2.0, "min": 1.0, "max": 3.0, "n": 3}
    assert measure_cli.summarize([]) == {
        "median": None, "min": None, "max": None, "n": 0}


def test_measure_files_aggregates_repeats_with_stub_client(tmp_path):
    calls: list[str] = []

    class StubClient:
        def measure_open(self, path):
            calls.append(str(path))
            return {"ok": True, "path": str(path), "kind": "xlsx",
                    "package_ms": 10.0, "data_ms": 20.0, "engine_total_ms": 30.0,
                    "render_ms": None, "peak_rss_kb": 1000,
                    "first_screen_ms": 5.0, "first_screen_package_ms": 2.0,
                    "first_screen_data_ms": 3.0,
                    "first_screen_counts": {"cells": 2, "row_count": 2, "last_row": 2},
                    "first_screen_error": None,
                    "counts": {"sheets": 1, "cells": 2}}

        def close(self):
            pass

    target = tmp_path / "book.xlsx"
    target.write_bytes(b"fake")
    results = measure_cli.measure_files(
        [target], repeats=3, client_factory=StubClient)
    assert len(calls) == 3
    assert len(results) == 1
    row = results[0]
    assert row["ok"] is True
    assert row["runs"] == 3
    assert row["failed_runs"] == 0
    assert row["package_ms"] == {"median": 10.0, "min": 10.0, "max": 10.0, "n": 3}
    assert row["render_ms"] is None
    assert row["first_screen_ms"] == {"median": 5.0, "min": 5.0, "max": 5.0, "n": 3}
    assert row["first_screen_package_ms"] == {"median": 2.0, "min": 2.0, "max": 2.0, "n": 3}
    assert row["first_screen_data_ms"] == {"median": 3.0, "min": 3.0, "max": 3.0, "n": 3}
    assert row["first_screen_counts"] == {"cells": 2, "row_count": 2, "last_row": 2}
    assert row["first_screen_errors"] == []
    assert row["counts"] == {"sheets": 1, "cells": 2}
