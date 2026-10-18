"""Đọc XLSX: sheetProtection của trang 1 và cờ protection (locked) của style từng ô A1, B1."""
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
styles = z.read("xl/styles.xml").decode("utf-8")
print("sheetProtection:", re.findall(r"<sheetProtection[^>]*>", sheet))
xfs = re.findall(r"<xf\b[^>]*?(?:/>|>[\s\S]*?</xf>)", re.search(r"<cellXfs\b[\s\S]*?</cellXfs>", styles).group(0))
for ref in ("A1", "B1"):
    cell = re.search(rf'<c\b[^>]*r="{ref}"[^>]*>', sheet)
    m = re.search(r'\bs="(\d+)"', cell.group(0)) if cell else None
    xf = xfs[int(m.group(1))] if m else ""
    print(ref, "xf#" + (m.group(1) if m else "0"), re.findall(r"<protection[^>]*>", xf) or "locked(mặc định)")
