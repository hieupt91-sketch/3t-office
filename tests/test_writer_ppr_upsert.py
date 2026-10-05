"""Chèn/thay phần tử con của w:pPr đúng thứ tự lược đồ OOXML và không bao giờ trùng lặp."""

import re
import unittest

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def _ppr(paragraph):
    inner = re.search(r"<w:pPr>(.*)</w:pPr>", paragraph, re.S).group(1)
    return [name for name in re.findall(r"<w:([A-Za-z]+)\b", inner) if name != "tab"]  # `tab` is nested inside `tabs`


class UpsertPprTests(unittest.TestCase):
    def test_same_value_is_not_appended_twice(self):
        paragraph = '<w:p><w:pPr><w:pStyle w:val="BodyText"/><w:jc w:val="both"/><w:rPr></w:rPr></w:pPr><w:r/></w:p>'
        out = patcher._writer_upsert_ppr_empty(paragraph, "jc", '<w:jc w:val="both"/>')
        self.assertEqual(out, paragraph)
        self.assertEqual(_ppr(out).count("jc"), 1)

    def test_replaces_existing_value(self):
        paragraph = '<w:p><w:pPr><w:jc w:val="left"/><w:rPr></w:rPr></w:pPr></w:p>'
        out = patcher._writer_upsert_ppr_empty(paragraph, "jc", '<w:jc w:val="center"/>')
        self.assertIn('w:val="center"', out)
        self.assertNotIn('w:val="left"', out)

    def test_new_elements_go_in_schema_order(self):
        paragraph = '<w:p><w:pPr><w:pStyle w:val="X"/><w:bidi w:val="0"/><w:ind w:left="0"/><w:rPr></w:rPr></w:pPr></w:p>'
        out = patcher._writer_upsert_ppr_empty(paragraph, "spacing", '<w:spacing w:before="0" w:after="120"/>')
        out = patcher._writer_upsert_ppr_empty(out, "jc", '<w:jc w:val="both"/>')
        out = patcher._writer_upsert_ppr_empty(out, "tabs", '<w:tabs><w:tab w:val="left" w:pos="1000"/></w:tabs>')
        self.assertEqual(_ppr(out), ["pStyle", "tabs", "bidi", "spacing", "ind", "jc", "rPr"])

    def test_paragraph_without_ppr_gets_one(self):
        out = patcher._writer_upsert_ppr_empty("<w:p><w:r/></w:p>", "jc", '<w:jc w:val="right"/>')
        self.assertEqual(out, '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r/></w:p>')


if __name__ == "__main__":
    unittest.main()