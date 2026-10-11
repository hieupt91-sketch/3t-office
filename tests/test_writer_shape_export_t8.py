import json
import unittest

from adapters.libreoffice.common.ooxml_zip_patch import _writer_restore_native_writer_shapes


def marker(spec):
    return f"<!--vno-writer-shape-v1:{json.dumps(spec, separators=(',', ':')).encode('utf-8').hex()}-->"


def drawing(x, y, width, height, name):
    return (
        '<w:drawing><wp:anchor><wp:positionH><wp:posOffset>' + str(x * 9525) + '</wp:posOffset></wp:positionH>'
        '<wp:positionV><wp:posOffset>' + str(y * 9525) + '</wp:posOffset></wp:positionV>'
        '<wp:extent cx="' + str(width * 9525) + '" cy="' + str(height * 9525) + '"/>'
        '<wp:docPr name="' + name + '"/><a:graphicData><wps:wsp><wps:cNvSpPr txBox="1"/>'
        '<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + str(width * 9525) + '" cy="' + str(height * 9525)
        + '"/></a:xfrm><a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></wps:spPr>'
        '<wps:txbx><w:txbxContent><w:p/></w:txbxContent></wps:txbx></wps:wsp></a:graphicData></wp:anchor></w:drawing>'
    )


class WriterShapeExportT8Tests(unittest.TestCase):
    def test_new_shape_becomes_native_word_autoshape_with_style(self):
        document = '<w:document>' + drawing(100, 160, 140, 80, 'Frame1') + '</w:document>'
        source = marker({
            "type": "rectangle", "isNew": True, "x": 100, "y": 160, "w": 140, "h": 80,
            "fill": "#2563eb", "stroke": "#1d4ed8", "strokeWidth": 2,
        })
        result = _writer_restore_native_writer_shapes(document, source)
        self.assertIn('<wps:cNvSpPr/>', result)
        self.assertNotIn('<wps:txbx>', result)
        self.assertIn('<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>', result)
        self.assertIn('<a:srgbClr val="2563EB"/>', result)
        self.assertIn('<a:ln w="19050"><a:solidFill><a:srgbClr val="1D4ED8"/></a:solidFill></a:ln>', result)
        self.assertIn('<wp:posOffset>952500</wp:posOffset>', result)

    def test_imported_shape_and_textbox_are_untouched(self):
        first = drawing(10, 20, 40, 30, 'ImportedShape')
        second = drawing(100, 160, 140, 80, 'NewTextBox')
        document = '<w:document>' + first + second + '</w:document>'
        source = marker({"type": "rectangle", "isNew": False, "x": 10, "y": 20, "w": 40, "h": 30}) + marker({
            "type": "textbox", "isNew": True, "x": 100, "y": 160, "w": 140, "h": 80,
            "fill": "#ffffff", "stroke": "#000000", "strokeWidth": 1,
        })
        self.assertEqual(_writer_restore_native_writer_shapes(document, source), document)

    def test_documents_without_shape_markers_are_unchanged(self):
        document = '<w:document>' + drawing(100, 160, 140, 80, 'Existing') + '</w:document>'
        self.assertEqual(_writer_restore_native_writer_shapes(document, '<p>Imported text</p>'), document)


if __name__ == "__main__":
    unittest.main()
