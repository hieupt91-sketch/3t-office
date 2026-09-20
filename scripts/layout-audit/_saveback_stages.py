"""Usage: python _saveback_stages.py <worktree> <docx> <outdir>
Lay 4 tang (LO import HTML / _contentForExport / LO docx khong hau xu ly / ban luu that) cho d09 d06 d15 d13 d21,
dem so va tra loi 4 cau hoi.
$env:LOCALAPPDATA = 'E:\VNOffice-profiles\opencode' truoc khi chay python.
"""
import os, sys, tempfile, zipfile, re, json, time, shutil, subprocess
from pathlib import Path

ROOT, DOCX, OUTDIR = [os.path.abspath(a) for a in sys.argv[1:4]]
sys.path.insert(0, ROOT)
import main as vnmain
import webview

def count_html(html: str) -> dict:
    """Dem cac chi so trong HTML."""
    tables = len(re.findall(r"<table\b", html, re.IGNORECASE))
    paras = len(re.findall(r"<p\b[^>]*>", html, re.IGNORECASE))
    rectangles = len(re.findall(r'(?:name|id)\s*=\s*["\']Rectangle\s+\d+["\']', html, re.IGNORECASE))
    connectors = len(re.findall(r'(?:name|id)\s*=\s*["\']Straight\s+Connector\s+\d+["\']', html, re.IGNORECASE))
    page_break_before = len(re.findall(r'(?:page-break-before|break-before)\s*:\s*(?:always|page)', html, re.IGNORECASE))
    return {
        "tables": tables,
        "paras": paras,
        "rectangles": rectangles,
        "connectors": connectors,
        "page_breaks": page_break_before,
    }

def count_docx(docx_path: str) -> dict:
    """Dem cac chi so trong DOCX (word/document.xml)."""
    try:
        z = zipfile.ZipFile(docx_path)
        x = z.read("word/document.xml").decode("utf-8", "replace")
    except Exception:
        return {"tables": 0, "paras": 0, "rectangles": 0, "connectors": 0, "page_breaks": 0, "pbb": 0}
    body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", x)
    tables = body.count("<w:tbl")
    paras = len(re.findall(r"<w:p[ >]", body))
    rectangles = len(re.findall(r'name\s*=\s*["\']Rectangle\s+\d+["\']', body, re.IGNORECASE))
    connectors = len(re.findall(r'name\s*=\s*["\']Straight\s+Connector\s+\d+["\']', body, re.IGNORECASE))
    br_page = len(re.findall(r'<w:br\b[^>]*w:type="page"', body))
    pbb = len(re.findall(r"<w:pageBreakBefore\b", body))
    return {
        "tables": tables,
        "paras": paras,
        "rectangles": rectangles,
        "connectors": connectors,
        "page_breaks": br_page + pbb,
        "pbb": pbb,
        "br_page": br_page,
    }

def get_first_texts_from_table(html: str, table_index: int = 2, max_paras: int = 3, max_words: int = 6) -> list:
    """Lay 6 tu dau cua 3 doan dau trong bang chi dinh (0-based index)."""
    tables = re.findall(r"<table\b[\s\S]*?</table\s*>", html, re.IGNORECASE)
    if table_index >= len(tables):
        return []
    tbl = tables[table_index]
    paras = re.findall(r"<p\b[^>]*>([\s\S]*?)</p\s*>", tbl, re.IGNORECASE)
    out = []
    for p in paras[:max_paras]:
        text = re.sub(r"<[^>]+>", "", p)
        text = re.sub(r"\s+", " ", html.unescape(text)).strip()
        words = text.split()[:max_words]
        out.append(" ".join(words))
    return out

def get_surrounding_tag(html: str, snippet: str) -> str:
    """Tim the bao quanh doan chua snippet trong stage2_dom.html."""
    i = html.find(snippet)
    if i < 0:
        return ""
    start = max(html.rfind("<div", 0, i), html.rfind("<section", 0, i), html.rfind("<p", 0, i), html.rfind("<td", 0, i))
    end = html.find(">", start)
    if start < 0 or end < 0:
        return ""
    return html[start:end+1]

def run_stage1(docx: str, tmp: str) -> str:
    """Tang 1: LO import HTML."""
    html_path = vnmain._run_soffice_convert(docx, "html", tmp, app_kind="writer")
    return html_path

