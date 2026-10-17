import html
import io
import json
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def package(entries):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, value in entries.items():
            archive.writestr(name, value)
    return stream.getvalue()


def read_entries(value):
    with zipfile.ZipFile(io.BytesIO(value), "r") as archive:
        return {name: archive.read(name).decode("utf-8") for name in archive.namelist()}


def base_xlsx():
    return package({
        "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>',
        "xl/workbook.xml": '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="0"/></workbook>',
        "xl/_rels/workbook.xml.rels": '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        "xl/worksheets/sheet1.xml": '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>',
        "xl/worksheets/_rels/sheet1.xml.rels": '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>',
        "xl/tables/table1.xml": '<?xml version="1.0"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="SalesTable" displayName="SalesTable" ref="A1:C6"><autoFilter ref="A1:C6"/><tableColumns count="3"><tableColumn id="1" name="Region"/><tableColumn id="2" name="Product"/><tableColumn id="3" name="Amount"/></tableColumns></table>',
    })


def fods_with_slicers(items):
    payload = html.escape(json.dumps(items, ensure_ascii=False, separators=(",", ":")), quote=True)
    return f'''<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet><table:table table:name="Data" vno:slicers="{payload}"><table:table-row/></table:table></office:spreadsheet></office:body></office:document>'''


class SheetSlicerXlsxTests(unittest.TestCase):
    def test_generates_excel_2016_slicer_parts_relationships_and_filter(self):
        source = base_xlsx()
        slicers = [{
            "id": "s1", "name": "RegionSlicer", "caption": "Region",
            "tableName": "SalesTable", "columnName": "Region", "columnIndex": 0,
            "left": 240, "top": 20, "width": 180, "height": 220,
            "numberOfColumns": 2, "selectedValues": ["North", "East"]
        }]
        replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods_with_slicers(slicers), replacements)
        output = patcher.patch_ooxml_zip(source, replacements)
        entries = read_entries(output)

        self.assertIn("xl/slicers/slicer1.xml", entries)
        self.assertIn("xl/slicerCaches/slicerCache1.xml", entries)
        self.assertIn('name="RegionSlicer"', entries["xl/slicers/slicer1.xml"])
        self.assertIn('tableId="1" column="1"', entries["xl/slicerCaches/slicerCache1.xml"])
        self.assertIn("relationships/slicerCache", entries["xl/_rels/workbook.xml.rels"])
        self.assertIn("relationships/slicer", entries["xl/worksheets/_rels/sheet1.xml.rels"])
        self.assertIn("x14:slicerList", entries["xl/worksheets/sheet1.xml"])
        self.assertIn("drawing/2010/slicer", entries["xl/drawings/drawing1.xml"])
        self.assertIn('<filter val="North"/>', entries["xl/tables/table1.xml"])
        self.assertIn('<filter val="East"/>', entries["xl/tables/table1.xml"])
        self.assertIn("application/vnd.ms-excel.slicer+xml", entries["[Content_Types].xml"])

    def test_generated_package_can_be_read_back_into_fods_metadata(self):
        source = base_xlsx()
        slicer = {
            "id": "s1", "name": "ProductSlicer", "caption": "Product",
            "tableName": "SalesTable", "columnName": "Product", "columnIndex": 1,
            "left": 50, "top": 60, "width": 190, "height": 200,
            "numberOfColumns": 1, "selectedValues": ["Paper"]
        }
        replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods_with_slicers([slicer]), replacements)
        output = patcher.patch_ooxml_zip(source, replacements)
        metadata = patcher._xlsx_table_slicer_metadata(output)
        self.assertEqual(1, len(metadata["Data"]))
        imported = metadata["Data"][0]
        self.assertEqual("ProductSlicer", imported["name"])
        self.assertEqual("SalesTable", imported["tableName"])
        self.assertEqual(1, imported["columnIndex"])
        self.assertEqual(["Paper"], imported["selectedValues"])

    def test_empty_metadata_removes_slicer_parts_and_workbook_links(self):
        source = base_xlsx()
        first = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods_with_slicers([{
            "name": "RegionSlicer", "caption": "Region", "tableName": "SalesTable",
            "columnName": "Region", "columnIndex": 0, "selectedValues": []
        }]), first)
        with_slicer = patcher.patch_ooxml_zip(source, first)
        second = {}
        patcher._apply_sheet_slicers_to_xlsx(with_slicer, fods_with_slicers([]), second)
        cleared = patcher.patch_ooxml_zip(with_slicer, second)
        entries = read_entries(cleared)
        self.assertNotIn("xl/slicers/slicer1.xml", entries)
        self.assertNotIn("xl/slicerCaches/slicerCache1.xml", entries)
        self.assertNotIn("relationships/slicerCache", entries["xl/_rels/workbook.xml.rels"])
        self.assertNotIn("relationships/slicer", entries["xl/worksheets/_rels/sheet1.xml.rels"])


if __name__ == "__main__":
    unittest.main()
