"""Regression coverage for PowerPoint-readable animation timing wrappers."""
from __future__ import annotations

import io
import unittest
import zipfile
import xml.etree.ElementTree as ET

import main

patcher = main._ooxml_zip_patch()
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
PFX = "{" + P + "}"
ET.register_namespace("p", P)


def make_pptx(slide_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/slides/slide1.xml", slide_xml)
    return buffer.getvalue()


class SlidesPptxAnimationTimingTests(unittest.TestCase):
    def test_slide_effects_map_to_supported_powerpoint_native_transition_elements(self):
        transitions = ["fade", "pushWipe", "irisWipe", "fadeOverColor"]
        pages = []
        styles = []
        for index, transition in enumerate(transitions, start=1):
            name = f"dp{index}"
            styles.append(
                f'<style:style style:name="{name}" style:family="drawing-page">'
                f'<style:drawing-page-properties smil:type="{transition}"/></style:style>'
            )
            pages.append(f'<draw:page draw:style-name="{name}"/>')
        fodp = "<office:document>" + "".join(styles) + "".join(pages) + "</office:document>"
        source = io.BytesIO()
        with zipfile.ZipFile(source, "w", compression=zipfile.ZIP_DEFLATED) as package:
            for index in range(1, 5):
                package.writestr(
                    f"ppt/slides/slide{index}.xml",
                    f'<p:sld xmlns:p="{P}"><p:cSld/></p:sld>',
                )

        patched = patcher.postprocess_slides_pptx(source.getvalue(), source_fodp=fodp)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            slides = [package.read(f"ppt/slides/slide{i}.xml").decode() for i in range(1, 5)]
        self.assertIn("<p:fade/>", slides[0])
        self.assertIn('<p:push dir="l"/>', slides[1])
        self.assertIn('<p:zoom dir="out"/>', slides[2])
        self.assertIn('<p:flip dir="l"/>', slides[3])

    def test_slide_effect_patch_is_a_noop_without_fodp_transition(self):
        original = make_pptx(f'<p:sld xmlns:p="{P}"><p:cSld/></p:sld>')
        self.assertIs(patcher.postprocess_slides_pptx(original), original)

    def test_click_effects_are_wrapped_and_keep_native_preset_timing(self):
        xml = f'''<p:sld xmlns:p="{P}"><p:timing><p:tnLst><p:par><p:cTn id="1"><p:childTnLst>
          <p:par><p:cTn id="2" presetID="10" nodeType="clickEffect"><p:stCondLst><p:cond delay="200"/></p:stCondLst><p:childTnLst/></p:cTn></p:par>
          <p:par><p:cTn id="3" presetID="2" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst/></p:cTn></p:par>
        </p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>'''
        patched = patcher.postprocess_slides_pptx(make_pptx(xml))
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            root = ET.fromstring(package.read("ppt/slides/slide1.xml"))
        parents = {child: parent for parent in root.iter() for child in parent}
        click_nodes = [node for node in root.iter(PFX + "cTn") if node.get("nodeType") == "clickEffect"]
        self.assertEqual([node.get("presetID") for node in click_nodes], ["10", "2"])
        self.assertEqual([node.get("presetSubtype") for node in click_nodes], ["0", "4"])
        self.assertEqual([node.get("grpId") for node in click_nodes], ["0", "0"])
        for click_node in click_nodes:
            effect_par = parents[click_node]
            wrapper = parents[parents[effect_par]]
            self.assertEqual(wrapper.get("fill"), "hold")
            self.assertEqual(wrapper.find(PFX + "stCondLst").find(PFX + "cond").get("delay"), "0")

    def test_existing_powerpoint_wrapper_is_not_duplicated(self):
        xml = f'''<p:sld xmlns:p="{P}"><p:timing><p:tnLst><p:par><p:cTn id="1"><p:childTnLst>
          <p:par><p:cTn id="2" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>
            <p:par><p:cTn id="3" presetID="10" presetClass="entr" presetSubtype="0" grpId="0" nodeType="clickEffect"><p:childTnLst/></p:cTn></p:par>
          </p:childTnLst></p:cTn></p:par>
        </p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>'''
        original = make_pptx(xml)
        self.assertEqual(patcher.postprocess_slides_pptx(original), original)

    def test_unbound_namespace_prefix_slide_is_left_unchanged(self):
        malformed_xml = b'<p:sld><p:timing/></p:sld>'
        original = make_pptx(malformed_xml.decode("utf-8"))

        patched = patcher.postprocess_slides_pptx(original)

        self.assertEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            self.assertEqual(package.read("ppt/slides/slide1.xml"), malformed_xml)


if __name__ == "__main__":
    unittest.main()
