"""Test sheet automatic type detection, Alt+Enter wrapText, and XLSX cell types and number formats."""

from __future__ import annotations

import io
import os
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import main

ROOT = Path(__file__).resolve().parents[1]

# XML Namespaces in OpenXML
NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def _make_fods_payload() -> str:
    """Build a complete FODS file containing all detected cell types and Alt+Enter wrapText."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:automatic-styles>
    <style:style style:name="vno-default-column" style:family="table-column">
      <style:table-column-properties style:column-width="1.693cm"/>
    </style:style>
    <style:style style:name="vno-default-row" style:family="table-row">
      <style:table-row-properties style:row-height="0.529cm" style:use-optimal-row-height="false"/>
    </style:style>
    <style:style style:name="vno-ro-wrap" style:family="table-row">
      <style:table-row-properties style:row-height="1.2cm" style:use-optimal-row-height="false"/>
    </style:style>
    <number:date-style style:name="n_date">
      <number:day number:style="long"/><number:text>/</number:text><number:month number:style="long"/><number:text>/</number:text><number:year number:style="long"/>
    </number:date-style>
    <style:style style:name="ce_date" style:family="table-cell" style:data-style-name="n_date"/>
    <number:time-style style:name="n_time">
      <number:hours number:style="long"/><number:text>:</number:text><number:minutes number:style="long"/>
    </number:time-style>
    <style:style style:name="ce_time" style:family="table-cell" style:data-style-name="n_time"/>
    <number:percentage-style style:name="n_pct">
      <number:number number:min-integer-digits="1" number:decimal-places="0" number:min-decimal-places="0"/>
      <number:text>%</number:text>
    </number:percentage-style>
    <style:style style:name="ce_pct" style:family="table-cell" style:data-style-name="n_pct"/>
    <number:currency-style style:name="n_vnd">
      <number:number number:min-integer-digits="1" number:decimal-places="0" number:min-decimal-places="0" number:grouping="true"/>
      <number:currency-symbol>₫</number:currency-symbol>
    </number:currency-style>
    <style:style style:name="ce_vnd" style:family="table-cell" style:data-style-name="n_vnd"/>
    <style:style style:name="ce_wrap" style:family="table-cell">
      <style:table-cell-properties fo:wrap-option="wrap"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1">
        <table:table-row>
          <table:table-cell office:value-type="float" office:value="1234.56"><text:p>1234.56</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="date" office:date-value="2026-12-31" table:style-name="ce_date"><text:p>46387</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="time" office:time-value="PT13H45M00S" table:style-name="ce_time"><text:p>0.5729166666666666</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="float" office:value="0.25" table:style-name="ce_pct"><text:p>0.25</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="float" office:value="250000" table:style-name="ce_vnd"><text:p>250000</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="string"><text:p>1234.56</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="string"><text:p>Văn bản thuần</text:p></table:table-cell>
        </table:table-row>
        <table:table-row table:style-name="vno-ro-wrap">
          <table:table-cell office:value-type="string" table:style-name="ce_wrap"><text:p>Dòng một</text:p><text:p>Dòng hai</text:p></table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>"""


