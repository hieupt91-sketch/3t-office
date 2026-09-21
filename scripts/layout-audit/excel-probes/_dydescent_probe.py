"""dyDescent / dau tieng Viet co lam hang cao them 1px? Tao xlsx toi thieu, mo Excel, doc RowHeight."""
import zipfile, subprocess, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
variant = sys.argv[1] if len(sys.argv) > 1 else "dy"
fmt = {'dy': '<sheetFormatPr defaultRowHeight="14.5" x14ac:dyDescent="0.35"/>', 'plain': '<sheetFormatPr defaultRowHeight="15"/>', 'd13': '<sheetFormatPr defaultRowHeight="13"/>', 'd12': '<sheetFormatPr defaultRowHeight="12"/>', 'd18': '<sheetFormatPr defaultRowHeight="18"/>'}[variant]
rows = [
    ("TNR14b ASCII", 1, "DIEU KHOAN THUONG MAI:"),
    ("TNR14b Viet", 1, "ĐIỀU KHOẢN THƯƠNG MẠI:"),
    ("TNR14b Xg", 1, "Xg"),
    ("Cal11 ASCII", 0, "abc"),
    ("Cal11 Viet", 0, "ĐIỀU KHOẢN"),
    ("TNR10 Viet", 2, "ĐIỀU KHOẢN"),
    ("TNR10 ASCII", 2, "DIEU KHOAN"),
    ("no cells", None, None),
    ("Arial12 ASCII", 3, "abc"),
    ("Arial12 Viet", 3, "ĐIỀU"),
]
xml_rows = []
for i, (name, s, text) in enumerate(rows):
    r = i + 1
    if s is None:
        xml_rows.append(f'<row r="{r}"/>')
    else:
        xml_rows.append(f'<row r="{r}"><c r="A{r}" s="{s}" t="inlineStr"><is><t>{text}</t></is></c></row>')
sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
         'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" mc:Ignorable="x14ac">'
         + fmt + '<cols><col min="1" max="1" width="40" customWidth="1"/></cols><sheetData>' + "".join(xml_rows) + '</sheetData></worksheet>')
wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>'
rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
root_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
charset = ' <charset val="163"/>' if variant == "dy" else ""
styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4">'
          f'<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/>{charset}<scheme val="minor"/></font>'
          '<font><b/><sz val="14"/><name val="Times New Roman"/><family val="1"/></font>'
          '<font><sz val="10"/><name val="Times New Roman"/><family val="1"/></font>'
          '<font><sz val="12"/><name val="Arial"/><family val="2"/></font></fonts>'
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders>'
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
          '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
path = os.path.join(HERE, f"_dydescent_{variant}.xlsx")
with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", ct); z.writestr("_rels/.rels", root_rels); z.writestr("xl/workbook.xml", wb)
    z.writestr("xl/_rels/workbook.xml.rels", rels); z.writestr("xl/worksheets/sheet1.xml", sheet.encode("utf-8")); z.writestr("xl/styles.xml", styles)
ps = f'''
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {{ $wb = $excel.Workbooks.Open("{path}"); $ws = $wb.Worksheets.Item(1)
  "std " + $ws.StandardHeight
  for ($r = 1; $r -le {len(rows)}; $r++) {{ "{{0}} {{1}}" -f $r, $ws.Rows.Item($r).RowHeight }}
}} finally {{ $wb.Close($false); $excel.Quit() }}
'''
psp = os.path.join(HERE, "_dydescent.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
print("variant", variant)
for line in r.stdout.strip().splitlines():
    if line.startswith("std"):
        print("StandardHeight", float(line.split()[1]) / 0.75, "px"); continue
    idx, pt = line.split(); print(f"{rows[int(idx) - 1][0]:16} -> {float(pt) / 0.75:.2f}px")
print(r.stderr[-300:])
