"""Đọc XLSX: liệt kê hình (xdr:sp) trong các bản vẽ của từng trang: tên, prstGeom, màu nền/viền, có dấu VN Sheet không."""
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
for name in sorted(n for n in z.namelist() if re.fullmatch(r"xl/drawings/drawing\d+\.xml", n)):
    xml = z.read(name).decode("utf-8", "replace")
    for sp in re.findall(r"<xdr:sp\b.*?</xdr:sp>", xml, re.S):
        print(name,
              "name=" + (re.search(r'<xdr:cNvPr[^>]*name="([^"]*)"', sp) or [None, "-"])[1],
              "prst=" + (re.search(r'prst="([^"]+)"', sp) or [None, "-"])[1],
              "fill=" + (re.search(r"<a:solidFill><a:srgbClr val=\"([0-9A-Fa-f]{6})\"", sp) or [None, "-"])[1],
              "vno=" + str("{6E4F0C21-7B1A-4F3C-9D55-566E4F53484D}" in sp),
              "txBox=" + str('txBox="1"' in sp))
