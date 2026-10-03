"""Python tests for fused Sheet payload construction and bounded FODS sessions."""

import base64
import json
import os
import tempfile
import time
import unittest
import zlib
from pathlib import Path
from unittest.mock import patch

import main
from adapters.libreoffice.sheet.sheet_open_payload import build_sheet_open_payload


ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "tests" / "fixtures" / "real-office-samples"


class SheetOpenPayloadTests(unittest.TestCase):
    def test_payload_flag_is_off_unless_explicitly_enabled(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(main._sheet_open_payload_enabled())
        for value in ("", "0", "false", "off"):
            with patch.dict(os.environ, {"SHEET_OPEN_PAYLOAD": value}, clear=True):
                self.assertFalse(main._sheet_open_payload_enabled(), value)
        for value in ("1", "true", "yes", "on"):
            with patch.dict(os.environ, {"SHEET_OPEN_PAYLOAD": value}, clear=True):
                self.assertTrue(main._sheet_open_payload_enabled(), value)

    def test_large_fods_uses_payload_while_small_fods_keeps_legacy_path(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(main._should_use_sheet_open_payload("x" * 1024))
            self.assertTrue(
                main._should_use_sheet_open_payload(
                    "x" * (main._SHEET_LARGE_FODS_CHARS + 1)
                )
            )
        with patch.dict(os.environ, {"SHEET_OPEN_PAYLOAD": "1"}, clear=True):
            self.assertTrue(main._should_use_sheet_open_payload("tiny"))

    def test_fused_pass_matches_existing_final_xf_transform_and_record_counts(self):
        fods_path = SAMPLES / "src" / "sample-sheet.fods"
        xlsx_path = SAMPLES / "sample-sheet.xlsx"
        with fods_path.open("r", encoding="utf-8", newline="") as handle:
            fods = handle.read()
        xlsx = xlsx_path.read_bytes()
        patcher = main._ooxml_zip_patch()
        patcher._INDEX_MEMO.clear()

        expected = patcher.reoverlay_sheet_xf_indices(xlsx, fods)
        actual, payload = build_sheet_open_payload(xlsx, fods, patcher)

        self.assertEqual(actual, expected)
        self.assertEqual(payload["format"], "vno.sheet.payload.v2")
        self.assertGreater(payload["sheets"], 0)
        self.assertGreater(payload["rows"], 0)
        records = [
            json.loads(line)
            for line in zlib.decompress(base64.b64decode(payload["rowsDeflateBase64"])).decode("utf-8").splitlines()
        ]
        self.assertEqual(payload["sheets"], sum(record[0] == "sheet" for record in records))
        self.assertEqual(payload["rows"], sum(record[0] == "row-xml" for record in records))

    def test_phase2_payload_emits_active_sheet_and_metadata_stubs_only(self):
        fods_path = SAMPLES / "src" / "sample-sheet.fods"
        xlsx_path = SAMPLES / "sample-sheet.xlsx"
        fods = fods_path.read_text(encoding="utf-8")
        xlsx = xlsx_path.read_bytes()
        patcher = main._ooxml_zip_patch()
        sheet_names = list(patcher._resolve_xlsx_sheet_entries(xlsx))
        self.assertGreater(len(sheet_names), 1)

        actual, payload = build_sheet_open_payload(
            xlsx, fods, patcher, included_sheets={sheet_names[0]}
        )

        records = [
            json.loads(line)
            for line in zlib.decompress(base64.b64decode(payload["rowsDeflateBase64"])).decode("utf-8").splitlines()
        ]
        self.assertEqual(actual, patcher.reoverlay_sheet_xf_indices(xlsx, fods))
        self.assertEqual([record[1] for record in records if record[0] == "sheet"], [sheet_names[0]])
        self.assertEqual(payload["deferredSheets"], sheet_names[1:])
        self.assertEqual([stub["name"] for stub in payload["sheetStubs"]], sheet_names)
        self.assertTrue(all(stub["usedRange"] for stub in payload["sheetStubs"]))
        self.assertTrue(all(stub["cellCount"] >= 0 for stub in payload["sheetStubs"]))

    def test_fallback_session_is_opaque_private_retrievable_and_released(self):
        with tempfile.TemporaryDirectory() as temp_dir, patch("main._user_data_dir", return_value=Path(temp_dir)):
            api = main.VnOfficeApi(app_kind="sheet")
            open_id = api._store_sheet_open_fallback("<spreadsheet>full model</spreadsheet>", "C:/work/book.xlsx", "<workbook/>")
            self.assertNotIn("/", open_id)
            self.assertNotIn("\\", open_id)
            self.assertEqual(len(api._sheet_open_sessions), 1)

            fallback = api._read_sheet_open_fallback(open_id)
            self.assertEqual(fallback["status"], "ok")
            self.assertEqual(fallback["content"], "<spreadsheet>full model</spreadsheet>")
            self.assertEqual(fallback["fileName"], "book.xlsx")
            self.assertEqual(fallback["sourcePath"], "C:/work/book.xlsx")
            self.assertEqual(fallback["ooxmlWorkbookXml"], "<workbook/>")
            self.assertNotIn("path", fallback)
            self.assertTrue(api.release_sheet_open_fallback(open_id))
            self.assertFalse(api._sheet_open_sessions)
            self.assertEqual(api._read_sheet_open_fallback(open_id)["status"], "error")

    def test_expired_fallback_session_is_deleted(self):
        with tempfile.TemporaryDirectory() as temp_dir, patch("main._user_data_dir", return_value=Path(temp_dir)):
            api = main.VnOfficeApi(app_kind="sheet")
            open_id = api._store_sheet_open_fallback("old FODS", "C:/work/old.xlsx", None)
            entry = api._sheet_open_sessions[open_id]
            entry["expires_at"] = time.monotonic() - 1
            path = Path(entry["path"])
            api._prune_sheet_open_sessions()
            self.assertFalse(path.exists())
            self.assertNotIn(open_id, api._sheet_open_sessions)

    def test_deferred_sheet_api_returns_only_requested_sheet(self):
        fods = (SAMPLES / "src" / "sample-sheet.fods").read_text(encoding="utf-8")
        source_bytes = (SAMPLES / "sample-sheet.xlsx").read_bytes()
        sheet_names = list(main._ooxml_zip_patch()._resolve_xlsx_sheet_entries(source_bytes))
        with tempfile.TemporaryDirectory() as temp_dir, patch("main._user_data_dir", return_value=Path(temp_dir)):
            source = Path(temp_dir) / "source.xlsx"
            source.write_bytes(source_bytes)
            api = main.VnOfficeApi(app_kind="sheet")
            open_id = api._store_sheet_open_fallback(fods, str(source), None)

            result = api._read_sheet_open_payload(open_id, sheet_names[-1])

            self.assertEqual(result["status"], "ok")
            payload = result["sheetPayload"]
            records = [
                json.loads(line)
                for line in zlib.decompress(base64.b64decode(payload["rowsDeflateBase64"])).decode("utf-8").splitlines()
            ]
            self.assertEqual([record[1] for record in records if record[0] == "sheet"], [sheet_names[-1]])
            self.assertNotIn(sheet_names[-1], payload["deferredSheets"])
            self.assertEqual(api._read_sheet_open_payload(open_id, "missing")["status"], "error")


if __name__ == "__main__":
    unittest.main()
