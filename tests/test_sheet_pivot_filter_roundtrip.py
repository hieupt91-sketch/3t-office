import io
import json
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    SHEET_VNO_NS,
    _apply_refreshed_pivot_locations_from_fods,
    overlay_pivot_filter_metadata_to_fods,
)


def _package(pivot_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("xl/pivotTables/pivotTable1.xml", pivot_xml)
    return buffer.getvalue()


def test_pivot_filter_metadata_round_trips_between_xlsx_and_fods():
    filters = [{"field": "Nhân viên", "selectedValues": ["NV1"]}]
    encoded = json.dumps(filters, ensure_ascii=False, separators=(",", ":"))
    xml_encoded = encoded.replace("&", "&amp;").replace('"', "&quot;")
    fods = (
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        f'xmlns:vno="{SHEET_VNO_NS}"><table:data-pilot-table table:name="PivotQ21" '
        f'vno:xlsx-location="A1:B2" vno:filters="{xml_encoded}"></table:data-pilot-table></office:document>'
    )
    original_pivot = (
        '<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'name="PivotQ21"><location ref="A1:A1"/></pivotTableDefinition>'
    )
    replacements: dict[str, str] = {}
    _apply_refreshed_pivot_locations_from_fods(_package(original_pivot), fods, replacements)
    updated = replacements["xl/pivotTables/pivotTable1.xml"]
    assert 'ref="A1:B2"' in updated
    assert "vno:filters=" in updated

    package = _package(updated)
    reopened_fods = fods.replace(f' vno:filters="{xml_encoded}"', "")
    overlaid = overlay_pivot_filter_metadata_to_fods(package, reopened_fods)
    assert "vno:filters=" in overlaid
    assert json.loads(encoded) == filters
