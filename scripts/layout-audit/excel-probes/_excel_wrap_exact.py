"""Tim be rong kha dung chinh xac (theo GDI px) cua o boc chu Excel: sinh chuoi co be rong GDI tang dan 1px,
hoi Excel (1 lan mo, nhieu chuoi) chuoi nao con 1 dong. Usage: _excel_wrap_exact.py <font> <pt> <colPx> [<font> <pt> <colPx> ...]"""
import sys, subprocess, json, os
sys.path.insert(0, r"E:\VN OFice\scripts\layout-audit")
from _gdi_text_width import gdi_width

HERE = os.path.dirname(os.path.abspath(__file__))
PS = os.path.join(HERE, "_excel_wrap_lines.ps1")
args = sys.argv[1:]
jobs = [(args[i], float(args[i + 1]), float(args[i + 2])) for i in range(0, len(args), 3)]
for font, pt, colpx in jobs:
    px = pt * 96 / 72
    units = {ch: gdi_width(font, px, ch) for ch in "Wi1.lI:"}
    tail = gdi_width(font, px, " X")
    # sinh chuoi voi be rong tong (GDI) tu colpx-24 den colpx-2, moi px mot chuoi neu duoc
    target_texts = {}
    lo, hi = int(colpx - 26), int(colpx - 1)
    import itertools
    ws = sorted(set(int(v) for v in units.values() if v > 0))
    chars_by_w = {int(v): k for k, v in units.items()}
    for total in range(lo, hi + 1):
        body = total - int(tail)
        found = None
        # tim to hop a*W + b*i + c*(.) ... = body bang tham lam
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
            text = found + " X"
            assert abs(gdi_width(font, px, text) - total) < 0.5, (text, gdi_width(font, px, text), total)
            target_texts[total] = text
    payload = json.dumps({"font": font, "pt": pt, "colPx": colpx, "texts": target_texts}, ensure_ascii=False)
    tmp = os.path.join(HERE, "_wrap_job.json")
    open(tmp, "w", encoding="utf-8").write(payload)
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS, "-JobPath", tmp], capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(r.stderr.strip()[-300:] if r.stderr.strip() else "", end="")
    res = json.loads(r.stdout.strip().splitlines()[-1])
    fits = [int(k) for k, v in res["lines"].items() if v == 1]
    wraps = [int(k) for k, v in res["lines"].items() if v > 1]
    print(f"{font} {pt}pt col {colpx}px: max fit GDI width {max(fits) if fits else None}, min wrap {min(wraps) if wraps else None} -> margin {colpx - max(fits) if fits else None} .. {colpx - min(wraps) if wraps else None}; actualCol {res['actual']}")
