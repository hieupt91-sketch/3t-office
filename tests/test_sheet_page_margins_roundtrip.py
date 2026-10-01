"""Excel page margins must not absorb LibreOffice header/footer spacing."""
import html
import io
import json
import unittest
import zipfile
import xml.etree.ElementTree as ET
import main

patcher = main._ooxml_zip_patch()


class SheetPageMarginsRoundtripTests(unittest.TestCase):
    def test_save_replaces_native_margins_and_preserves_header_distances(self):
        source = '<worksheet><sheetData/><pageMargins top="1" bottom="1" left="1" right="1" header="0.2" footer="0.4"/><pageSetup/></worksheet>'
        result = patcher.apply_page_margins_to_worksheet(source, {'top': 1.5, 'bottom': 1.6, 'left': 1.7, 'right': 1.8})
        attrs = ET.fromstring(result).find('pageMargins').attrib
        for side, value in [('top', 1.5), ('bottom', 1.6), ('left', 1.7), ('right', 1.8)]:
            self.assertAlmostEqual(float(attrs[side]) * 2.54, value)
        self.assertEqual((attrs['header'], attrs['footer']), ('0.2', '0.4'))

    def test_missing_margins_insert_before_page_setup(self):
        result = patcher.apply_page_margins_to_worksheet('<worksheet><sheetData/><pageSetup/><drawing/></worksheet>', dict.fromkeys(['top', 'bottom', 'left', 'right'], 0))
        self.assertEqual([child.tag for child in ET.fromstring(result)], ['sheetData', 'pageMargins', 'pageSetup', 'drawing'])

    def test_open_uses_native_margins_and_sheet_names_not_sheet_order(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as archive:
            archive.writestr('xl/workbook.xml', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="A &amp; B" sheetId="1" r:id="rId1"/></sheets></workbook>')
            archive.writestr('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet3.xml"/></Relationships>')
            archive.writestr('xl/worksheets/sheet3.xml', '<worksheet><pageMargins top="0.5" bottom="0.6" left="0.7" right="0.8"/></worksheet>')
        source = '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"><table:table table:name="Untouched"/><table:table table:name="A &amp; B"></table:table></office:document>'
        result = patcher.overlay_page_margins_to_fods(data.getvalue(), source)
        ET.fromstring(result)
        margins = patcher.parse_page_margins_from_fods(result)
        self.assertEqual(set(margins), {'A & B'})
        self.assertAlmostEqual(margins['A & B']['top'], 1.27)
        self.assertIn('<table:table table:name="Untouched"/>', result)
        metadata = '<table:table table:name="A &amp; B" vno:page-margins="' + html.escape(json.dumps(dict.fromkeys(['top', 'bottom', 'left', 'right'], 1.5)), quote=True) + '">'
        saved = patcher.postprocess_sheet_xlsx(data.getvalue(), source_fods=metadata)
        with zipfile.ZipFile(io.BytesIO(saved)) as archive:
            attrs = ET.fromstring(archive.read('xl/worksheets/sheet3.xml')).find('pageMargins').attrib
            self.assertAlmostEqual(float(attrs['top']) * 2.54, 1.5)

    def test_invalid_metadata_is_ignored(self):
        for margins in ['bad json', {}, {'top': float('nan'), 'bottom': 1, 'left': 1, 'right': 1}]:
            encoded = margins if isinstance(margins, str) else json.dumps(margins)
            source = '<table:table table:name="Data" vno:page-margins="' + html.escape(encoded, quote=True) + '">'
            self.assertEqual(patcher.parse_page_margins_from_fods(source), {})


if __name__ == '__main__':
    unittest.main()
