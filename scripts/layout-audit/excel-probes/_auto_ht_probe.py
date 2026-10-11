"""Hang tu dong (khong customHeight) co ht lon hon noi dung: Excel giu ht hay tinh lai? Cac truong hop wrap/khong wrap, 1 dong/nhieu dong."""
import zipfile, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
cases = [
    ("ht60 no-wrap 1 line", 60, 0, "x"),
    ("ht60 wrap 1 line", 60, 1, "x"),
    ("ht60 wrap newline 2 lines", 60, 1, "a&#10;b"),
    ("ht60 wrap long text wraps", 60, 1, "long long long long long long long long text here"),
    ("ht10 wrap newline 2 lines", 10, 1, "a&#10;b"),
    ("ht10 no-wrap 1 line", 10, 0, "x"),
    ("ht60 wrap empty", 60, 1, ""),
    ("ht60 no cell", 60, None, None),
    ("ht60 wrap 1 line dyDescent", 60, 1, "x"),
]
rows = []
for i, (name, ht, wrap, text) in enumerate(cases):
    r = i + 1
    extra = ' x14ac:dyDescent="0.25"' if "dyDescent" in name else ""
    if wrap is None:
        rows.append(f'<row r="{r}" ht="{ht}"{extra}/>')
    else:
        cell = f'<c r="A{r}" s="{wrap}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>' if text else f'<c r="A{r}" s="{wrap}"/>'
        rows.append(f'<row r="{r}" ht="{ht}"{extra}>{cell}</row>')
sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
         'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" mc:Ignorable="x14ac">'
         '<sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="12" customWidth="1"/></cols><sheetData>' + "".join(rows) + '</sheetData></worksheet>')
wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>'
rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
root_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders>'
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf></cellXfs>'
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
path = os.path.join(HERE, "_auto_ht.xlsx")
with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", ct); z.writestr("_rels/.rels", root_rels); z.writestr("xl/workbook.xml", wb)
    z.writestr("xl/_rels/workbook.xml.rels", rels); z.writestr("xl/worksheets/sheet1.xml", sheet); z.writestr("xl/styles.xml", styles)
ps = f'''
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {{ $wb = $excel.Workbooks.Open("{path}"); $ws = $wb.Worksheets.Item(1)
  for ($r = 1; $r -le {len(cases)}; $r++) {{ "{{0}} {{1}}" -f $r, $ws.Rows.Item($r).RowHeight }}
}} finally {{ $wb.Close($false); $excel.Quit() }}
'''
psp = os.path.join(HERE, "_auto_ht.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
for line in r.stdout.strip().splitlines():
    idx, pt = line.split(); name, ht, wrap, text = cases[int(idx) - 1]
    print(f"{name:32} ht={ht:>3} -> Excel {pt}pt = {float(pt) / 0.75:.1f}px")
print(r.stderr[-400:])
