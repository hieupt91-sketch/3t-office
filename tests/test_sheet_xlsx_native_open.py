"""Sheet Phase 2a: File → Mở overlays lockStructure onto FODS.

No native file dialog and no SendKeys. Builds a real XLSX ZIP with
workbookProtection lockStructure, mocks soffice XLSX→FODS (which drops the
flag), then calls VnOfficeApi.open_document_dialog(). Optional integration
runs the same path through soffice when it is installed.
"""

from __future__ import annotations

import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main

patcher = main._ooxml_zip_patch()

ROOT = Path(__file__).resolve().parents[1]

LO_FODS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="BaoCao"><table:table-row>
      <table:table-cell office:value-type="string"><text:p>Khóa cấu trúc</text:p></table:table-cell>
    </table:table-row></table:table>
  </office:spreadsheet></office:body>
</office:document>
"""

LOCKED_WORKBOOK_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<workbookPr/><workbookProtection lockWindows="false" lockStructure="1"/>'
    '<bookViews/><sheets><sheet name="BaoCao" sheetId="1" r:id="rId1"/></sheets>'
    "</workbook>"
)

UNLOCKED_WORKBOOK_XML = LOCKED_WORKBOOK_XML.replace(' lockStructure="1"', "")


def _fake_xlsx(workbook_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("xl/workbook.xml", workbook_xml)
        package.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0"?><worksheet/>')
    return buffer.getvalue()


class SheetXlsxNativeOpenTests(unittest.TestCase):
    def test_overlay_injects_structure_protected_from_lock_structure(self):
        overlaid = patcher.overlay_fods_structure_protection(LO_FODS, LOCKED_WORKBOOK_XML)
        self.assertTrue(patcher.fods_has_structure_protection(overlaid))
        self.assertIn('table:structure-protected="true"', overlaid)
        self.assertIn("Khóa cấu trúc", overlaid)

    def test_overlay_noop_when_xlsx_is_unlocked(self):
        overlaid = patcher.overlay_fods_structure_protection(LO_FODS, UNLOCKED_WORKBOOK_XML)
        self.assertEqual(overlaid, LO_FODS)
        self.assertFalse(patcher.fods_has_structure_protection(overlaid))

    def test_overlay_sheet_xlsx_fods_reads_zip_via_shared_helper(self):
        xlsx = _fake_xlsx(LOCKED_WORKBOOK_XML)
        overlaid = patcher.overlay_sheet_xlsx_fods(xlsx, LO_FODS)
        self.assertTrue(patcher.fods_has_structure_protection(overlaid))
        entry = patcher.read_zip_entry(xlsx, "xl/workbook.xml")
        self.assertIsNotNone(entry)
        self.assertIn(b'lockStructure="1"', entry)

    def test_open_document_dialog_overlays_fods_before_returning_content(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            xlsx_path = Path(temp_dir) / "BaoCao.xlsx"
            xlsx_path.write_bytes(_fake_xlsx(LOCKED_WORKBOOK_XML))
            api = main.VnOfficeApi("sheet", str(xlsx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                self.assertTrue(src_path.endswith("BaoCao.xlsx"))
                self.assertEqual((target_ext, app_kind), ("fods", "sheet"))
                output = Path(out_dir) / "BaoCao.fods"
                output.write_text(LO_FODS, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                with patch.object(main, "_active_window", return_value=None):
                    result = api.open_document_dialog("sheet")

        self.assertEqual(result.get("status"), "ok")
        content = result.get("content") or ""
        self.assertIn('table:structure-protected="true"', content)
        self.assertTrue(patcher.fods_has_structure_protection(content))
        workbook_xml = result.get("ooxmlWorkbookXml") or ""
        self.assertIn('lockStructure="1"', workbook_xml)

    def test_open_unlocked_xlsx_does_not_invent_structure_lock(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            xlsx_path = Path(temp_dir) / "Mo.xlsx"
            xlsx_path.write_bytes(_fake_xlsx(UNLOCKED_WORKBOOK_XML))
            api = main.VnOfficeApi("sheet", str(xlsx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / f"{Path(src_path).stem}.fods"
                output.write_text(LO_FODS, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("sheet")

        self.assertEqual(result.get("status"), "ok")
        self.assertFalse(patcher.fods_has_structure_protection(result.get("content") or ""))

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_real_soffice_save_then_open_keeps_lock(self):
        """Lưu FODS→XLSX (Phase 1) rồi Mở XLSX (Phase 2a) qua open_document_dialog."""
        protected_fods = LO_FODS.replace(
            "<office:spreadsheet>",
            '<office:spreadsheet table:structure-protected="true">',
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            fods_path = Path(temp_dir) / "lock.fods"
            fods_path.write_text(protected_fods, encoding="utf-8")
            xlsx_path = Path(
                main._run_soffice_convert(str(fods_path), "xlsx", temp_dir, app_kind="sheet")
            )
            patcher.postprocess_sheet_xlsx_file(
                str(xlsx_path), fods_path=str(fods_path), enabled=True
            )
            workbook_xml = patcher.read_zip_entry(xlsx_path.read_bytes(), "xl/workbook.xml")
            self.assertIsNotNone(workbook_xml)
            self.assertTrue(patcher.workbook_has_structure_lock(workbook_xml.decode("utf-8")))

            api = main.VnOfficeApi("sheet", str(xlsx_path))
            with patch.object(main, "_active_window", return_value=None):
                result = api.open_document_dialog("sheet")

        self.assertEqual(result.get("status"), "ok", result)
        content = result.get("content") or ""
        self.assertTrue(
            patcher.fods_has_structure_protection(content),
            "Mở lại XLSX đã Lưu phải overlay table:structure-protected (LibreOffice convert không map ngược)",
        )
        self.assertIn('lockStructure="1"', result.get("ooxmlWorkbookXml") or "")


if __name__ == "__main__":
    unittest.main()
