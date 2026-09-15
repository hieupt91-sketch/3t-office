"""Usage: python _writer_layout_audit.py <worktree> <docdir> <outdir> [names...]
Bo do chuan Writer: voi moi .docx lay so do TUNG DOAN tu Word 2016 COM (_word_para_metrics.ps1) va tu canvas app that
(_canvas_para_metrics.py), ghep doan theo van ban, phan loai nguyen nhan lech, gom thanh ma tran loai-loi x file.
Viet <outdir>/_writer_layout_matrix.md va <outdir>/<name>.pairs.jsonl. Word/canvas metrics duoc cache theo ten file."""
import os, sys, subprocess, json, glob, re, unicodedata, collections
ROOT, DOCDIR, OUTDIR = [os.path.abspath(a) for a in sys.argv[1:4]]
names = sys.argv[4:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(DOCDIR, "*.docx")))
SP = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)
PT2PX = 96 / 72

def norm(t):
    t = unicodedata.normalize("NFC", t or "").lower()
    return re.sub(r"[^0-9a-z\u00c0-\u1ef9]+", "", t)

def word_metrics(docx, out):
    if not os.path.exists(out):
        r = subprocess.run(["powershell", "-NoProfile", "-Command", "& '%s' -File '%s' -Out '%s'" % (os.path.join(SP, "_word_para_metrics.ps1"), docx, out)], capture_output=True, text=True, timeout=900)
        if not os.path.exists(out): return None, (r.stdout + r.stderr).strip()[:120]
    return [json.loads(l) for l in open(out, encoding="utf-8") if l.strip()], ""

def canvas_metrics(docx, out):
    if not os.path.exists(out):
        r = subprocess.run([sys.executable, os.path.join(SP, "_canvas_para_metrics.py"), ROOT, docx, out], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=1500, cwd=ROOT)
        if not os.path.exists(out): return None, None, (r.stdout + r.stderr).strip()[-200:]
    lines = [json.loads(l) for l in open(out, encoding="utf-8") if l.strip()]
    return lines[0]["meta"], lines[1:], ""

def match(word_rows, canvas_rows):
    """Greedy in-order match of non-table paragraphs by normalized text prefix (>= 6 chars)."""
    pairs = []; wi = 0
    wrows = [w for w in word_rows if not w["tbl"]]
    for c in canvas_rows:
        if c["tag"] == "TABLE" or c["tables"]: continue
        key = norm(c["text"])[:24]
        if len(key) < 6: continue
        for j in range(wi, min(wi + 40, len(wrows))):
            if norm(wrows[j]["text"])[:24] == key:
                pairs.append((c, wrows[j])); wi = j + 1; break
    return pairs

def classify(pairs, canvas_rows, word_rows):
    """Per matched pair: compare line count, line pitch (height/lines), spacing to the next matched paragraph, page."""
    kinds = collections.Counter(); details = []
    idx_c = {id(c): k for k, c in enumerate(canvas_rows)}
    by_i = {w["i"]: w for w in word_rows}
    for n, (c, w) in enumerate(pairs):
        tags = []
        c_lines = c["lines"] if c["lines"] and c["lines"] > 0 else (round(c["h"] / c["lh"]) if c["lh"] else 1)
        if c_lines != w["lines"]:
            tags.append("wrap")  # so dong gay khac -> font thay the / do rong / tab
        else:
            c_line_px = c["h"] / max(1, c_lines); w_line_px = None
            # Word: chieu cao doan = y(next) - y - spacing; chi do duoc khi doan ke tiep cung trang
            nxt = by_i.get(w["i"] + 1)
            if nxt and nxt["page"] == w["page"] and nxt["y"] > w["y"]:
                w_para_px = (nxt["y"] - w["y"]) * PT2PX - max(w["sa"], nxt["sb"]) * PT2PX
                w_line_px = w_para_px / max(1, w["lines"])
                if abs(w_line_px - c_line_px) > 1.5: tags.append("line-height")
        # spacing to the next matched pair (same page both sides)
        if n + 1 < len(pairs):
            c2, w2 = pairs[n + 1]
            if w2["page"] == w["page"] and c2["page"] == c["page"] and w2["i"] == w["i"] + 1 and idx_c[id(c2)] == idx_c[id(c)] + 1:
                c_pitch = c2["top"] - c["top"]; w_pitch = (w2["y"] - w["y"]) * PT2PX
                if "wrap" not in tags and "line-height" not in tags and abs(c_pitch - w_pitch) > 2.5: tags.append("spacing")
        if c["font"].lower() != (w["font"] or "").lower(): tags.append("font-name")
        if w["size"] and w["size"] < 1000 and abs(c["size"] - w["size"] * PT2PX) > 0.6: tags.append("font-size")
        if c["page"] != w["page"]: tags.append("page")
        for t in tags: kinds[t] += 1
        if tags: details.append({"kinds": tags, "canvas": {k: c[k] for k in ("i", "page", "h", "lines", "lh", "font", "size", "mt", "mb")}, "word": {k: w[k] for k in ("i", "page", "y", "lines", "sb", "sa", "lsRule", "ls", "font", "size")}, "text": c["text"]})
    # Drift: within a Word page, canvas offset from the page's first matched paragraph vs Word's. A jump > 8px between
    # consecutive pairs points at the unmatched blocks in between (table, image, empty paragraphs, floats).
    anchor = None; prev = None
    for c, w in pairs:
        if anchor is None or w["page"] != anchor[1]["page"] or c["page"] != anchor[0]["page"]:
            anchor = (c, w); prev = (c, w, 0.0); continue
        drift = (c["top"] - anchor[0]["top"]) - (w["y"] - anchor[1]["y"]) * PT2PX
        if abs(drift - prev[2]) > 8:
            between = [b for b in canvas_rows if idx_c[id(prev[0])] < idx_c[id(b)] < idx_c[id(c)]]
            cause = "table" if any(b["tag"] == "TABLE" or b["tables"] for b in between) else ("float" if any(b["floats"] for b in between) else ("empty-para" if between else "unknown"))
            kinds["drift:" + cause] += 1
            details.append({"kinds": ["drift:" + cause], "drift_px": round(drift - prev[2], 1), "between": [{"tag": b["tag"], "h": b["h"], "text": b["text"][:30]} for b in between][:6], "text": c["text"]})
        prev = (c, w, drift)
    return kinds, details

