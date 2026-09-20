"""Usage: python _import_drawing_loss.py <worktree> <docdir> <outdir>
Chi DO: do mat lop "doi tuong ve" khi LO xuat HTML tren 23 file (bo d10).
Dem lai <w:tbl> chinh xac cho d09 d13 d15 o 4 tang. Vi tri bang nhan doi d09.
$env:LOCALAPPDATA = 'E:\VNOffice-profiles\opencode' truoc khi chay python.
"""
import os, sys, re, json, tempfile, zipfile, shutil, subprocess
from pathlib import Path

ROOT, DOCDIR, OUTDIR = [os.path.abspath(a) for a in sys.argv[1:4]]
sys.path.insert(0, ROOT)
import main as vnmain

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
    "wpg": "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
    "v": "urn:schemas-microsoft-com:vml",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
}

PRST_TYPES = {
    "rect": "Rectangle",
    "roundRect": "Rounded Rectangle",
    "line": "Line",
    "straightConnector1": "Straight Connector",
    "curvedConnector2": "Curved Connector",
    "curvedConnector3": "Curved Connector 3",
    "curvedConnector4": "Curved Connector 4",
    "curvedConnector5": "Curved Connector 5",
    "elbowConnector": "Elbow Connector",
}

def extract_ooxml(docx_path):
    """Doc word/document.xml + header*.xml + footer*.xml."""
    z = zipfile.ZipFile(docx_path)
    parts = {}
    for name in z.namelist():
        if name == "word/document.xml" or name.startswith("word/header") and name.endswith(".xml") or name.startswith("word/footer") and name.endswith(".xml"):
            parts[name] = z.read(name).decode("utf-8", "replace")
    return parts

def count_ooxml_drawings(ooxml_parts):
    """Dem cac loai doi tuong ve trong OOXML."""
    counts = {
        "pic:pic": 0,
        "wps:wsp": 0,
        "wpg:wgp": 0,
        "w:pict": 0,
        "v:shape": 0,
        "w:txbxContent": 0,
        "c:chart": 0,
        "wp:anchor": 0,
        "wp:inline": 0,
        "prstGeom": {},
    }
    for xml in ooxml_parts.values():
        counts["pic:pic"] += len(re.findall(r"<pic:pic\b", xml))
        counts["wps:wsp"] += len(re.findall(r"<wps:wsp\b", xml))
        counts["wpg:wgp"] += len(re.findall(r"<wpg:wgp\b", xml))
        counts["w:pict"] += len(re.findall(r"<w:pict\b", xml))
        counts["v:shape"] += len(re.findall(r"<v:shape\b", xml))
        counts["w:txbxContent"] += len(re.findall(r"<w:txbxContent\b", xml))
        counts["c:chart"] += len(re.findall(r"<c:chart\b", xml))
        counts["wp:anchor"] += len(re.findall(r"<wp:anchor\b", xml))
        counts["wp:inline"] += len(re.findall(r"<wp:inline\b", xml))
        for prst in re.findall(r'<a:prstGeom\b[^>]*prst\s*=\s*["\']([^"\']+)["\']', xml):
            counts["prstGeom"][prst] = counts["prstGeom"].get(prst, 0) + 1
    return counts

def run_lo_import_html(docx_path, tmp):
    """Chay LO DOCX -> HTML (tang 1)."""
    html_path = vnmain._run_soffice_convert(docx_path, "html", tmp, app_kind="writer")
    return open(html_path, encoding="utf-8", errors="replace").read()

