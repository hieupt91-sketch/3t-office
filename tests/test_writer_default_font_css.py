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

    def test_w25a_half_point_style_font_size_overrides(self):
        """W25a: Style đoạn có w:sz lẻ (Normal 8.5pt, Heading 1 14.5pt) bị LibreOffice cắt 0.5pt;
        overlay Python ghi đè font-size chính xác vào head CSS mà không sửa rule cũ."""
        styles_xml = (
            '<w:styles xmlns:w="w">'
            '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
            '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="17"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:sz w:val="29"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:sz w:val="20"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="CustomStyle"><w:name w:val="Custom Note"/><w:rPr><w:sz w:val="23"/></w:rPr></w:style>'
            '</w:styles>'
        )
        docx = _docx(styles_xml)
        html = (
            '<html><head><style type="text/css">\n'
            '\t\tp.western { font-family: "Tahoma", sans-serif; font-size: 8pt }\n'
            '\t\th1.western { font-family: "Tahoma", sans-serif; font-size: 14pt }\n'
            '\t\th2.western { font-family: "Tahoma", sans-serif; font-size: 10pt }\n'
            '\t\tp.custom-note-western { font-size: 11pt }\n'
            '\t</style></head><body></body></html>'
        )
        out = patcher.inject_docx_half_point_styles_css(docx, html)
        # Rule cũ vẫn nguyên
        self.assertIn('p.western { font-family: "Tahoma", sans-serif; font-size: 8pt }', out)
        self.assertIn('h1.western { font-family: "Tahoma", sans-serif; font-size: 14pt }', out)
        # Rule mới chèn sau với cỡ nửa điểm chính xác
        self.assertIn('p.western { font-size: 8.5pt }', out)
        self.assertIn('h1.western { font-size: 14.5pt }', out)
        self.assertIn('p.custom-note-western { font-size: 11.5pt }', out)
        # Heading 2 cỡ chẵn (20 = 10pt) không bị thêm rule
        self.assertNotIn('h2.western { font-size: 10pt }', out[out.rfind('h1.western { font-size: 14.5pt }'):])

    def test_w32_heading_style_chain_written_as_full_css_rules(self):
        # d20: heading 2 basedOn Footer (không font/sz/b) -> TNR (docDefaults) 10pt thường; heading 1 sz 22 đậm;
        # heading 6 nghiêng 9pt; màu lấy w:color khác 000000
        docx = _docx(
            '<w:styles xmlns:w="w"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman"/></w:rPr></w:rPrDefault></w:docDefaults>'
            '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
            '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Footer"/><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="12"/></w:numPr></w:pPr><w:rPr><w:szCs w:val="26"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:b w:val="0"/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr></w:style>'
            '</w:styles>'
        )
        props = patcher.docx_heading_style_props(docx)
        self.assertEqual(props[1], {"family": "Times New Roman", "size_pt": 11.0, "bold": True, "italic": False, "color": None})
        self.assertEqual(props[2], {"family": "Times New Roman", "size_pt": 10.0, "bold": False, "italic": False, "color": None})
        self.assertEqual(props[6]["italic"], True)
        self.assertEqual(props[6]["color"], "666666")
        html = '<html><head><style type="text/css">\n\t\th2 { margin-top: 0.11cm }\n\t</style></head><body><h2 class="western">x</h2></body></html>'
        out = patcher.inject_docx_heading_styles_css(docx, html)
        self.assertIn('h1.western { font-family: "Times New Roman", serif; font-size: 11pt; font-weight: bold; font-style: normal }', out)
        self.assertIn('h2.western { font-family: "Times New Roman", serif; font-size: 10pt; font-weight: normal; font-style: normal }', out)
        self.assertIn('h6.western { font-family: "Times New Roman", serif; font-size: 9pt; font-weight: normal; font-style: italic; color: #666666 }', out)
        self.assertLess(out.find("h2 { margin-top"), out.find("h2.western {"))  # rule mới sau rule LibreOffice


if __name__ == "__main__":
    unittest.main()
