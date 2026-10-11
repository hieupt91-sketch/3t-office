"""StandardHeight cua Excel lay tu dau? Bien the tren ban sao lan05 (sheet 1): doc StandardHeight + hang 85/86 (TNR 10 rong)."""
import zipfile, subprocess, os, sys, re, shutil, io
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"E:\VN OFice\file test\lan\lan05.xlsx"
sys.path.insert(0, r"E:\VN OFice")
from adapters.libreoffice.common import ooxml_zip_patch as z
entries = z._resolve_xlsx_sheet_entries(open(SRC, "rb").read())
sheet_part = list(entries.values())[0]
variants = {
    "noColA": lambda x: x.replace('<col min="1" max="1" width="5" style="1" customWidth="1"/>', ''),
    "colA_style14": lambda x: x.replace('<col min="1" max="1" width="5" style="1"', '<col min="1" max="1" width="5" style="14"'),
    "colA_min2": lambda x: x.replace('<col min="1" max="1" width="5" style="1"', '<col min="1" max="2" width="5" style="1"').replace('<col min="2" max="2" width="8.26953125" style="2" customWidth="1"/>', ''),
}
for name, fn in variants.items():
    out = os.path.join(HERE, f"_std_{name}.xlsx")
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
  "std {{0}} r85 {{1}} r86 {{2}} r84 {{3}} r150 {{4}}" -f $ws.StandardHeight, $ws.Rows.Item(85).RowHeight, $ws.Rows.Item(86).RowHeight, $ws.Rows.Item(84).RowHeight, $ws.Rows.Item(150).RowHeight
}} finally {{ $wb.Close($false); $excel.Quit() }}
'''
    psp = os.path.join(HERE, "_std.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
    print(f"{name:12} {r.stdout.strip()} {r.stderr.strip()[-100:]}")
