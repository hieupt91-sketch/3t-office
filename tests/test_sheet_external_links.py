"""Sheet save: external workbook references survive the LibreOffice round trip.

Measured on "thiết bị mạng.xlsx" / "Danh sách thi online.xlsx" (2026-09-14): LibreOffice wrote
`'file:///…xlsx'#$ds.N$8:O$7760` instead of `[1]ds!N$8:O$7760`, dropped xl/externalLinks/* and
Excel 2016 refused to open the result. The post-processor now copies the externalLink parts
(+ their _rels), re-ids the relationships (source rId3 collided with LibreOffice's sheet rId3),
inserts <externalReferences> after </sheets> and restores formula/type/cached value of every
cell whose source formula references [N], keeping the output's style index.
"""
import importlib.util
import io
import os
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("sheet_external_links", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

CT_EXT = "application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml"


def make_xlsx(parts):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as package:
        for name, content in parts.items():
            package.writestr(name, content)
    return stream.getvalue()


SOURCE = {
    "[Content_Types].xml": f'<Types><Override PartName="/xl/workbook.xml" ContentType="w"/><Override PartName="/xl/externalLinks/externalLink1.xml" ContentType="{CT_EXT}"/></Types>',
    "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets><externalReferences><externalReference r:id="rId3"/></externalReferences><calcPr/></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="w" Target="worksheets/sheet1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink" Target="externalLinks/externalLink1.xml"/></Relationships>',
    "xl/externalLinks/externalLink1.xml": '<externalLink><externalBook r:id="rId1"/></externalLink>',
    "xl/externalLinks/_rels/externalLink1.xml.rels": '<Relationships><Relationship Id="rId1" Type="ext" Target="file:///E:/other.xlsx" TargetMode="External"/></Relationships>',
    "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" s="7" t="str"><f>VLOOKUP(B1,[1]ds!N$8:O$7760,2,0)</f><v>Nguyễn Thị</v></c><c r="B1"><v>5</v></c></row></sheetData></worksheet>',
}

OUTPUT = {
    "[Content_Types].xml": '<Types><Override PartName="/xl/workbook.xml" ContentType="w"/></Types>',
    "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Data" sheetId="1" r:id="rId3"/></sheets><calcPr/></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="s" Target="styles.xml"/><Relationship Id="rId3" Type="w" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" s="2" t="e"><f aca="false">VLOOKUP(B1,&apos;file:///E:/other.xlsx&apos;#$ds.N$8:O$7760,2,0)</f><v>#VALUE!</v></c><c r="B1" s="1"><v>5</v></c></row></sheetData></worksheet>',
}


class ExternalLinksPreserved(unittest.TestCase):
    def test_parts_relationships_and_formula_cells_are_restored(self):
        source = make_xlsx(SOURCE)
        output = make_xlsx(OUTPUT)
        replacements = {}
        patcher._preserve_external_links(output, source, replacements)
        patched = patcher.patch_ooxml_zip(output, replacements)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            names = package.namelist()
            wb = package.read("xl/workbook.xml").decode()
            rels = package.read("xl/_rels/workbook.xml.rels").decode()
            sheet = package.read("xl/worksheets/sheet1.xml").decode()
            ct = package.read("[Content_Types].xml").decode()
        self.assertIn("xl/externalLinks/externalLink1.xml", names)
        self.assertIn("xl/externalLinks/_rels/externalLink1.xml.rels", names)
        # externalReferences sits after </sheets>, with a fresh relationship id (rId3 already names the sheet)
        self.assertIn('</sheets><externalReferences><externalReference r:id="rIdVnoExt2"/></externalReferences><calcPr/>', wb)
        self.assertIn('Id="rIdVnoExt2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink" Target="externalLinks/externalLink1.xml"', rels)
        self.assertEqual(rels.count('Id="rId3"'), 1)
        self.assertIn('PartName="/xl/externalLinks/externalLink1.xml"', ct)
        # formula, type and cached value come from the source; the style index stays LibreOffice's
        self.assertIn('<c r="A1" s="2" t="str"><f>VLOOKUP(B1,[1]ds!N$8:O$7760,2,0)</f><v>Nguyễn Thị</v></c>', sheet)
        self.assertIn('<c r="B1" s="1"><v>5</v></c>', sheet)
        self.assertNotIn("file:///", sheet)


if __name__ == "__main__":
    unittest.main()
