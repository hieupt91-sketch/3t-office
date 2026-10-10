"""XLSX: siêu liên kết khôi phục không được trùng Id quan hệ với drawing (lan09: Excel từ chối mở tệp đã lưu).

LibreOffice cấp rId1 cho drawing; bản nguồn dùng rId1 cho quan hệ hyperlink. Bước khôi phục cũ bỏ quan hệ vì "Id đã tồn tại"
nên <hyperlink r:id="rId1"> trỏ vào drawing → Excel không mở được tệp.
"""

from __future__ import annotations

import io
import re
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
WORKBOOK = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<sheets><sheet name="Khuyến cáo" sheetId="1" r:id="rId1"/></sheets></workbook>'
)
WORKBOOK_RELS = (
    f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{REL_NS}">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    "</Relationships>"
)
SOURCE_SHEET = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision">'
    '<sheetData><row r="32"><c r="A32" t="inlineStr"><is><t>link</t></is></c></row></sheetData>'
    '<hyperlinks><hyperlink ref="A32" r:id="rId1" xr:uid="{00000000-0004-0000-0100-000000000000}"/></hyperlinks>'
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    '<drawing r:id="rId2"/></worksheet>'
)
SOURCE_RELS = (
    f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="{REL_NS}">'
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing2.xml"/>'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
    'Target="http://nhaantoan.com/khuyen-cao.html" TargetMode="External"/></Relationships>'
)
# Bản LibreOffice ghi ra: mất hyperlink, drawing chiếm rId1.
TARGET_SHEET = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<sheetData><row r="32"><c r="A32" t="inlineStr"><is><t>link</t></is></c></row></sheetData>'
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    '<drawing r:id="rId1"/></worksheet>'
)
TARGET_RELS = (
    f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{REL_NS}">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing2.xml"/>'
    "</Relationships>"
)


def _zip(sheet_xml: str, rels_xml: str | None) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/workbook.xml", WORKBOOK)
        archive.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)
        if rels_xml is not None:
            archive.writestr("xl/worksheets/_rels/sheet1.xml.rels", rels_xml)
    return buffer.getvalue()


class XlsxHyperlinkRelationshipIdTests(unittest.TestCase):
    def _restore(self, target_rels: str | None = TARGET_RELS) -> dict:
        replacements: dict = {}
        patcher._restore_missing_hyperlinks_step(_zip(TARGET_SHEET, target_rels), _zip(SOURCE_SHEET, SOURCE_RELS), replacements)
        return replacements

    def test_hyperlink_gets_unique_relationship_id_when_source_id_collides_with_drawing(self):
        replacements = self._restore()
        sheet = replacements["xl/worksheets/sheet1.xml"]
        rels = replacements["xl/worksheets/_rels/sheet1.xml.rels"]
        link_id = re.search(r'<hyperlink\b[^>]*\br:id="([^"]+)"', sheet).group(1)
        self.assertNotEqual(link_id, "rId1", "hyperlink r:id must not point at the drawing relationship")
        link_rel = re.search(rf'<Relationship\b[^>]*\bId="{re.escape(link_id)}"[^>]*/>', rels)
        self.assertIsNotNone(link_rel, "hyperlink relationship must exist in sheet rels")
        self.assertIn("hyperlink", link_rel.group(0))
        self.assertIn("nhaantoan.com", link_rel.group(0))
        self.assertIn('TargetMode="External"', link_rel.group(0))

    def test_existing_drawing_relationship_is_untouched(self):
        replacements = self._restore()
        rels = replacements["xl/worksheets/_rels/sheet1.xml.rels"]
        self.assertRegex(rels, r'<Relationship\b[^>]*\bId="rId1"[^>]*Type="[^"]*/drawing"[^>]*/>')
        self.assertEqual(len(re.findall(r"<Relationship\b", rels)), 2)
        self.assertIn('<drawing r:id="rId1"/>', replacements.get("xl/worksheets/sheet1.xml", TARGET_SHEET))

    def test_every_relationship_id_in_rels_is_unique(self):
        rels = self._restore()["xl/worksheets/_rels/sheet1.xml.rels"]
        ids = re.findall(r'\bId="([^"]+)"', rels)
        self.assertEqual(len(ids), len(set(ids)))

    def test_hyperlink_uid_attribute_is_stripped_and_hyperlink_precedes_drawing(self):
        sheet = self._restore()["xl/worksheets/sheet1.xml"]
        self.assertNotIn("xr:uid", sheet)
        self.assertLess(sheet.index("<hyperlinks>"), sheet.index("<drawing"))

    def test_source_id_kept_when_it_does_not_collide(self):
        free_rels = TARGET_RELS.replace('Id="rId1"', 'Id="rId7"')
        sheet_free = TARGET_SHEET.replace('<drawing r:id="rId1"/>', '<drawing r:id="rId7"/>')
        replacements: dict = {}
        patcher._restore_missing_hyperlinks_step(_zip(sheet_free, free_rels), _zip(SOURCE_SHEET, SOURCE_RELS), replacements)
        self.assertIn('r:id="rId1"', replacements["xl/worksheets/sheet1.xml"])
        self.assertRegex(replacements["xl/worksheets/_rels/sheet1.xml.rels"], r'Id="rId1"[^>]*hyperlink|hyperlink[^>]*Id="rId1"')


if __name__ == "__main__":
    unittest.main()