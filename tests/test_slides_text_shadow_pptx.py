"""Khôi phục bóng chữ (fo:text-shadow) khi soffice xuất PPTX: kiểm hàm xử lý bằng dữ liệu giả."""
import io
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "adapters" / "libreoffice" / "common"))
import ooxml_zip_patch as patcher  # noqa: E402

FODP = (
    '<office:document><office:automatic-styles>'
    '<style:style style:name="vnoT2" style:family="text"><style:text-properties fo:text-shadow="1pt 1pt" fo:color="#334155"/></style:style>'
    '<style:style style:name="vnoT3" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>'
    '</office:automatic-styles><office:body><office:presentation>'
    '<draw:page draw:name="p1"><draw:frame><draw:text-box>'
    '<text:p text:style-name="P1"/>'
    '<text:p text:style-name="P2">Xin chao <text:span text:style-name="vnoT2">the</text:span> gioi</text:p>'
    '<text:p text:style-name="P2">Xin chao the gioi</text:p>'
    '<text:p text:style-name="P3"><text:span text:style-name="vnoT3">Dam</text:span><text:span text:style-name="vnoT2"> va bong</text:span></text:p>'
    '</draw:text-box></draw:frame></draw:page></office:presentation></office:body></office:document>'
)


def run(text, extra=""):
    return (f'<a:r><a:rPr lang="en-GB" sz="2000"><a:solidFill><a:srgbClr val="334155"/></a:solidFill>{extra}'
            f'<a:uFillTx/><a:latin typeface="Segoe UI"/></a:rPr><a:t>{text}</a:t></a:r>')


EMPTY = "<a:effectLst></a:effectLst>"


def slide_xml():
    p1 = "<a:p>" + run("Xin chao ", EMPTY) + run("the", EMPTY) + run(" gioi", EMPTY) + "</a:p>"
    p2 = "<a:p>" + run("Xin chao the gioi", EMPTY) + "</a:p>"
    p3 = "<a:p>" + run("Dam", EMPTY) + run(" va bong", EMPTY) + "</a:p>"
    return f'<p:sld xmlns:a="a" xmlns:p="p"><p:txBody>{p1}{p2}{p3}</p:txBody></p:sld>'


def make_pptx(xml=None):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as package:
        package.writestr("ppt/slides/slide1.xml", xml or slide_xml())
    return buffer.getvalue()


class TextShadowPptxTests(unittest.TestCase):
    def test_ranges_follow_character_offsets_and_skip_self_closing_paragraphs(self):
        ranges = patcher._slides_text_shadow_ranges_from_fodp(FODP)
        self.assertEqual(ranges[0]["Xin chao the gioi"], [[(9, 12)]])
        self.assertEqual(ranges[0]["Dam va bong"], [[(3, 11)]])

    def test_no_shadow_in_fodp_means_nothing_to_do(self):
        self.assertEqual(patcher._slides_text_shadow_ranges_from_fodp(FODP.replace("fo:text-shadow", "fo:x")), [])
        self.assertEqual(patcher._apply_slides_text_shadow(make_pptx(), FODP.replace("fo:text-shadow", "fo:x")), {})

    def test_only_the_shadowed_run_gets_outer_shadow(self):
        out = patcher._apply_slides_text_shadow(make_pptx(), FODP)
        xml = out["ppt/slides/slide1.xml"]
        first = xml.split("</a:p>")[0]
        self.assertIn("<a:outerShdw", first.split("<a:t>the</a:t>")[0].split("<a:r>")[-1])
        self.assertNotIn("<a:outerShdw", first.split("<a:t>Xin chao </a:t>")[0])
        self.assertEqual(xml.count("<a:outerShdw"), 2 + 0, "một ở 'the', một ở ' va bong'")

    def test_duplicate_paragraph_text_consumes_shadow_in_order(self):
        # Đoạn thứ hai có cùng chữ nhưng KHÔNG đổ bóng trong FODP: phải giữ nguyên.
        xml = patcher._apply_slides_text_shadow(make_pptx(), FODP)["ppt/slides/slide1.xml"]
        paragraphs = xml.split("</a:p>")
        self.assertIn("<a:outerShdw", paragraphs[0])
        self.assertNotIn("<a:outerShdw", paragraphs[1])

    def test_idempotent_and_keeps_existing_shadow(self):
        once = patcher._apply_slides_text_shadow(make_pptx(), FODP)["ppt/slides/slide1.xml"]
        twice = patcher._apply_slides_text_shadow(make_pptx(once), FODP)
        self.assertEqual(twice.get("ppt/slides/slide1.xml", once).count("<a:outerShdw"), once.count("<a:outerShdw"))

    def test_run_without_effect_list_gets_one_in_schema_order(self):
        plain = run("the")
        out = patcher._set_run_text_shadow(plain)
        self.assertLess(out.index("<a:effectLst>"), out.index("<a:latin"))
        self.assertGreater(out.index("<a:effectLst>"), out.index("</a:solidFill>"))

    def test_prior_replacements_are_composed_not_overwritten(self):
        prior = {"ppt/slides/slide1.xml": slide_xml().replace("Dam", "DAM")}
        xml = patcher._apply_slides_text_shadow(make_pptx(), FODP, prior)["ppt/slides/slide1.xml"]
        self.assertIn("DAM", xml)
        self.assertIn("<a:outerShdw", xml)


if __name__ == "__main__":
    unittest.main()