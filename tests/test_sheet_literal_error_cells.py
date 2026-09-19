"""Quy ước S14 (đo batch LAN vòng 6, 19/9/2026: lan01 200 ô, lan15 2 ô).

XLSX gốc có ô giá trị lỗi thuần `<c t="e"><v>#N/A</v></c>` (giá trị dán, không công thức). LibreOffice chỉ biểu diễn
lỗi bằng công thức nên nhập thành `table:formula="of:=#N/A"` và xuất `<f>#N/A</f>` -> thanh công thức Excel hiện
"=#N/A" thay vì "#N/A". Hậu xử lý bỏ `<f>` khi ô lưu có cùng giá trị lỗi và công thức đúng bằng chữ lỗi đó.
"""
import importlib.util
import io
import os
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("sheet_literal_errors", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)

NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
WORKBOOK = f'<workbook {NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>'
RELS = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'


def _xlsx(sheet: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("xl/workbook.xml", WORKBOOK)
        z.writestr("xl/_rels/workbook.xml.rels", RELS)
        z.writestr("xl/styles.xml", f"<styleSheet {NS}/>")
        z.writestr("xl/worksheets/sheet1.xml", sheet)
    return buf.getvalue()


SOURCE = (f'<worksheet {NS}><sheetData><row r="2">'
          '<c r="Y2" s="3"/>'                                              # ô tự đóng: không được nuốt ô kế tiếp
          '<c r="Z2" s="10" t="e"><v>#N/A</v></c>'                      # lỗi thuần -> bỏ <f>
          '<c r="AA2" s="10" t="e"><f>VLOOKUP(A2,B:C,2,0)</f><v>#N/A</v></c>'  # lỗi từ công thức thật -> giữ
          '<c r="AB2" t="e"><v>#DIV/0!</v></c>'
          "<c r=\"AD2\"><f>VLOOKUP(B3,'Gia'!$A:$C,3,FALSE)</f><v>5</v></c>"   # S15: chữ công thức gốc
          '<c r="AE2"><f t="shared" ref="AE2:AE9" si="0">A2*2</f><v>4</v></c>'  # shared -> không đụng
          '<c r="AF2"><f>SUM(A2:A9)</f><v>4</v></c>'                      # người dùng đổi công thức -> giữ của app
          '</row></sheetData></worksheet>')
SAVED = (f'<worksheet {NS}><sheetData><row r="2">'
         '<c r="Y2" s="3"/>'
         '<c r="Z2" s="88" t="e"><f aca="false">#N/A</f><v>#N/A</v></c>'
         '<c r="AA2" s="88" t="e"><f aca="false">VLOOKUP(A2,B:C,2,0)</f><v>#N/A</v></c>'
         '<c r="AB2" s="88" t="e"><f aca="false">#DIV/0!</f><v>#DIV/0!</v></c>'
         '<c r="AC2" s="88" t="e"><f aca="false">#N/A</f><v>#N/A</v></c>'  # người dùng gõ =#N/A trong app -> giữ
         "<c r=\"AD2\" s=\"1\"><f aca=\"false\">VLOOKUP(B3,'Gia'!$A:$C,3,FALSE())</f><v>5</v></c>"
         '<c r="AE2" s="1"><f aca="false">A2*2</f><v>4</v></c>'
         '<c r="AF2" s="1"><f aca="false">SUM(A2:A10)</f><v>4</v></c>'
         '</row></sheetData></worksheet>')


class LiteralErrorCells(unittest.TestCase):
    def test_pasted_error_values_do_not_become_formulas(self):
        replacements = {}
        patcher._restore_literal_error_cells_step(_xlsx(SAVED), _xlsx(SOURCE), replacements)
        out = replacements["xl/worksheets/sheet1.xml"]
        self.assertIn('<c r="Y2" s="3"/>', out)
        self.assertIn('<c r="Z2" s="88" t="e"><v>#N/A</v></c>', out)
        self.assertIn('<c r="AB2" s="88" t="e"><v>#DIV/0!</v></c>', out)
        self.assertIn('<c r="AA2" s="88" t="e"><f aca="false">VLOOKUP(A2,B:C,2,0)</f><v>#N/A</v></c>', out)
        self.assertIn('<c r="AC2" s="88" t="e"><f aca="false">#N/A</f><v>#N/A</v></c>', out)
        # S15: FALSE() của LibreOffice -> chữ công thức gốc (cùng nghĩa); shared/đã đổi thì giữ của app
        self.assertIn("<c r=\"AD2\" s=\"1\"><f aca=\"false\">VLOOKUP(B3,'Gia'!$A:$C,3,FALSE)</f><v>5</v></c>", out)
        self.assertIn('<c r="AE2" s="1"><f aca="false">A2*2</f><v>4</v></c>', out)
        self.assertIn('<c r="AF2" s="1"><f aca="false">SUM(A2:A10)</f><v>4</v></c>', out)


if __name__ == "__main__":
    unittest.main()
