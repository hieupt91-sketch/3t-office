import unittest

from adapters.libreoffice.common.ooxml_zip_patch import (
    _patch_blip_fill,
    _writer_restore_picture_tools_effects,
    postprocess_writer_picture_tools
)


def sample_blip_fill(name: str = "rId1") -> str:
    return (
        f'<pic:blipFill>'
        f'<a:blip r:embed="{name}"/>'
        f'<a:stretch><a:fillRect/></a:stretch>'
        f'</pic:blipFill>'
    )


class WriterPictureToolsTests(unittest.TestCase):
    def test_patch_blip_fill_crop_and_luminance(self):
        original = sample_blip_fill("rId1")
        # Crop: L=10%, T=15%, R=10%, B=15%; Brightness=20%, Contrast=20%
        patched = _patch_blip_fill(original, (10, 15, 10, 15), 20, 20)
        self.assertIn('<a:lum bright="20000" contrast="20000"/>', patched)
        self.assertIn('<a:srcRect l="10000" t="15000" r="10000" b="15000"/>', patched)
        # Sequence: srcRect should be right after </a:blip>
        self.assertIn('</a:blip><a:srcRect', patched)

    def test_patch_blip_fill_reset(self):
        original = (
            '<pic:blipFill>'
            '<a:blip r:embed="rId1"><a:lum bright="20000"/></a:blip>'
            '<a:srcRect l="10000" t="10000"/>'
            '<a:stretch><a:fillRect/></a:stretch>'
            '</pic:blipFill>'
        )
        reset_xml = _patch_blip_fill(original, (0, 0, 0, 0), 0, 0, reset=True)
        self.assertNotIn('<a:lum', reset_xml)
        self.assertNotIn('<a:srcRect', reset_xml)

    def test_writer_restore_picture_tools_effects(self):
        doc_xml = (
            f'<w:document><w:body>'
            f'<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic>{sample_blip_fill("rId1")}</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
            f'<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic>{sample_blip_fill("rId2")}</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
            f'</w:body></w:document>'
        )
        source_html = (
            '<p><img src="pic1.png" data-vno-crop-l="10" data-vno-crop-t="15" data-vno-crop-r="10" data-vno-crop-b="15" data-vno-brightness="20" data-vno-contrast="20"></p>'
            '<p><img src="pic2.png"></p>'
        )
        result_xml = _writer_restore_picture_tools_effects(doc_xml, source_html)
        # First image has crop and luminance
        self.assertIn('<a:srcRect l="10000" t="15000" r="10000" b="15000"/>', result_xml)
        self.assertIn('<a:lum bright="20000" contrast="20000"/>', result_xml)
        # Second image remains unchanged
        self.assertEqual(result_xml.count('<a:srcRect'), 1)
        self.assertEqual(result_xml.count('<a:lum'), 1)


if __name__ == "__main__":
    unittest.main()
