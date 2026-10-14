"""Tạo một tệp XLSX tối thiểu từ {"A1": giá_trị,...} để Excel 2016 (chưa kích hoạt, chỉ-đọc) tính công thức có vùng ô.

Dùng: python -I make_oracle_xlsx.py <cells.json> <out.xlsx>
"""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape

cells = json.load(open(sys.argv[1], encoding="utf-8-sig"))


def split(ref):
    match = re.match(r"^([A-Z]+)(\d+)$", ref)
    col = 0
    for ch in match.group(1):
        col = col * 26 + ord(ch) - 64
    return int(match.group(2)), col


rows = {}
for ref, value in cells.items():
    row, col = split(ref)
    rows.setdefault(row, {})[col] = (ref, value)

sheet = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
         '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
for row in sorted(rows):
    sheet.append(f'<row r="{row}">')
    for col in sorted(rows[row]):
        ref, value = rows[row][col]
        if isinstance(value, bool):
            sheet.append(f'<c r="{ref}" t="b"><v>{1 if value else 0}</v></c>')
        elif isinstance(value, (int, float)):
            sheet.append(f'<c r="{ref}"><v>{value}</v></c>')
        elif value is None or value == "":
            continue
        else:
            sheet.append(f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>')
    sheet.append('</row>')
sheet.append('</sheetData></worksheet>')

with zipfile.ZipFile(sys.argv[2], "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
    z.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    z.writestr("xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>')
    z.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
    z.writestr("xl/worksheets/sheet1.xml", "".join(sheet))
print("ok")
