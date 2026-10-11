"""StandardHeight: bien the tren lan12/lan19 sheet 1."""
import zipfile, subprocess, os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"E:\VN OFice")
from adapters.libreoffice.common import ooxml_zip_patch as z
jobs = {
    "lan12": {
        "asis": lambda x: x,
        "drh15": lambda x: x.replace('defaultRowHeight="15.6"', 'defaultRowHeight="15"'),
        "colA0": lambda x: x.replace('<col min="1" max="1" width="6" style="68"', '<col min="1" max="1" width="6" style="0"'),
        "nocols": lambda x: re.sub(r"<cols>.*?</cols>", "", x, flags=re.S),
    },
    "lan19": {
        "asis": lambda x: x,
        "drh20": lambda x: x.replace('defaultRowHeight="14.5"', 'defaultRowHeight="20"'),
        "colA0": lambda x: x.replace('<col min="1" max="1" width="6.6328125" style="46"', '<col min="1" max="1" width="6.6328125" style="0"'),
    },
}
for stem, variants in jobs.items():
    SRC = r"E:\VN OFice\file test\lan\%s.xlsx" % stem
    entries = z._resolve_xlsx_sheet_entries(open(SRC, "rb").read()); sheet_part = list(entries.values())[0]
    for name, fn in variants.items():
        out = os.path.join(HERE, f"_std2_{stem}_{name}.xlsx")
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
  "std {{0}} r15 {{1}} r16 {{2}} r17 {{3}} r18 {{4}} r24 {{5}}" -f $ws.StandardHeight, $ws.Rows.Item(15).RowHeight, $ws.Rows.Item(16).RowHeight, $ws.Rows.Item(17).RowHeight, $ws.Rows.Item(18).RowHeight, $ws.Rows.Item(24).RowHeight
}} finally {{ $wb.Close($false); $excel.Quit() }}
'''
        psp = os.path.join(HERE, "_std2.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
        r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
        print(f"{stem} {name:8} {r.stdout.strip()} {r.stderr.strip()[-100:]}")
