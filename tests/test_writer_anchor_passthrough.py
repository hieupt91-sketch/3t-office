from __future__ import annotations

import importlib.util
import io
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


if __name__ == "__main__":
    unittest.main()
