"""Writer save: a restored header/footer part must bring its own .rels and media along.

Measured 2026-09-15 on the LAN batch (d20.docx): word/header1.xml was copied from the original,
but word/_rels/header1.xml.rels (logo word/media/image1.jpeg) was not -> Word 2016 "The file
appears to be corrupted"; removing the header made the file open.
"""
import importlib.util
import io
import os
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("writer_hf_deps", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
CT = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
RELS = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')


def _docx(entries: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", entries.pop("[Content_Types].xml", CT))
        z.writestr("_rels/.rels", RELS)
        for name, data in entries.items():
            z.writestr(name, data)
    return buf.getvalue()


class HeaderFooterDependencies(unittest.TestCase):
    def test_header_rels_and_media_are_copied_with_renamed_media(self):
        source = _docx({
            "word/document.xml": f'<w:document {W}><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p><w:sectPr><w:headerReference w:type="default" r:id="rId8"/><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
            "word/_rels/document.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>',
            "word/header1.xml": f'<w:hdr {W}><w:p><w:r><w:drawing><a:blip r:embed="rId1" xmlns:a="x"/></w:drawing></w:r></w:p></w:hdr>',
            "word/_rels/header1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.jpeg"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/></Relationships>',
            "word/media/image1.jpeg": b"\xff\xd8logo",
        })
        converted = _docx({
            "word/document.xml": f'<w:document {W}><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
            "word/_rels/document.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
            "word/media/image1.jpeg": b"\xff\xd8BODY-IMAGE-MUST-STAY",
        })
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        with zipfile.ZipFile(io.BytesIO(result)) as z:
            names = set(z.namelist())
            self.assertIn("word/header1.xml", names)
            self.assertIn("word/_rels/header1.xml.rels", names)
            self.assertIn("word/media/vnohf_image1.jpeg", names)
            self.assertEqual(z.read("word/media/vnohf_image1.jpeg"), b"\xff\xd8logo")
            self.assertEqual(z.read("word/media/image1.jpeg"), b"\xff\xd8BODY-IMAGE-MUST-STAY")
            rels = z.read("word/_rels/header1.xml.rels").decode()
            self.assertIn('Target="media/vnohf_image1.jpeg"', rels)
            self.assertIn('Target="https://example.com"', rels)
            ct = z.read("[Content_Types].xml").decode()
            self.assertIn('Extension="jpeg"', ct)
            self.assertEqual(ct.count('PartName="/word/header1.xml"'), 1)

    def test_source_theme_replaces_libreoffice_theme(self):
        """HDLD.docx: untouched runs keep w:asciiTheme=majorHAnsi; LibreOffice's theme says Arial,
        the original says Calibri Light -> dotted lines wrapped, 5 -> 6 pages in Word."""
        theme = lambda major: f'<a:theme xmlns:a="x"><a:majorFont><a:latin typeface="{major}"/></a:majorFont></a:theme>'
        source = _docx({
            "word/document.xml": f'<w:document {W}><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p><w:sectPr><w:headerReference w:type="default" r:id="rId8"/></w:sectPr></w:body></w:document>',
            "word/_rels/document.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>',
            "word/header1.xml": f'<w:hdr {W}><w:p/></w:hdr>',
            "word/theme/theme1.xml": theme("Calibri Light"),
        })
        converted = _docx({
            "word/document.xml": f'<w:document {W}><w:body><w:p><w:r><w:t>Body</w:t></w:r></w:p><w:sectPr/></w:body></w:document>',
            "word/_rels/document.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
            "word/theme/theme1.xml": theme("Arial"),
        })
        result = patcher.postprocess_writer_docx(converted, source_docx=source)
        with zipfile.ZipFile(io.BytesIO(result)) as z:
            self.assertIn('typeface="Calibri Light"', z.read("word/theme/theme1.xml").decode())


if __name__ == "__main__":
    unittest.main()
