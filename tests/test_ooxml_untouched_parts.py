"""Shared OOXML ZIP patch contract: untouched parts remain byte-identical."""

from __future__ import annotations

import io
import unittest
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import patch_ooxml_zip


def make_package(parts: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name, payload in parts.items():
            package.writestr(name, payload)
    return buffer.getvalue()


def package_parts(payload: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(payload), "r") as package:
        return {name: package.read(name) for name in package.namelist() if not name.endswith("/")}


class OoxmlUntouchedPartsTests(unittest.TestCase):
    CASES = (
        (
            "docx",
            "word/document.xml",
            {
                "[Content_Types].xml": b"<Types><Override PartName='/word/document.xml'/></Types>",
                "word/document.xml": b"<w:document><w:body><w:p>old</w:p></w:body></w:document>",
                "word/styles.xml": b"<w:styles><w:style w:styleId='Keep'/></w:styles>",
                "word/footnotes.xml": b"<w:footnotes><w:footnote w:id='7'>untouched</w:footnote></w:footnotes>",
                "word/media/image1.bin": bytes(range(256)),
            },
            b"<w:document><w:body><w:p>edited</w:p></w:body></w:document>",
        ),
        (
            "xlsx",
            "xl/worksheets/sheet1.xml",
            {
                "[Content_Types].xml": b"<Types><Override PartName='/xl/workbook.xml'/></Types>",
                "xl/workbook.xml": b"<workbook><sheets/></workbook>",
                "xl/worksheets/sheet1.xml": b"<worksheet><sheetData><row r='1'/></sheetData></worksheet>",
                "xl/worksheets/sheet2.xml": b"<worksheet><sheetData><row r='2'><c r='A2'/></row></sheetData></worksheet>",
                "xl/styles.xml": b"<styleSheet><fonts count='0'/></styleSheet>",
            },
            b"<worksheet><sheetData><row r='1'><c r='A1'/></row></sheetData></worksheet>",
        ),
        (
            "pptx",
            "ppt/slides/slide1.xml",
            {
                "[Content_Types].xml": b"<Types><Override PartName='/ppt/presentation.xml'/></Types>",
                "ppt/presentation.xml": b"<p:presentation><p:sldIdLst/></p:presentation>",
                "ppt/slides/slide1.xml": b"<p:sld><p:cSld><p:spTree/></p:cSld></p:sld>",
                "ppt/notesSlides/notesSlide1.xml": b"<p:notes><p:spTree><p:sp/></p:spTree></p:notes>",
                "ppt/media/image1.bin": bytes(reversed(range(256))),
            },
            b"<p:sld><p:cSld><p:spTree><p:sp/></p:spTree></p:cSld></p:sld>",
        ),
    )

    def test_noop_save_keeps_each_ooxml_part_byte_identical(self):
        for extension, _, parts, _ in self.CASES:
            with self.subTest(format=extension):
                source = make_package(parts)
                saved = patch_ooxml_zip(source, {})
                self.assertEqual(package_parts(source), package_parts(saved))

    def test_targeted_write_keeps_untouched_parts_byte_identical_for_all_formats(self):
        for extension, changed_part, parts, replacement in self.CASES:
            with self.subTest(format=extension):
                saved = package_parts(patch_ooxml_zip(make_package(parts), {changed_part: replacement}))
                self.assertEqual(saved[changed_part], replacement)
                for name, original in parts.items():
                    if name != changed_part:
                        self.assertEqual(saved[name], original, f"{extension} part changed unexpectedly: {name}")


if __name__ == "__main__":
    unittest.main()
