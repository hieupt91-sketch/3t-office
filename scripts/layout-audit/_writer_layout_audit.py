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
    wrows = [w for w in word_rows if not w["tbl"] and w.get("zone", "body") == "body"]
    for c in canvas_rows:
        if c["tag"] == "TABLE" or c["tables"]: continue
        key = norm(c["text"])[:24]
        if len(key) < 6: continue
        for j in range(wi, min(wi + 40, len(wrows))):
            if norm(wrows[j]["text"])[:24] == key:
                pairs.append((c, wrows[j])); wi = j + 1; break
    return pairs

def theme_fonts(docx):
    """+Headings/+Body trong Word COM (Font.NameOther) = font major/minor cua theme1.xml."""
    import zipfile
    try:
        t = zipfile.ZipFile(docx).read("word/theme/theme1.xml").decode("utf-8", "replace")
    except Exception:
        return {}
    # W12b: tài liệu tiếng Việt (docDefaults w:lang="vi") → Word dùng <a:font script="Viet"> (TNR/Arial), không phải latin
    try:
        styles = zipfile.ZipFile(docx).read("word/styles.xml").decode("utf-8", "replace")
    except Exception:
        styles = ""
    lang = re.search(r"<w:rPrDefault>.*?<w:lang\b[^>]*w:val=\"([^\"]*)\"", styles, re.S)
    vietnamese = bool(lang and lang.group(1).lower().startswith("vi"))
    def pick(kind):
        block = re.search(rf"<a:{kind}>(.*?)</a:{kind}>", t, re.S)
        if not block: return ""
        latin = re.search(r'<a:latin\b[^>]*typeface="([^"]*)"', block.group(1))
        viet = re.search(r'<a:font\b[^>]*script="Viet"[^>]*typeface="([^"]*)"', block.group(1))
        return ((viet.group(1) if vietnamese and viet else (latin.group(1) if latin else ""))).lower()
    return {"+headings": pick("majorFont"), "+body": pick("minorFont")}

def contextual_spacing_from_docx(docx, word_rows):
    """Word COM NoSpaceBetweenParagraphsOfSameStyle trả False dù style có <w:contextualSpacing/> (đo d09: List
    Paragraph, Word bỏ space-after 10pt giữa các đoạn cùng style → 43 cặp bị gán nhầm 'line-height'). Đọc thẳng
    OOXML: style chain (basedOn) hoặc pPr của đoạn có contextualSpacing → đặt w['nsb'] = True (khớp theo chữ)."""
    import zipfile
    try:
        z = zipfile.ZipFile(docx)
        styles = z.read("word/styles.xml").decode("utf-8", "replace")
        doc = z.read("word/document.xml").decode("utf-8", "replace")
    except Exception:
        return
    style_ctx = {}; based = {}
    for m in re.finditer(r'<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>(.*?)</w:style>', styles, re.S):
        sid, body = m.group(1), m.group(2)
        ppr = re.search(r"<w:pPr>.*?</w:pPr>", body, re.S)
        style_ctx[sid] = bool(ppr and "<w:contextualSpacing" in ppr.group(0))
        b = re.search(r'<w:basedOn w:val="([^"]+)"', body); based[sid] = b.group(1) if b else None
    def ctx(sid, depth=0):
        if not sid or sid not in style_ctx or depth > 12: return False
        return style_ctx[sid] or ctx(based.get(sid), depth + 1)
    by_text = {}
    for pm in re.finditer(r"<w:p\b[^>]*>(.*?)</w:p>", doc, re.S):
        body = pm.group(1)
        ppr = re.search(r"<w:pPr>(.*?)</w:pPr>", body, re.S)
        pp = ppr.group(1) if ppr else ""
        sid = re.search(r'<w:pStyle w:val="([^"]+)"', pp)
        own = "<w:contextualSpacing" in pp and 'w:val="0"' not in (re.search(r"<w:contextualSpacing[^>]*>", pp) or re.match("", "")).group(0)
        flag = own or ctx(sid.group(1) if sid else "Normal")
        text = norm("".join(re.findall(r"<w:t\b[^>]*>([^<]*)</w:t>", body)))[:24]
        if len(text) >= 6 and text not in by_text: by_text[text] = flag
    for w in word_rows:
        key = norm(w.get("text", ""))[:24]
        if key in by_text and by_text[key]: w["nsb"] = True

