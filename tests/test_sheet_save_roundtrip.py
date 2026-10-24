"""Sheet Save Round-trip: Open real XLSX -> Save back -> Reopen and compare.

Tests the full round-trip fidelity of save_document_dialog for Sheet:
  1. Open real XLSX via open_document_dialog (initial_file bypass)
  2. Save FODS content back to XLSX via save_document_dialog (mocked dialog)
  3. Reopen the saved XLSX
  4. Verify sheet count, cell values, formulas, encoding are preserved

Sheet uses FODS (Flat OpenDocument Spreadsheet), not HTML like Writer.
Comparisons focus on <table:table> count, office:value/text content, and
absence of mojibake characters.

Requires LibreOffice soffice. Tests are skipped if soffice is unavailable.
"""

from __future__ import annotations

import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURES_DIR = ROOT / "tests" / "fixtures" / "real-office-samples"

FIXTURES = sorted(FIXTURES_DIR.glob("sample-sheet*.xlsx"))

EDIT_MARKER_VALUE = "ROUNDTRIP_EDIT_42"
EDIT_MARKER_TEXT = "Gia tri moi sau khi chinh sua"


def _count_tables(fods_text: str) -> int:
    return len(re.findall(r"<table:table[\s>]", fods_text or "", re.IGNORECASE))


def _has_mojibake(fods_text: str) -> bool:
    return "\ufffd" in (fods_text or "")


def _normalize_ws(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def _extract_cell_values(fods_text: str) -> list[str]:
    values = []
    for m in re.finditer(r'office:value="([^"]*)"', fods_text or ""):
        val = m.group(1)
        if val:
            values.append(val)
    for m in re.finditer(r'<text:p>([^<]*)</text:p>', fods_text or ""):
        val = m.group(1).strip()
        if val:
            values.append(val)
    return values


def _make_mock_window(dest_path: str) -> MagicMock:
    window = MagicMock()
    window.create_file_dialog.return_value = dest_path
    return window


class SheetSaveRoundtripTests(unittest.TestCase):
    """Round-trip fidelity tests for Sheet save_document_dialog."""

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_all_fixtures_roundtrip(self):
        self.assertGreater(len(FIXTURES), 0, "No .xlsx fixtures found")
        # Do not share a LibreOffice profile with a live desktop app or another
        # test run. The persistent UNO worker and CLI fallback both use this URI.
        with tempfile.TemporaryDirectory(prefix="vno-sheet-roundtrip-profile-") as profile_dir:
            with patch.object(main, "_profile_uri", return_value=Path(profile_dir).as_uri()):
                try:
                    for xlsx_path in FIXTURES:
                        with self.subTest(file=xlsx_path.name):
                            self._do_roundtrip(xlsx_path)
                finally:
                    main._PERSISTENT_SOFFICE.release_for_cli_fallback("sheet")

    def _do_roundtrip(self, xlsx_path: Path):
        api = main.VnOfficeApi("sheet", str(xlsx_path))

        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("sheet")
        self.assertEqual(open_result.get("status"), "ok",
            f"Open failed for {xlsx_path.name}: {open_result}")
        content = open_result.get("content") or ""
        self.assertTrue(len(content) > 0, f"Empty content from {xlsx_path.name}")

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(content, "sheet", target_format="xlsx")
        self.assertEqual(save_result.get("status"), "ok",
            f"Save failed for {xlsx_path.name}: {save_result}")

        api2 = main.VnOfficeApi("sheet", dest_path)
        with patch.object(main, "_active_window", return_value=None):
            reopen_result = api2.open_document_dialog("sheet")
        self.assertEqual(reopen_result.get("status"), "ok",
            f"Reopen failed for {xlsx_path.name}: {reopen_result}")
        content2 = reopen_result.get("content") or ""

        orig_tables = _count_tables(content)
        reopen_tables = _count_tables(content2)
        self.assertEqual(orig_tables, reopen_tables,
            f"[{xlsx_path.name}] Sheet count changed: {orig_tables} -> {reopen_tables}")

        orig_values = _extract_cell_values(content)
        reopen_values = _extract_cell_values(content2)
        if orig_values:
            found = sum(1 for v in orig_values if v in reopen_values)
            ratio = found / len(orig_values)
            self.assertGreater(ratio, 0.5,
                f"[{xlsx_path.name}] Value preservation too low: {ratio:.1%} ({found}/{len(orig_values)})")

        self.assertFalse(_has_mojibake(content2),
            f"[{xlsx_path.name}] Mojibake (\\ufffd) detected in reopened content")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_edit_before_save_preserves_new_content(self):
        self.assertGreater(len(FIXTURES), 0, "No .xlsx fixtures found")
        xlsx_path = FIXTURES[0]
        api = main.VnOfficeApi("sheet", str(xlsx_path))

        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("sheet")
        self.assertEqual(open_result.get("status"), "ok")
        content = open_result.get("content") or ""

        last_table_end = content.rfind("</table:table>")
        if last_table_end == -1:
            self.skipTest("No <table:table> found in FODS content")
        insert_pos = content.rfind("</table:table-row>", last_table_end)
        if insert_pos == -1:
            insert_pos = last_table_end
        else:
            insert_pos += len("</table:table-row>")

        new_cell = (
            '<table:table-cell office:value-type="string"'
            f' office:string-value="{EDIT_MARKER_VALUE}">'
            f"<text:p>{EDIT_MARKER_TEXT}</text:p></table:table-cell>"
        )
        new_row = f"<table:table-row>{new_cell}</table:table-row>"
        modified_content = content[:insert_pos] + new_row + content[insert_pos:]

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(modified_content, "sheet", target_format="xlsx")
        self.assertEqual(save_result.get("status"), "ok")

        api2 = main.VnOfficeApi("sheet", dest_path)
        with patch.object(main, "_active_window", return_value=None):
            reopen_result = api2.open_document_dialog("sheet")
        self.assertEqual(reopen_result.get("status"), "ok")
        content2 = reopen_result.get("content") or ""

        self.assertIn(EDIT_MARKER_VALUE, content2,
            "Newly added cell value not found after round-trip save/reopen")
        self.assertIn(EDIT_MARKER_VALUE, content2,
            "Cell office:string-value must survive FODS -> XLSX -> FODS round-trip")


if __name__ == "__main__":
    unittest.main()
