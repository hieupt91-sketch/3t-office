import sys, glob, json, os, collections
outdir = sys.argv[1]
c = collections.Counter()
for p in sorted(glob.glob(os.path.join(outdir, "*.pairs.jsonl"))):
    name = os.path.basename(p).split(".")[0]
    for line in open(p, encoding="utf-8"):
        d = json.loads(line)
        if "line-height" not in d["kinds"] or "w_line_px" not in d: continue
        w, cv = d["word"], d["canvas"]
        factor = round(w["ls"] / 12, 2) if w["lsRule"] == 5 else None
        key = (name, w["font"], w["size"], "rule", w["lsRule"], "x", factor, "wordLine", round(d["w_line_px"]), "cvLine", round(d["c_line_px"]), "cv/word", round(d["c_line_px"] / d["w_line_px"], 2) if d["w_line_px"] else None, "lines", w["lines"])
        c[key] += 1
for k, v in c.most_common(30): print(v, k)
