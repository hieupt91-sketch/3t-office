import unittest

from adapters.libreoffice.common.ooxml_zip_patch import (
    _writer_restore_text_effects,
    postprocess_writer_text_effects
)


class WriterTextEffectsTests(unittest.TestCase):
    def test_restore_text_effects_adds_w14_namespace_and_tags(self):
        doc_xml = (
            '<w:document><w:body>'
            '<w:p><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>Văn bản có hiệu ứng</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        source_html = (
            '<p><span class="vno-text-effect" '
            'data-vno-outline-color="FF0000" data-vno-outline-width="12700" '
            'data-vno-shadow="1" data-vno-shadow-blur="50800" data-vno-shadow-dist="38100" data-vno-shadow-dir="5400000" '
            'data-vno-glow-color="0000FF" data-vno-glow-rad="101600">'
            'Văn bản có hiệu ứng'
            '</span></p>'
        )
        result_xml = _writer_restore_text_effects(doc_xml, source_html)

        # 1. Namespace
        self.assertIn('xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"', result_xml)

        # 2. Outline
        self.assertIn('<w14:textOutline w14:w="12700"><w14:solidFill><w14:srgbClr w14:val="FF0000"/></w14:solidFill></w14:textOutline>', result_xml)

        # 3. Shadow
        self.assertIn('<w14:shadow w14:blurRad="50800" w14:dist="38100" w14:dir="5400000"><w14:srgbClr w14:val="000000"><w14:alpha w14:val="50000"/></w14:srgbClr></w14:shadow>', result_xml)

        # 4. Glow
        self.assertIn('<w14:glow w14:rad="101600"><w14:srgbClr w14:val="0000FF"><w14:alpha w14:val="60000"/></w14:srgbClr></w14:glow>', result_xml)

    def test_restore_text_effects_leaves_plain_text_untouched(self):
        doc_xml = (
            '<w:document><w:body>'
            '<w:p><w:r><w:t>Văn bản thường</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        source_html = '<p>Văn bản thường</p>'
        result_xml = _writer_restore_text_effects(doc_xml, source_html)
        self.assertEqual(result_xml, doc_xml)


if __name__ == "__main__":
    unittest.main()
