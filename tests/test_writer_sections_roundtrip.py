"""Real LibreOffice round-trip for Writer section geometry and header references."""

from __future__ import annotations

import os
import json
import re
import tempfile
import unittest
import zipfile
from unittest.mock import MagicMock, patch

import main
from adapters.libreoffice.common.ooxml_zip_patch import _apply_writer_link_to_previous
from main import VnOfficeApi


def _minimal_two_section_docx(path: str) -> None:
    document_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>
<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/><w:footerReference w:type="default" r:id="rIdFooter1"/><w:type w:val="nextPage"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:pPr><w:r><w:t>Portrait section content</w:t></w:r></w:p>
<w:p><w:r><w:t>Landscape section content</w:t></w:r></w:p>
<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader2"/><w:footerReference w:type="default" r:id="rIdFooter2"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
    document_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
<Relationship Id="rIdHeader2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>
<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
<Relationship Id="rIdFooter2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr/></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>'''
    settings = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''
    headers = {
        "word/header1.xml": "<w:hdr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:p><w:r><w:t>PORTRAIT HEADER</w:t></w:r></w:p></w:hdr>",
        "word/header2.xml": "<w:hdr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:p><w:r><w:t>LANDSCAPE HEADER</w:t></w:r></w:p></w:hdr>",
    }
    footers = {
        "word/footer1.xml": "<w:ftr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:p><w:r><w:t>PORTRAIT FOOTER</w:t></w:r></w:p></w:ftr>",
        "word/footer2.xml": "<w:ftr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:p><w:r><w:t>LANDSCAPE FOOTER</w:t></w:r></w:p></w:ftr>",
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document_xml)
        archive.writestr("word/_rels/document.xml.rels", document_rels)
        archive.writestr("word/styles.xml", styles)
        archive.writestr("word/settings.xml", settings)
        for name, xml in headers.items():
            archive.writestr(name, xml)
        for name, xml in footers.items():
            archive.writestr(name, xml)


