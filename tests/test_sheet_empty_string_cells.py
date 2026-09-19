"""Quy ước S13 (đo batch LAN vòng 5/6, 19/9/2026: lan25 686 ô, lan20 20 ô, lan15 2 ô).

Ô chuỗi rỗng `<c t="s"><v>N</v></c>` (N -> `<si><t/></si>`) bị soffice BỎ khi nhập XLSX→FODS (đo: LO FODS chỉ còn
`<table:table-cell table:number-columns-repeated="7"/>`), còn khi xuất FODS→XLSX thì giữ. Excel coi đó là ô thật
(ISBLANK=FALSE, COUNTA đếm) nên hậu xử lý chèn lại từ file gốc, xf đi qua bộ chép của S8.
"""
import importlib.util
import io
import os
import re
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("sheet_empty_strings", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
WORKBOOK = f'<workbook {NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>'
RELS = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
SRC_STYLES = (f'<styleSheet {NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><sz val="9"/><name val="Trebuchet MS"/></font></fonts>'
              '<fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders>'
              '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs></styleSheet>')
LO_STYLES = (f'<styleSheet {NS}><fonts count="1"><font><sz val="10"/><name val="Arial"/></font></fonts>'
             '<fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders>'
             '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>')
SRC_SST = f'<sst {NS} count="5" uniqueCount="3"><si><t>a</t></si><si><t/></si><si><t xml:space="preserve"></t></si></sst>'
LO_SST = f'<sst {NS} count="2" uniqueCount="2"><si><t xml:space="preserve">a</t></si><si><t xml:space="preserve">b</t></si></sst>'
SRC_SHEET = (f'<worksheet {NS}><sheetData>'
             '<row r="2"><c r="T2"><v>1</v></c><c r="U2" t="s"><v>1</v></c><c r="V2" s="1" t="s"><v>2</v></c><c r="Y2" t="s"><v>1</v></c></row>'
             '<row r="4"><c r="A4" t="inlineStr"><is><t/></is></c><c r="B4" t="s"><v>0</v></c></row>'
             '<row r="6"><c r="C6" t="s"><v>1</v></c></row>'
             '</sheetData></worksheet>')
LO_SHEET = (f'<worksheet {NS}><sheetData>'
            '<row r="2"><c r="T2" s="0" t="n"><v>1</v></c><c r="Y2" s="0" t="s"><v>1</v></c></row>'      # Y2: người dùng đã gõ "b"
            '<row r="4"><c r="A4" s="0"/><c r="B4" s="0" t="s"><v>0</v></c></row>'                       # A4: ô tự đóng chỉ có style
            '</sheetData></worksheet>')


def _xlsx(styles: str, sst: str, sheet: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("xl/workbook.xml", WORKBOOK); z.writestr("xl/_rels/workbook.xml.rels", RELS)
        z.writestr("xl/styles.xml", styles); z.writestr("xl/sharedStrings.xml", sst); z.writestr("xl/worksheets/sheet1.xml", sheet)
    return buf.getvalue()


class EmptyStringCells(unittest.TestCase):
    def test_dropped_empty_string_cells_are_restored_in_order_with_mapped_xf(self):
        src = _xlsx(SRC_STYLES, SRC_SST, SRC_SHEET)
        lo = _xlsx(LO_STYLES, LO_SST, LO_SHEET)
        replacements = {}
        copier = patcher._SourceXfCopier(lo, src)
        patcher._restore_empty_string_cells_step(lo, src, replacements, copier)
        sheet = replacements["xl/worksheets/sheet1.xml"]
        sst = replacements["xl/sharedStrings.xml"]
        styles = replacements["xl/styles.xml"]
        # Chuỗi rỗng được thêm vào sharedStrings của file lưu (index 2), count/uniqueCount cập nhật
        self.assertIn("<si><t/></si></sst>", sst)
        self.assertIn('uniqueCount="3"', sst)
        self.assertIn('count="6"', sst)  # 2 + 4 ô khôi phục (U2, V2, A4, C6)
        # U2 chèn giữa T2 và Y2; V2 mang xf chép (index 1 mới, font Trebuchet); Y2 giữ nguyên "b"
        self.assertIn('<c r="T2" s="0" t="n"><v>1</v></c><c r="U2" t="s"><v>2</v></c><c r="V2" s="1" t="s"><v>2</v></c><c r="Y2" s="0" t="s"><v>1</v></c>', sheet)
        self.assertIn('<name val="Trebuchet MS"/>', styles)
        self.assertIn('<cellXfs count="2">', styles)
        # A4 tự đóng chỉ có style -> thành ô chuỗi rỗng; B4 giữ
        self.assertIn('<row r="4"><c r="A4" t="s"><v>2</v></c><c r="B4" s="0" t="s"><v>0</v></c></row>', sheet)
        # Dòng 6 chưa có -> tạo mới đúng thứ tự, sau dòng 4
        self.assertIn('</row><row r="6"><c r="C6" t="s"><v>2</v></c></row></sheetData>', sheet)
        import xml.dom.minidom
        xml.dom.minidom.parseString(sheet); xml.dom.minidom.parseString(sst); xml.dom.minidom.parseString(styles)

    def test_nothing_to_restore_leaves_files_untouched(self):
        src = _xlsx(SRC_STYLES, SRC_SST, f'<worksheet {NS}><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>')
        lo = _xlsx(LO_STYLES, LO_SST, LO_SHEET)
        replacements = {}
        patcher._restore_empty_string_cells_step(lo, src, replacements, patcher._SourceXfCopier(lo, src))
        self.assertEqual(replacements, {})


if __name__ == "__main__":
    unittest.main()
