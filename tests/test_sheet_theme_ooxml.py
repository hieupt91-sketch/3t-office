"""
Tests for Sheet Theme support in OOXML Zip Patch (Excel 2016 parity).
Covers:
1. Preset resolution (Office, Facet, Organic, custom palettes/font schemes).
2. DrawingML Theme XML generation (generate_sheet_theme_xml).
3. Theme XML parsing (parse_sheet_theme_xml) and roundtrip consistency.
4. FODS embedding (apply_workbook_theme_to_fods) and extraction (parse_workbook_theme_from_fods).
5. Postprocess XLSX patching (postprocess_sheet_xlsx):
   - Injects xl/theme/theme1.xml when workbook theme is specified in FODS.
   - Ensures relationship in xl/_rels/workbook.xml.rels and [Content_Types].xml.
   - Preserves source XLSX theme when theme is unchanged.
6. Open overlay (overlay_sheet_xlsx_fods):
   - Reads xl/theme/theme1.xml from source XLSX and sets vno:workbook-theme on FODS root.
"""

import io
import json
import xml.etree.ElementTree as ET
import zipfile
import pytest

from adapters.libreoffice.common.ooxml_zip_patch import (
    DEFAULT_SHEET_THEME,
    SHEET_COLOR_PALETTES,
    SHEET_FONT_SCHEMES,
    SHEET_THEMES_PRESETS,
    resolve_sheet_theme,
    generate_sheet_theme_xml,
    parse_sheet_theme_xml,
    parse_workbook_theme_from_fods,
    apply_workbook_theme_to_fods,
    _sheet_themes_equal,
    _apply_sheet_theme_to_xlsx,
    postprocess_sheet_xlsx,
    overlay_sheet_xlsx_fods,
)


def _create_minimal_xlsx():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
            '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
            '  <Default Extension="xml" ContentType="application/xml"/>\n'
            '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n'
            '  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n'
            '</Types>'
        ))
        zf.writestr("_rels/.rels", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n'
            '</Relationships>'
        ))
        zf.writestr("xl/workbook.xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n'
            '  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>\n'
            '</workbook>'
        ))
        zf.writestr("xl/_rels/workbook.xml.rels", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n'
            '</Relationships>'
        ))
        zf.writestr("xl/worksheets/sheet1.xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
            '  <sheetData/>\n'
            '</worksheet>'
        ))
        zf.writestr("xl/styles.xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
            '  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>\n'
            '  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>\n'
            '  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\n'
            '  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\n'
            '  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>\n'
            '</styleSheet>'
        ))
    return buf.getvalue()


def test_resolve_sheet_theme_presets():
    office = resolve_sheet_theme("office")
    assert office["themeId"] == "office"
    assert office["themeName"] == "Office"
    assert office["colorSchemeId"] == "office"
    assert office["colorScheme"]["colors"]["accent1"].upper() == SHEET_COLOR_PALETTES["office"]["colors"]["accent1"].upper()
    assert office["fontScheme"]["majorFont"] == "Calibri Light"
    assert office["fontScheme"]["minorFont"] == "Calibri"

    facet = resolve_sheet_theme("facet")
    assert facet["themeId"] == "facet"
    assert facet["themeName"] == "Facet"
    assert facet["colorScheme"]["colors"]["accent1"].upper() == "94C600"
    assert facet["fontScheme"]["majorFont"] == "Century Gothic"
    assert facet["fontScheme"]["minorFont"] == "Century Gothic"

    organic = resolve_sheet_theme("organic")
    assert organic["themeId"] == "organic"
    assert organic["colorScheme"]["colors"]["accent1"].upper() == "688A28"
    assert organic["fontScheme"]["majorFont"] == "Garamond"
    assert organic["fontScheme"]["minorFont"] == "Garamond"


def test_resolve_sheet_theme_custom():
    custom = resolve_sheet_theme({
        "themeId": "custom",
        "colorSchemeId": "blue",
        "fontSchemeId": "arial"
    })
    assert custom["themeId"] == "custom"
    assert custom["colorSchemeId"] == "blue"
    assert custom["fontSchemeId"] == "arial"
    assert custom["colorScheme"]["colors"]["accent1"].upper() == SHEET_COLOR_PALETTES["blue"]["colors"]["accent1"].upper()
    assert custom["fontScheme"]["minorFont"] == "Arial"


