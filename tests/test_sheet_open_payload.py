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
from adapters.libreoffice.sheet.sheet_open_payload import (
    build_sheet_open_payload,
    build_sheet_open_preview,
)


ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "tests" / "fixtures" / "real-office-samples"


class SheetOpenPayloadTests(unittest.TestCase):
    def test_preview_keeps_active_viewport_and_compact_sheet_layout(self):
        fods = """<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">
<office:automatic-styles><style:style style:name="co1"><style:table-column-properties style:column-width="1cm"/></style:style></office:automatic-styles>
<office:body><office:spreadsheet><office:settings><config:config-item config:name="ActiveTable">B</config:config-item></office:settings>
<table:table table:name="A"><table:table-column table:style-name="co1"/><table:table-row><table:table-cell office:value-type="string"><text:p>other-sheet</text:p></table:table-cell></table:table-row></table:table>
<table:table table:name="B"><table:table-column table:style-name="co1"/><table:table-row><table:table-cell office:value-type="string"><text:p>visible-cell</text:p></table:table-cell></table:table-row></table:table>
</office:spreadsheet></office:body></office:document>"""
        preview = build_sheet_open_preview(fods, max_rows=1)

        self.assertTrue(preview["partialPreview"])
        self.assertEqual(preview["sheets"], 2)
        self.assertEqual(preview["rows"], 1)
        self.assertIn('table:name="A"', preview["supportXml"])
        self.assertIn('table:name="B"', preview["supportXml"])
        self.assertIn("table:table-column", preview["supportXml"])
        self.assertNotIn("other-sheet", preview["rowsDeflateBase64"])
        self.assertNotIn("visible-cell", preview["supportXml"])

    def test_payload_flag_is_off_unless_explicitly_enabled(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(main._sheet_open_payload_enabled())
        for value in ("", "0", "false", "off"):
            with patch.dict(os.environ, {"SHEET_OPEN_PAYLOAD": value}, clear=True):
                self.assertFalse(main._sheet_open_payload_enabled(), value)
        for value in ("1", "true", "yes", "on"):
            with patch.dict(os.environ, {"SHEET_OPEN_PAYLOAD": value}, clear=True):
                self.assertTrue(main._sheet_open_payload_enabled(), value)

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
        ordinary_overlay = patcher.overlay_sheet_xlsx_fods(xlsx, fods)
        skipped_xf_overlay = patcher.overlay_sheet_xlsx_fods(
            xlsx, fods, skip_initial_xf=True
        )
        expected_compacted = patcher.reoverlay_sheet_xf_indices(
            xlsx, main._optimize_fods_for_sheet(ordinary_overlay)
        )
        fused_compacted, _ = build_sheet_open_payload(
            xlsx, main._optimize_fods_for_sheet(skipped_xf_overlay), patcher
        )
        self.assertEqual(fused_compacted, expected_compacted)
        self.assertEqual(payload["format"], "vno.sheet.payload.v2")
        self.assertGreater(payload["sheets"], 0)
        self.assertGreater(payload["rows"], 0)
        records = [
            json.loads(line)
            for chunk in payload["rowChunks"]
            for line in zlib.decompress(base64.b64decode(chunk["data"])).decode("utf-8").splitlines()
        ]
        self.assertEqual(payload["sheets"], sum(record[0] == "sheet" for record in records))
        self.assertEqual(payload["rows"], sum(record[0] == "row-xml" for record in records))
        self.assertEqual(payload["rows"], sum(chunk["rows"] for chunk in payload["rowChunks"]))
        preview_records = [
            json.loads(line)
            for line in zlib.decompress(base64.b64decode(payload["previewRowsDeflateBase64"]))
            .decode("utf-8").splitlines()
        ]
        self.assertEqual(payload["sheets"], sum(record[0] == "sheet" for record in preview_records))
        self.assertEqual(payload["previewRows"], sum(record[0] == "row-xml" for record in preview_records))

    def test_fallback_session_is_opaque_private_retrievable_and_released(self):
        with tempfile.TemporaryDirectory() as temp_dir, patch("main._user_data_dir", return_value=Path(temp_dir)):
            api = main.VnOfficeApi(app_kind="sheet")
            open_id = api._store_sheet_open_fallback(
                "<spreadsheet>full model</spreadsheet>", "C:/work/book.xlsx", "<workbook/>",
                [{"data": "Y2h1bms=", "rows": 1}],
            )
            chunk_path = api._sheet_open_sessions[open_id]["chunk_paths"][0]
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
            self.assertEqual(api.get_sheet_open_payload_chunk(open_id, 0), {
                "status": "ok", "openId": open_id, "index": 0, "rows": 1, "data": "Y2h1bms="
            })
            self.assertTrue(api.release_sheet_open_fallback(open_id))
            self.assertFalse(chunk_path.exists())
            self.assertFalse(api._sheet_open_sessions)
            self.assertEqual(api._read_sheet_open_fallback(open_id)["status"], "error")

    def test_reserved_payload_session_reports_background_completion(self):
        with tempfile.TemporaryDirectory() as temp_dir, patch("main._user_data_dir", return_value=Path(temp_dir)):
            api = main.VnOfficeApi(app_kind="sheet")
            open_id = api._reserve_sheet_open_payload_session("C:/work/book.xlsx", "<workbook/>")
            self.assertEqual(api._read_sheet_open_payload_status(open_id), {
                "status": "building", "phase": "preparing"
            })
            api._store_sheet_open_fallback(
                "<spreadsheet>full model</spreadsheet>",
                "C:/work/book.xlsx",
                "<workbook/>",
                [{"data": "Y2h1bms=", "rows": 1}],
                open_id=open_id,
                payload_metadata={"totalRows": 1, "chunkCount": 1, "supportXml": "<office:document/>"},
            )
            state = api._read_sheet_open_payload_status(open_id)
            self.assertEqual(state["status"], "ready")
            self.assertEqual(state["metadata"]["totalRows"], 1)
            self.assertEqual(api.get_sheet_open_payload_chunk(open_id, 0)["data"], "Y2h1bms=")
            api.release_sheet_open_fallback(open_id)

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


if __name__ == "__main__":
    unittest.main()
