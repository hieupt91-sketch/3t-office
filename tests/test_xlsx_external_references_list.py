"""XLSX: danh sách <externalReferences> phải là danh sách GỐC đầy đủ (lan22: Excel không mở tệp đã lưu).

LibreOffice ghi sẵn một <externalReferences> rút gọn (1 mục). Bước giữ liên kết ngoài trước đây chỉ chèn danh sách gốc khi
workbook.xml CHƯA có phần tử này, nên bản rút gọn ở lại trong khi công thức/tên dùng chỉ số [2]..[8] → Excel từ chối mở.
"""

from __future__ import annotations

import io
import re
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
EXT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink"
WS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"


def _sheet() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'
    )


def _source() -> bytes:
    refs = "".join(f'<externalReference r:id="rId{n + 2}"/>' for n in range(1, 4))
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets>'
        f"<externalReferences>{refs}</externalReferences></workbook>"
    )
    rels = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="{REL_NS}">'
        f'<Relationship Id="rId1" Type="{WS}" Target="worksheets/sheet1.xml"/>'
        + "".join(f'<Relationship Id="rId{n + 2}" Type="{EXT}" Target="externalLinks/externalLink{n}.xml"/>' for n in range(1, 4))
        + "</Relationships>"
    )
    ct = (
        f'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="{CT_NS}"><Default Extension="xml" ContentType="application/xml"/>'
        + "".join(
            f'<Override PartName="/xl/externalLinks/externalLink{n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml"/>'
            for n in range(1, 4)
        )
        + "</Types>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", rels)
        archive.writestr("[Content_Types].xml", ct)
        archive.writestr("xl/worksheets/sheet1.xml", _sheet())
        for n in range(1, 4):
            archive.writestr(f"xl/externalLinks/externalLink{n}.xml", f"<externalLink n='{n}'/>")
            archive.writestr(
                f"xl/externalLinks/_rels/externalLink{n}.xml.rels",
                f'<Relationships xmlns="{REL_NS}"><Relationship Id="rId1" Type="x" Target="file:///book{n}.xlsx" TargetMode="External"/></Relationships>',
            )
    return buffer.getvalue()


def _lo_output(with_short_list: bool) -> bytes:
    short = '<externalReferences><externalReference r:id="rId5"/></externalReferences>' if with_short_list else ""
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets><sheet name="S" sheetId="1" r:id="rId3"/></sheets>{short}<definedNames/></workbook>'
    )
    rels = (
        f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{REL_NS}">'
        f'<Relationship Id="rId3" Type="{WS}" Target="worksheets/sheet1.xml"/>'
        + (f'<Relationship Id="rId5" Type="{EXT}" Target="externalLinks/externalLink1.xml"/>' if with_short_list else "")
        + "</Relationships>"
    )
    ct = f'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="{CT_NS}"><Default Extension="xml" ContentType="application/xml"/></Types>'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", rels)
        archive.writestr("[Content_Types].xml", ct)
        archive.writestr("xl/worksheets/sheet1.xml", _sheet())
    return buffer.getvalue()


class XlsxExternalReferencesListTests(unittest.TestCase):
    def _preserve(self, with_short_list: bool) -> dict:
        replacements: dict = {}
        patcher._preserve_external_links(_lo_output(with_short_list), _source(), replacements)
        return replacements

    def test_short_libreoffice_list_is_replaced_by_full_original_list(self):
        replacements = self._preserve(True)
        workbook = replacements["xl/workbook.xml"]
        refs = re.findall(r'<externalReference r:id="([^"]+)"/>', workbook)
        self.assertEqual(len(refs), 3, workbook)
        self.assertEqual(workbook.count("<externalReferences"), 1)
        rels = replacements["xl/_rels/workbook.xml.rels"]
        targets = []
        for ref in refs:
            hit = re.search(rf'<Relationship\b[^>]*\bId="{re.escape(ref)}"[^>]*/>', rels)
            self.assertIsNotNone(hit, f"khong co quan he cho {ref}")
            targets.append(re.search(r'Target="([^"]+)"', hit.group(0)).group(1))
        self.assertEqual(targets, [f"externalLinks/externalLink{n}.xml" for n in (1, 2, 3)], "thu tu phai giong tep goc")

    def test_stale_libreoffice_external_relationship_is_removed(self):
        rels = self._preserve(True)["xl/_rels/workbook.xml.rels"]
        self.assertNotIn('Id="rId5"', rels)
        ids = re.findall(r'\bId="([^"]+)"', rels)
        self.assertEqual(len(ids), len(set(ids)))
        # tập quan hệ không phải externalLink (worksheet...) giữ nguyên
        self.assertIn('Id="rId3"', rels)

    def test_missing_list_is_still_inserted_as_before(self):
        workbook = self._preserve(False)["xl/workbook.xml"]
        self.assertEqual(len(re.findall(r'<externalReference r:id="', workbook)), 3)

    def test_external_link_parts_and_content_types_are_copied(self):
        replacements = self._preserve(True)
        for n in (1, 2, 3):
            self.assertIn(f"xl/externalLinks/externalLink{n}.xml", replacements)
            self.assertIn(f"xl/externalLinks/_rels/externalLink{n}.xml.rels", replacements)
        self.assertEqual(replacements["[Content_Types].xml"].count("externalLink+xml"), 3)


if __name__ == "__main__":
    unittest.main()