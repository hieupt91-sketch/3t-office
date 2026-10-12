"""Native editable WordArt post-processing for Slides exports."""
from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"


class SlidesPptxWordArtTests(unittest.TestCase):
    def test_vn_wordart_is_exported_as_editable_text_effect_and_roundtrips_idempotently(self):
        slide = f'''<p:sld xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree>
          <p:sp><p:nvSpPr><p:cNvPr id="2" name="wordart-1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
          <p:spPr/><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:t>Editable title</a:t></a:r></a:p></p:txBody></p:sp>
          <p:sp><p:nvSpPr><p:cNvPr id="3" name="plain-text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
          <p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Plain text</a:t></a:r></a:p></p:txBody></p:sp>
        </p:spTree></p:cSld></p:sld>'''
        fodp = '''<office:document><office:presentation><draw:page><draw:frame draw:name="wordart-1" vno:wordart="true">
          <draw:text-box><text:p><text:span>Editable title</text:span></text:p></draw:text-box></draw:frame></draw:page></office:presentation></office:document>'''
        original = io.BytesIO()
        with zipfile.ZipFile(original, "w", compression=zipfile.ZIP_DEFLATED) as package:
            package.writestr("ppt/slides/slide1.xml", slide)

        patched = patcher.postprocess_slides_pptx(original.getvalue(), source_fodp=fodp)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            updated = package.read("ppt/slides/slide1.xml").decode()
        self.assertIn('<a:bodyPr wrap="square"><a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp></a:bodyPr>', updated)
        self.assertIn("<a:t>Editable title</a:t>", updated)
        self.assertIn("<a:bodyPr/>", updated)
        self.assertEqual(patcher.postprocess_slides_pptx(patched, source_fodp=fodp), patched)

    def test_imported_slide_without_vn_wordart_is_unchanged(self):
        slide = f'<p:sld xmlns:p="{P}" xmlns:a="{A}"><p:cSld/></p:sld>'
        original = io.BytesIO()
        with zipfile.ZipFile(original, "w", compression=zipfile.ZIP_DEFLATED) as package:
            package.writestr("ppt/slides/slide1.xml", slide)
        data = original.getvalue()
        self.assertIs(patcher.postprocess_slides_pptx(data), data)


if __name__ == "__main__":
    unittest.main()
