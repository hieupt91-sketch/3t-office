"""Usage: _wrap_class.py <outdir> [kind]  -- group pairs containing a kind by measured features."""
import sys, glob, json, os, collections
outdir = sys.argv[1]; kind = sys.argv[2] if len(sys.argv) > 2 else "wrap"
rows = []
for p in sorted(glob.glob(os.path.join(outdir, "*.pairs.jsonl"))):
    for line in open(p, encoding="utf-8"):
        try: d = json.loads(line)
        except Exception: continue
        if kind in (d.get("kinds") or []):
            d["_file"] = os.path.basename(p).split(".")[0]; rows.append(d)
print("pairs:", len(rows))
c = collections.Counter(); byfile = collections.Counter()
for d in rows:
    w = d["word"]; cv = d["canvas"]
    byfile[d["_file"]] += 1
    if kind == "wrap":
        key = (w.get("font"), w.get("size"), "word", w.get("lines"), "canvas", cv.get("lines"), "len", (len(d.get("text", "")) // 40) * 40)
    else:
        ratio = round((cv.get("lh") or 0) / ((w.get("ls") or 1) * 96 / 72), 2) if w.get("ls") else None
        key = (w.get("font"), w.get("size"), "lsRule", w.get("lsRule"), "ls", w.get("ls"), "canvas lh", round(cv.get("lh") or 0, 1), "cv size", round(cv.get("size") or 0, 1), "ratio", ratio)
    c[key] += 1
print(dict(byfile))
for k, v in c.most_common(25): print(v, k)
