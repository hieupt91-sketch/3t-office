import unittest

from adapters.libreoffice.common.ooxml_zip_patch import _writer_restore_created_image_layout


def drawing(name: str) -> str:
    return (
        '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        '<wp:extent cx="533400" cy="304800"/>'
        '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:docPr id="1" name="{name}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic><a:graphicData><pic:pic/></a:graphicData></a:graphic>'
        '</wp:inline>'
    )


class WriterCreatedImageLayoutTests(unittest.TestCase):
    def test_restores_wrap_and_named_page_position(self):
        xml = (
            f"<w:document>{drawing('one')}{drawing('two')}"
            '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:left="1701" w:right="850" w:top="1134" w:bottom="1134"/></w:sectPr>'
            "</w:document>"
        )
        source = (
            '<img src="one.png" data-vno-wrap="square" data-vno-layout-edited="true" '
            'data-vno-position="topRight">'
            '<img src="two.png" data-vno-wrap="inline">'
        )

        result = _writer_restore_created_image_layout(xml, source)

        self.assertEqual(result.count("<wp:anchor"), 1)
        self.assertEqual(result.count("<wp:inline"), 1)
        self.assertIn('<wp:positionH relativeFrom="page"><wp:posOffset>6487160</wp:posOffset></wp:positionH>', result)
        self.assertIn('<wp:positionV relativeFrom="page"><wp:posOffset>720090</wp:posOffset></wp:positionV>', result)
        self.assertIn('<wp:wrapSquare wrapText="bothSides"/>', result)
        self.assertIn('behindDoc="0"', result)

    def test_leaves_unedited_imported_image_untouched(self):
        xml = f"<w:document>{drawing('source')}</w:document>"
        source = '<img src="source.png" data-vno-wrap="square">'

        self.assertEqual(_writer_restore_created_image_layout(xml, source), xml)

    def test_maps_top_and_bottom_wrap_without_position(self):
        xml = f"<w:document>{drawing('one')}</w:document>"
        source = '<img src="one.png" data-vno-wrap="topBottom" data-vno-layout-edited="true">'

        result = _writer_restore_created_image_layout(xml, source)

        self.assertIn('<wp:wrapTopAndBottom/>', result)
        self.assertIn('relativeFrom="column"><wp:posOffset>0</wp:posOffset>', result)


if __name__ == "__main__":
    unittest.main()
