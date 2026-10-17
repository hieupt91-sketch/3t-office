import base64
import io
import json
import re
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher

P_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
MC_NS = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'


def _slide(transition: str = "", root_extra: str = "") -> str:
    return (
        f'<?xml version="1.0"?><p:sld {P_NS} {root_extra}><p:cSld><p:spTree/></p:cSld>'
        f"<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>{transition}<p:timing/></p:sld>"
    )


def _pptx(slides: list[str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        ids = "".join(f'<p:sldId id="{256 + i}" r:id="rId{i + 1}"/>' for i in range(len(slides)))
        package.writestr("ppt/presentation.xml", f'<p:presentation {P_NS}><p:sldIdLst>{ids}</p:sldIdLst></p:presentation>')
        rels = "".join(f'<Relationship Id="rId{i + 1}" Type="x/slide" Target="slides/slide{i + 1}.xml"/>' for i in range(len(slides)))
        package.writestr("ppt/_rels/presentation.xml.rels", f"<Relationships>{rels}</Relationships>")
        for i, xml in enumerate(slides):
            package.writestr(f"ppt/slides/slide{i + 1}.xml", xml)
    return buffer.getvalue()


def _fodp(pages: int, extra_attrs: list[str] | None = None) -> str:
    extra_attrs = extra_attrs or [""] * pages
    body = "".join(f'<draw:page draw:name="p{i + 1}" draw:style-name="dp{i + 1}"{extra_attrs[i]}></draw:page>' for i in range(pages))
    return (
        '<?xml version="1.0"?><office:document xmlns:office="o" xmlns:draw="d" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">'
        f"<office:body><office:presentation>{body}</office:presentation></office:body></office:document>"
    )


def _decode(payload: str) -> dict:
    return json.loads(base64.b64decode(payload).decode("utf-8"))


class SourceTransitionOverlayTests(unittest.TestCase):
    def test_marks_each_page_with_its_own_transition_and_advance(self):
        pptx = _pptx([
            _slide('<p:transition spd="med" advClick="0" advTm="5000"><p:wipe dir="l"/></p:transition>'),
            _slide(""),
            _slide(
                '<mc:AlternateContent><mc:Choice Requires="p14"><p:transition spd="slow" p14:dur="1500" advTm="2000">'
                '<p14:ripple/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow" advTm="2000"><p:fade/></p:transition></mc:Fallback>'
                "</mc:AlternateContent>",
                MC_NS,
            ),
        ])
        out = patcher.overlay_fodp_source_transitions(_fodp(3), pptx)
        pages = re.findall(r"<draw:page\b([^>]*)>", out)
        first = re.search(r'vno:src-transition="([^"]+)"', pages[0])
        self.assertTrue(first)
        self.assertIn('<p:wipe dir="l"/>', _decode(first.group(1))["xml"])
        self.assertIn("vno:src-advance=\"click:0;after:5000\"", pages[0])
        self.assertNotIn("vno:src-transition", pages[1])
        third = _decode(re.search(r'vno:src-transition="([^"]+)"', pages[2]).group(1))
        self.assertIn("p14:dur=\"1500\"", third["xml"])
        self.assertIn("p14", third["ns"])
        self.assertIn("vno:src-advance=\"click:1;after:2000\"", pages[2])

    def test_no_transition_anywhere_is_a_noop(self):
        pptx = _pptx([_slide(""), _slide("")])
        fodp = _fodp(2)
        self.assertEqual(patcher.overlay_fodp_source_transitions(fodp, pptx), fodp)


class SourceTransitionSaveTests(unittest.TestCase):
    def _run(self, slide_xml: str, attrs: str) -> str:
        pptx = _pptx([slide_xml])
        fodp = _fodp(1, [attrs])
        out = patcher._apply_slides_source_transitions(pptx, fodp)
        return out.get("ppt/slides/slide1.xml", slide_xml)

    def test_source_block_replaces_what_soffice_wrote_and_keeps_schema_order(self):
        block = '<p:transition spd="med" advClick="0" advTm="5000"><p:wipe dir="l"/></p:transition>'
        payload = base64.b64encode(json.dumps({"xml": block, "ns": {}}).encode()).decode()
        result = self._run(_slide('<p:transition><p:fade/></p:transition>'), f' vno:src-transition="{payload}"')
        self.assertEqual(result.count("<p:transition"), 1)
        self.assertIn(block, result)
        self.assertLess(result.index("</p:clrMapOvr>"), result.index("<p:transition"))
        self.assertLess(result.index("<p:transition"), result.index("<p:timing"))

    def test_namespaces_needed_by_the_source_block_are_declared_on_the_root(self):
        block = '<mc:AlternateContent><mc:Choice Requires="p14"><p:transition p14:dur="1500"><p14:ripple/></p:transition></mc:Choice></mc:AlternateContent>'
        payload = base64.b64encode(json.dumps({"xml": block, "ns": {"mc": "http://schemas.openxmlformats.org/markup-compatibility/2006", "p14": "http://schemas.microsoft.com/office/powerpoint/2010/main"}}).encode()).decode()
        result = self._run(_slide(""), f' vno:src-transition="{payload}"')
        self.assertIn('xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"', result)
        self.assertIn('xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"', result)

    def test_user_advance_settings_are_applied_to_an_existing_transition(self):
        result = self._run(_slide('<p:transition spd="med"><p:fade/></p:transition>'), ' vno:advance-click="0" vno:advance-after="3000"')
        tag = re.search(r"<p:transition\b[^>]*>", result).group(0)
        self.assertIn('advClick="0"', tag)
        self.assertIn('advTm="3000"', tag)
        self.assertIn("<p:fade/>", result)

    def test_user_advance_without_any_transition_creates_one(self):
        result = self._run(_slide(""), ' vno:advance-after="4000"')
        self.assertIn('<p:transition advTm="4000"/>', result)
        self.assertLess(result.index("<p:transition"), result.index("<p:timing"))

    def test_nothing_to_do_returns_empty(self):
        self.assertEqual(patcher._apply_slides_source_transitions(_pptx([_slide("")]), _fodp(1)), {})


class SourceThemeTests(unittest.TestCase):
    def _package(self) -> bytes:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
            package.writestr("ppt/slideMasters/slideMaster1.xml", "<p:sldMaster/>")
            package.writestr(
                "ppt/slideMasters/_rels/slideMaster1.xml.rels",
                '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>',
            )
            package.writestr("ppt/theme/theme1.xml", '<a:theme name="Office"><a:fontScheme><a:latin typeface="Calibri"/></a:fontScheme></a:theme>')
        return buffer.getvalue()

    def test_original_theme_is_carried_and_restored(self):
        pptx = self._package()
        marked = patcher.overlay_fodp_source_theme(
            '<office:document xmlns:office="o" xmlns:draw="d" xmlns:style="s"><style:master-page style:name="Standard"/></office:document>', pptx
        )
        self.assertIn("vno:src-theme=", marked)
        # soffice đã ghi chủ đề mặc định riêng
        converted = self._package()
        converted = patcher.patch_ooxml_zip(converted, {"ppt/theme/theme1.xml": '<a:theme name="LibreOffice"/>'.encode("utf-8")})
        restored = patcher._restore_slides_source_theme(converted, marked, None)
        self.assertEqual(list(restored), ["ppt/theme/theme1.xml"])
        self.assertIn('name="Office"', restored["ppt/theme/theme1.xml"])

    def test_a_theme_chosen_in_vn_is_not_overwritten(self):
        pptx = self._package()
        marked = patcher.overlay_fodp_source_theme(
            '<office:document xmlns:office="o" xmlns:draw="d" xmlns:style="s"><style:master-page style:name="Standard"/></office:document>', pptx
        )
        self.assertEqual(patcher._restore_slides_source_theme(pptx, marked, {"id": "corporate-red"}), {})

if __name__ == "__main__":
    unittest.main()
