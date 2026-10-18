"""Đọc XLSX: liệt kê x14:sparklineGroup (type, ô đích, vùng dữ liệu) của mọi trang."""
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
for name in sorted(n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)):
    xml = z.read(name).decode("utf-8", "replace")
    for group in re.findall(r"<x14:sparklineGroup\b.*?</x14:sparklineGroup>", xml, re.S):
        head = re.match(r"<x14:sparklineGroup\b([^>]*)>", group).group(1)
        kind = (re.search(r'\btype="([^"]+)"', head) or [None, "line(mặc định)"])[1]
        cells = re.findall(r"<xm:f>([^<]*)</xm:f><xm:sqref>([^<]*)</xm:sqref>", group)
        print(name, "type=" + kind, cells)
