import html
import io
import json
import unittest
import zipfile
from pathlib import Path

from adapters.libreoffice.common import ooxml_zip_patch as patcher


FIXTURE = Path(__file__).parent / "fixtures" / "real-office-samples" / "sample-sheet-pivot.xlsx"


def read_entries(value):
    with zipfile.ZipFile(io.BytesIO(value), "r") as archive:
        return {name: archive.read(name).decode("utf-8") for name in archive.namelist()}


def replace_entry(value, name, transform):
    source = io.BytesIO(value)
    output = io.BytesIO()
    with zipfile.ZipFile(source, "r") as reader, zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as writer:
        for info in reader.infolist():
            data = reader.read(info.filename)
            if info.filename == name:
                data = transform(data.decode("utf-8")).encode("utf-8")
            writer.writestr(info, data)
    return output.getvalue()


def fods(items, *, include_pivot_id=True):
    payload = html.escape(json.dumps(items, ensure_ascii=False, separators=(",", ":")), quote=True)
    pivot_id = ' vno:pivot-id="pivot-1"' if include_pivot_id else ""
    return f'''<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet><table:table table:name="DoanhThuNguon"><table:table-row/></table:table><table:table table:name="BangTongHop" vno:slicers="{payload}"><table:data-pilot-tables><table:data-pilot-table table:name="DoanhThuTheoKhuVuc"{pivot_id}/></table:data-pilot-tables></table:table></office:spreadsheet></office:body></office:document>'''


