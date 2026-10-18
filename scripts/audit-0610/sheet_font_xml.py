"""Đọc XLSX: với 4 ô đầu hàng 1 in phông của từng ô (u, strike, vertAlign) từ styles.xml."""
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
styles = z.read("xl/styles.xml").decode("utf-8")
sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
fonts = re.findall(r"<font\b[\s\S]*?</font>|<font\s*/>", re.search(r"<fonts\b[\s\S]*?</fonts>", styles).group(0))
xfs = re.findall(r"<xf\b[^>]*?(?:/>|>[\s\S]*?</xf>)", re.search(r"<cellXfs\b[\s\S]*?</cellXfs>", styles).group(0))
for ref in ("A1", "B1", "C1", "D1"):
    cell = re.search(rf'<c\b[^>]*r="{ref}"[^>]*>', sheet)
    style_id = int(re.search(r'\bs="(\d+)"', cell.group(0)).group(1)) if cell and re.search(r'\bs="(\d+)"', cell.group(0)) else 0
    font_id = int(re.search(r'fontId="(\d+)"', xfs[style_id]).group(1))
    f = fonts[font_id]
    print(ref, "u=" + (re.search(r'<u(?:\s+val="([^"]+)")?\s*/>', f).group(1) or "single") if re.search(r"<u\b", f) else "u=-", "strike" if "<strike" in f else "-", "vert=" + (re.search(r'<vertAlign val="([^"]+)"', f).group(1) if "<vertAlign" in f else "-"))
