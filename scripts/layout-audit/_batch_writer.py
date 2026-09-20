"""Usage: python _batch_writer.py <worktree> <docx-dir> <out-dir> [names...]
For each .docx: Word PDF page count of the original, open in the real app (canvas page count from the status bar,
word count), edit (bold + "ZZ") and save, Word PDF page count of the saved file, ZZ present, paragraph/sectPr/br stats.
Writes <out-dir>/_batch_writer_report.md. One document at a time."""
import os, sys, subprocess, re, glob, zipfile, json
ROOT, DOCDIR, OUTDIR = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3])
names = sys.argv[4:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(DOCDIR, "*.docx")))
SP = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)

def word_pages(path):
    r = subprocess.run(["powershell", "-NoProfile", "-File", os.path.join(SP, "_word_oracle3.ps1"), "-File", path], capture_output=True, text=True, timeout=400)
    m = re.search(r"pages=(\d+)", r.stdout or "")
    return int(m.group(1)) if m else (r.stdout or r.stderr).strip()[:60]

def docx_stats(path):
    try:
        z = zipfile.ZipFile(path)
        x = z.read("word/document.xml").decode("utf8", "replace")
    except Exception as e:
        return {"err": str(e)[:40]}
    body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", x)
    pbb = len(re.findall(r"<w:pageBreakBefore\b", body))
    hdr = len([n for n in z.namelist() if n.startswith("word/header") and n.endswith(".xml")])
    ftr = len([n for n in z.namelist() if n.startswith("word/footer") and n.endswith(".xml")])
    media = len([n for n in z.namelist() if n.startswith("word/media/")])
    return {"paras": len(re.findall(r"<w:p[ >]", body)), "sect": len(re.findall(r"<w:pPr>(?:(?!</w:pPr>)[\s\S])*?<w:sectPr", body)),
            "br": len(re.findall(r'<w:br\b[^>]*w:type="page"', body)), "pbb": pbb, "hdr": hdr, "ftr": ftr, "media": media,
            "anchors": x.count("<wp:anchor"), "tables": x.count("<w:tbl>"), "zz": "ZZ" in x}

PROBE = r'''
import sys, time, os, json
ROOT, DOCX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, ROOT)
import webview, main as vnmain
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCX])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Writer - Batch", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
stem = os.path.splitext(os.path.basename(DOCX))[0][:6]
def after_load(win):
    name = ''
    for _ in range(100):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
        if stem and stem in name: break
    loaded = stem in name
    time.sleep(8)
    status = win.evaluate_js("((document.querySelector('.vno-statusbar-left')||{}).textContent||'').replace(/\\s+/g,' ')") or ''
    edit = win.evaluate_js("(function(){ try { const body = document.querySelector('.vno-writer-body'); const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let n, count = 0; while ((n = walker.nextNode())) { if (n.textContent.trim().length > 12) { count++; if (count === 3) { const r = document.createRange(); r.selectNodeContents(n); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); const ce = n.parentElement.closest('[contenteditable]'); if (ce) ce.focus(); document.execCommand('bold'); const r2 = document.createRange(); r2.setStart(n, 0); r2.collapse(true); s.removeAllRanges(); s.addRange(r2); return 'insert=' + document.execCommand('insertText', false, 'ZZ'); } } } return 'no-text'; } catch (e) { return 'err:' + e.message; } })()")
    time.sleep(2)
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).catch(e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    for _ in range(200):
        time.sleep(3)
        if (os.path.exists(OUT) and os.path.getsize(OUT) > 0) or win.evaluate_js("window.__saveErr"): break
    time.sleep(4)
    print("RESULT " + json.dumps({"loaded": loaded, "status": status, "edit": edit, "err": win.evaluate_js("window.__saveErr")}, ensure_ascii=False), flush=True)
    win.evaluate_js("document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)
    win.destroy()
webview.start(after_load, window, debug=False)
'''
probe_path = os.path.join(OUTDIR, "_probe_writer_batch.py")
open(probe_path, "w", encoding="utf-8").write(PROBE)

rows = []
for name in names:
    src = os.path.join(DOCDIR, name)
    out = os.path.join(OUTDIR, "_rt_" + name)
    if os.path.exists(out): os.remove(out)
    orig_pages = word_pages(src)
    r = subprocess.run([sys.executable, probe_path, ROOT, src, out], capture_output=True, text=True, cwd=ROOT, timeout=1500, encoding="utf-8", errors="replace")
    m = re.search(r"RESULT (\{.*\})", r.stdout or "")
    res = json.loads(m.group(1)) if m else {"loaded": False, "status": (r.stderr or "")[-120:], "edit": "", "err": ""}
    canvas = re.search(r"Trang 1 / (\d+)", res.get("status", "")); canvas = int(canvas.group(1)) if canvas else "?"
    saved = os.path.exists(out)
    saved_pages = word_pages(out) if saved else "-"
    so, ss = docx_stats(src), (docx_stats(out) if saved else {})
    rows.append((name, orig_pages, canvas, saved_pages, "yes" if saved else "NO", "yes" if res.get("loaded") else "NO",
                 f"{so.get('paras')}/{ss.get('paras','-')}", f"{so.get('sect')}/{ss.get('sect','-')}", f"{so.get('br')}/{ss.get('br','-')}",
                 f"{so.get('pbb')}/{ss.get('pbb','-')}", f"{so.get('hdr')}/{ss.get('hdr','-')}", f"{so.get('ftr')}/{ss.get('ftr','-')}", f"{so.get('media')}/{ss.get('media','-')}",
                 ss.get("zz", "-"), (res.get("edit") or "")[:20], (res.get("err") or "")[:40]))
    print(name, "word", orig_pages, "canvas", canvas, "saved", saved_pages, "loaded", res.get("loaded"), flush=True)
    with open(os.path.join(OUTDIR, "_batch_writer_report.md"), "w", encoding="utf-8") as f:
        f.write("| file | Word pages | canvas pages | saved pages (Word) | saved | loaded | paras o/s | sectPr o/s | br o/s | pbb o/s | hdr o/s | ftr o/s | media o/s | ZZ | edit | err |\n|---|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|\n")
        for row in rows:
            f.write("| " + " | ".join(str(x) for x in row) + " |\n")
print("report:", os.path.join(OUTDIR, "_batch_writer_report.md"))
