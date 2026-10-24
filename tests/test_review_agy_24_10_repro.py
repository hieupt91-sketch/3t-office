"""Tái hiện lỗi tìm thấy trong rà soát AGY-REVIEW-1 (docs/REVIEW-AGY-24-10.md).

Hai hàm pivot trong ooxml_zip_patch.py chèn `xmlns:vno`/`vno:filters` bằng cách
cắt ký tự cuối thẻ mở (`tag[:-1] + " ..."`). Khi thẻ gốc là THẺ TỰ ĐÓNG
(`.../>`) thay vì thẻ mở có đóng riêng, kết quả là XML hỏng: dấu `/` nằm giữa
các attribute. Thẻ tự đóng xuất hiện khi bảng pivot không còn trường nào nên
nó không phải thuần lý thuyết.

Hiện tại hai test này dùng @unittest.expectedFailure để ghi nhận hành vi hỏng
mà không làm đỏ cả bộ test; khi sửa lỗi bỏ expectedFailure và giữ assertion.
"""
import io
import json
import zipfile
import unittest
import xml.etree.ElementTree as ET

from adapters.libreoffice.common.ooxml_zip_patch import (
    _apply_refreshed_pivot_locations_from_fods,
    overlay_pivot_filter_metadata_to_fods,
)

SHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
VNO_NS = "https://vnoffice.vn/ns/spreadsheet/1.0"


def _package(pivot_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("xl/pivotTables/pivotTable1.xml", pivot_xml)
    return buffer.getvalue()


class PivotSelfClosingTagRegressionTests(unittest.TestCase):
    @unittest.expectedFailure
    def test_locations_from_fods_keeps_self_closing_definition_well_formed(self):
        """A. _apply_refreshed_pivot_locations_from_fods với pivotTableDefinition tự đóng."""
        pivot = f'<pivotTableDefinition xmlns="{SHEET_NS}" name="abc"/>'
        fods = (
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">'
            '<table:data-pilot-table table:name="abc" vno:xlsx-location="A1:B2" vno:filters="{}"/>'
            "</office:document>"
        )
        replacements: dict[str, str] = {}
        _apply_refreshed_pivot_locations_from_fods(_package(pivot), fods, replacements)
        updated = replacements["xl/pivotTables/pivotTable1.xml"]
        ET.fromstring(updated)  # XML phải well-formed; hiện tại parse lỗi

    @unittest.expectedFailure
    def test_overlay_to_fods_keeps_self_closing_data_pilot_table_well_formed(self):
        """B. overlay_pivot_filter_metadata_to_fods với data-pilot-table tự đóng."""
        filters = json.dumps(
            [{"field": "Nhân viên", "selectedValues": ["NV1"]}], ensure_ascii=False
        )
        encoded = filters.replace("&", "&amp;").replace('"', "&quot;")
        pivot = (
            f'<pivotTableDefinition xmlns="{SHEET_NS}" xmlns:vno="{VNO_NS}" '
            f'name="abc" vno:filters="{encoded}"></pivotTableDefinition>'
        )
        fods = (
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">'
            '<table:data-pilot-table table:name="abc"/>'
            "</office:document>"
        )
        overlaid = overlay_pivot_filter_metadata_to_fods(_package(pivot), fods)
        ET.fromstring(overlaid)  # XML phải well-formed; hiện tại parse lỗi


if __name__ == "__main__":
    unittest.main()
