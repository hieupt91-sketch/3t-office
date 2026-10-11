"""Quy ước S23 (đo 19/9/2026, lan23): XLSX ghi SpreadsheetML có tiền tố (`<x:workbook xmlns:x="…/main"><x:sheet>`,
`<x:c>`) — phần mềm kế toán xuất. Overlay lúc mở, hậu xử lý lúc lưu và auditor đều dùng regex `<sheet\\b`/`<c\\b` nên
không thấy gì: không vno:xf, không khôi phục, auditor đọc 0 sheet → 627 lệch bị che. Chuẩn hoá một lần ở cửa vào."""
import importlib.util
import io
import os
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(__file__))
SPEC = importlib.util.spec_from_file_location("sheet_prefixed", os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py"))
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def _xlsx(prefixed: bool) -> bytes:
    p = "x:" if prefixed else ""
    decl = f'xmlns:x="{NS}"' if prefixed else f'xmlns="{NS}"'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("xl/workbook.xml", f'<{p}workbook {decl} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><{p}sheets><{p}sheet name="Main" sheetId="1" state="hidden" r:id="rId1"/></{p}sheets></{p}workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
        z.writestr("xl/worksheets/sheet1.xml", f'<{p}worksheet {decl}><{p}sheetData><{p}row r="1"><{p}c r="A1" s="3"><{p}v>1</{p}v></{p}c></{p}row></{p}sheetData></{p}worksheet>')
        z.writestr("xl/styles.xml", f'<{p}styleSheet {decl}><{p}cellXfs count="4"><{p}xf numFmtId="0"/><{p}xf numFmtId="0"/><{p}xf numFmtId="0"/><{p}xf numFmtId="3"/></{p}cellXfs></{p}styleSheet>')
    return buf.getvalue()


class PrefixedOoxml(unittest.TestCase):
    def test_prefix_is_stripped_only_for_main_namespace(self):
        out = patcher.normalize_source_xlsx(_xlsx(True))
        with zipfile.ZipFile(io.BytesIO(out)) as z:
            wb = z.read("xl/workbook.xml").decode()
            ws = z.read("xl/worksheets/sheet1.xml").decode()
        self.assertIn('<sheet name="Main"', wb)
        self.assertIn("<sheets>", wb)
        self.assertIn('r:id="rId1"', wb)  # tiền tố khác giữ nguyên
        self.assertIn('<c r="A1" s="3"><v>1</v></c>', ws)
        self.assertEqual(patcher._resolve_xlsx_sheet_entries(out), {"Main": "xl/worksheets/sheet1.xml"})
        # Không tiền tố -> trả nguyên bytes
        plain = _xlsx(False)
        self.assertIs(patcher.normalize_source_xlsx(plain), plain)

    def test_absolute_package_relationship_targets_resolve_from_root(self):
        source = _xlsx(False)
        buf = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(source), "r") as zin, zipfile.ZipFile(buf, "w") as zout:
            for name in zin.namelist():
                data = zin.read(name)
                if name == "xl/_rels/workbook.xml.rels":
                    data = data.replace(b'Target="worksheets/sheet1.xml"', b'Target="/xl/worksheets/sheet1.xml"')
                zout.writestr(name, data)
        self.assertEqual(
            patcher._resolve_xlsx_sheet_entries(buf.getvalue()),
            {"Main": "xl/worksheets/sheet1.xml"},
        )

    def test_xf_overlay_sees_prefixed_source(self):
        fods = ('<office:document xmlns:office="urn:o" xmlns:table="urn:t"><office:body><office:spreadsheet>'
                '<table:table table:name="Main"><table:table-row><table:table-cell office:value-type="float" office:value="1"/></table:table-row>'
                '</table:table></office:spreadsheet></office:body></office:document>')
        out = patcher.reoverlay_sheet_xf_indices(_xlsx(True), fods)
        self.assertIn('vno:xf="3"', out)


if __name__ == "__main__":
    unittest.main()
