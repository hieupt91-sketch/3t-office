"""Quy ước S8: ô không bị sửa trong app giữ NGUYÊN xf gốc của XLSX khi lưu.

Đo 2026-09-15/16 (ma trận Sheet): LibreOffice tự viết lại mã Excel (Accounting) và đổi viền ô gộp khi nhập
-> numberFormat 287k / border 180k ô không sửa được qua FODS. Hậu xử lý chép <xf> gốc (+font/fill/border/numFmt)
vào styles.xml mới và đặt lại s= cho ô có vno:xf. Bản đầu của opencode ghi "<numFmt .../>" thành "//>", bỏ
<alignment> trong xf, bỏ <border/> tự đóng (lệch chỉ số) và không cập nhật count -> Excel từ chối file.
"""
import importlib.util
import io
import os
import re
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("sheet_untouched_xf", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
WORKBOOK = f'<workbook {NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>'
RELS = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'


def _xlsx(styles: str, sheet: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("xl/workbook.xml", WORKBOOK)
        z.writestr("xl/_rels/workbook.xml.rels", RELS)
        z.writestr("xl/styles.xml", styles)
        z.writestr("xl/worksheets/sheet1.xml", sheet)
    return buf.getvalue()


SOURCE_STYLES = (f'<styleSheet {NS}><numFmts count="1"><numFmt numFmtId="170" formatCode="_(* #,##0_);_(* \\(#,##0\\);_(* &quot;-&quot;??_);_(@_)"/></numFmts>'
                 '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Times New Roman"/></font></fonts>'
                 '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/></patternFill></fill></fills>'
                 '<borders count="2"><border/><border><left style="thin"/><right/><top style="thin"/><bottom style="thin"/></border></borders>'
                 '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="170" fontId="1" fillId="1" borderId="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf></cellXfs></styleSheet>')
LO_STYLES = (f'<styleSheet {NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="General"/></numFmts>'
             '<fonts count="1"><font><sz val="10"/><name val="Arial"/></font></fonts>'
             '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
             '<borders count="1"><border/></borders>'
             '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>')
LO_SHEET = f'<worksheet {NS}><sheetData><row r="1"><c r="A1" s="1"><v>5</v></c><c r="B1" s="1"><v>6</v></c></row></sheetData></worksheet>'
FODS = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">'
        '<office:body><office:spreadsheet><table:table table:name="S1"><table:table-row>'
        '<table:table-cell office:value-type="float" office:value="5" vno:xf="1"/>'
        '<table:table-cell office:value-type="float" office:value="6"/>'
        '</table:table-row></table:table></office:spreadsheet></office:body></office:document>')


class UntouchedCellStyles(unittest.TestCase):
    def test_untouched_cell_gets_original_xf_with_dependencies_and_valid_counts(self):
        src = _xlsx(SOURCE_STYLES, LO_SHEET)
        lo = _xlsx(LO_STYLES, LO_SHEET)
        replacements = {}
        patcher._restore_original_xf_for_vno_cells(lo, FODS, src, replacements)
        styles = replacements["xl/styles.xml"]
        sheet = replacements["xl/worksheets/sheet1.xml"]
        import xml.dom.minidom
        xml.dom.minidom.parseString(styles)
        # A1 (vno:xf=1) -> xf mới thứ 2 (index 2); B1 giữ s="1" của LibreOffice
        self.assertIn('<c r="A1" s="2">', sheet)
        self.assertIn('<c r="B1" s="1">', sheet)
        # xf mới chép cả <alignment>, trỏ tới font/fill/border/numFmt được chép thêm
        xfs = re.findall(r"<xf\b[^>]*/>|<xf\b[^>]*>.*?</xf>", re.search(r"<cellXfs[^>]*>(.*?)</cellXfs>", styles, re.S).group(1), re.S)
        self.assertEqual(len(xfs), 3)
        self.assertIn('<alignment horizontal="center" wrapText="1"/>', xfs[2])
        self.assertIn('fontId="1"', xfs[2]); self.assertIn('fillId="1"', xfs[2]); self.assertIn('borderId="1"', xfs[2])
        self.assertIn('numFmtId="165"', xfs[2])
        self.assertIn('<numFmt numFmtId="165" formatCode="_(* #,##0_);_(* \\(#,##0\\);_(* &quot;-&quot;??_);_(@_)"/>', styles)
        for tag in ("fonts", "fills", "borders", "cellXfs", "numFmts"):
            m = re.search(rf'<{tag} count="(\d+)">(.*?)</{tag}>', styles, re.S)
            child = {"fonts": "font", "fills": "fill", "borders": "border", "cellXfs": "xf", "numFmts": "numFmt"}[tag]
            actual = len(re.findall(rf"<{child}\b[^>]*/>|<{child}\b[^>]*>.*?</{child}>", m.group(2), re.S))
            self.assertEqual(int(m.group(1)), actual, tag)
        self.assertIn("<border><left style=\"thin\"/><right/><top style=\"thin\"/><bottom style=\"thin\"/></border>", styles)

    def test_copied_font_never_dedupes_into_normal_slot_zero(self):
        """lan08 vòng 8 (98 ô): font chép (Arial 10) trùng fonts[0] của LibreOffice -> gộp về 0; sau đó
        _restore_normal_font_in_styles thay fonts[0] bằng Normal gốc (Calibri 11) -> ô mất Arial 10."""
        lo_styles = LO_STYLES.replace('<fonts count="1"><font><sz val="10"/><name val="Arial"/></font></fonts>',
                                      '<fonts count="1"><font><b/><sz val="13"/><name val="Times New Roman"/></font></fonts>')
        replacements = {}
        patcher._restore_original_xf_for_vno_cells(_xlsx(lo_styles, LO_SHEET), FODS, _xlsx(SOURCE_STYLES, LO_SHEET), replacements)
        styles = replacements["xl/styles.xml"]
        xfs = re.findall(r"<xf\b[^>]*/>|<xf\b[^>]*>.*?</xf>", re.search(r"<cellXfs[^>]*>(.*?)</cellXfs>", styles, re.S).group(1), re.S)
        self.assertIn('fontId="1"', xfs[2])
        self.assertIn('<fonts count="2">', styles)

    def test_builtin_numfmt_id_declared_explicitly_in_source_keeps_its_code(self):
        """lan28 (vòng 5, 1540 ô): file gốc khai báo `<numFmt numFmtId="41" formatCode="_-* #,##0_-;…"/>` (ghi đè mã
        built-in theo locale); S8 chỉ chép id >= 164 nên Excel dùng mã 41 mặc định của nó."""
        code = "_-* #,##0_-;\\-* #,##0_-;_-* &quot;-&quot;_-;_-@_-"
        src = SOURCE_STYLES.replace('<numFmt numFmtId="170"', f'<numFmt numFmtId="41" formatCode="{code}"/><numFmt numFmtId="170"').replace(
            'count="1"><numFmt numFmtId="41"', 'count="2"><numFmt numFmtId="41"').replace('numFmtId="170" fontId="1"', 'numFmtId="41" fontId="1"')
        replacements = {}
        patcher._restore_original_xf_for_vno_cells(_xlsx(LO_STYLES, LO_SHEET), FODS, _xlsx(src, LO_SHEET), replacements)
        styles = replacements["xl/styles.xml"]
        self.assertIn(f'<numFmt numFmtId="165" formatCode="{code}"/>', styles)
        xfs = re.findall(r"<xf\b[^>]*/>|<xf\b[^>]*>.*?</xf>", re.search(r"<cellXfs[^>]*>(.*?)</cellXfs>", styles, re.S).group(1), re.S)
        self.assertIn('numFmtId="165"', xfs[2])

    def test_s10_source_theme_and_indexed_colors_follow_the_copied_xf(self):
        """Đo vòng 5 (19/9): fill <fgColor theme="9" tint="0.6"/> chép theo S8 nhưng theme1.xml là theme
        mặc định của LibreOffice -> Excel tô #E9706D thay vì #A9D18E (574 ô lan07/13/17)."""
        src_theme = '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:accent6><a:srgbClr val="70AD47"/></a:accent6></a:theme>'
        lo_theme = '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:accent6><a:srgbClr val="C9211E"/></a:accent6></a:theme>'
        src_styles = SOURCE_STYLES.replace('<fgColor rgb="FFD9EAD3"/>', '<fgColor theme="9" tint="0.6"/>').replace(
            "</styleSheet>", '<colors><indexedColors><color rgb="FF112233"/></indexedColors></colors></styleSheet>')

        def with_theme(styles, theme):
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w") as z:
                z.writestr("xl/workbook.xml", WORKBOOK); z.writestr("xl/_rels/workbook.xml.rels", RELS)
                z.writestr("xl/styles.xml", styles); z.writestr("xl/worksheets/sheet1.xml", LO_SHEET)
                z.writestr("xl/theme/theme1.xml", theme)
            return buf.getvalue()

        replacements = {}
        patcher._restore_original_xf_for_vno_cells(with_theme(LO_STYLES, lo_theme), FODS, with_theme(src_styles, src_theme), replacements)
        self.assertEqual(replacements["xl/theme/theme1.xml"], src_theme)
        styles = replacements["xl/styles.xml"]
        self.assertIn('<fgColor theme="9" tint="0.6"/>', styles)
        self.assertIn('<colors><indexedColors><color rgb="FF112233"/></indexedColors></colors></styleSheet>', styles)
        import xml.dom.minidom
        xml.dom.minidom.parseString(styles)
        # Không có ô vno:xf nào -> không đụng theme của LibreOffice
        untouched = {}
        patcher._restore_original_xf_for_vno_cells(with_theme(LO_STYLES, lo_theme), FODS.replace(' vno:xf="1"', ""), with_theme(src_styles, src_theme), untouched)
        self.assertNotIn("xl/theme/theme1.xml", untouched)

    def test_s10_libreoffice_shifted_indexed_palette_is_dropped_when_source_has_none(self):
        """Đo Excel COM lan03 E3 (19/9): LibreOffice ghi <indexedColors> thiếu khối 8 màu lặp (chỉ số 8–15)
        -> indexed="8" (đen) Excel vẽ #800000; bỏ khối đó -> #000000 như file gốc."""
        lo_palette = "<colors><indexedColors>" + "".join(
            f'<rgbColor rgb="FF{c}"/>' for c in ["000000", "FFFFFF", "FF0000", "00FF00", "0000C8", "FFFF00", "FF00FF", "00FFFF", "800000", "008000"]) + "</indexedColors></colors>"
        lo_styles = LO_STYLES.replace("</styleSheet>", lo_palette + "</styleSheet>")
        # Có ô vno:xf
        replacements = {}
        patcher._restore_original_xf_for_vno_cells(_xlsx(lo_styles, LO_SHEET), FODS, _xlsx(SOURCE_STYLES, LO_SHEET), replacements)
        self.assertNotIn("<indexedColors", replacements["xl/styles.xml"])
        self.assertNotIn("<colors", replacements["xl/styles.xml"])
        # Không có ô vno:xf nào vẫn phải bỏ bảng màu lệch
        replacements = {}
        patcher._restore_original_xf_for_vno_cells(_xlsx(lo_styles, LO_SHEET), FODS.replace(' vno:xf="1"', ""), _xlsx(SOURCE_STYLES, LO_SHEET), replacements)
        self.assertNotIn("<indexedColors", replacements["xl/styles.xml"])
        # File gốc có <indexedColors> riêng -> thay bằng của file gốc (không bỏ)
        src_custom = SOURCE_STYLES.replace("</styleSheet>", '<colors><indexedColors><color rgb="FF112233"/></indexedColors></colors></styleSheet>')
        replacements = {}
        patcher._restore_original_xf_for_vno_cells(_xlsx(lo_styles, LO_SHEET), FODS, _xlsx(src_custom, LO_SHEET), replacements)
        self.assertIn('<indexedColors><color rgb="FF112233"/></indexedColors>', replacements["xl/styles.xml"])
        self.assertNotIn('0000C8', replacements["xl/styles.xml"])


if __name__ == "__main__":
    unittest.main()
