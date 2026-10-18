"""Đọc XLSX do VN Sheet lưu: in ra printOptions, pageSetup (pageOrder, blackAndWhite, cellComments) của trang tính đầu."""
import re
import sys
import zipfile

path = sys.argv[1]
x = zipfile.ZipFile(path).read("xl/worksheets/sheet1.xml").decode("utf-8")
for tag in ("printOptions", "pageSetup"):
    for m in re.finditer(rf"<{tag}\b[^>]*/?>", x):
        print(m.group(0))
