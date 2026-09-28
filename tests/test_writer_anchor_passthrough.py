from __future__ import annotations

import importlib.util
import io
import json
import re
import zipfile
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PATCHER = ROOT / "adapters" / "libreoffice" / "common" / "ooxml_zip_patch.py"
spec = importlib.util.spec_from_file_location("writer_anchor_patcher", PATCHER)
patcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patcher)

IMAGE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"


def make_docx(document_body: str, rels: str = "", media: dict[str, bytes] | None = None) -> bytes:
    document = (
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">'
        f'<w:body>{document_body}</w:body></w:document>'
    )
    content_types = (
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="xml" ContentType="application/xml"/></Types>'
    )
    relationships = (
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'{rels}</Relationships>'
    )
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("word/document.xml", document)
        archive.writestr("word/_rels/document.xml.rels", relationships)
        for name, payload in (media or {}).items():
            archive.writestr(name, payload)
    return result.getvalue()


def anchor(name: str, payload: str, rid: str = "rId7", docpr_id: int = 1) -> str:
    return (
        '<w:p><w:r><w:drawing><wp:anchor behindDoc="1">'
        '<wp:positionH relativeFrom="page"><wp:posOffset>-800100</wp:posOffset></wp:positionH>'
        '<wp:positionV relativeFrom="page"><wp:posOffset>-914400</wp:posOffset></wp:positionV>'
        '<wp:wrapTopAndBottom/><wp:docPr '
        f'id="{docpr_id}" name="{name}"/>{payload}<a:blip r:embed="{rid}"/>'
        '</wp:anchor></w:drawing></w:r></w:p>'
    )


