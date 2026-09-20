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

    def test_w12b_vietnamese_document_uses_theme_script_viet_fonts(self):
        """Đo d07 (19/9): theme majorFont latin "Calibri Light" nhưng <a:font script="Viet" typeface="Times New Roman"/>;
        docDefaults w:lang="vi" → Word COM Font.Name = Times New Roman, LibreOffice HTML ghi Calibri Light (23 đoạn cao
        hơn 6–9%). Tài liệu không phải tiếng Việt vẫn dùng latin."""
        theme = ('<a:theme xmlns:a="x"><a:fontScheme><a:majorFont><a:latin typeface="Calibri Light"/><a:font script="Jpan" typeface="X"/>'
                 '<a:font script="Viet" typeface="Times New Roman"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/>'
                 '<a:font script="Viet" typeface="Arial"/></a:minorFont></a:fontScheme></a:theme>')
        def docx(lang, document='<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>a</w:t></w:r></w:p></w:body></w:document>'):
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w") as z:
                z.writestr("word/styles.xml", f'<w:styles xmlns:w="w"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/><w:sz w:val="22"/><w:lang w:val="{lang}"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>')
                z.writestr("word/theme/theme1.xml", theme)
                z.writestr("word/document.xml", document)
            return buf.getvalue()
        vi = patcher.docx_theme_fonts(docx("vi"))
        self.assertEqual((vi["major"], vi["minor"], vi["vietnamese"]), ("Times New Roman", "Arial", True))
        self.assertEqual(patcher.docx_default_font(docx("vi")), ("Arial", 11.0))
        en = patcher.docx_theme_fonts(docx("en-US"))
        self.assertEqual((en["major"], en["minor"]), ("Calibri Light", "Calibri"))
        html = '<p><font face="Calibri Light, sans-serif"><font size="3">x</font></font></p><p style="font-family: \'Calibri\', sans-serif">y</p>'
        out = patcher.apply_docx_theme_script_fonts(docx("vi"), html)
        self.assertIn('face="Times New Roman, sans-serif"', out)
        self.assertIn("font-family: 'Arial', sans-serif", out)
        self.assertEqual(patcher.apply_docx_theme_script_fonts(docx("en-US"), html), html)
        # Run đặt tường minh Calibri Light -> không thay (không thể phân biệt trong HTML)
        explicit = docx("vi", '<w:document xmlns:w="w"><w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri Light"/></w:rPr><w:t>a</w:t></w:r></w:p></w:body></w:document>')
        self.assertIn('face="Calibri Light, sans-serif"', patcher.apply_docx_theme_script_fonts(explicit, html))


if __name__ == "__main__":
    unittest.main()