def test_generate_and_parse_theme_xml_roundtrip():
    for preset_id in ("office", "facet", "organic", "integral"):
        theme = resolve_sheet_theme(preset_id)
        xml_str = generate_sheet_theme_xml(theme)

        # Must parse as valid XML
        root = ET.fromstring(xml_str)
        assert "theme" in root.tag

        # Parse back using parse_sheet_theme_xml
        parsed = parse_sheet_theme_xml(xml_str)
        assert parsed is not None
        assert parsed["themeName"] == theme["themeName"]
        for key in ("dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"):
            assert parsed["colorScheme"]["colors"][key].upper() == theme["colorScheme"]["colors"][key].upper()
        assert parsed["fontScheme"]["majorFont"] == theme["fontScheme"]["majorFont"]
        assert parsed["fontScheme"]["minorFont"] == theme["fontScheme"]["minorFont"]


def test_fods_workbook_theme_embed_and_parse():
    fods_template = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:vno="urn:vnoffice:document:1.0">\n'
        '  <office:body>\n'
        '    <office:spreadsheet>\n'
        '      <office:table office:name="Sheet1"/>\n'
        '    </office:spreadsheet>\n'
        '  </office:body>\n'
        '</office:document>'
    )

    theme_to_set = {
        "themeId": "organic",
        "colorSchemeId": "organic",
        "fontSchemeId": "garamond",
        "themeName": "Organic"
    }

    updated_fods = apply_workbook_theme_to_fods(fods_template, theme_to_set)
    assert 'vno:workbook-theme="' in updated_fods

    parsed_back = parse_workbook_theme_from_fods(updated_fods)
    assert parsed_back is not None
    assert parsed_back["themeId"] == "organic"
    assert parsed_back["fontSchemeId"] == "garamond"


def test_postprocess_sheet_xlsx_injects_theme():
    min_xlsx = _create_minimal_xlsx()
    fods = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'vno:workbook-theme="{&quot;themeId&quot;:&quot;organic&quot;,&quot;colorSchemeId&quot;:&quot;organic&quot;,&quot;fontSchemeId&quot;:&quot;garamond&quot;,&quot;themeName&quot;:&quot;Organic&quot;}">\n'
        '  <office:body><office:spreadsheet/></office:body>\n'
        '</office:document>'
    )

    patched_xlsx = postprocess_sheet_xlsx(min_xlsx, source_fods=fods, source_xlsx_bytes=None)
    with zipfile.ZipFile(io.BytesIO(patched_xlsx), "r") as zf:
        namelist = zf.namelist()
        assert "xl/theme/theme1.xml" in namelist

        theme_xml = zf.read("xl/theme/theme1.xml").decode("utf-8")
        assert "Garamond" in theme_xml
        assert "688A28" in theme_xml

        # Check workbook rels
        rels_xml = zf.read("xl/_rels/workbook.xml.rels").decode("utf-8")
        assert "theme/theme1.xml" in rels_xml

        # Check content types
        ct_xml = zf.read("[Content_Types].xml").decode("utf-8")
        assert 'PartName="/xl/theme/theme1.xml"' in ct_xml


def test_overlay_sheet_xlsx_fods_and_postprocess_roundtrip():
    # 1. Create xlsx with facet theme
    facet_theme = resolve_sheet_theme("facet")
    theme_xml = generate_sheet_theme_xml(facet_theme)

    buf = io.BytesIO()
    min_xlsx = _create_minimal_xlsx()
    with zipfile.ZipFile(io.BytesIO(min_xlsx), "r") as zin:
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                zout.writestr(item, zin.read(item.filename))
            zout.writestr("xl/theme/theme1.xml", theme_xml)
    xlsx_with_theme = buf.getvalue()

    # 2. Overlay into blank FODS
    blank_fods = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">\n'
        '  <office:body><office:spreadsheet/></office:body>\n'
        '</office:document>'
    )

    fods_with_theme = overlay_sheet_xlsx_fods(xlsx_with_theme, blank_fods)
    parsed_theme = parse_workbook_theme_from_fods(fods_with_theme)
    assert parsed_theme is not None
    assert parsed_theme["themeId"] == "facet" or parsed_theme.get("colorScheme", {}).get("colors", {}).get("accent1", "").upper() == "94C600"

    # 3. Save (postprocess) back
    saved_xlsx = postprocess_sheet_xlsx(xlsx_with_theme, source_fods=fods_with_theme, source_xlsx_bytes=xlsx_with_theme)
    with zipfile.ZipFile(io.BytesIO(saved_xlsx), "r") as zf:
        out_theme_xml = zf.read("xl/theme/theme1.xml").decode("utf-8")
        assert "94C600" in out_theme_xml
        assert "Century Gothic" in out_theme_xml
