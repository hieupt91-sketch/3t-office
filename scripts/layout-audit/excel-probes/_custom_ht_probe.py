"""Tao xlsx toi thieu voi cac hang customHeight ht khac nhau, mo bang Excel COM, doc RowHeight (pt) -> px."""
import io, zipfile, subprocess, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
hts = [float(v) for v in sys.argv[1:]] or [47.95, 60.6, 37.45, 19.8, 343.45, 299.95, 191.95, 13.8, 17.4, 15.75, 18.74, 12.2, 12.4, 12.5, 12.6, 12.74, 12.76, 13.1, 13.12, 13.13, 13.14, 13.5, 15.1, 15.4, 24.2, 24.4, 24.7, 24.75]
rows = "".join(f'<row r="{i + 1}" ht="{ht}" customHeight="1"><c r="A{i + 1}" t="inlineStr"><is><t>x</t></is></c></row>' for i, ht in enumerate(hts))
sheet = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="15"/><sheetData>{rows}</sheetData></worksheet>'
wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>'
rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
root_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>'
path = os.path.join(HERE, "_custom_ht.xlsx")
with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", ct); z.writestr("_rels/.rels", root_rels); z.writestr("xl/workbook.xml", wb)
    z.writestr("xl/_rels/workbook.xml.rels", rels); z.writestr("xl/worksheets/sheet1.xml", sheet)
ps = f'''
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $true; $excel.DisplayAlerts = $false
try {{ $wb = $excel.Workbooks.Open("{path}"); $ws = $wb.Worksheets.Item(1)
  $excel.ActiveWindow.Zoom = 100; $excel.ActiveWindow.ScrollRow = 1
  $win = $excel.ActiveWindow
  for ($r = 1; $r -le {len(hts)}; $r++) {{
    $y1 = $win.PointsToScreenPixelsY($ws.Rows.Item($r).Top); $y2 = $win.PointsToScreenPixelsY($ws.Rows.Item($r + 1).Top)
    "{{0}} {{1}} {{2}}" -f $r, $ws.Rows.Item($r).RowHeight, ($y2 - $y1)
  }}
}} finally {{ $wb.Close($false); $excel.Quit() }}
'''
psp = os.path.join(HERE, "_custom_ht.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
import math
for line in r.stdout.strip().splitlines():
    idx, pt, px = line.split(); ht = hts[int(idx) - 1]; px_exact = ht * 96 / 72
    print(f"ht {ht:8.3f}pt = {px_exact:8.3f}px -> Excel screen {px}px (RowHeight {pt}pt = {float(pt) / 0.75:6.2f})  floor {math.floor(px_exact)} round {round(px_exact)} ceil {math.ceil(px_exact - 1e-9)}")
print(r.stderr[-500:])