def count_html_drawings(html):
    """Dem cac bieu dien doi tuong ve trong HTML LO xuat."""
    counts = {
        "img": 0,
        "absolute_div": 0,
        "svg": 0,
        "hr": 0,
        "img_by_prefix": {},
    }
    counts["img"] = len(re.findall(r"<img\b", html, re.IGNORECASE))
    counts["absolute_div"] = len(re.findall(r'<div[^>]*style\s*=\s*["\'][^"\']*position\s*:\s*absolute', html, re.IGNORECASE))
    counts["svg"] = len(re.findall(r"<svg\b", html, re.IGNORECASE))
    counts["hr"] = len(re.findall(r"<hr\b", html, re.IGNORECASE))
    for m in re.findall(r'<img\b[^>]*name\s*=\s*["\']([^"\']+)["\']', html, re.IGNORECASE):
        prefix = m.split()[0] if " " in m else m
        prefix = re.sub(r'\d+$', '', prefix)
        counts["img_by_prefix"][prefix] = counts["img_by_prefix"].get(prefix, 0) + 1
    return counts

def count_wtbl_at_stages(docx_path, tmp):
    """Dem <w:tbl> chinh xac o 4 tang cho mot file."""
    stages = {}
    
    # Tang 0: DOCX goc
    z = zipfile.ZipFile(docx_path)
    doc_xml = z.read("word/document.xml").decode("utf-8", "replace")
    stages["stage0_original"] = count_wtbl_exact(doc_xml)
    
    # Tang 1: LO import HTML
    html1_path = vnmain._run_soffice_convert(docx_path, "html", tmp, app_kind="writer")
    html1 = open(html1_path, encoding="utf-8", errors="replace").read()
    stages["stage1_lo_import_html"] = {"tables_html": len(re.findall(r"<table\b", html1, re.IGNORECASE))}
    
    # Tang 2: App export (can chay app)
    # Dung _saveback_stages logic nhung chi lay stage2_export
    stem = Path(docx_path).stem[:6]
    server, port = vnmain._start_static_server()
    app_kind, initial_file = vnmain.parse_launch_args([docx_path])
    api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
    window = vnmain.webview.create_window(title=f"VN Writer - {stem}", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
    
    export_html = ""
    dom_html = ""
    
    def after_load(win):
        nonlocal export_html, dom_html
        for _ in range(300):
            time.sleep(3)
            name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
            if stem in name:
                break
        time.sleep(8)
        export_html = win.evaluate_js("window.__vnoAppInstance.adapter._contentForExport()") or ""
        dom_html = win.evaluate_js("document.querySelector('.vno-writer-body')?.innerHTML || ''") or ""
        win.destroy()
    
    import time
    vnmain.webview.start(after_load, window, debug=False)
    
    stages["stage2_export"] = {"tables_html": len(re.findall(r"<table\b", export_html, re.IGNORECASE))}
    stages["stage2_dom"] = {"tables_html": len(re.findall(r"<table\b", dom_html, re.IGNORECASE)), "dom_html": dom_html}
    
    # Tang 3: LO HTML -> DOCX
    stage3_docx = os.path.join(tmp, f"{Path(docx_path).stem}_stage3.docx")
    vnmain._run_soffice_convert(html1_path, "docx", tmp, app_kind="writer")
    src = os.path.join(tmp, Path(html1_path).stem + ".docx")
    if os.path.exists(src):
        shutil.move(src, stage3_docx)
    if os.path.exists(stage3_docx):
        z3 = zipfile.ZipFile(stage3_docx)
        doc3 = z3.read("word/document.xml").decode("utf-8", "replace")
        stages["stage3_lo_docx"] = count_wtbl_exact(doc3)
    else:
        stages["stage3_lo_docx"] = {"tables": 0, "error": "not generated"}
    
    return stages, export_html, dom_html

def count_wtbl_exact(xml):
    """Dem <w:tbl> mo chinh xac (co > hoac khoang trang sau tbl)."""
    return len(re.findall(r"<w:tbl\b", xml))

def find_duplicate_tables_d09(dom_html):
    """Tim vi tri bang nhan doi trong stage2_dom cua d09."""
    tables = [(m.start(), m.end(), m.group(0)[:200]) for m in re.finditer(r"<table\b[\s\S]*?</table\s*>", dom_html, re.IGNORECASE)]
    result = {"total_tables": len(tables), "duplicates": []}
    if len(tables) >= 3:
        for i in [1, 2]:
            if i < len(tables):
                tbl = tables[i]
                before = dom_html[max(0, tbl[0]-200):tbl[0]]
                after = dom_html[tbl[1]:tbl[1]+200]
                in_li = bool(re.search(r"<li\b", before[-200:], re.IGNORECASE))
                in_vno_float = 'data-vno-float' in before[-200:]
                result["duplicates"].append({
                    "table_index": i,
                    "first_6_words_before": " ".join(re.sub(r"<[^>]+>", "", before).split()[:6]),
                    "first_6_words_after": " ".join(re.sub(r"<[^>]+>", "", after).split()[:6]),
                    "in_li": in_li,
                    "in_div_vno_float": in_vno_float,
                    "parent_tag_before": get_parent_tag(before[-200:]),
                })
    return result

def get_parent_tag(snippet):
    tags = re.findall(r"<(div|li|td|th|p|section|article)\b[^>]*>", snippet, re.IGNORECASE)
    return tags[-1] if tags else "unknown"

def analyze_one(docx_path, outdir):
    """Phan tich mot file DOCX."""
    fname = Path(docx_path).name
    stem = Path(docx_path).stem
    print(f"[{fname}] Bat dau...", flush=True)
    
    tmp = tempfile.mkdtemp(prefix=f"vno_{stem}_")
    result = {"file": fname}
    
    # (a) OOXML goc
    print(f"  Doc OOXML...", flush=True)
    ooxml = extract_ooxml(docx_path)
    result["ooxml"] = count_ooxml_drawings(ooxml)
    
    # (b) HTML tang 1
    print(f"  Chay LO import HTML...", flush=True)
    html1 = run_lo_import_html(docx_path, tmp)
    result["html_stage1"] = count_html_drawings(html1)
    with open(os.path.join(outdir, f"{stem}_stage1.html"), "w", encoding="utf-8") as f:
        f.write(html1)
    
    # (c) Ma tran mat
    result["loss_matrix"] = estimate_loss(result["ooxml"], result["html_stage1"])
    
    # Dem <w:tbl> cho d09, d13, d15
    if stem in ("d09", "d13", "d15"):
        print(f"  Dem <w:tbl> 4 tang...", flush=True)
        stages, export_html, dom_html = count_wtbl_at_stages(docx_path, tmp)
        result["wtbl_stages"] = stages
        with open(os.path.join(outdir, f"{stem}_stage2_export.html"), "w", encoding="utf-8") as f:
            f.write(export_html)
        with open(os.path.join(outdir, f"{stem}_stage2_dom.html"), "w", encoding="utf-8") as f:
            f.write(dom_html)
        if stem == "d09":
            result["d09_duplicate_tables"] = find_duplicate_tables_d09(dom_html)
    
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"  [{fname}] Xong.", flush=True)
    return result

