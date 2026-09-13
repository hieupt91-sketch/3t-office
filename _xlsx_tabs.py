"""Usage: python _xlsx_tabs.py <xlsx>... — per file: sheets, tabColor count, tabSelected count"""
import zipfile, re, sys
for f in sys.argv[1:]:
    z = zipfile.ZipFile(f)
    ws = [n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml', n)]
    tabc = sum(1 for n in ws if '<tabColor' in z.read(n).decode())
    sel = sum(1 for n in ws if 'tabSelected="1"' in z.read(n).decode())
    print(f[-24:], 'sheets', len(ws), 'tabColor', tabc, 'tabSelected', sel)
