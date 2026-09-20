"""Usage: python _page_causes.py <outdir> <docdir>
Phan loai nguyen nhan lop page (a/b/c/d) tai moi diem chuyen trang Word.
a = doan bi day nguyen khoi, b = bang dai hon mot trang khong cat duoc, c = keepNext/keepLines/pageBreakBefore, d = khac.
Xuat docs/HANDOFF-WRITER-R14.md: bang file x (so diem chuyen trang Word, so diem khop canvas, a, b, c, d), tong, 3 vi du moi loai."""
import sys, os, json, re, unicodedata, collections, zipfile
from glob import glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

outdir, docdir = sys.argv[1], sys.argv[2]
PT2PX = 96 / 72
TWIP2PT = 1 / 20

def norm(t):
    t = unicodedata.normalize("NFC", (t or "").lower())
    return re.sub(r"[^0-9a-z\u00c0-\u1ef9]+", "", t)

def get_page_info(docx):
    z = zipfile.ZipFile(docx)
    doc = z.read("word/document.xml").decode("utf-8", "replace")
    pgSz = re.search(r'<w:pgSz\b[^>]*w:w="(\d+)"\s+w:h="(\d+)"', doc)
    pgMar = re.search(r'<w:pgMar\b[^>]*w:top="(\d+)"\s+w:right="(\d+)"\s+w:bottom="(\d+)"\s+w:left="(\d+)"\s+w:header="(\d+)"\s+w:footer="(\d+)"', doc)
    if not pgSz or not pgMar:
        return None
    page_h = int(pgSz.group(2)) * TWIP2PT
    top_mar = int(pgMar.group(1)) * TWIP2PT
    bot_mar = int(pgMar.group(3)) * TWIP2PT
    header = int(pgMar.group(5)) * TWIP2PT
    footer = int(pgMar.group(6)) * TWIP2PT
    body_bottom = page_h - bot_mar
    return {"page_h": page_h, "top_mar": top_mar, "bot_mar": bot_mar, "header": header, "footer": footer, "body_bottom": body_bottom}

def get_keep_flags(docx):
    z = zipfile.ZipFile(docx)
    styles = z.read("word/styles.xml").decode("utf-8", "replace")
    doc = z.read("word/document.xml").decode("utf-8", "replace")
    
    style_flags = {}
    for m in re.finditer(r'<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>(.*?)</w:style>', styles, re.S):
        sid, body = m.group(1), m.group(2)
        ppr = re.search(r"<w:pPr>(.*?)</w:pPr>", body, re.S)
        if ppr:
            pp = ppr.group(1)
            style_flags[sid] = {
                "keepNext": "<w:keepNext" in pp,
                "keepLines": "<w:keepLines" in pp,
                "pageBreakBefore": "<w:pageBreakBefore" in pp,
            }
    
    based = {}
    for m in re.finditer(r'<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>(.*?)</w:style>', styles, re.S):
        sid, body = m.group(1), m.group(2)
        b = re.search(r'<w:basedOn w:val="([^"]+)"', body)
        based[sid] = b.group(1) if b else None
    
    def resolve_style(sid, depth=0):
        if not sid or depth > 12:
            return {"keepNext": False, "keepLines": False, "pageBreakBefore": False}
        flags = style_flags.get(sid, {"keepNext": False, "keepLines": False, "pageBreakBefore": False})
        base = based.get(sid)
        if base:
            base_flags = resolve_style(base, depth + 1)
            return {k: flags[k] or base_flags[k] for k in flags}
        return flags
    
    para_flags = {}
    para_idx = 0
    for m in re.finditer(r"<w:p\b[^>]*>(.*?)</w:p>", doc, re.S):
        body = m.group(1)
        ppr = re.search(r"<w:pPr>(.*?)</w:pPr>", body, re.S)
        pp = ppr.group(1) if ppr else ""
        sid = re.search(r'<w:pStyle w:val="([^"]+)"', pp)
        style_f = resolve_style(sid.group(1) if sid else "Normal")
        own_keepNext = "<w:keepNext" in pp
        own_keepLines = "<w:keepLines" in pp
        own_pgBrkBefore = "<w:pageBreakBefore" in pp
        para_flags[para_idx] = {
            "keepNext": own_keepNext or style_f["keepNext"],
            "keepLines": own_keepLines or style_f["keepLines"],
            "pageBreakBefore": own_pgBrkBefore or style_f["pageBreakBefore"],
        }
        para_idx += 1
    return para_flags

def load_jsonl(path):
    return [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]

def match_pairs(word_rows, canvas_rows):
    pairs = []
    wi = 0
    wrows = [w for w in word_rows if not w.get("tbl") and w.get("zone", "body") == "body"]
    for c in canvas_rows:
        if c.get("tag") == "TABLE" or c.get("tables"):
            continue
        key = norm(c.get("text", ""))[:24]
        if len(key) < 6:
            continue
        for j in range(wi, min(wi + 40, len(wrows))):
            if norm(wrows[j].get("text", ""))[:24] == key:
                pairs.append((c, wrows[j]))
                wi = j + 1
                break
    return pairs