class SheetPivotSlicerXlsxTests(unittest.TestCase):
    def test_pivot_slicer_writes_native_cache_selection_and_pivot_filter(self):
        source = FIXTURE.read_bytes()
        item = {
            "id": "ps1", "name": "LocKhuVuc", "caption": "Khu vực", "sourceType": "pivot", "kind": "slicer",
            "pivotId": "pivot-1", "connectedPivotIds": ["pivot-1"], "fieldName": "Khu vực",
            "selectedValues": ["Bắc", "Trung"], "left": 360, "top": 30, "width": 190, "height": 220,
            "numberOfColumns": 2, "buttonHeight": 30,
        }
        replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods([item]), replacements)
        output = patcher.patch_ooxml_zip(source, replacements)
        entries = read_entries(output)

        cache = entries["xl/slicerCaches/slicerCache1.xml"]
        self.assertIn('<pivotTable tabId="2" name="DoanhThuTheoKhuVuc"/>', cache)
        self.assertIn('<tabular pivotCacheId="1">', cache)
        self.assertIn('<i x="0" s="1"/>', cache)
        self.assertIn('<i x="1" s="0"/>', cache)
        self.assertIn('<i x="2" s="1"/>', cache)
        self.assertIn("pivotCacheDefinition pivotCacheId=\"1\"", entries["xl/pivotCache/pivotCacheDefinition1.xml"])
        self.assertIn('multipleItemSelectionAllowed="1"', entries["xl/pivotTables/pivotTable1.xml"])
        self.assertIn('<item x="1" h="1"/>', entries["xl/pivotTables/pivotTable1.xml"])

        imported = patcher._xlsx_table_slicer_metadata(output, fods([]))["BangTongHop"][0]
        self.assertEqual("pivot", imported["sourceType"])
        self.assertEqual("pivot-1", imported["pivotId"])
        self.assertEqual(["Bắc", "Trung"], imported["selectedValues"])

    def test_timeline_writes_native_parts_and_roundtrips_range(self):
        source = replace_entry(
            FIXTURE.read_bytes(),
            "xl/pivotCache/pivotCacheDefinition1.xml",
            lambda xml: xml.replace(
                '<cacheField name="Tháng" numFmtId="0"><sharedItems count="3"><s v="T1"/><s v="T2"/><s v="T3"/></sharedItems></cacheField>',
                '<cacheField name="Ngày" numFmtId="14"><sharedItems containsDate="1" count="3"><d v="2025-01-01T00:00:00"/><d v="2025-02-01T00:00:00"/><d v="2025-03-01T00:00:00"/></sharedItems></cacheField>',
            ),
        )
        item = {
            "id": "tl1", "name": "DongThoiGianNgay", "caption": "Ngày", "sourceType": "pivot", "kind": "timeline",
            "pivotId": "pivot-1", "connectedPivotIds": ["pivot-1"], "fieldName": "Ngày",
            "startDate": "2025-02-01", "endDate": "2025-03-01", "granularity": "months",
            "left": 300, "top": 40, "width": 360, "height": 150,
        }
        replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods([item]), replacements)
        output = patcher.patch_ooxml_zip(source, replacements)
        entries = read_entries(output)

        self.assertIn("xl/timelineCaches/timelineCache1.xml", entries)
        self.assertIn("xl/timelines/timeline1.xml", entries)
        cache = entries["xl/timelineCaches/timelineCache1.xml"]
        self.assertIn('filterType="dateBetween"', cache)
        self.assertIn('startDate="2025-02-01T00:00:00" endDate="2025-03-01T00:00:00"', cache)
        self.assertIn("relationships/TimelineCache", entries["xl/_rels/workbook.xml.rels"])
        self.assertIn("relationships/Timeline", entries["xl/worksheets/_rels/sheet2.xml.rels"])
        self.assertIn("timelineRefs", entries["xl/worksheets/sheet2.xml"])
        self.assertIn("timelinePivotCacheDefinition", entries["xl/pivotCache/pivotCacheDefinition1.xml"])
        self.assertIn("drawing/2012/timeline", next(value for name, value in entries.items() if name.startswith("xl/drawings/drawing")))

        imported = patcher._xlsx_table_slicer_metadata(output, fods([]))["BangTongHop"][0]
        self.assertEqual("timeline", imported["kind"])
        self.assertEqual("months", imported["granularity"])
        self.assertEqual("2025-02-01", imported["startDate"])
        self.assertEqual("2025-03-01", imported["endDate"])

    def test_open_then_save_keeps_native_pivot_slicer(self):
        source = FIXTURE.read_bytes()
        item = {
            "name": "LocKhuVuc", "caption": "Khu vực", "sourceType": "pivot", "kind": "slicer",
            "pivotId": "pivot-1", "connectedPivotIds": ["pivot-1"], "fieldName": "Khu vực",
            "selectedValues": ["Nam"], "style": "dark", "buttonHeight": 32,
        }
        first_replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods([item]), first_replacements)
        opened_file = patcher.patch_ooxml_zip(source, first_replacements)
        overlaid = patcher._overlay_sheet_slicers_from_xlsx(opened_file, fods([]))

        second_replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, overlaid, second_replacements)
        saved_file = patcher.patch_ooxml_zip(source, second_replacements)
        entries = read_entries(saved_file)
        self.assertIn("xl/slicerCaches/slicerCache1.xml", entries)
        self.assertIn('s="1"', entries["xl/slicerCaches/slicerCache1.xml"])
        self.assertIn('style="SlicerStyleDark1"', entries["xl/slicers/slicer1.xml"])
        imported = patcher._xlsx_table_slicer_metadata(saved_file, fods([]))["BangTongHop"][0]
        self.assertEqual(["Nam"], imported["selectedValues"])
        self.assertEqual(32, imported["buttonHeight"])
        self.assertEqual("dark", imported["style"])

    def test_external_file_without_vno_id_links_slicer_to_imported_pivot_id(self):
        source = FIXTURE.read_bytes()
        item = {
            "name": "LocKhuVuc", "caption": "Khu vực", "sourceType": "pivot", "kind": "slicer",
            "pivotId": "pivot-1", "connectedPivotIds": ["pivot-1"], "fieldName": "Khu vực", "selectedValues": ["Bắc"],
        }
        replacements = {}
        patcher._apply_sheet_slicers_to_xlsx(source, fods([item]), replacements)
        external = patcher.patch_ooxml_zip(source, replacements)
        overlaid = patcher._overlay_sheet_slicers_from_xlsx(external, fods([], include_pivot_id=False))
        self.assertIn('vno:pivot-id="pivot-import-1"', overlaid)
        self.assertIn('&quot;pivotId&quot;:&quot;pivot-import-1&quot;', overlaid)


if __name__ == "__main__":
    unittest.main()
