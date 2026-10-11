import sys, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"E:\VN OFice\scripts\layout-audit")
from _gdi_text_width import gdi_width

def texts_for(font, px, colpx):
    units = {ch: gdi_width(font, px, ch) for ch in "Wi1.lI:"}
    tail = gdi_width(font, px, " X")
    ws = sorted(set(int(v) for v in units.values() if v > 0))
    chars_by_w = {int(v): k for k, v in units.items()}
    out = {}
    for total in range(int(colpx - 26), int(colpx)):
        body = total - int(tail); found = None
        for a in range(body // ws[-1], -1, -1):
            rest = body - a * ws[-1]
            for b in range(rest // ws[0] + 1):
                r2 = rest - b * ws[0]
                if r2 == 0:
                    found = chars_by_w[ws[-1]] * a + chars_by_w[ws[0]] * b; break
                for w in ws[1:-1]:
                    if r2 % w == 0:
                        found = chars_by_w[ws[-1]] * a + chars_by_w[ws[0]] * b + chars_by_w[w] * (r2 // w); break
                if found: break
            if found: break
        if found is not None:
            out[total] = found + " X"
    return out

cw = json.load(open(os.path.join(HERE, "_cw_probe.json"), encoding="utf-8-sig"))
def nat(font, size, text, bold=False):
    t = cw[font][str(size)]["b" if bold else "r"]
    return sum(t[str(ord(c))] for c in text)
data = [("Times New Roman", 15, 200, 187, 188), ("Times New Roman", 15, 300, 283, 284), ("Times New Roman", 12, 120, 112, 113),
        ("Arial", 10, 100, 92, 93), ("Times New Roman", 10, 150, 140, 141), ("Calibri", 11, 64, 57, 58),
        ("Times New Roman", 15, 64, 55, 56), ("Times New Roman", 15, 100, 90, 91), ("Times New Roman", 15, 150, 139, 140),
        ("Times New Roman", 15, 400, 380, 381), ("Calibri", 11, 200, 189, 190), ("Calibri", 11, 300, 285, 286),
        ("Times New Roman", 12, 300, 285, 286), ("Times New Roman", 18, 300, 283, 284)]
for font, pt, colpx, fit, wrap in data:
    texts = texts_for(font, pt * 96 / 72, colpx)
    tf, tw = texts[fit], texts[wrap]
    nf, nw = nat(font, pt, tf), nat(font, pt, tw)
    print(f"{font:16} {pt:>2}pt col {colpx:>3}: natural fit {nf:7.2f} wrap {nw:7.2f} -> margin in ({colpx - nw:.2f}, {colpx - nf:.2f}]   fit={tf!r} wrap={tw!r}")