class WriterAnchorPassthroughTests(unittest.TestCase):
    def test_group_anchor_xml_media_relationship_and_content_type_are_preserved(self):
        source_anchor = anchor("Group 7068", '<wpg:wgp><a:graphic><a:t>CATALOG</a:t></a:graphic></wpg:wgp>')
        source = make_docx(
            source_anchor,
            f'<Relationship Id="rId7" Type="{IMAGE_REL}" Target="media/cover.png"/>',
            {"word/media/cover.png": b"purple-cover"},
        )
        converted = make_docx(
            anchor("Group 7068", '<pic:pic><a:t>rasterized</a:t></pic:pic>', "rId2", 1),
            f'<Relationship Id="rId2" Type="{IMAGE_REL}" Target="media/blue.png"/>',
            {"word/media/blue.png": b"blue-cover"},
        )

        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        with zipfile.ZipFile(io.BytesIO(result)) as archive:
            xml = archive.read("word/document.xml").decode()
            rels = archive.read("word/_rels/document.xml.rels").decode()
            content_types = archive.read("[Content_Types].xml").decode()
            names = set(archive.namelist())
            copied_name = re.search(r'Target="(media/vno_passthrough_[^"]+\.png)"', rels).group(1)
            self.assertEqual(archive.read("word/" + copied_name), b"purple-cover")
        self.assertIn("<wpg:wgp>", xml)
        self.assertIn("CATALOG", xml)
        self.assertNotIn("rasterized", xml)
        self.assertNotIn('Id="rId2"', rels)
        self.assertNotIn("word/media/blue.png", names)
        self.assertRegex(xml, r'r:embed="rId\d+"')
        self.assertIn('Extension="png" ContentType="image/png"', content_types)

    def test_same_paragraph_fallback_does_not_replace_later_unmatched_anchor(self):
        source = make_docx(anchor("Original group", "<wpg:wgp/>", docpr_id=9))
        converted = make_docx(
            anchor("Generated A", "<pic:pic/>", docpr_id=1)
            + anchor("Generated B", "<pic:pic/>", docpr_id=2)
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertIn("Original group", xml)
        self.assertIn("Generated B", xml)

    def test_untouched_starwriter_frame_restores_native_textbox_and_drops_shape_gifs(self):
        source_rect = (
            '<w:p><w:r><w:drawing><wp:anchor>'
            '<wp:docPr id="1" name="Rectangle 2"/>'
            '<wps:wsp><wps:cNvPr name="Rectangle 2"/><wps:spPr>'
            '<a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill></wps:spPr>'
            '<wps:txbx><w:txbxContent><w:p><w:r><w:t>BAN GIAM DOC</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp></wp:anchor></w:drawing></w:r></w:p>'
        )
        source_line = (
            '<w:p><w:r><w:drawing><wp:anchor>'
            '<wp:docPr id="2" name="Elbow Connector 23"/>'
            '<wps:wsp><wps:cNvPr name="Elbow Connector 23"/></wps:wsp>'
            '</wp:anchor></w:drawing></w:r></w:p>'
        )
        source = make_docx(source_rect + source_line)
        converted = make_docx(
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:drawing><wp:anchor><wp:docPr id="10" name="Shape1"/>'
            '<pic:pic><a:blip r:embed="rId2"/></pic:pic></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="11" name="Shape2"/>'
            '<pic:pic><a:blip r:embed="rId3"/></pic:pic></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="12" name="Frame1"/>'
            '<wps:txbx/><w:txbxContent><w:p><w:r><w:t>BAN GIAM DOC</w:t></w:r></w:p>'
            '</w:txbxContent></wp:anchor></w:drawing></w:r></w:p>',
            f'<Relationship Id="rId2" Type="{IMAGE_REL}" Target="media/image2.gif"/>'
            f'<Relationship Id="rId3" Type="{IMAGE_REL}" Target="media/image3.gif"/>',
            {"word/media/image2.gif": b"GIF89a-rect", "word/media/image3.gif": b"GIF89a-line"},
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        with zipfile.ZipFile(io.BytesIO(result)) as archive:
            xml = archive.read("word/document.xml").decode()
            names = set(archive.namelist())
        self.assertEqual(len(re.findall(r"<wp:anchor\b", xml)), 2)
        self.assertEqual(len(re.findall(r"<pic:pic\b", xml)), 0)
        self.assertIn('name="Rectangle 2"', xml)
        self.assertIn('name="Elbow Connector 23"', xml)
        self.assertIn("BAN GIAM DOC", xml)
        self.assertIn('val="1F4E79"', xml)
        self.assertNotIn("Frame1", xml)
        self.assertNotIn("Shape1", xml)
        self.assertNotIn("Shape2", xml)
        self.assertFalse(any(name.endswith(".gif") for name in names))

    def test_starwriter_gif_is_kept_when_textbox_was_edited(self):
        source = make_docx(
            '<w:p><w:r><w:drawing><wp:anchor>'
            '<wp:docPr id="1" name="Rectangle 2"/>'
            '<wps:wsp><wps:txbx><w:txbxContent><w:p><w:r><w:t>BAN GIAM DOC</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp></wp:anchor></w:drawing></w:r></w:p>'
        )
        converted = make_docx(
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="10" name="Shape1"/>'
            '<pic:pic><a:blip r:embed="rId2"/></pic:pic></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="12" name="Frame1"/>'
            '<wps:txbx/><w:txbxContent><w:p><w:bookmarkStart w:id="1" w:name="vno-edited-0"/>'
            '<w:r><w:t>ZZ BAN GIAM DOC</w:t></w:r></w:p></w:txbxContent></wp:anchor></w:drawing></w:r></w:p>',
            f'<Relationship Id="rId2" Type="{IMAGE_REL}" Target="media/image2.gif"/>',
            {"word/media/image2.gif": b"GIF89a-rect"},
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        with zipfile.ZipFile(io.BytesIO(result)) as archive:
            xml = archive.read("word/document.xml").decode()
            names = set(archive.namelist())
        self.assertIn("Frame1", xml)
        self.assertIn("ZZ BAN GIAM DOC", xml)
        self.assertIn("Shape1", xml)
        self.assertTrue(any(name.endswith(".gif") for name in names))

    def test_named_png_picture_is_not_dropped_as_starwriter_gif(self):
        source = make_docx(
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="1" name="Picture 4"/>'
            '<pic:pic><a:blip r:embed="rId7"/></pic:pic></wp:anchor></w:drawing></w:r></w:p>',
            f'<Relationship Id="rId7" Type="{IMAGE_REL}" Target="media/cover.png"/>',
            {"word/media/cover.png": b"png-bytes"},
        )
        converted = make_docx(
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:drawing><wp:anchor><wp:docPr id="1" name="Picture 4"/>'
            '<pic:pic><a:blip r:embed="rId2"/></pic:pic></wp:anchor></w:drawing></w:r></w:p>',
            f'<Relationship Id="rId2" Type="{IMAGE_REL}" Target="media/cover.png"/>',
            {"word/media/cover.png": b"png-bytes"},
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertIn("Picture 4", xml)
        self.assertIn("<pic:pic", xml)

    def test_standalone_callout_with_group_label_is_kept(self):
        source_xml = (
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="1" name="Group 368"/>'
            '<wpg:wgp><wps:txbx><w:txbxContent><w:p><w:r><w:t>Camera ong khoi</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wpg:wgp></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="14" name="Rectangle 14"/>'
            '<wps:wsp><wps:txbx><w:txbxContent><w:p><w:r><w:t>Camera ong khoi</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp></wp:anchor></w:drawing></w:r></w:p>'
        )
        converted_xml = (
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="2" name="Frame1"/>'
            '<wps:txbx/><w:txbxContent><w:p><w:r><w:t>Camera ong khoi</w:t></w:r></w:p>'
            '</w:txbxContent></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="3" name="Frame2"/>'
            '<wps:txbx/><w:txbxContent><w:p><w:r><w:t>Camera ong khoi</w:t></w:r></w:p>'
            '</w:txbxContent></wp:anchor></w:drawing></w:r></w:p>'
        )
        source = make_docx(source_xml)
        converted = make_docx(converted_xml)
        kept = patcher._remove_duplicate_writer_textbox_anchors(converted_xml, source_xml)
        self.assertEqual(len(re.findall(r"<wp:anchor\b", kept)), 1)
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertIn('name="Rectangle 14"', xml)
        self.assertIn('name="Group 368"', xml)
        self.assertEqual(len(re.findall(r"<wp:anchor\b", xml)), 2)
        self.assertNotIn("Frame1", xml)
        self.assertNotIn("Frame2", xml)

    def test_empty_textbox_frame_restores_source_name(self):
        source = make_docx(
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="44" name="Rectangle 44"/>'
            '<wps:wsp><wps:txbx><w:txbxContent><w:p><w:r><w:t></w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp></wp:anchor></w:drawing></w:r></w:p>'
        )
        converted = make_docx(
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:drawing><wp:anchor><wp:docPr id="6" name="Frame6"/>'
            '<wps:txbx/><w:txbxContent><w:p><w:r><w:t></w:t></w:r></w:p>'
            '</w:txbxContent></wp:anchor></w:drawing></w:r></w:p>'
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertIn('name="Rectangle 44"', xml)
        self.assertNotIn("Frame6", xml)
        self.assertEqual(len(re.findall(r"<wps:wsp\b", xml)), 1)

    def test_missing_connector_is_inserted_without_doubling(self):
        source = make_docx(
            '<w:p><w:r><w:t>Before the line</w:t></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="1" name="Straight Connector 1"/>'
            '<wps:wsp><a:prstGeom prst="line"><a:avLst/></a:prstGeom></wps:wsp>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>After the line</w:t></w:r></w:p>'
        )
        converted = make_docx(
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:t>Before the line</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="2" w:name="vno-untouched-1"/>'
            '<w:r><w:t>After the line</w:t></w:r></w:p>'
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertEqual(len(re.findall(r'name="Straight Connector 1"', xml)), 1)
        self.assertEqual(len(re.findall(r"<wps:wsp\b", xml)), 1)
        self.assertEqual(len(re.findall(r"<wp:anchor\b", xml)), 1)
        self.assertLess(xml.find("Before the line"), xml.find("Straight Connector 1"))
        self.assertLess(xml.find("Straight Connector 1"), xml.find("After the line"))

    def test_inline_group_without_anchor_is_inserted(self):
        source = make_docx(
            '<w:p><w:r><w:t>Caption</w:t></w:r></w:p>'
            '<w:p><w:r><w:drawing><wp:inline><wp:docPr id="1893" name="Group 1893"/>'
            '<wpg:wgp><wps:wsp><wps:cNvPr name="Shape 2327"/>'
            '<a:custGeom><a:pathLst/></a:custGeom></wps:wsp></wpg:wgp>'
            '</wp:inline></w:drawing></w:r></w:p>'
        )
        converted = make_docx(
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:t>Caption</w:t></w:r></w:p>'
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertIn('name="Group 1893"', xml)
        self.assertIn("<wpg:wgp>", xml)
        self.assertEqual(len(re.findall(r"<wps:wsp\b", xml)), 1)
        self.assertEqual(len(re.findall(r"<wp:inline\b", xml)), 1)
        self.assertEqual(len(re.findall(r'name="Group 1893"', xml)), 1)

    def test_deleted_connector_is_not_reinserted(self):
        marker = "VNO_SHAPE_MUTATION_" + json.dumps(
            {"type": "delete", "anchorName": "Straight Connector 1", "shapeName": "Straight Connector 1"},
            separators=(",", ":"),
        ).encode().hex()
        source = make_docx(
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="1" name="Straight Connector 1"/>'
            '<wps:wsp><a:prstGeom prst="line"><a:avLst/></a:prstGeom></wps:wsp>'
            '</wp:anchor></w:drawing></w:r></w:p>'
        )
        converted = make_docx(
            f'<w:p><w:r><w:t>{marker}</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:t>Body</w:t></w:r></w:p>'
        )
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        xml = zipfile.ZipFile(io.BytesIO(result)).read("word/document.xml").decode()
        self.assertNotIn("Straight Connector 1", xml)
        self.assertNotIn("VNO_SHAPE_MUTATION_", xml)
        self.assertEqual(len(re.findall(r"<wps:wsp\b", xml)), 0)


if __name__ == "__main__":
    unittest.main()