def run_stage2(docx: str, tmp: str) -> tuple:
    """Tang 2: mo app, lay _contentForExport va DOM."""
    stem = Path(docx).stem[:6]
    server, port = vnmain._start_static_server()
    app_kind, initial_file = vnmain.parse_launch_args([docx])
    api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
    window = webview.create_window(title="VN Writer - Stage2", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
    
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
        with open(os.path.join(tmp, "stage2_export.html"), "w", encoding="utf-8") as f:
            f.write(export_html)
        with open(os.path.join(tmp, "stage2_dom.html"), "w", encoding="utf-8") as f:
            f.write(dom_html)
        win.destroy()
    
    webview.start(after_load, window, debug=False)
    return os.path.join(tmp, "stage2_export.html"), os.path.join(tmp, "stage2_dom.html")

def run_stage3(export_html_path: str, tmp: str) -> str:
    """Tang 3: LO HTML -> DOCX truc tiep (khong hau xu ly)."""
    out_docx = os.path.join(tmp, "stage3_lo.docx")
    vnmain._run_soffice_convert(export_html_path, "docx", tmp, app_kind="writer")
    src = os.path.join(tmp, Path(export_html_path).stem + ".docx")
    if os.path.exists(src):
        shutil.move(src, out_docx)
    return out_docx

def run_stage4(docx: str, tmp: str) -> str:
    """Tang 4: ban luu that (chay _batch_writer.py logic)."""
    out_docx = os.path.join(tmp, "stage4_real.docx")
    PROBE = f'''
import sys, time, os, json
ROOT, DOCX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, ROOT)
import webview, main as vnmain
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCX])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Writer - Stage4", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
stem = "{Path(docx).stem[:6]}"
def after_load(win):
    name = ""
    for _ in range(100):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{{}}).textContent||''") or ""
        if stem in name: break
    loaded = stem in name
    time.sleep(8)
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).catch(e => {{ window.__saveErr = String(e && e.stack || e); }}); 'queued'")
    for _ in range(200):
        time.sleep(3)
        if (os.path.exists(OUT) and os.path.getsize(OUT) > 0) or win.evaluate_js("window.__saveErr"): break
    time.sleep(4)
    print("RESULT " + json.dumps({{"loaded": loaded, "err": win.evaluate_js("window.__saveErr")}}, ensure_ascii=False), flush=True)
    win.destroy()
webview.start(after_load, window, debug=False)
'''
    probe_path = os.path.join(tmp, "_probe_stage4.py")
    with open(probe_path, "w", encoding="utf-8") as f:
        f.write(PROBE)
    r = subprocess.run([sys.executable, probe_path, ROOT, docx, out_docx], capture_output=True, text=True, cwd=ROOT, timeout=1500, encoding="utf-8", errors="replace")
    m = re.search(r"RESULT (\{.*\})", r.stdout or "")
    res = json.loads(m.group(1)) if m else {"loaded": False, "err": r.stderr[-120:]}
    if not os.path.exists(out_docx) or os.path.getsize(out_docx) == 0:
        return ""
    return out_docx

def analyze_document(docx: str, outdir: str) -> dict:
    """Chay day du 4 tang cho mot DOCX."""
    tmp = tempfile.mkdtemp(prefix=f"vno_{Path(docx).stem}_")
    result = {"docx": Path(docx).name, "stages": {}}
    
    # Stage 1
    print(f"[{Path(docx).name}] Stage 1: LO import HTML...", flush=True)
    stage1_html_path = run_stage1(docx, tmp)
    stage1_html = open(stage1_html_path, encoding="utf-8", errors="replace").read()
    result["stages"]["stage1_lo_import"] = count_html(stage1_html)
    shutil.copy2(stage1_html_path, os.path.join(outdir, f"{Path(docx).stem}_stage1_lo_import.html"))
    
    # Stage 2
    print(f"[{Path(docx).name}] Stage 2: App export...", flush=True)
    stage2_export_path, stage2_dom_path = run_stage2(docx, tmp)
    stage2_export_html = open(stage2_export_path, encoding="utf-8", errors="replace").read()
    stage2_dom_html = open(stage2_dom_path, encoding="utf-8", errors="replace").read()
    result["stages"]["stage2_export"] = count_html(stage2_export_html)
    result["stages"]["stage2_dom"] = count_html(stage2_dom_html)
    shutil.copy2(stage2_export_path, os.path.join(outdir, f"{Path(docx).stem}_stage2_export.html"))
    shutil.copy2(stage2_dom_path, os.path.join(outdir, f"{Path(docx).stem}_stage2_dom.html"))
    
    # Stage 3
    print(f"[{Path(docx).name}] Stage 3: LO HTML->DOCX (no post)...", flush=True)
    stage3_docx = run_stage3(stage2_export_path, tmp)
    if stage3_docx and os.path.exists(stage3_docx):
        result["stages"]["stage3_lo_docx"] = count_docx(stage3_docx)
        shutil.copy2(stage3_docx, os.path.join(outdir, f"{Path(docx).stem}_stage3_lo.docx"))
    else:
        result["stages"]["stage3_lo_docx"] = {"error": "not generated"}
    
    # Stage 4
    print(f"[{Path(docx).name}] Stage 4: Real saveback...", flush=True)
    stage4_docx = run_stage4(docx, tmp)
    if stage4_docx and os.path.exists(stage4_docx):
        result["stages"]["stage4_real"] = count_docx(stage4_docx)
        shutil.copy2(stage4_docx, os.path.join(outdir, f"{Path(docx).stem}_stage4_real.docx"))
    else:
        result["stages"]["stage4_real"] = {"error": "not generated", "detail": res.get("err", "")}
    
    # Cleanup temp
    shutil.rmtree(tmp, ignore_errors=True)
    return result

def main():
    if len(sys.argv) < 4:
        print("Usage: python _saveback_stages.py <worktree> <docx> <outdir>")
        sys.exit(1)
    
    docx_dir = os.path.dirname(sys.argv[2])
    target_files = ["d09.docx", "d06.docx", "d15.docx", "d13.docx", "d21.docx"]
    
    os.makedirs(sys.argv[3], exist_ok=True)
    all_results = {}
    
    for fname in target_files:
        docx_path = os.path.join(docx_dir, fname)
        if not os.path.exists(docx_path):
            print(f"SKIP {fname}: not found", flush=True)
            continue
        print(f"\n=== Processing {fname} ===", flush=True)
        res = analyze_document(docx_path, sys.argv[3])
        all_results[fname] = res
    
    # Write summary
    summary_path = os.path.join(sys.argv[3], "_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nSummary written to {summary_path}", flush=True)
    
    # Print table for questions
    print("\n=== BANG TANG X SO DEM ===")
    for fname, res in all_results.items():
        print(f"\n{fname}:")
        for stage, counts in res["stages"].items():
            print(f"  {stage}: {counts}")

if __name__ == "__main__":
    main()