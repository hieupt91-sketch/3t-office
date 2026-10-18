"""Đọc XLSX: in ghi chú (xl/comments*.xml): ô và nội dung."""
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
for name in z.namelist():
    if re.fullmatch(r"xl/comments\d*\.xml", name):
        x = z.read(name).decode("utf-8")
        for m in re.finditer(r'<comment\b[^>]*ref="([A-Z]+\d+)"[^>]*>([\s\S]*?)</comment>', x):
            print(m.group(1), re.sub(r"<[^>]+>", "", m.group(2)).strip())
