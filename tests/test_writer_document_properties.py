from __future__ import annotations

import io
import json
import unittest
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    postprocess_writer_document_properties,
    read_zip_entry,
)


def _package(core_xml: str) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            '</Types>',
        )
        archive.writestr(
            "_rels/.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            '</Relationships>',
        )
        archive.writestr("docProps/core.xml", core_xml)
        archive.writestr("word/document.xml", "<w:document xmlns:w=\"urn:w\"/>")
    return output.getvalue()


class WriterDocumentPropertiesTests(unittest.TestCase):
    def test_updates_five_fields_and_preserves_other_core_properties(self):
        original = _package(
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">'
            '<dc:title>Cũ</dc:title><dc:creator>Tác giả cũ</dc:creator>'
            '<dcterms:modified>2026-10-13T00:00:00Z</dcterms:modified><cp:revision>7</cp:revision>'
            '</cp:coreProperties>'
        )
        properties = {
            "title": "Kế hoạch & dự toán",
            "creator": "Nguyễn Văn An",
            "subject": "Quý IV",
            "keywords": "ngân sách; nội bộ",
            "description": "Dòng 1\nDòng 2",
        }
        marker = json.dumps(properties, ensure_ascii=False).encode("utf-8").hex()
        patched = postprocess_writer_document_properties(
            original, source_html=f"<!--vno-document-properties-hex:{marker}--><p>Nội dung</p>",
        )
        core = read_zip_entry(patched, "docProps/core.xml").decode("utf-8")
        self.assertIn("<dc:title>Kế hoạch &amp; dự toán</dc:title>", core)
        self.assertIn("<dc:creator>Nguyễn Văn An</dc:creator>", core)
        self.assertIn("<dc:subject>Quý IV</dc:subject>", core)
        self.assertIn("<cp:keywords>ngân sách; nội bộ</cp:keywords>", core)
        self.assertIn("<dc:description>Dòng 1\nDòng 2</dc:description>", core)
        self.assertIn("<cp:revision>7</cp:revision>", core)
        self.assertIn("<dcterms:modified>2026-10-13T00:00:00Z</dcterms:modified>", core)

    def test_empty_fields_remove_existing_values(self):
        original = _package(
            '<cp:coreProperties xmlns:cp="urn:core" xmlns:dc="urn:dc">'
            '<dc:title>Cũ</dc:title><dc:description>Ghi chú cũ</dc:description>'
            '</cp:coreProperties>'
        )
        marker = json.dumps({"title": "", "description": ""}).encode("utf-8").hex()
        patched = postprocess_writer_document_properties(
            original, source_html=f"<!--vno-document-properties-hex:{marker}-->",
        )
        core = read_zip_entry(patched, "docProps/core.xml").decode("utf-8")
        self.assertNotIn("dc:title", core)
        self.assertNotIn("dc:description", core)

    def test_content_status_final_writes_core_and_custom_xml(self):
        original = _package(
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '<dc:title>Tài liệu</dc:title>'
            '</cp:coreProperties>'
        )
        marker = json.dumps({"title": "Tài liệu", "contentStatus": "Final"}, ensure_ascii=False).encode("utf-8").hex()
        patched = postprocess_writer_document_properties(
            original, source_html=f"<!--vno-document-properties-hex:{marker}-->",
        )
        core = read_zip_entry(patched, "docProps/core.xml").decode("utf-8")
        self.assertIn("<cp:contentStatus>Final</cp:contentStatus>", core)
        custom = read_zip_entry(patched, "docProps/custom.xml").decode("utf-8")
        self.assertIn('name="_MarkAsFinal"', custom)
        self.assertIn('<vt:bool>true</vt:bool>', custom)
        ct = read_zip_entry(patched, "[Content_Types].xml").decode("utf-8")
        self.assertIn('/docProps/custom.xml', ct)
        rels = read_zip_entry(patched, "_rels/.rels").decode("utf-8")
        self.assertIn('custom-properties', rels)


if __name__ == "__main__":
    unittest.main()

