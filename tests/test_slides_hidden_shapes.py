import io, sys, unittest, zipfile
sys.path.insert(0, r"E:\VNOffice-agy-shapenames")
from adapters.libreoffice.common import ooxml_zip_patch as patcher


def package(xml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("ppt/slides/slide1.xml", xml)
    return buf.getvalue()


def fodp(*shapes: str) -> str:
    return "<office:presentation><draw:page draw:name='p1'>" + "".join(shapes) + "</draw:page></office:presentation>"


class SlidesHiddenShapesPatch(unittest.TestCase):
    def test_marks_only_hidden_shape_by_name(self):
        xml = '<p:sld><p:cNvPr id="3" name="A &quot;x&quot;"/><p:cNvPr id="4" name="B"/></p:sld>'
        src = fodp('<draw:custom-shape draw:name="A &quot;x&quot;" vno:hidden="true">', '<draw:custom-shape draw:name="B">')
        out = patcher._apply_slides_hidden_shapes(package(xml), src, None)["ppt/slides/slide1.xml"]
        self.assertIn('<p:cNvPr hidden="1" id="3"', out)
        self.assertIn('<p:cNvPr id="4" name="B"/>', out)

    def test_duplicate_names_follow_order(self):
        xml = '<p:sld><p:cNvPr id="3" name="Dup"/><p:cNvPr id="4" name="Dup"/></p:sld>'
        src = fodp('<draw:custom-shape draw:name="Dup">', '<draw:custom-shape draw:name="Dup" vno:hidden="true">')
        out = patcher._apply_slides_hidden_shapes(package(xml), src, None)["ppt/slides/slide1.xml"]
        self.assertIn('<p:cNvPr id="3" name="Dup"/>', out)
        self.assertIn('<p:cNvPr hidden="1" id="4" name="Dup"/>', out)

    def test_no_hidden_shapes_changes_nothing(self):
        self.assertEqual(patcher._apply_slides_hidden_shapes(package('<p:sld><p:cNvPr id="3" name="A"/></p:sld>'), fodp('<draw:custom-shape draw:name="A">'), None), {})


if __name__ == "__main__":
    unittest.main()