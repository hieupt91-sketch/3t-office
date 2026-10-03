"""P8 view-first worker operations, exercised against the real bundled LibreOffice.

Skipped when no LibreOffice or no sample workbook is available.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402

WORKER = ROOT / "adapters" / "libreoffice" / "common" / "soffice_uno_worker.py"
SAMPLE = ROOT / "file test" / "lan" / "lan03.xlsx"


class ViewWorkerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.soffice = vnmain.find_soffice()
        if not cls.soffice or not SAMPLE.is_file():
            raise unittest.SkipTest("LibreOffice or sample workbook not available")
        cls.profile = tempfile.mkdtemp(prefix="vno-view-profile-")
        profile_uri = Path(cls.profile).as_uri()
        cls.proc = subprocess.Popen(
            [sys.executable, str(WORKER), cls.soffice, profile_uri, "vnoview_" + uuid.uuid4().hex, "sheet"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, encoding="utf-8",
        )
        ready = json.loads(cls.proc.stdout.readline())
        if not ready.get("ready"):
            raise unittest.SkipTest("worker not ready: " + str(ready.get("error")))

    @classmethod
    def tearDownClass(cls):
        try:
            cls.proc.stdin.write(json.dumps({"op": "shutdown"}) + "\n")
            cls.proc.stdin.flush()
            cls.proc.wait(timeout=20)
        except Exception:
            if cls.proc.poll() is None:
                cls.proc.kill()

    def call(self, **request):
        request.setdefault("id", 1)
        self.proc.stdin.write(json.dumps(request) + "\n")
        self.proc.stdin.flush()
        return json.loads(self.proc.stdout.readline())

    def test_open_window_close(self):
        opened = self.call(op="view_open", source_path=str(SAMPLE))
        self.assertTrue(opened["ok"], opened)
        self.assertEqual(len(opened["sheets"]), 12)
        self.assertGreater(opened["sheets"][0]["rows"], 0)
        doc_id = opened["doc_id"]

        window = self.call(op="view_window", doc_id=doc_id, sheet=0, r0=0, c0=0, r1=29, c1=9)
        self.assertTrue(window["ok"], window)
        self.assertEqual(len(window["values"]), 30)
        self.assertTrue(all(len(row) == 10 for row in window["values"]))
        self.assertEqual(len(window["formulas"]), 30)
        self.assertEqual(len(window["col_widths"]), 10)
        self.assertEqual(len(window["row_heights"]), 30)
        self.assertTrue(any(cell not in ("", None) for row in window["values"] for cell in row))
        self.assertTrue(all(width > 0 for width in window["col_widths"]))

        bad = self.call(op="view_window", doc_id=doc_id, sheet=0, r0=5, c0=0, r1=2, c1=3)
        self.assertFalse(bad["ok"])
        too_big = self.call(op="view_window", doc_id=doc_id, sheet=0, r0=0, c0=0, r1=100000, c1=100)
        self.assertFalse(too_big["ok"])

        self.assertTrue(self.call(op="view_close", doc_id=doc_id)["ok"])
        gone = self.call(op="view_window", doc_id=doc_id, sheet=0, r0=0, c0=0, r1=1, c1=1)
        self.assertFalse(gone["ok"])


if __name__ == "__main__":
    unittest.main()