matrix = {}; per_file = {}
for name in names:
    docx = os.path.join(DOCDIR, name); base = os.path.splitext(name)[0]
    wrows, werr = word_metrics(docx, os.path.join(OUTDIR, base + ".word.jsonl"))
    if wrows is None: per_file[name] = {"error": "word: " + werr}; print(name, "WORD FAIL", werr, flush=True); continue
    meta, crows, cerr = canvas_metrics(docx, os.path.join(OUTDIR, base + ".canvas.jsonl"))
    if crows is None: per_file[name] = {"error": "canvas: " + cerr}; print(name, "CANVAS FAIL", cerr, flush=True); continue
    pairs = match(wrows, crows)
    kinds, details = classify(pairs, crows, wrows)
    tables_c = sum(1 for c in crows if c["tag"] == "TABLE"); floats_c = sum(c["floats"] for c in crows)
    wpages = max((w["page"] for w in wrows), default=0); cpages = max((c["page"] for c in crows), default=0)
    per_file[name] = {"word_pages": wpages, "canvas_pages": cpages, "paras_word": len(wrows), "blocks": len(crows), "matched": len(pairs), "kinds": dict(kinds), "tables": tables_c, "floats": floats_c}
    matrix[name] = kinds
    with open(os.path.join(OUTDIR, base + ".pairs.jsonl"), "w", encoding="utf-8") as f:
        for d in details: f.write(json.dumps(d, ensure_ascii=False) + "\n")
    print(name, "word", wpages, "canvas", cpages, "matched", len(pairs), dict(kinds), flush=True)

all_kinds = sorted({k for v in matrix.values() for k in v}, key=lambda k: -sum(v[k] for v in matrix.values()))
with open(os.path.join(OUTDIR, "_writer_layout_matrix.md"), "w", encoding="utf-8") as f:
    f.write("| file | Word pages | canvas pages | matched paras | " + " | ".join(all_kinds) + " |\n|---|---:|---:|---:|" + "---:|" * len(all_kinds) + "\n")
    for name, info in per_file.items():
        if "error" in info: f.write(f"| {name} | {info['error']} |\n"); continue
        f.write(f"| {name} | {info['word_pages']} | {info['canvas_pages']} | {info['matched']} | " + " | ".join(str(info['kinds'].get(k, 0)) for k in all_kinds) + " |\n")
    f.write("\n| kind | files affected | total paragraphs |\n|---|---:|---:|\n")
    for k in all_kinds:
        f.write(f"| {k} | {sum(1 for v in matrix.values() if v.get(k))} | {sum(v.get(k, 0) for v in matrix.values())} |\n")
print("matrix:", os.path.join(OUTDIR, "_writer_layout_matrix.md"))
