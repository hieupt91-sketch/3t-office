from __future__ import annotations

import os
import re
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


SOFFICE_CANDIDATES = (
    Path(os.environ.get("VNO_SOFFICE", "")),
    Path.home() / "tools" / "libreoffice" / "program" / "soffice.exe",
    Path(r"C:\Program Files\LibreOffice\program\soffice.exe"),
)

FODS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"
 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:body><office:spreadsheet><table:table table:name="Sheet1">
  <table:table-row>
   <table:table-cell office:value-type="float" office:value="1"><text:p>1</text:p></table:table-cell>
   <table:table-cell office:value-type="float" office:value="2"><text:p>2</text:p></table:table-cell>
   <table:table-cell/>
   <table:table-cell table:formula="of:=MMULT([.A1:.B2];[.A1:.B2])" table:number-matrix-columns-spanned="2" table:number-matrix-rows-spanned="2" office:value-type="float" office:value="7"><text:p>7</text:p></table:table-cell>
   <table:covered-table-cell office:value-type="float" office:value="10"><text:p>10</text:p></table:covered-table-cell>
  </table:table-row>
  <table:table-row>
   <table:table-cell office:value-type="float" office:value="3"><text:p>3</text:p></table:table-cell>
   <table:table-cell office:value-type="float" office:value="4"><text:p>4</text:p></table:table-cell>
   <table:table-cell/>
   <table:covered-table-cell office:value-type="float" office:value="15"><text:p>15</text:p></table:covered-table-cell>
   <table:covered-table-cell office:value-type="float" office:value="22"><text:p>22</text:p></table:covered-table-cell>
  </table:table-row>
 </table:table></office:spreadsheet></office:body>
</office:document>"""


def _soffice() -> Path | None:
    return next((path for path in SOFFICE_CANDIDATES if str(path) and path.is_file()), None)


class TestSheetArrayFormulaXlsx(unittest.TestCase):
    def test_fods_xlsx_fods_preserves_array_anchor_and_range(self):
        soffice = _soffice()
        if soffice is None:
            self.skipTest("Không tìm thấy LibreOffice đóng gói")
        with tempfile.TemporaryDirectory(prefix="vno-array-xlsx-") as temp_dir:
            root = Path(temp_dir)
            source = root / "array.fods"
            source.write_text(FODS, encoding="utf-8")
            profile = root / "profile"
            command = [
                str(soffice), "--headless", f"-env:UserInstallation={profile.as_uri()}",
                "--convert-to", "xlsx", "--outdir", str(root), str(source),
            ]
            result = subprocess.run(command, capture_output=True, text=True, timeout=90, check=False)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            xlsx = root / "array.xlsx"
            self.assertTrue(xlsx.is_file(), result.stdout + result.stderr)
            with zipfile.ZipFile(xlsx) as package:
                sheet = package.read("xl/worksheets/sheet1.xml").decode("utf-8")
            formula = re.search(r'<f\b([^>]*)>([\s\S]*?)</f>', sheet)
            self.assertIsNotNone(formula, sheet)
            self.assertRegex(formula.group(1), r'\bt="array"')
            self.assertRegex(formula.group(1), r'\bref="D1:E2"')
            self.assertEqual(formula.group(2), "MMULT(A1:B2,A1:B2)")

            reopened = root / "reopened"
            reopened.mkdir()
            profile2 = root / "profile2"
            result = subprocess.run([
                str(soffice), "--headless", f"-env:UserInstallation={profile2.as_uri()}",
                "--convert-to", "fods", "--outdir", str(reopened), str(xlsx),
            ], capture_output=True, text=True, timeout=90, check=False)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            roundtrip = (reopened / "array.fods").read_text(encoding="utf-8")
            self.assertIn('table:number-matrix-columns-spanned="2"', roundtrip)
            self.assertIn('table:number-matrix-rows-spanned="2"', roundtrip)


if __name__ == "__main__":
    unittest.main()
