"""Viền ảnh Writer: data-vno-border -> <a:ln> trong pic:spPr (Word 2016 COM: Line.Visible, Weight 2.25, DashStyle 4)."""
from __future__ import annotations

import unittest

import main

patcher = main._ooxml_zip_patch()


def pic(sp_pr_inner: str = '<a:xfrm/><a:prstGeom prst="rect"/>') -> str:
    return (
        '<pic:pic><pic:nvPicPr/><pic:blipFill><a:blip r:embed="rId1"/></pic:blipFill>'
        f'<pic:spPr>{sp_pr_inner}</pic:spPr></pic:pic>'
    )


class PictureBorderTests(unittest.TestCase):
    def test_ln_xml_for_each_style(self):
        dashed = patcher._writer_picture_border_ln("2.25:dashed:#0000ff")
        self.assertIn('w="28575"', dashed)
        self.assertIn('<a:srgbClr val="0000FF"/>', dashed)
        self.assertIn('<a:prstDash val="dash"/>', dashed)
        self.assertIn('cmpd="dbl"', patcher._writer_picture_border_ln("3:double:#000000"))
        self.assertIn('val="sysDot"', patcher._writer_picture_border_ln("1:dotted:#ff0000"))

    def test_invalid_specs_are_ignored(self):
        for spec in ("", "2:dashed", "x:dashed:#000000", "2:wavy:#000000", "2:dashed:red", "0:solid:#000000", "99:solid:#000000"):
            self.assertIsNone(patcher._writer_picture_border_ln(spec), spec)

    def test_border_is_inserted_and_replaces_existing_line(self):
        xml = "<w:p>" + pic('<a:xfrm/><a:prstGeom prst="rect"/><a:ln w="1"><a:noFill/></a:ln>') + "</w:p>"
        html = '<p><img src="x.png" data-vno-border="2.25:dashed:#0000ff"></p>'
        out = patcher._writer_restore_picture_tools_effects(xml, html)
        self.assertEqual(out.count("<a:ln"), 1)
        self.assertIn('<a:prstDash val="dash"/>', out)
        self.assertNotIn("<a:noFill/>", out)

    def test_border_goes_before_effect_list(self):
        xml = pic('<a:xfrm/><a:prstGeom prst="rect"/><a:effectLst/>')
        html = '<img data-vno-border="1:solid:#00ff00">'
        out = patcher._writer_restore_picture_tools_effects(xml, html)
        self.assertLess(out.index("<a:ln"), out.index("<a:effectLst"))

    def test_second_picture_gets_its_own_border(self):
        xml = pic() + pic()
        html = '<img src="a.png"><img src="b.png" data-vno-border="1.5:solid:#ff0000">'
        out = patcher._writer_restore_picture_tools_effects(xml, html)
        first, second = out.split("</pic:pic>")[:2]
        self.assertNotIn("<a:ln", first)
        self.assertIn('<a:srgbClr val="FF0000"/>', second)


if __name__ == "__main__":
    unittest.main()
