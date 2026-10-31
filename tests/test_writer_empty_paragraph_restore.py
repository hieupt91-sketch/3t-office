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

    def test_splits_a_collapsed_empty_source_paragraph_from_its_marked_neighbor(self):
        source = document(paragraph("A"), paragraph(), paragraph("B"))
        converted = document(
            "<w:p><w:bookmarkStart w:id=\"0\" w:name=\"vno-untouched-0\"/>"
            "<w:bookmarkStart w:id=\"1\" w:name=\"vno-untouched-1\"/>"
            "<w:r><w:t>A</w:t></w:r></w:p>",
            paragraph("B", 2),
        )
        source_html = ''.join(
            f'<p id="vno-untouched-{index}">{text}</p>'
            for index, text in enumerate(("A", "", "B"))
        )

        restored = restore_writer_missing_empty_paragraphs_by_source_markers(
            source, converted, source_html
        )

        self.assertEqual(restored.count("<w:p>"), 3)
        self.assertLess(restored.index("<w:t>A</w:t>"), restored.index("<w:t>B</w:t>"))

    def test_keeps_collapsed_group_repair_when_inserting_another_missing_blank(self):
        source = document(
            paragraph("A"), paragraph(), paragraph("B"), paragraph(), paragraph("C"),
        )
        converted = document(
            "<w:p><w:bookmarkStart w:id=\"0\" w:name=\"vno-untouched-0\"/>"
            "<w:bookmarkStart w:id=\"1\" w:name=\"vno-untouched-1\"/>"
            "<w:r><w:t>A</w:t></w:r></w:p>",
            paragraph("B", 2), paragraph("C", 4),
        )
        source_html = ''.join(
            f'<p id="vno-untouched-{index}">{text}</p>'
            for index, text in enumerate(("A", "", "B", "", "C"))
        )

        restored = restore_writer_missing_empty_paragraphs_by_source_markers(
            source, converted, source_html
        )

        self.assertEqual(restored.count("<w:p>"), 5)
        self.assertIn("<w:t>A</w:t></w:r></w:p><w:p></w:p>", restored)
        self.assertIn("<w:t>B</w:t></w:r></w:p><w:p></w:p>", restored)

    def test_fails_closed_when_source_indices_do_not_match_editor_markers(self):
        source = document(paragraph("A"), paragraph(), paragraph("B"))
        converted = document(paragraph("A", 0), paragraph("B", 1))
        source_html = '<p id="vno-untouched-0">A</p><p id="vno-untouched-1">B</p>'

        self.assertEqual(
            restore_writer_missing_empty_paragraphs_by_source_markers(
                source, converted, source_html
            ),
            converted,
        )

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