def classify_page_breaks(outdir, docdir):
    names = sorted(os.path.basename(p)[:-5] for p in glob(os.path.join(docdir, "*.docx")) if not os.path.basename(p).startswith("d10"))
    
    file_stats = {}
    all_examples = {"a": [], "b": [], "c": [], "d": []}
    
    for name in names:
        docx = os.path.join(docdir, name + ".docx")
        base = name
        
        page_info = get_page_info(docx)
        if not page_info:
            print(f"{name}: khong doc duoc page info", flush=True)
            continue
        body_bottom_pt = page_info["body_bottom"]
        
        keep_flags = get_keep_flags(docx)
        
        wrows = load_jsonl(os.path.join(outdir, base + ".word.jsonl"))
        crows_full = load_jsonl(os.path.join(outdir, base + ".canvas.jsonl"))
        meta = crows_full[0] if crows_full and "meta" in crows_full[0] else {}
        crows = crows_full[1:] if crows_full and "meta" in crows_full[0] else crows_full
        
        # meta is nested: {"meta": {...}}
        meta_inner = meta.get("meta", meta)
        canvas_total_h_px = meta_inner.get("pageH", 0)
        canvas_footer_h_px = meta_inner.get("footerH", 0)
        canvas_body_top_px = meta_inner.get("bodyTop", 0)
        canvas_pages = max((c.get("page", 0) for c in crows), default=1)
        canvas_page_h_px = canvas_total_h_px / canvas_pages if canvas_pages > 0 else 1122
        canvas_page_body_h_px = canvas_page_h_px - canvas_body_top_px - canvas_footer_h_px
        
        pairs = match_pairs(wrows, crows)
        if not pairs:
            continue
        
        # Count total page divergences (canvas.page != word.page)
        page_divergences = sum(1 for c, w in pairs if c["page"] != w["page"])
        
        w_idx_to_flags = {w["i"]: keep_flags.get(w["i"], {"keepNext": False, "keepLines": False, "pageBreakBefore": False}) for w in wrows}
        c_idx_map = {id(c): idx for idx, c in enumerate(crows)}
        
        wp_breaks = 0
        cp_matches = 0
        causes = {"a": 0, "b": 0, "c": 0, "d": 0}
        
        for n in range(len(pairs) - 1):
            c_curr, w_curr = pairs[n]
            c_next, w_next = pairs[n + 1]
            
            if w_next["page"] > w_curr["page"]:
                wp_breaks += 1
                canvas_breaks = c_next["page"] > c_curr["page"]
                if canvas_breaks:
                    cp_matches += 1
                
                last_w = w_curr
                first_w_next = w_next
                
                # Word cuts paragraph at this break?
                ls = last_w.get("ls", 0)
                lines = last_w.get("lines", 1)
                y = last_w.get("y", 0)
                para_bottom_pt = y + lines * ls
                word_cuts = para_bottom_pt > body_bottom_pt + 0.5
                
                # Cause (a): Word cuts paragraph but canvas pushes whole block to next page
                if word_cuts and c_curr["page"] == w_curr["page"] + 1:
                    causes["a"] += 1
                    if len(all_examples["a"]) < 3:
                        all_examples["a"].append({
                            "file": base, "text": c_curr["text"][:6], "para_bottom": round(para_bottom_pt, 1),
                            "body_bottom": round(body_bottom_pt, 1), "wp": w_curr["page"], "cp": c_curr["page"]
                        })
                    continue
                
                # Cause (b): Check for TABLE in canvas that spans multiple pages or is taller than page body
                table_cause = False
                table_blk = None
                table_pages = 0
                # Check tables on canvas pages from c_curr.page to c_next.page
                for blk in crows:
                    if (blk.get("tag") == "TABLE" or blk.get("tables")):
                        blk_page = blk.get("page", 0)
                        if c_curr["page"] <= blk_page <= c_next["page"]:
                            blk_h = blk.get("h", 0)
                            # Table spans multiple canvas pages (starts on or before c_curr.page and ends after)
                            # or is very tall (>80% of page body)
                            if blk_h > canvas_page_body_h_px * 0.8:
                                table_cause = True
                                table_blk = blk
                                table_pages = max(1, c_next["page"] - c_curr["page"] + 1)
                                break
                
                if table_cause:
                    causes["b"] += 1
                    if len(all_examples["b"]) < 3:
                        all_examples["b"].append({
                            "file": base, "text": c_curr["text"][:6], "table_h_px": table_blk.get("h", 0),
                            "page_body_h_px": round(canvas_page_body_h_px, 1), "wp": w_curr["page"],
                            "table_pages": table_pages
                        })
                    continue
                
                # Cause (c): keepNext/keepLines/pageBreakBefore on first para of next page OR previous para
                keep_cause = False
                flags_next = w_idx_to_flags.get(first_w_next["i"], {})
                flags_curr = w_idx_to_flags.get(last_w["i"], {})
                if flags_next.get("keepNext") or flags_next.get("keepLines") or flags_next.get("pageBreakBefore") or \
                   flags_curr.get("keepNext"):
                    keep_cause = True
                if keep_cause:
                    causes["c"] += 1
                    if len(all_examples["c"]) < 3:
                        all_examples["c"].append({
                            "file": base, "text": c_next["text"][:6], "flags_next": flags_next,
                            "flags_curr": flags_curr, "wp": w_next["page"]
                        })
                    continue
                
                # Cause (d): other - y drift
                anchor_w = None
                anchor_c = None
                for cc, ww in pairs:
                    if ww["page"] == w_curr["page"] and cc["page"] == c_curr["page"]:
                        anchor_w = ww
                        anchor_c = cc
                        break
                if anchor_w and anchor_c:
                    drift_px = (c_curr["top"] - anchor_c["top"]) - (w_curr["y"] - anchor_w["y"]) * PT2PX
                else:
                    drift_px = 0
                causes["d"] += 1
                if len(all_examples["d"]) < 3:
                    all_examples["d"].append({
                        "file": base, "text": c_curr["text"][:6], "drift_px": round(drift_px, 1),
                        "wp": w_curr["page"], "cp": c_curr["page"]
                    })
        
        file_stats[base] = {
            "wp_breaks": wp_breaks,
            "cp_matches": cp_matches,
            "page_divergences": page_divergences,
            "a": causes["a"],
            "b": causes["b"],
            "c": causes["c"],
            "d": causes["d"],
        }
        print(f"{base}: wp_breaks={wp_breaks} cp_matches={cp_matches} a={causes['a']} b={causes['b']} c={causes['c']} d={causes['d']}", flush=True)
    
    handoff_path = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "HANDOFF-WRITER-R14.md")
    os.makedirs(os.path.dirname(handoff_path), exist_ok=True)
    
    with open(handoff_path, "w", encoding="utf-8") as f:
        f.write("# Handoff R14 - Phan loai nguyen nhan lop page\n\n")
        f.write("| file | Word page breaks | Canvas match | Page divergences | a (day nguyen khoi) | b (bang dai) | c (keepNext/keepLines) | d (khac) |\n")
        f.write("|---|---:|---:|---:|---:|---:|---:|---:|\n")
        total = {"wp": 0, "cp": 0, "pd": 0, "a": 0, "b": 0, "c": 0, "d": 0}
        for base, s in file_stats.items():
            f.write(f"| {base} | {s['wp_breaks']} | {s['cp_matches']} | {s['page_divergences']} | {s['a']} | {s['b']} | {s['c']} | {s['d']} |\n")
            total["wp"] += s["wp_breaks"]
            total["cp"] += s["cp_matches"]
            total["pd"] += s["page_divergences"]
            total["a"] += s["a"]
            total["b"] += s["b"]
            total["c"] += s["c"]
            total["d"] += s["d"]
        f.write(f"| **Tong** | **{total['wp']}** | **{total['cp']}** | **{total['pd']}** | **{total['a']}** | **{total['b']}** | **{total['c']}** | **{total['d']}** |\n\n")
        
        for cause in ["a", "b", "c", "d"]:
            f.write(f"## Vi du nguyen nhan ({cause.upper()})\n\n")
            for ex in all_examples[cause]:
                if cause == "a":
                    f.write(f"- {ex['file']}: doan \"{ex['text']}\" - para_bottom={ex['para_bottom']}pt > body_bottom={ex['body_bottom']}pt (Word cat, canvas day sang trang {ex['cp']})\n")
                elif cause == "b":
                    f.write(f"- {ex['file']}: bang cao {ex['table_h_px']}px tren {ex['table_pages']} trang canvas (> {ex['page_body_h_px']:.0f}px/trang) tai Word trang {ex['wp']}\n")
                elif cause == "c":
                    fn = ex["flags_next"]
                    fc = ex["flags_curr"]
                    f.write(f"- {ex['file']}: doan \"{ex['text']}\" trang {ex['wp']} - next(keepNext={fn.get('keepNext')} keepLines={fn.get('keepLines')} pgBrkBefore={fn.get('pageBreakBefore')}) curr(keepNext={fc.get('keepNext')})\n")
                else:
                    f.write(f"- {ex['file']}: doan \"{ex['text']}\" trang {ex['wp']}/{ex['cp']} - drift={ex['drift_px']}px\n")
            f.write("\n")
    
    print(f"Handoff written to {handoff_path}")

if __name__ == "__main__":
    classify_page_breaks(outdir, docdir)