def estimate_loss(ooxml_counts, html_counts):
    """Uoc luong mat: doi tuong goc khong co dai dien o HTML."""
    matrix = {}
    total_original = sum(v for k, v in ooxml_counts.items() if k != "prstGeom")
    total_html = sum(v for k, v in html_counts.items() if k != "img_by_prefix")
    
    matrix["total_original_objects"] = total_original
    matrix["total_html_representations"] = total_html
    matrix["estimated_lost"] = max(0, total_original - total_html)
    matrix["loss_ratio"] = matrix["estimated_lost"] / total_original if total_original > 0 else 0
    matrix["note"] = "Su doan dua tren tong so; khong phai mapping 1-1. pic:pic -> img; wps:wsp/wpg:wgp -> absolute_div/svg; v:shape -> img/absolute_div; w:txbxContent -> absolute_div; c:chart -> img/svg; wp:anchor/inline la container."
    return matrix

def main():
    if len(sys.argv) < 4:
        print("Usage: python _import_drawing_loss.py <worktree> <docdir> <outdir>")
        sys.exit(1)
    
    os.makedirs(OUTDIR, exist_ok=True)
    
    # Lay 23 file (bo d10)
    all_files = sorted([f for f in os.listdir(DOCDIR) if f.endswith(".docx") and f != "d10.docx"])
    print(f"Tong {len(all_files)} file: {all_files}", flush=True)
    
    all_results = {}
    for fname in all_files:
        docx_path = os.path.join(DOCDIR, fname)
        try:
            all_results[fname] = analyze_one(docx_path, OUTDIR)
        except Exception as e:
            print(f"  LOI {fname}: {e}", flush=True)
            all_results[fname] = {"file": fname, "error": str(e)}
    
    # Luu ket qua
    summary_path = os.path.join(OUTDIR, "_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nDa luu tong hop: {summary_path}", flush=True)
    
    # In bang tong hop muc 1c
    print("\n=== BANG 23 FILE (MUC 1C) ===")
    print("File | pic:pic | wps:wsp | wpg:wgp | w:pict | v:shape | w:txbxContent | c:chart | wp:anchor | wp:inline | Total Orig | HTML img | HTML abs-div | HTML svg | HTML hr | Est Lost | Loss%")
    for fname, res in all_results.items():
        if "error" in res:
            print(f"{fname} | ERROR")
            continue
        o = res["ooxml"]
        h = res["html_stage1"]
        m = res["loss_matrix"]
        tot_orig = m["total_original_objects"]
        print(f"{fname} | {o['pic:pic']} | {o['wps:wsp']} | {o['wpg:wgp']} | {o['w:pict']} | {o['v:shape']} | {o['w:txbxContent']} | {o['c:chart']} | {o['wp:anchor']} | {o['wp:inline']} | {tot_orig} | {h['img']} | {h['absolute_div']} | {h['svg']} | {h['hr']} | {m['estimated_lost']} | {m['loss_ratio']*100:.1f}%")
    
    # Tong theo loai
    print("\n=== TONG THEO LOAI (MUC 1C) ===")
    files_with_shape_loss = 0
    files_with_vml_loss = 0
    files_with_textbox_loss = 0
    for fname, res in all_results.items():
        if "error" in res:
            continue
        o = res["ooxml"]
        h = res["html_stage1"]
        m = res["loss_matrix"]
        if o["wps:wsp"] > 0 or o["wpg:wgp"] > 0:
            if m["estimated_lost"] > 0:
                files_with_shape_loss += 1
        if o["v:shape"] > 0 or o["w:pict"] > 0:
            if m["estimated_lost"] > 0:
                files_with_vml_loss += 1
        if o["w:txbxContent"] > 0:
            if m["estimated_lost"] > 0:
                files_with_textbox_loss += 1
    print(f"File co shape (wps:wsp/wpg:wgp) mat: {files_with_shape_loss}")
    print(f"File co VML (v:shape/w:pict) mat: {files_with_vml_loss}")
    print(f"File co textbox (w:txbxContent) mat: {files_with_textbox_loss}")
    
    # Muc 2: d09, d13, d15 <w:tbl>
    print("\n=== MUC 2: DEM <w:tbl> CHINH XAC ===")
    for stem in ("d09", "d13", "d15"):
        fname = f"{stem}.docx"
        if fname in all_results and "wtbl_stages" in all_results[fname]:
            print(f"\n{fname}:")
            for stage, counts in all_results[fname]["wtbl_stages"].items():
                print(f"  {stage}: {counts}")
            if stem == "d09" and "d09_duplicate_tables" in all_results[fname]:
                dup = all_results[fname]["d09_duplicate_tables"]
                print(f"  Bang nhan doi (stage2_dom): {dup}")

if __name__ == "__main__":
    main()