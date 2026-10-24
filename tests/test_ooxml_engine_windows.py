"""Windows stdio smoke test for the OOXMLKit engine (skipped without a build)."""

import json
import os
import subprocess
import time
import zipfile
from pathlib import Path

import pytest

openpyxl = pytest.importorskip("openpyxl")

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENGINE = (
    REPO_ROOT
    / "ports"
    / "ios"
    / "OOXMLKit"
    / ".build"
    / "release"
    / "ooxml-engine.exe"
)
ENGINE = Path(os.environ.get("OOXML_ENGINE_PATH", DEFAULT_ENGINE))


@pytest.mark.skipif(os.name != "nt", reason="Windows executable smoke test")
def test_engine_opens_edits_saves_and_reopens_synthetic_xlsx(tmp_path):
    if not ENGINE.is_file():
        pytest.skip(f"Swift engine executable is not built: {ENGINE}")

    source = tmp_path / "input.xlsx"
    workbook = openpyxl.Workbook()
    workbook.active["A1"] = "before"
    workbook.save(source)

    # Add an incompressible, unused package part to make the input exceed 1 MB.
    padding = os.urandom(540_000).hex().encode("ascii")
    repacked = tmp_path / "one-megabyte.xlsx"
    with zipfile.ZipFile(source) as original, zipfile.ZipFile(
        repacked, "w", compression=zipfile.ZIP_DEFLATED
    ) as target:
        for item in original.infolist():
            target.writestr(item, original.read(item.filename))
        target.writestr("customXml/spike-padding.xml", b"<p>" + padding + b"</p>")
    source = repacked
    assert source.stat().st_size >= 1_000_000

    started = time.perf_counter()
    process = subprocess.Popen(
        [str(ENGINE)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    startup_seconds = time.perf_counter() - started

    def request(payload):
        process.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n")
        process.stdin.flush()
        response = json.loads(process.stdout.readline())
        assert response["ok"], response
        return response["result"]

    try:
        opened_at = time.perf_counter()
        opened = request({"id": 1, "op": "open", "args": {"path": str(source)}})
        open_seconds = time.perf_counter() - opened_at
        handle = opened["handle"]
        request(
            {
                "id": 2,
                "op": "sheet.setValue",
                "args": {"handle": handle, "ref": "A1", "value": "after"},
            }
        )
        output = tmp_path / "output.xlsx"
        request(
            {
                "id": 3,
                "op": "save",
                "args": {"handle": handle, "path": str(output)},
            }
        )
        reopened = request({"id": 4, "op": "open", "args": {"path": str(output)}})
        read = request(
            {
                "id": 5,
                "op": "sheet.read",
                "args": {"handle": reopened["handle"], "range": "A1"},
            }
        )
        assert read["cells"][0]["value"] == "after"
    finally:
        process.stdin.close()
        process.wait(timeout=30)
        stderr = process.stderr.read()
        assert process.returncode == 0, stderr
        process.stdout.close()
        process.stderr.close()

    verify = openpyxl.load_workbook(output, read_only=True, data_only=True)
    try:
        assert verify.active["A1"].value == "after"
    finally:
        verify.close()

    print(
        "engine startup={:.3f}s open_1MB={:.3f}s".format(
            startup_seconds, open_seconds
        )
    )


@pytest.mark.skipif(os.name != "nt", reason="Windows executable smoke test")
def test_engine_xlsx_save_delta_reopens_and_rejects_unsupported(tmp_path):
    if not ENGINE.is_file():
        pytest.skip(f"Swift engine executable is not built: {ENGINE}")

    source = tmp_path / "delta-source.xlsx"
    target = tmp_path / "delta-staging.xlsx"
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Data"
    sheet["A1"] = "before"
    sheet["A2"] = 5
    sheet["C1"] = "styled"
    sheet["C1"].font = sheet["C1"].font.copy(bold=True)
    workbook.save(source)

    process = subprocess.Popen(
        [str(ENGINE)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )

    def request(payload):
        process.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n")
        process.stdin.flush()
        return json.loads(process.stdout.readline())

    try:
        response = request(
            {
                "id": 1,
                "op": "xlsx.save",
                "args": {
                    "source_document_path": str(source),
                    "target_path": str(target),
                    "delta": {
                        "cells": [
                            {"sheet": "Data", "ref": "A1", "type": "string", "value": "after"},
                            {"sheet": "Data", "ref": "B1", "formula": "A2*2", "cached": 10},
                            {"sheet": "Data", "ref": "C1", "type": "string", "value": "styled", "styleIndex": 1},
                        ],
                        "cleared_cells": [{"sheet": "Data", "range": "A2"}],
                        "structural_ops": [
                            {"op": "sheet.freezePanes", "args": {"sheet": "Data", "rows": 1, "cols": 1}},
                            {"op": "sheet.setTabColor", "args": {"sheet": "Data", "color": "FF0000"}},
                            {"op": "sheet.setPrintArea", "args": {"sheet": "Data", "range": "A1:C1"}},
                        ],
                    },
                },
            }
        )
        assert response["ok"] is True, response
        result = response["result"]
        assert result["ok"] is True, result
        assert result["unsupported"] == []
        assert "xl/worksheets/sheet1.xml" in result["changedParts"]
        assert target.is_file()

        with zipfile.ZipFile(source) as original_zip, zipfile.ZipFile(target) as saved_zip:
            assert original_zip.namelist() == saved_zip.namelist()
            for part in original_zip.namelist():
                if part not in result["changedParts"]:
                    assert original_zip.read(part) == saved_zip.read(part), part

        saved = openpyxl.load_workbook(target, data_only=False)
        try:
            saved_sheet = saved["Data"]
            assert saved_sheet["A1"].value == "after"
            assert saved_sheet["B1"].value == "=A2*2"
            assert saved_sheet["C1"].style_id == 1
            assert saved_sheet["A2"].value is None
        finally:
            saved.close()

        unsupported_target = tmp_path / "unsupported-staging.xlsx"
        unsupported = request(
            {
                "id": 2,
                "op": "xlsx.save",
                "args": {
                    "source_document_path": str(source),
                    "target_path": str(unsupported_target),
                    "delta": {
                        "cells": [],
                        "cleared_cells": [],
                        "structural_ops": [{"op": "sheet.add", "args": {"name": "New"}}],
                    },
                },
            }
        )
        assert unsupported["ok"] is True, unsupported
        assert unsupported["result"]["ok"] is False
        assert unsupported["result"]["changedParts"] == []
        assert unsupported["result"]["unsupported"]
        assert not unsupported_target.exists()
    finally:
        process.stdin.close()
        process.wait(timeout=30)
        stderr = process.stderr.read()
        assert process.returncode == 0, stderr
        process.stdout.close()
        process.stderr.close()
