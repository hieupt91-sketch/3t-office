"""lan12 s1 hang 16 (ht=13.8, TNR 11, Excel 20; StandardHeight 21): ht co la 'nen' khong?"""
import zipfile, subprocess, os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"E:\VN OFice")
from adapters.libreoffice.common import ooxml_zip_patch as z
SRC = r"E:\VN OFice\file test\lan\lan12.xlsx"
entries = z._resolve_xlsx_sheet_entries(open(SRC, "rb").read()); sheet_part = list(entries.values())[0]
variants = {
    "asis": lambda x: x,
    "r16_ht30": lambda x: x.replace('<row r="16" spans="1:5" ht="13.8">', '<row r="16" spans="1:5" ht="30">'),
    "r16_noht": lambda x: x.replace('<row r="16" spans="1:5" ht="13.8">', '<row r="16" spans="1:5">'),
    "r16_ht16": lambda x: x.replace('<row r="16" spans="1:5" ht="13.8">', '<row r="16" spans="1:5" ht="16">'),
}
xml0 = zipfile.ZipFile(SRC).read(sheet_part).decode("utf-8")
print(re.search(r'<row r="16"[^>]*>', xml0).group(0), "|", re.search(r'<row r="15"[^>]*>', xml0).group(0))
for name, fn in variants.items():
    out = os.path.join(HERE, f"_l12_{name}.xlsx")
    zin = zipfile.ZipFile(SRC)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == sheet_part:
                data = fn(data.decode("utf-8")).encode("utf-8")
            zout.writestr(item, data)
    ps = f'''
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {{ $wb = $excel.Workbooks.Open("{out}"); $ws = $wb.Worksheets.Item(1)
  "std {{0}} r15 {{1}} r16 {{2}}" -f $ws.StandardHeight, $ws.Rows.Item(15).RowHeight, $ws.Rows.Item(16).RowHeight
}} finally {{ $wb.Close($false); $excel.Quit() }}
'''
    psp = os.path.join(HERE, "_l12.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
    print(f"{name:10} {r.stdout.strip()} {r.stderr.strip()[-100:]}")
