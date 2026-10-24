"""PPTX embedded-font relationships must survive a Slides round-trip."""

import io
import zipfile
import xml.etree.ElementTree as ET

from adapters.libreoffice.common.ooxml_zip_patch import postprocess_slides_pptx


P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
FONT_PATH = "ppt/fonts/TestFont.fntdata"
FONT_BYTES = b"embedded-font-payload"
FODP = (
    '<?xml version="1.0"?>'
    '<office:document-presentation '
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"/>'
)


def _package(entries: dict[str, bytes]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, payload in entries.items():
            archive.writestr(name, payload)
    return output.getvalue()


def _read_package(payload: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        return {name: archive.read(name) for name in archive.namelist()}


def test_postprocess_restores_embedded_fonts_and_relationships() -> None:
    source = _package(
        {
            "ppt/presentation.xml": (
                f'<p:presentation xmlns:p="{P_NS}" xmlns:r="{R_NS}" '
                'embedTrueTypeFonts="1" saveSubsetFonts="1">'
                '<p:sldSz cx="100" cy="100"/>'
                '<p:embeddedFontLst><p:embeddedFont><p:font typeface="Test Font"/>'
                '<p:regular r:id="rId7"/></p:embeddedFont></p:embeddedFontLst>'
                '</p:presentation>'
            ).encode(),
            "ppt/_rels/presentation.xml.rels": (
                f'<Relationships xmlns="{PKG_REL_NS}">'
                f'<Relationship Id="rId7" Type="{R_NS}/font" Target="fonts/TestFont.fntdata"/>'
                '</Relationships>'
            ).encode(),
            FONT_PATH: FONT_BYTES,
            "[Content_Types].xml": (
                f'<Types xmlns="{CT_NS}"><Default Extension="fntdata" '
                'ContentType="application/x-fontdata"/></Types>'
            ).encode(),
        }
    )
    converted = _package(
        {
            "ppt/presentation.xml": (
                f'<p:presentation xmlns:p="{P_NS}"><p:sldSz cx="100" cy="100"/>'
                '<p:defaultTextStyle/><p:extLst/>'
                '</p:presentation>'
            ).encode(),
            "ppt/_rels/presentation.xml.rels": (
                f'<Relationships xmlns="{PKG_REL_NS}">'
                f'<Relationship Id="rId7" Type="{R_NS}/slideLayout" '
                'Target="slideLayouts/slideLayout1.xml"/></Relationships>'
            ).encode(),
            "[Content_Types].xml": f'<Types xmlns="{CT_NS}"/>'.encode(),
        }
    )

    result = postprocess_slides_pptx(converted, source_fodp=FODP, source_pptx=source)
    entries = _read_package(result)

    assert entries.get(FONT_PATH) == FONT_BYTES
    presentation = ET.fromstring(entries["ppt/presentation.xml"])
    assert presentation.attrib.get("embedTrueTypeFonts") == "1"
    assert presentation.attrib.get("saveSubsetFonts") == "1"
    font_list = presentation.find(f"{{{P_NS}}}embeddedFontLst")
    assert font_list is not None
    child_tags = [child.tag for child in presentation]
    assert child_tags.index(f"{{{P_NS}}}embeddedFontLst") < child_tags.index(f"{{{P_NS}}}defaultTextStyle")
    assert child_tags.index(f"{{{P_NS}}}embeddedFontLst") < child_tags.index(f"{{{P_NS}}}extLst")
    font_entry = font_list.find(f"{{{P_NS}}}embeddedFont/{{{P_NS}}}regular")
    assert font_entry is not None
    font_ref = font_entry.attrib.get(f"{{{R_NS}}}id")
    assert font_ref
    assert font_ref != "rId7"
    relationships = ET.fromstring(entries["ppt/_rels/presentation.xml.rels"])
    assert b"<Relationships" in entries["ppt/_rels/presentation.xml.rels"]
    assert b"ns0:Relationships" not in entries["ppt/_rels/presentation.xml.rels"]
    font_relationships = [
        rel for rel in relationships
        if rel.attrib.get("Type") == f"{R_NS}/font"
    ]
    assert any(rel.attrib.get("Id") == font_ref for rel in font_relationships)
    assert any(rel.attrib.get("Target") == "fonts/TestFont.fntdata" for rel in font_relationships)
    assert any(
        rel.attrib.get("Id") == "rId7"
        and rel.attrib.get("Type") == f"{R_NS}/slideLayout"
        for rel in relationships
    )
    content_types = ET.fromstring(entries["[Content_Types].xml"])
    assert any(
        item.attrib.get("Extension") == "fntdata"
        and item.attrib.get("ContentType") == "application/x-fontdata"
        for item in content_types.findall(f"{{{CT_NS}}}Default")
    )
