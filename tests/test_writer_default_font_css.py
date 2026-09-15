"""Writer open (quy ước W9): font/cỡ mặc định của Word đến từ docDefaults + theme phải vào head HTML.

Đo d07.docx 2026-09-15: LibreOffice HTML không có font-family nào (font là theme minor = Arial), canvas rơi về
Times New Roman NĐ30 → 199 đoạn lệch font trong 1 file (ma trận Writer: lớp font-name 301 đoạn / 13 file).
"""
import importlib.util
import io
import os
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("writer_default_font", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

THEME = '<a:theme xmlns:a="x"><a:fontScheme><a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme></a:theme>'


def _docx(styles_xml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/styles.xml", styles_xml)
        z.writestr("word/theme/theme1.xml", THEME)
    return buf.getvalue()


class DefaultFontCss(unittest.TestCase):
    def test_theme_minor_font_from_doc_defaults(self):
        docx = _docx('<w:styles xmlns:w="w"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>')
        self.assertEqual(patcher.docx_default_font(docx), ("Arial", 11.0))
        html = '<html><head><style type="text/css">\n\t\tp { line-height: 115% }\n\t</style></head><body><p>x</p></body></html>'
        out = patcher.inject_docx_default_font_css(docx, html)
        self.assertIn('p.western { font-family: "Arial", sans-serif; font-size: 11pt }', out)

    def test_normal_style_wins_and_existing_rule_is_merged(self):
        docx = _docx('<w:styles xmlns:w="w"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:styleId="Normal"><w:rPr><w:rFonts w:ascii="Times New Roman"/><w:sz w:val="28"/></w:rPr></w:style></w:styles>')
        self.assertEqual(patcher.docx_default_font(docx), ("Times New Roman", 14.0))
        html = '<html><head><style type="text/css">p.western { font-weight: normal }</style></head><body></body></html>'
        out = patcher.inject_docx_default_font_css(docx, html)
        self.assertIn('p.western { font-weight: normal; font-family: "Times New Roman", sans-serif; font-size: 14pt }', out)
        self.assertEqual(out.count("p.western"), 1)

    def test_head_that_already_declares_font_is_untouched(self):
        docx = _docx('<w:styles xmlns:w="w"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>')
        html = '<html><head><style>p { font-size: 12pt } p.western { font-family: "Arial", sans-serif }</style></head></html>'
        self.assertEqual(patcher.inject_docx_default_font_css(docx, html), html)


if __name__ == "__main__":
    unittest.main()
