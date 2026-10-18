"""Hình dạng dựng sẵn của VN Sheet (Chèn > Hình dạng): ghi xdr:sp prstGeom có dấu nhận diện và đọc vno:shapes từ FODS."""
import html
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.libreoffice.common import ooxml_zip_patch as patch  # noqa: E402


class SheetShapesDrawingTests(unittest.TestCase):
    def test_fods_shapes_are_parsed_with_shape_flag_and_text_boxes_untouched(self):
        shapes = [{"id": "s1", "shapeType": "star5", "anchor": {"c": "B", "r": 2}, "widthPx": 120, "heightPx": 80}]
        boxes = [{"id": "t1", "text": "Xin chao", "anchor": {"c": "A", "r": 1}, "widthPx": 180, "heightPx": 54}]
        fods = (
            '<office:document><table:table table:name="Sheet1" '
            f'vno:text-boxes="{html.escape(json.dumps(boxes), quote=True)}" '
            f'vno:shapes="{html.escape(json.dumps(shapes), quote=True)}"></table:table></office:document>'
        )
        parsed = patch._parse_fods_text_boxes(fods)
        items = parsed["Sheet1"]
        self.assertEqual(len(items), 2)
        self.assertFalse(items[0].get("_shape"))
        self.assertTrue(items[1].get("_shape"))
        self.assertEqual(items[1]["shapeType"], "star5")

    def test_preset_shape_xml_has_prst_marker_and_style(self):
        xml = patch._drawing_preset_shape({
            "shapeType": "rightArrow", "anchor": {"c": "C", "r": 4}, "widthPx": 150, "heightPx": 60,
            "fillColor": "#ef4444", "strokeColor": "#7f1d1d", "strokeWidth": 2, "text": "A & B", "rotation": 30, "flipH": True,
            "name": "Mui ten", "altText": "mo ta",
        }, 7)
        self.assertIn('prst="rightArrow"', xml)
        self.assertIn(patch._SHEET_SHAPE_EXT_URI, xml)
        self.assertIn('<xdr:col>2</xdr:col>', xml)
        self.assertIn('<xdr:row>3</xdr:row>', xml)
        self.assertIn('val="EF4444"', xml)
        self.assertIn('w="19050"', xml)
        self.assertIn('rot="1800000"', xml)
        self.assertIn('flipH="1"', xml)
        self.assertIn("A &amp; B", xml)
        self.assertIn('name="Mui ten"', xml)
        self.assertIn('descr="mo ta"', xml)
        self.assertNotIn('txBox="1"', xml)

    def test_unknown_shape_type_falls_back_to_rect(self):
        xml = patch._drawing_preset_shape({"shapeType": "khong-co", "anchor": {"c": "A", "r": 1}}, 1)
        self.assertIn('prst="rect"', xml)


if __name__ == "__main__":
    unittest.main()