def classify(pairs, canvas_rows, word_rows, themes=None):
    """Per matched pair: compare line count, line pitch (height/lines), spacing to the next matched paragraph, page."""
    kinds = collections.Counter(); details = []
    idx_c = {id(c): k for k, c in enumerate(canvas_rows)}
    by_i = {w["i"]: w for w in word_rows}
    for n, (c, w) in enumerate(pairs):
        tags = []
        c_lines = c["lines"] if c["lines"] and c["lines"] > 0 else (round(c["h"] / c["lh"]) if c["lh"] else 1)
        if c_lines != w["lines"]:
            tags.append("wrap")  # so dong gay khac -> font thay the / do rong / tab
        # Chỉ so khi hai đoạn KẾ TIẾP NHAU ở cả Word lẫn canvas và cùng trang: pitch (đỉnh→đỉnh) phải bằng nhau.
        # Word không cho đo chiều cao đoạn trực tiếp; pitch − khoảng cách đoạn (MAX(sa, sb kế)) = chiều cao đoạn.
        if n + 1 < len(pairs) and "wrap" not in tags:
            c2, w2 = pairs[n + 1]
            # Đoạn trong BẢNG: Word trả y của ô (các ô cùng hàng cùng y) nên pitch đoạn→đoạn không phải chiều cao
            # đoạn (d09: 43 cặp "line-height" giả, Word 9–10 px/dòng cho chữ 13pt). Bảng đo riêng (drift:table, wrap).
            in_table = bool(w.get("tbl")) or bool(w2.get("tbl"))
            if not in_table and w2["page"] == w["page"] and c2["page"] == c["page"] and w2["i"] == w["i"] + 1 and idx_c[id(c2)] == idx_c[id(c)] + 1:
                c_pitch = c2["top"] - c["top"]; w_pitch = (w2["y"] - w["y"]) * PT2PX
                if abs(c_pitch - w_pitch) > 2.5:
                    # contextualSpacing: hai doan cung style co "khong cach doan cung kieu" -> Word bo sa/sb giua chung
                    contextual = w.get("nsb") and w2.get("nsb") and w.get("style") == w2.get("style")
                    w_para_px = w_pitch - (0 if contextual else max(w["sa"], w2["sb"]) * PT2PX)
                    # Canvas đo được chiều cao khối trực tiếp (h); pitch − lề bỏ sót lề của phần tử con (li/p trong ol)
                    c_para_px = c["h"] if c.get("h") else c_pitch - max(c["mb"], c2["mt"])
                    tags.append("line-height" if abs(w_para_px - c_para_px) > 2.5 else "spacing")
                    # Số đo để gom lớp offline: chiều cao đoạn Word/canvas (px) và chiều cao MỖI dòng suy ra
                    c["_w_para_px"] = round(w_para_px, 1); c["_c_para_px"] = round(c_para_px, 1)
                    c["_w_line_px"] = round(w_para_px / max(1, w["lines"]), 2); c["_c_line_px"] = round(c_para_px / max(1, c_lines), 2)
        # Word: chữ Việt (high ANSI) vẽ bằng font hAnsi = Font.NameOther; Font.Name trả về font eastAsia (đo d07/HDLD).
        wfont = (w.get("fontOther") or w.get("font") or "").split(";")[0].strip().lower()
        wfont = (themes or {}).get(wfont, wfont)
        if wfont and c["font"].lower() != wfont: tags.append("font-name")
        if w["size"] and w["size"] < 1000 and abs(c["size"] - w["size"] * PT2PX) > 0.6: tags.append("font-size")
        if c["page"] != w["page"]: tags.append("page")
        for t in tags: kinds[t] += 1
        if tags: details.append({"kinds": tags, "canvas": {k: c[k] for k in ("i", "page", "h", "lines", "lh", "font", "size", "mt", "mb")}, "word": {k: w[k] for k in ("i", "page", "y", "lines", "sb", "sa", "lsRule", "ls", "font", "size")}, "text": c["text"],
                                 **{k[1:]: c[k] for k in ("_w_para_px", "_c_para_px", "_w_line_px", "_c_line_px") if k in c}})
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
    contextual_spacing_from_docx(docx, wrows)
    pairs = match(wrows, crows)
    kinds, details = classify(pairs, crows, wrows, theme_fonts(docx))
    tables_c = sum(1 for c in crows if c["tag"] == "TABLE"); floats_c = sum(c["floats"] for c in crows)
    wpages = max((w["page"] for w in wrows), default=0); cpages = max((c["page"] for c in crows), default=0)
    per_file[name] = {"word_pages": wpages, "canvas_pages": cpages, "paras_word": len(wrows), "blocks": len(crows), "matched": len(pairs), "kinds": dict(kinds), "tables": tables_c, "floats": floats_c, "header_h": meta.get("headerH", 0), "footer_h": meta.get("footerH", 0), "body_top": meta.get("bodyTop", 0)}
    matrix[name] = kinds
    with open(os.path.join(OUTDIR, base + ".pairs.jsonl"), "w", encoding="utf-8") as f:
        for d in details: f.write(json.dumps(d, ensure_ascii=False) + "\n")
    print(name, "word", wpages, "canvas", cpages, "matched", len(pairs), f"headerH={meta.get('headerH', 0)} footerH={meta.get('footerH', 0)} bodyTop={meta.get('bodyTop', 0)}", dict(kinds), flush=True)

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
