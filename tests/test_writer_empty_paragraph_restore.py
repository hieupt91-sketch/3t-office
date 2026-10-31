from __future__ import annotations

import unittest

from adapters.libreoffice.common.ooxml_zip_patch import (
    restore_writer_missing_empty_paragraphs_by_source_markers,
)


def paragraph(text: str = "", marker: int | None = None) -> str:
    bookmark = (
        f'<w:bookmarkStart w:id="{marker}" w:name="vno-untouched-{marker}"/>'
        f'<w:bookmarkEnd w:id="{marker}"/>'
        if marker is not None else ""
    )
    run = f"<w:r><w:t>{text}</w:t></w:r>" if text else ""
    return f"<w:p>{bookmark}{run}</w:p>"


def document(*paragraphs: str) -> str:
    return "<w:document><w:body>" + "".join(paragraphs) + "<w:sectPr/></w:body></w:document>"


class WriterEmptyParagraphRestoreTests(unittest.TestCase):
    def test_restores_only_source_empty_paragraphs_missing_from_marked_roundtrip(self):
        source = document(
            paragraph("A", 0), paragraph(), paragraph("B", 2),
            paragraph(), paragraph("C", 4),
        )
        converted = document(paragraph("A", 0), paragraph("B", 2), paragraph("C", 4))
        source_html = "".join(
            f'<p id="vno-untouched-{index}">{text}</p>'
            for index, text in enumerate(("A", "", "B", "", "C"))
        )

        restored = restore_writer_missing_empty_paragraphs_by_source_markers(
            source, converted, source_html
        )

        self.assertEqual(restored.count("<w:p>"), 5)
        self.assertLess(restored.index("<w:t>A</w:t>"), restored.index("<w:t>B</w:t>"))
        self.assertLess(restored.index("<w:t>B</w:t>"), restored.index("<w:t>C</w:t>"))
        self.assertIn("<w:t>A</w:t></w:r></w:p><w:p></w:p><w:p>", restored)
        self.assertIn("<w:t>B</w:t></w:r></w:p><w:p></w:p><w:p>", restored)

    def test_does_not_restore_when_source_paragraphs_are_not_all_marked_untouched(self):
        source = document(paragraph("A", 0), paragraph(), paragraph("B", 2))
        converted = document(paragraph("A", 0), paragraph("changed", 2))
        source_html = '<p id="vno-untouched-0">A</p><p id="vno-edited-1">edited</p><p id="vno-untouched-2">B</p>'

        self.assertEqual(
            restore_writer_missing_empty_paragraphs_by_source_markers(
                source, converted, source_html
            ),
            converted,
        )


if __name__ == "__main__":
    unittest.main()
