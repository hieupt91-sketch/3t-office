"""Usage: _page_divergence.py <outdir> <name>  -- diem dau tien canvas va Word lech trang, va cac cap quanh do.
Doc <name>.canvas.jsonl/<name>.word.jsonl + match lai nhu _writer_layout_audit (text prefix)."""
import sys, os, json, re, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
outdir, name = sys.argv[1], sys.argv[2]
def norm(t):
    t = unicodedata.normalize("NFC", (t or "").lower())
    return re.sub(r"[^0-9a-zÀ-ỹ]+", "", t)
w = [json.loads(l) for l in open(os.path.join(outdir, name + ".word.jsonl"), encoding="utf-8") if l.strip()]
c = [json.loads(l) for l in open(os.path.join(outdir, name + ".canvas.jsonl"), encoding="utf-8") if l.strip()][1:]
wrows = [x for x in w if not x["tbl"]]
pairs = []; wi = 0
for cc in c:
    if cc["tag"] == "TABLE" or cc["tables"]: continue
    key = norm(cc["text"])[:24]
    if len(key) < 6: continue
    for j in range(wi, min(wi + 40, len(wrows))):
        if norm(wrows[j]["text"])[:24] == key:
            pairs.append((cc, wrows[j])); wi = j + 1; break
first = next((i for i, (cc, ww) in enumerate(pairs) if cc["page"] != ww["page"]), None)
print("pairs", len(pairs), "first divergence index", first)
# Troi tich luy TRONG trang (px): (C.top - C.top cua cap dau trang) - (W.y - W.y cua cap dau trang)*96/72; in buoc nhay > 4px
if "--drift" in sys.argv:
    page_base = {}
    last_d = None
    for idx, (cc, ww) in enumerate(pairs):
        if cc["page"] != ww["page"]: break
        p = ww["page"]
        if p not in page_base: page_base[p] = (cc["top"], ww["y"]); last_d = 0.0
        d = (cc["top"] - page_base[p][0]) - (ww["y"] - page_base[p][1]) * 96 / 72
        if last_d is None or abs(d - last_d) > 4:
            prev = pairs[idx - 1] if idx > 0 else None
            between = []
            if prev:
                i0 = c.index(prev[0]); i1 = c.index(cc)
                between = [f"{b['tag']} h={b['h']:.0f} {b['text'][:22]!r}" for b in c[i0 + 1:i1]]
            print(f"  p{p} drift {d:+.0f}px (step {d - (last_d or 0):+.0f}) at {cc['text'][:30]!r} | C h={cc['h']:.0f} lines={cc['lines']} mt/mb={cc['mt']:.0f}/{cc['mb']:.0f} | W lines={ww['lines']} sb/sa={ww['sb']}/{ww['sa']} ls={ww['lsRule']}/{ww['ls']} | between: {between[:3]}")
        last_d = d
if first is not None:
    for cc, ww in pairs[max(0, first - 6): first + 3]:
        flag = "<<" if cc["page"] != ww["page"] else "  "
        print(f"{flag} W p{ww['page']} y={ww['y']:.0f} lines={ww['lines']} sb/sa={ww['sb']}/{ww['sa']} ls={ww['lsRule']}/{ww['ls']} | C p{cc['page']} top={cc['top']:.0f} h={cc['h']:.0f} lines={cc['lines']} mt/mb={cc['mt']:.0f}/{cc['mb']:.0f} lh={cc['lh']:.1f} | {cc['text'][:40]!r}")
    # unmatched canvas blocks between the pair before divergence and the divergent one
    prev_c = pairs[first - 1][0] if first > 0 else None
    cur_c = pairs[first][0]
    if prev_c:
        i0 = c.index(prev_c); i1 = c.index(cur_c)
        print("--- canvas blocks between:")
        for blk in c[i0 + 1:i1]:
            print(f"   {blk['tag']} p{blk['page']} top={blk['top']:.0f} h={blk['h']:.0f} tables={blk['tables']} floats={blk['floats']} | {blk['text'][:50]!r}")