def _section_properties(xml: str) -> list[str]:
    return re.findall(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", xml)


class TestWriterSectionsRoundtrip(unittest.TestCase):
    def test_link_to_previous_is_encoded_as_missing_or_explicit_references(self):
        xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:body><w:sectPr><w:headerReference w:type="default" r:id="rIdH"/>'
            '<w:footerReference w:type="default" r:id="rIdF"/></w:sectPr>'
            '<w:sectPr></w:sectPr></w:body></w:document>'
        )
        linked = _apply_writer_link_to_previous(xml, [
            {"headerFooter": {"linkToPrevious": False}},
            {"headerFooter": {"linkToPrevious": True}},
        ])
        sections = _section_properties(linked)
        self.assertEqual(len(sections), 2)
        self.assertNotRegex(sections[1], r"<w:(?:header|footer)Reference\b")

        unlinked = _apply_writer_link_to_previous(xml, [
            {"headerFooter": {"linkToPrevious": False}},
            {"headerFooter": {"linkToPrevious": False}},
        ])
        sections = _section_properties(unlinked)
        self.assertIn('w:headerReference w:type="default" r:id="rIdH"', sections[1])
        self.assertIn('w:footerReference w:type="default" r:id="rIdF"', sections[1])

    def test_open_and_save_as_keeps_two_section_orientations_and_headers(self):
        with tempfile.TemporaryDirectory(prefix="vno-writer-sections-") as tmp:
            source_path = os.path.join(tmp, "two-sections.docx")
            destination_path = os.path.join(tmp, "roundtrip.docx")
            _minimal_two_section_docx(source_path)

            api = VnOfficeApi(app_kind="writer", initial_file=source_path)
            opened = api.open_document_dialog("writer")
            self.assertEqual(opened.get("status"), "ok", repr(opened))
            self.assertEqual(len(_section_properties(opened.get("ooxmlDocumentXml", ""))), 2)
            self.assertIn("PORTRAIT HEADER", opened.get("ooxmlHeaders", {}).get("rIdHeader1", ""))
            self.assertIn("LANDSCAPE HEADER", opened.get("ooxmlHeaders", {}).get("rIdHeader2", ""))
            self.assertIn("PORTRAIT FOOTER", opened.get("ooxmlFooters", {}).get("rIdFooter1", ""))
            self.assertIn("LANDSCAPE FOOTER", opened.get("ooxmlFooters", {}).get("rIdFooter2", ""))

            section_meta = [
                {
                    "id": "section-1",
                    "type": "nextPage",
                    "pageSetup": {"size": "a4", "orientation": "portrait", "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20}},
                    "headerFooter": {"linkToPrevious": False, "differentFirstPage": False, "differentOddEven": False, "pageNumberRestart": False},
                },
                {
                    "id": "section-2",
                    "type": "nextPage",
                    "pageSetup": {"size": "a4", "orientation": "landscape", "margins": {"top": 25, "right": 20, "bottom": 20, "left": 30}},
                    "headerFooter": {"linkToPrevious": False, "differentFirstPage": True, "differentOddEven": True, "pageNumberRestart": True, "pageNumberStart": 4},
                },
            ]
            content = (
                '<style>@page vno-section-1 { size:210mm 297mm; margin:20mm 20mm 20mm 20mm; } '
                '@page vno-section-2 { size:297mm 210mm; margin:20mm 20mm 20mm 20mm; }</style>'
                '<div class="vno-export-section vno-export-section-1" data-vno-export-section="section-1"><p>Portrait section content</p></div>'
                '<div class="vno-export-section vno-export-section-2" data-vno-export-section="section-2"><p>Landscape section content</p></div>'
                f'<!--vno-sections-meta: {json.dumps(section_meta)} -->'
            )
            save_window = MagicMock()
            save_window.create_file_dialog.return_value = destination_path
            with patch.object(main, "_active_window", return_value=save_window):
                saved = api.save_document_dialog(
                    content,
                    app_kind="writer",
                    target_format="docx",
                    suggested_name="roundtrip.docx",
                    source_path=source_path,
                )
            self.assertEqual(saved.get("status"), "ok", repr(saved))

            with zipfile.ZipFile(destination_path, "r") as archive:
                document_xml = archive.read("word/document.xml").decode("utf-8")
                rels_xml = archive.read("word/_rels/document.xml.rels").decode("utf-8")
                sections = _section_properties(document_xml)
                self.assertEqual(len(sections), 2, document_xml)
                self.assertNotRegex(sections[0], r'<w:pgSz\b[^>]*w:orient="landscape"')
                self.assertRegex(sections[1], r'<w:pgSz\b[^>]*w:orient="landscape"')
                self.assertRegex(sections[0], r'<w:pgSz\b[^>]*w:w="11906"[^>]*w:h="16838"')
                self.assertRegex(sections[1], r'<w:pgSz\b[^>]*w:w="16838"[^>]*w:h="11906"')
                first_margin = re.search(r'<w:pgMar\b[^>]*w:top="(\d+)"[^>]*w:left="(\d+)"', sections[0])
                second_margin = re.search(r'<w:pgMar\b[^>]*w:top="(\d+)"[^>]*w:left="(\d+)"', sections[1])
                self.assertIsNotNone(first_margin)
                self.assertIsNotNone(second_margin)
                self.assertNotEqual(first_margin.groups(), second_margin.groups())
                self.assertIn("<w:titlePg/>", sections[1])
                self.assertRegex(sections[1], r'<w:pgNumType\b[^>]*w:start="4"')
                settings_xml = archive.read("word/settings.xml").decode("utf-8")
                self.assertIn("<w:evenAndOddHeaders/>", settings_xml)
                for kind, expected in (
                    ("header", ("PORTRAIT HEADER", "LANDSCAPE HEADER")),
                    ("footer", ("PORTRAIT FOOTER", "LANDSCAPE FOOTER")),
                ):
                    references = []
                    for section in sections:
                        reference = re.search(rf'<w:{kind}Reference\b[^>]*r:id="([^"]+)"', section)
                        self.assertIsNotNone(reference, section)
                        rel = re.search(rf'<Relationship\b(?=[^>]*\bId="{reference.group(1)}")(?=[^>]*\bTarget="([^"]+)")', rels_xml)
                        self.assertIsNotNone(rel, reference.group(1))
                        target = rel.group(1)
                        part = target if target.startswith("word/") else f"word/{target}"
                        references.append((part, archive.read(part).decode("utf-8")))
                    self.assertNotEqual(references[0][0], references[1][0], f"Per-section {kind}s collapsed: {document_xml}")
                    self.assertIn(expected[0], references[0][1])
                    self.assertIn(expected[1], references[1][1])


if __name__ == "__main__":
    unittest.main()
