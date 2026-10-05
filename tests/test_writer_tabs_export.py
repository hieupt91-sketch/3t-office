"""Dừng tab của Doc ghi vào DOCX: data-vno-tabs -> w:tabs."""

import re
import unittest

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class WriterTabsXmlTests(unittest.TestCase):
    def test_tabs_xml_converts_cm_align_and_leader(self):
        xml = patcher._writer_tabs_xml("15.5:r:d;8:l:n;4:c:h;3:l:u")
        positions = [int(p) for p in re.findall(r'w:pos="(\d+)"', xml)]
        self.assertEqual(positions, sorted(positions), "dừng tab phải sắp theo vị trí")
        self.assertIn('<w:tab w:val="right" w:leader="dot" w:pos="8787"/>', xml)
        self.assertIn('<w:tab w:val="left" w:pos="4535"/>', xml)
        self.assertIn('w:val="center" w:leader="hyphen"', xml)
        self.assertIn('w:leader="underscore"', xml)

    def test_bad_values_are_ignored(self):
        self.assertEqual(patcher._writer_tabs_xml(""), "")
        self.assertEqual(patcher._writer_tabs_xml("abc;-3:l:n;0:r:d"), "")

    def test_created_paragraph_gets_custom_tabs_replacing_default(self):
        document = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="BodyText"/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs><w:jc w:val="both"/><w:rPr/></w:pPr><w:r><w:t>KINH GUI</w:t></w:r></w:p></w:body></w:document>'
        source = '<p data-vno-tabs="8:l:n;15.5:r:d" style="text-align: justify">KINH GUI</p>'
        out = patcher._writer_restore_created_paragraph_css(document, source)
        self.assertEqual(out.count("<w:tabs>"), 1)
        self.assertNotIn('w:pos="720"', out)
        self.assertIn('w:val="right" w:leader="dot"', out)
        self.assertEqual(out.count("<w:jc "), 1)

    def test_paragraph_without_style_but_with_tabs_is_patched(self):
        document = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="BodyText"/><w:rPr/></w:pPr><w:r><w:t>A</w:t></w:r></w:p></w:body></w:document>'
        out = patcher._writer_restore_created_paragraph_css(document, '<p data-vno-tabs="5:l:n">A</p>')
        self.assertIn('w:pos="2835"', out)


if __name__ == "__main__":
    unittest.main()