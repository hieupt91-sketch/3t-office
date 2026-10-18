"""Lặp lại phương tiện Slides: LibreOffice bỏ anim:audio repeatCount khi ghi PPTX; ta thêm <p:audio>/<p:video> cMediaNode repeatCount."""
from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()


def pic(kind: str, spid: int) -> str:
    return (
        f'<p:pic><p:nvPicPr><p:cNvPr id="{spid}" name="m{spid}"/><p:cNvPicPr/><p:nvPr><a:{kind}File r:link="rId2"/></p:nvPr></p:nvPicPr>'
        '<p:blipFill/><p:spPr/></p:pic>'
    )


def slide(shapes: str, timing: str = "") -> str:
    return (
        '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="a" xmlns:r="r">'
        f'<p:cSld><p:spTree>{shapes}</p:spTree></p:cSld><p:clrMapOvr/>{timing}</p:sld>'
    )


def package(slide_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        z.writestr("ppt/slides/slide1.xml", slide_xml)
    return buffer.getvalue()


def fodp(*audio_tags: str) -> str:
    return "<draw:page>" + "".join(audio_tags) + "</draw:page>"


LOOP = '<anim:audio smil:begin="indefinite" smil:end="stop-audio+0s" smil:fill="hold" smil:repeatCount="indefinite"/>'
ONCE = '<anim:audio smil:begin="indefinite" smil:end="stop-audio+0s" smil:fill="hold"/>'
TIMING = ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
          '<p:seq><p:cTn id="2" nodeType="mainSeq"><p:childTnLst/></p:cTn></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')


class MediaLoopTests(unittest.TestCase):
    def test_loop_audio_is_added_to_existing_timing(self):
        xml = slide(pic("audio", 7), TIMING)
        out = patcher._apply_slides_media_loops(package(xml), fodp(LOOP), None)["ppt/slides/slide1.xml"]
        self.assertIn('<p:audio><p:cMediaNode vol="80000"><p:cTn id="9000" repeatCount="indefinite"', out)
        self.assertIn('<p:spTgt spid="7"/>', out)
        self.assertLess(out.index("</p:seq>"), out.index("<p:audio>"), "p:audio đứng sau dãy chính")
        self.assertEqual(out.count("<p:timing"), 1)

    def test_timing_is_created_when_slide_has_none_and_video_uses_p_video(self):
        out = patcher._apply_slides_media_loops(package(slide(pic("video", 9))), fodp(LOOP), None)["ppt/slides/slide1.xml"]
        self.assertIn("<p:video><p:cMediaNode", out)
        self.assertLess(out.index("</p:clrMapOvr>") if "</p:clrMapOvr>" in out else out.index("<p:clrMapOvr/>"), out.index("<p:timing"))

    def test_only_the_looping_media_gets_a_node_by_order(self):
        xml = slide(pic("audio", 5) + pic("audio", 6), TIMING)
        out = patcher._apply_slides_media_loops(package(xml), fodp(ONCE, LOOP), None)["ppt/slides/slide1.xml"]
        self.assertEqual(out.count("<p:audio>"), 1)
        self.assertIn('<p:spTgt spid="6"/></p:tgtEl></p:cMediaNode>', out)

    def test_nothing_changes_without_repeat_count(self):
        self.assertEqual(patcher._apply_slides_media_loops(package(slide(pic("audio", 7), TIMING)), fodp(ONCE), None), {})


if __name__ == "__main__":
    unittest.main()
