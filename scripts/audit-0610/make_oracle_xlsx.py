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


raw = cells
sheets = raw["__sheets__"] if isinstance(raw, dict) and "__sheets__" in raw else {"Sheet1": raw}


def build_sheet(cell_map):
    rows = {}
    for ref, value in cell_map.items():
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
    return "".join(sheet)


names = list(sheets)
overrides = "".join(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(len(names)))
sheet_tags = "".join(f'<sheet name="{escape(n)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, n in enumerate(names))
rels = "".join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>' for i in range(len(names)))
with zipfile.ZipFile(sys.argv[2], "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + overrides + '</Types>')
    z.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    z.writestr("xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheet_tags + '</sheets></workbook>')
    z.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>')
    for i, n in enumerate(names):
        z.writestr(f"xl/worksheets/sheet{i + 1}.xml", build_sheet(sheets[n]))
print("ok")
