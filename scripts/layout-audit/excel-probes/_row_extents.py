"""In cac o (explicit/implicit) va metrics cua mot hang: _row_extents.py <lanNN> <sheetIndex> <row>"""
import sys, re
sys.path.insert(0, r"E:\VN OFice")
from adapters.libreoffice.common import ooxml_zip_patch as z
stem, si, r = sys.argv[1], int(sys.argv[2]), sys.argv[3]
d = open(r"E:\VN OFice\file test\lan\%s.xlsx" % stem, "rb").read()
fonts, xfs = z._xlsx_cell_fonts(d)
normal = z._extract_normal_font_from_xlsx(d)
print("Normal", normal["name"], normal["size"], z._excel_font_metrics(normal["name"], normal["size"], normal.get("bold")))
ents = list(z._resolve_xlsx_sheet_entries(d).items()); xml = z._unprefix_spreadsheetml(z.read_zip_entry(d, ents[si][1]).decode("utf-8"))
for cm in re.finditer(r"<col\b([^>]*)/?>", xml):
    a = cm.group(1); s = re.search(r'style="(\d+)"', a); f = fonts[xfs[int(s.group(1))]["fontId"]] if s else normal
    print("  col", re.search(r'min="(\d+)"', a).group(1), "-", re.search(r'max="(\d+)"', a).group(1), f["name"], f["size"], "b" if f["bold"] else "", z._excel_font_metrics(f["name"], f["size"], f["bold"], f.get("italic", False)))
m = re.search(r'<row\b([^>]*\br="%s"[^>]*?)(?:/>|>(.*?)</row>)' % r, xml, re.S)
attrs, body = m.group(1), m.group(2) or ""
print("row", re.sub(r'spans="[^"]*"\s*', "", attrs).strip())
rs = re.search(r'\bs="(\d+)"', attrs)
if rs:
    f = fonts[xfs[int(rs.group(1))]["fontId"]]; print("  row style font", f, z._excel_font_metrics(f["name"], f["size"], f["bold"], f.get("italic", False)))
for cm in re.finditer(r"<c\b([^>]*?)(?:/>|>(.*?)</c>)", body, re.S):
    ca, cb = cm.group(1), cm.group(2) or ""
    s = re.search(r'\bs="(\d+)"', ca); xf = xfs[int(s.group(1))] if s else xfs[0]; f = fonts[xf["fontId"]]
    coord = re.search(r'\br="([A-Z]+\d+)"', ca).group(1)
    print("  ", coord, f["name"], f["size"], "b" if f["bold"] else "", "i" if f.get("italic") else "", "W" if xf["wrap"] else "", "*" if re.search(r"<(?:v|is)\b", cb) else "", z._excel_font_metrics(f["name"], f["size"], f["bold"], f.get("italic", False)))
