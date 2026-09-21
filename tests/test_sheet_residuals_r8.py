import importlib.util
import io
from pathlib import Path
import unittest
import zipfile


PATH = Path(__file__).parents[1] / "adapters/libreoffice/common/ooxml_zip_patch.py"
SPEC = importlib.util.spec_from_file_location("sheet_residuals_r8", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


def package(workbook, sheet, styles=None, shared=None, drawing=None, linked=False):
    out = io.BytesIO()
    rel_type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
    with zipfile.ZipFile(out, "w") as z:
        z.writestr("xl/workbook.xml", workbook)
        z.writestr("xl/_rels/workbook.xml.rels", f'<Relationships><Relationship Id="rId1" Type="{rel_type}" Target="worksheets/sheet1.xml"/></Relationships>')
        z.writestr("xl/worksheets/sheet1.xml", sheet)
        if styles: z.writestr("xl/styles.xml", styles)
        if shared: z.writestr("xl/sharedStrings.xml", shared)
        if drawing:
            z.writestr("xl/worksheets/_rels/sheet1.xml.rels", '<Relationships><Relationship Id="rIdD" Type="drawing" Target="../drawings/drawing1.xml"/></Relationships>')
            z.writestr("xl/drawings/drawing1.xml", drawing)
    return out.getvalue()


class ResidualLayersR8Tests(unittest.TestCase):
    def test_column_width_uses_s24_direct_pixel_convention(self):
        xml = '<worksheet><dimension ref="A1:A2"/><cols><col min="1" max="1" width="8" customWidth="1"/></cols></worksheet>'
        out = patcher._restore_column_widths(xml, {"A": 1.6933}, 7.0, source_explicit_cols={1}, source_widths={1: 8.25})
        self.assertIn('width="9.14"', out)

    def test_sheet_name_escape_and_hidden_state_restored_by_order(self):
        out = '<workbook><sheets><sheet name="Bang " sheetId="1" r:id="rId1"/></sheets></workbook>'
        src = '<workbook><sheets><sheet name="Bang_x0009_" sheetId="1" state="hidden" r:id="rId1"/></sheets></workbook>'
        fixed = patcher._restore_source_sheet_names_and_states(out, src)
        self.assertIn('name="Bang_x0009_"', fixed); self.assertIn('state="hidden"', fixed)

    def test_formula_cache_replaced_and_missing_error_inserted(self):
        wb = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        styles = '<styleSheet><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf fontId="0" fillId="0" borderId="0" numFmtId="0" xfId="0"/></cellXfs></styleSheet>'
        src = package(wb, '<worksheet><sheetData><row r="1"><c r="A1"><f>TODAY()</f><v>10</v></c><c r="B1" s="0" t="e"><f>NA()</f><v>#N/A</v></c></row></sheetData></worksheet>', styles)
        saved = package(wb, '<worksheet><sheetData><row r="1"><c r="A1"><f>TODAY()</f><v>20</v></c></row></sheetData></worksheet>', styles)
        repl = {}; copier = patcher._SourceXfCopier(saved, src)
        patcher._restore_formula_results_and_missing_errors_step(saved, src, repl, copier)
        self.assertIn('<v>10</v>', repl['xl/worksheets/sheet1.xml']); self.assertIn('r="B1"', repl['xl/worksheets/sheet1.xml'])

    def test_leading_newline_string_restored(self):
        wb = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        src = package(wb, '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>', shared='<sst><si><t xml:space="preserve">\nNoi dung</t></si></sst>')
        saved = package(wb, '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>', shared='<sst><si><t>Noi dung</t></si></sst>')
        repl = {}; patcher._restore_lost_leading_newlines_step(saved, src, repl, None)
        self.assertIn('xml:space="preserve">\nNoi dung', repl['xl/worksheets/sheet1.xml'])

    def test_trailing_apostrophe_string_restored(self):
        wb = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        src = package(wb, '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>NH16C\'</t></is></c></row></sheetData></worksheet>')
        saved = package(wb, '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>NH16C</t></is></c></row></sheetData></worksheet>')
        repl = {}; patcher._restore_lost_leading_newlines_step(saved, src, repl, None)
        self.assertIn("NH16C'", repl['xl/worksheets/sheet1.xml'])

    def test_center_continuous_drops_only_invented_merge(self):
        wb = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        styles = '<styleSheet><cellXfs count="1"><xf><alignment horizontal="centerContinuous"/></xf></cellXfs></styleSheet>'
        src = package(wb, '<worksheet><sheetData><row r="1"><c r="A1" s="0"/></row></sheetData></worksheet>', styles)
        saved = package(wb, '<worksheet><sheetData><row r="1"><c r="A1"/></row></sheetData><mergeCells count="1"><mergeCell ref="A1:C1"/></mergeCells></worksheet>')
        repl = {}; patcher._remove_spurious_center_continuous_merges_step(saved, src, repl)
        self.assertNotIn('mergeCell', repl['xl/worksheets/sheet1.xml'])

    def test_linked_picture_is_counted_for_passthrough(self):
        wb = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        sheet = '<worksheet><sheetData/><drawing r:id="rIdD"/></worksheet>'
        drawing = '<xdr:wsDr><xdr:oneCellAnchor><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Pic"/></xdr:nvPicPr><xdr:blipFill><a:blip r:link="rId9"/></xdr:blipFill></xdr:pic></xdr:oneCellAnchor></xdr:wsDr>'
        parsed = patcher._parse_xlsx_drawing_images(package(wb, sheet, drawing=drawing))
        self.assertEqual(1, len(parsed['Data']))

    def test_cell_rebuilder_handles_self_closing_cells_in_one_pass(self):
        xml = '<worksheet><sheetData><row r="1"><c r="A1"/></row></sheetData></worksheet>'
        out = patcher._insert_or_replace_cells(xml, {'A1': '<c r="A1"><v>1</v></c>', 'B1': '<c r="B1"><v>2</v></c>'})
        self.assertIn('<c r="A1"><v>1</v></c><c r="B1"><v>2</v></c>', out)

    def test_covered_error_formula_is_promoted_before_app_parse(self):
        xml = '<table:covered-table-cell table:formula="of:=NA()" calcext:value-type="error"><text:p>#N/A</text:p></table:covered-table-cell>'
        out = patcher._promote_covered_formula_errors(xml)
        self.assertIn('<table:table-cell ', out)
        self.assertIn('</table:table-cell>', out)

    def test_original_leading_newline_adds_empty_first_paragraph(self):
        cell = '<table:table-cell><text:p>Noi dung</text:p></table:table-cell>'
        out = patcher._set_original_string_attr(cell, '\r\nNoi dung')
        self.assertIn('<text:p></text:p><text:p>Noi dung</text:p>', out)


if __name__ == "__main__":
    unittest.main()
