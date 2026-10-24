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
