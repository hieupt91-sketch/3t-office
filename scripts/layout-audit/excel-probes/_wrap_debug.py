"""Debug ngat dong Python cho 1 o: _wrap_debug.py <xlsx> <sheetIndex> <coord>"""
import sys, re, json
sys.path.insert(0, r"E:\VN OFice")
from adapters.libreoffice.common import ooxml_zip_patch as z
path, si, coord = sys.argv[1], int(sys.argv[2]), sys.argv[3]
data = open(path, "rb").read()
ents = list(z._resolve_xlsx_sheet_entries(data).items())
xml = z.read_zip_entry(data, ents[si][1]).decode("utf-8")
fonts, xfs = z._xlsx_cell_fonts(data)
plain, rich = z._xlsx_shared_strings(data)
m = re.search(r'<c\b([^>]*\br="%s"[^>]*?)(?:/>|>(.*?)</c>)' % coord, xml, re.S)
attrs, body = m.group(1), m.group(2) or ""
s = re.search(r'\bs="(\d+)"', attrs); xf = xfs[int(s.group(1))] if s else xfs[0]
font = fonts[xf["fontId"]]
print("font", font, "wrap", xf["wrap"])
runs = z._xlsx_wrap_cell_runs(attrs, body, rich, font)
if not runs:
    text = z._xlsx_wrap_cell_text(attrs, body, plain)
    runs = [{"t": text, "h": z._excel_font_line_heights(font["name"], font["size"], font["bold"]), "f": dict(font, italic=False)}]
col = re.match(r"[A-Z]+", coord).group(0)
digit = z._extract_default_font_digit_width(data)
colm = None
for cm in re.finditer(r"<col\b([^>]*)/?>", xml):
    a = cm.group(1); w = re.search(r'width="([\d.]+)"', a); mn = int(re.search(r'min="(\d+)"', a).group(1)); mx = int(re.search(r'max="(\d+)"', a).group(1))
    if mn <= z._column_index(col) <= mx and w: colm = float(w.group(1))
import math
colpx = math.floor(((256 * colm + math.floor(128 / digit)) / 256) * digit + 1e-6) if colm else None
print("col", col, "chars", colm, "px", colpx, "mdw", digit)
measured = []
for r in runs:
    nat = z._excel_natural_widths(r["f"]["name"], r["f"]["size"], r["f"]["bold"])
    measured.append({"t": r["t"], "w": nat[0], "h": r["h"], "m": nat[1]})
avail = colpx - measured[0]["m"]
print("avail", avail, "margin", measured[0]["m"])
lines = z._excel_wrap_lines(measured, avail)
# in tung dong voi be rong
chars = []
for i, r in enumerate(measured):
    for ch in r["t"]:
        chars.append((ch, 0.0 if ch == "\n" else float(r["w"].get(str(ord(ch)), -1)), i))
# tai dung thuat toan de in noi dung dong
line, total, last_break, idx, out = [], 0.0, -1, 0, []
while idx < len(chars):
    ch, w, ri = chars[idx]
    if ch == "\n":
        line.append(chars[idx]); out.append(line); line, total, last_break = [], 0.0, -1; idx += 1; continue
    if line and ch != " " and total + w > avail + 1e-6:
        if last_break > 0:
            out.append(line[:last_break]); idx -= len(line) - last_break
        else:
            out.append(line)
        line, total, last_break = [], 0.0, -1; continue
    line.append(chars[idx]); total += w
    if ch == " ": last_break = len(line)
    idx += 1
out.append(line)
for i, l in enumerate(out):
    txt = "".join(c[0] for c in l).replace("\n", "⏎")
    print(f"{i + 1:2} {sum(c[1] for c in l):7.2f} | {txt}")
print("height", z._excel_wrapped_row_height(measured, avail))
