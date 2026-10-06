"""Mức đại cương của Doc ghi vào DOCX: data-vno-outline -> w:outlineLvl (đúng thứ tự schema)."""

import re
import unittest

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class WriterOutlineXmlTests(unittest.TestCase):
    def test_body_paragraph_gets_outline_level_in_schema_order(self):
        document = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="BodyText"/><w:jc w:val="both"/><w:rPr/></w:pPr><w:r><w:t>MUC LON</w:t></w:r></w:p></w:body></w:document>'
        out = patcher._writer_restore_created_paragraph_css(document, '<p data-vno-outline="3">MUC LON</p>')
        self.assertEqual(out.count("<w:outlineLvl "), 1)
        self.assertIn('<w:outlineLvl w:val="2"/>', out)
        self.assertLess(out.index("<w:jc "), out.index("<w:outlineLvl "), "outlineLvl phải sau jc")
        self.assertLess(out.index("<w:outlineLvl "), out.index("<w:rPr"), "outlineLvl phải trước rPr")

    def test_replaces_existing_outline_without_duplicates(self):
        document = '<w:document><w:body><w:p><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:r><w:t>A</w:t></w:r></w:p></w:body></w:document>'
        out = patcher._writer_restore_created_paragraph_css(document, '<p data-vno-outline="5">A</p>')
        self.assertEqual(len(re.findall(r"<w:outlineLvl ", out)), 1)
        self.assertIn('w:val="4"', out)

    def test_invalid_level_is_ignored(self):
        document = '<w:document><w:body><w:p><w:pPr><w:rPr/></w:pPr><w:r><w:t>A</w:t></w:r></w:p></w:body></w:document>'
        for bad in ("0", "10", "x"):
            out = patcher._writer_restore_created_paragraph_css(document, f'<p data-vno-outline="{bad}">A</p>')
            self.assertNotIn("outlineLvl", out)


if __name__ == "__main__":
    unittest.main()
