import zipfile
import re
with zipfile.ZipFile('_rt_lan18.xlsx', 'r') as z:
    with z.open('xl/worksheets/sheet1.xml') as f:
        content = f.read().decode('utf-8', errors='replace')

# Find cell A2
for m in re.finditer(r'<c[^>]*r="A2"[^>]*>', content):
    print('A2:', m.group())

# Find cell A5
for m in re.finditer(r'<c[^>]*r="A5"[^>]*>', content):
    print('A5:', m.group())

# Find cell C5
for m in re.finditer(r'<c[^>]*r="C5"[^>]*>', content):
    print('C5:', m.group())