class SheetTypeDetectionXlsxTests(unittest.TestCase):
    """Verify that detected types save to real XLSX numeric, date, time, currency and wrapText cells."""

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_xlsx_cell_types_and_number_formats(self):
        fods = _make_fods_payload()
        with tempfile.TemporaryDirectory() as td:
            fods_path = os.path.join(td, "type_test.fods")
            with open(fods_path, "w", encoding="utf-8") as f:
                f.write(fods)

            xlsx_path = main._convert_save_source_to_native(fods_path, "sheet", "xlsx")
            self.assertTrue(os.path.exists(xlsx_path), "File XLSX phải được xuất thành công")

            with zipfile.ZipFile(xlsx_path, "r") as z:
                sheet_xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
                styles_xml = z.read("xl/styles.xml").decode("utf-8")
                shared_strings_xml = (
                    z.read("xl/sharedStrings.xml").decode("utf-8")
                    if "xl/sharedStrings.xml" in z.namelist()
                    else ""
                )

            # 1. Parse styles.xml: map style index (s) -> numFmtId and wrapText
            styles_root = ET.fromstring(styles_xml)
            num_fmts = {}
            for num_fmt in styles_root.findall(f".//{{{NS_MAIN}}}numFmt"):
                num_fmts[int(num_fmt.attrib["numFmtId"])] = num_fmt.attrib.get("formatCode", "")

            cell_xfs = []
            for xf in styles_root.findall(f".//{{{NS_MAIN}}}cellXfs/{{{NS_MAIN}}}xf"):
                num_fmt_id = int(xf.attrib.get("numFmtId", "0"))
                alignment = xf.find(f"{{{NS_MAIN}}}alignment")
                wrap_text = alignment is not None and alignment.attrib.get("wrapText") in ("1", "true")
                cell_xfs.append({"numFmtId": num_fmt_id, "wrapText": wrap_text})

            # 2. Parse sharedStrings
            shared_strings = []
            if shared_strings_xml:
                sst_root = ET.fromstring(shared_strings_xml)
                for si in sst_root.findall(f".//{{{NS_MAIN}}}si"):
                    t_nodes = si.findall(f".//{{{NS_MAIN}}}t")
                    shared_strings.append("".join((t.text or "") for t in t_nodes))

            # 3. Parse sheet1.xml cells
            sheet_root = ET.fromstring(sheet_xml)
            cells = {}
            for row in sheet_root.findall(f".//{{{NS_MAIN}}}sheetData/{{{NS_MAIN}}}row"):
                for c in row.findall(f"{{{NS_MAIN}}}c"):
                    r = c.attrib["r"]
                    cell_type = c.attrib.get("t", "n")  # default cell type in XLSX is 'n'
                    s_idx = int(c.attrib.get("s", "0"))
                    v_elem = c.find(f"{{{NS_MAIN}}}v")
                    val = v_elem.text if v_elem is not None else ""
                    cells[r] = {"type": cell_type, "styleIndex": s_idx, "val": val}

            # A1: 1234.56 must be a real number
            self.assertIn("A1", cells)
            self.assertIn(cells["A1"]["type"], ("n", ""), "A1 phải là kiểu số (number)")
            self.assertAlmostEqual(float(cells["A1"]["val"]), 1234.56, places=2)

            # A2: 31/12/2026 must be serial 46387 with date format
            self.assertIn("A2", cells)
            self.assertIn(cells["A2"]["type"], ("n", ""), "A2 phải là kiểu số (serial ngày)")
            self.assertEqual(int(float(cells["A2"]["val"])), 46387)
            a2_xf = cell_xfs[cells["A2"]["styleIndex"]]
            a2_fmt = num_fmts.get(a2_xf["numFmtId"], "")
            self.assertTrue(
                "yy" in a2_fmt.lower() or a2_xf["numFmtId"] in (14, 15, 16, 17, 22),
                f"A2 phải có định dạng ngày: formatCode='{a2_fmt}' (numFmtId={a2_xf['numFmtId']})",
            )

            # A3: 13:45 must be time serial ~0.5729166667 with time format
            self.assertIn("A3", cells)
            self.assertIn(cells["A3"]["type"], ("n", ""), "A3 phải là kiểu số (serial giờ)")
            self.assertAlmostEqual(float(cells["A3"]["val"]), 0.5729166667, places=5)
            a3_xf = cell_xfs[cells["A3"]["styleIndex"]]
            a3_fmt = num_fmts.get(a3_xf["numFmtId"], "")
            self.assertTrue(
                "h" in a3_fmt.lower() or a3_xf["numFmtId"] in (18, 19, 20, 21),
                f"A3 phải có định dạng giờ hh:mm: formatCode='{a3_fmt}' (numFmtId={a3_xf['numFmtId']})",
            )

            # A4: 25% must be 0.25 with percentage format
            self.assertIn("A4", cells)
            self.assertIn(cells["A4"]["type"], ("n", ""), "A4 phải là kiểu số (phần trăm)")
            self.assertAlmostEqual(float(cells["A4"]["val"]), 0.25, places=4)
            a4_xf = cell_xfs[cells["A4"]["styleIndex"]]
            a4_fmt = num_fmts.get(a4_xf["numFmtId"], "")
            self.assertTrue(
                "%" in a4_fmt or a4_xf["numFmtId"] in (9, 10),
                f"A4 phải có định dạng phần trăm: formatCode='{a4_fmt}' (numFmtId={a4_xf['numFmtId']})",
            )

            # A5: 250000 VND must be number 250000 with currency format
            self.assertIn("A5", cells)
            self.assertIn(cells["A5"]["type"], ("n", ""), "A5 phải là kiểu số (tiền tệ VND)")
            self.assertEqual(int(float(cells["A5"]["val"])), 250000)
            a5_xf = cell_xfs[cells["A5"]["styleIndex"]]
            a5_fmt = num_fmts.get(a5_xf["numFmtId"], "")
            self.assertTrue(
                "₫" in a5_fmt or "đ" in a5_fmt.lower() or a5_xf["numFmtId"] in (5, 6, 7, 8, 41, 42, 43, 44),
                f"A5 phải có định dạng tiền tệ VND: formatCode='{a5_fmt}' (numFmtId={a5_xf['numFmtId']})",
            )

            # A6: '1234.56 forced text must be string cell
            self.assertIn("A6", cells)
            self.assertEqual(cells["A6"]["type"], "s", "A6 có dấu nháy đơn đầu phải là ô string")
            str_idx_a6 = int(cells["A6"]["val"])
            self.assertEqual(shared_strings[str_idx_a6], "1234.56")

            # A7: plain text must stay text
            self.assertIn("A7", cells)
            self.assertEqual(cells["A7"]["type"], "s", "A7 phải là ô string")
            str_idx_a7 = int(cells["A7"]["val"])
            self.assertEqual(shared_strings[str_idx_a7], "Văn bản thuần")

            # A8: Alt+Enter multiline text with wrapText and real newline
            self.assertIn("A8", cells)
            self.assertEqual(cells["A8"]["type"], "s", "A8 phải là ô string")
            str_idx_a8 = int(cells["A8"]["val"])
            self.assertEqual(shared_strings[str_idx_a8], "Dòng một\nDòng hai")
            a8_xf = cell_xfs[cells["A8"]["styleIndex"]]
            self.assertTrue(a8_xf["wrapText"], "A8 phải có alignment wrapText='1' hoặc wrapText='true'")


if __name__ == "__main__":
    unittest.main()
