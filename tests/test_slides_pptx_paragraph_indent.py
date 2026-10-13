"""Regression checks for PowerPoint paragraph levels dropped by soffice."""
from __future__ import annotations

import io
import unittest
import zipfile
import xml.etree.ElementTree as ET

import main

patcher = main._ooxml_zip_patch()
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
AP = "{" + A + "}"
ET.register_namespace("a", A)
ET.register_namespace("p", P)


FODP = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
 <office:automatic-styles><style:style style:name="vnoP1" style:family="paragraph">
  <style:paragraph-properties fo:margin-left="36pt"/>
 </style:style></office:automatic-styles>
 <office:body><office:presentation><draw:page>
  <draw:rect><text:p text:style-name="vnoP1">Indented text</text:p></draw:rect>
 </draw:page></office:presentation></office:body>
</office:document>'''


def make_pptx(slide_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/slides/slide1.xml", slide_xml)
    return buffer.getvalue()


class SlidesPptxParagraphIndentTests(unittest.TestCase):
    def test_restores_second_level_indent_on_matching_text(self):
        slide = f'''<p:sld xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree>
          <p:sp><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Indented text</a:t></a:r></a:p></p:txBody></p:sp>
        </p:spTree></p:cSld></p:sld>'''
        patched = patcher.postprocess_slides_pptx(make_pptx(slide), source_fodp=FODP)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            root = ET.fromstring(package.read("ppt/slides/slide1.xml"))
        paragraph = next(root.iter(AP + "p"))
        self.assertEqual(paragraph.find(AP + "pPr").get("lvl"), "1")

    def test_preserves_other_paragraph_properties(self):
        slide = f'''<p:sld xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree>
          <p:sp><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="r" lvl="0"/><a:r><a:t>Indented text</a:t></a:r></a:p></p:txBody></p:sp>
        </p:spTree></p:cSld></p:sld>'''
        patched = patcher.postprocess_slides_pptx(make_pptx(slide), source_fodp=FODP)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            root = ET.fromstring(package.read("ppt/slides/slide1.xml"))
        properties = next(root.iter(AP + "pPr"))
        self.assertEqual(properties.get("algn"), "r")
        self.assertEqual(properties.get("lvl"), "1")

    def test_leaves_unmatched_text_and_unindented_fodp_unchanged(self):
        slide = f'''<p:sld xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree>
          <p:sp><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Other text</a:t></a:r></a:p></p:txBody></p:sp>
        </p:spTree></p:cSld></p:sld>'''
        original = make_pptx(slide)
        self.assertEqual(patcher.postprocess_slides_pptx(original, source_fodp=FODP), original)


if __name__ == "__main__":
    unittest.main()
