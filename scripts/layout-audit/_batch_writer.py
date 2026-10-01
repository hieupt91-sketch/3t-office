"""Word page parity and save audit driven through WebView2 CDP.

Usage: python _batch_writer.py <worktree> <docx-dir> <out-dir> [names...]
Word page counts use hidden COM. The 3T Writer window is inspected and edited
through its WebView2 remote-debugging endpoint; this script sends no OS input.
"""

import glob
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT, DOCDIR, OUTDIR = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3])
names = sys.argv[4:] or sorted(os.path.basename(path) for path in glob.glob(os.path.join(DOCDIR, "*.docx")))
SP = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)


def word_pages(path):
    result = subprocess.run(
        ["powershell", "-NoProfile", "-File", os.path.join(SP, "_word_oracle3.ps1"), "-File", path],
        capture_output=True,
        text=True,
        timeout=400,
    )
    match = re.search(r"pages=(\d+)", result.stdout or "")
    return int(match.group(1)) if match else (result.stdout or result.stderr).strip()[:60]


def docx_stats(path):
    try:
        archive = zipfile.ZipFile(path)
        xml = archive.read("word/document.xml").decode("utf8", "replace")
    except Exception as exc:
        return {"err": str(exc)[:40]}
    body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", xml)
    return {
        "paras": len(re.findall(r"<w:p[ >]", body)),
        "sect": len(re.findall(r"<w:pPr>(?:(?!</w:pPr>)[\s\S])*?<w:sectPr", body)),
        "br": len(re.findall(r'<w:br\b[^>]*w:type="page"', body)),
        "pbb": len(re.findall(r"<w:pageBreakBefore\b", body)),
        "hdr": len([name for name in archive.namelist() if name.startswith("word/header") and name.endswith(".xml")]),
        "ftr": len([name for name in archive.namelist() if name.startswith("word/footer") and name.endswith(".xml")]),
        "media": len([name for name in archive.namelist() if name.startswith("word/media/")]),
        "anchors": xml.count("<wp:anchor"),
        "tables": xml.count("<w:tbl>"),
        "zz": "ZZ" in xml,
    }


PROBE = r'''
import json, os, sys, threading, time
ROOT, DOCX, OUT, SCRIPTS = sys.argv[1:5]
sys.path.insert(0, ROOT)
sys.path.insert(0, SCRIPTS)
from _cdp_client import connect_to_page, free_local_port
CDP_PORT = free_local_port()
os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = f"--remote-debugging-port={CDP_PORT}"
import webview, main as vnmain
server, static_port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCX])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(
    title="3T Doc - Page audit",
    url=vnmain.build_launch_url(app_kind, initial_file, port=static_port),
    width=1400,
    height=900,
    js_api=api,
)
window.create_file_dialog = lambda *args, **kwargs: OUT
stem = os.path.splitext(os.path.basename(DOCX))[0][:6]
finished = threading.Event()

def run_cdp():
    page = None
    loaded = False
    status = ""
    edit = ""
    error = ""
    try:
        page = connect_to_page(CDP_PORT, timeout=90)
        page.call("Runtime.enable")
        page.call("Page.enable")
        deadline = time.monotonic() + 900
        while time.monotonic() < deadline:
            state = page.evaluate("({name:(document.querySelector('.vno-doc-tab span')||{}).textContent||'',status:((document.querySelector('.vno-statusbar-left')||{}).textContent||'').replace(/\\s+/g,' ')})")
            name = state.get("name") or ""
            status = state.get("status") or ""
            if stem and stem.lower() in name.lower():
                loaded = True
                break
            time.sleep(0.35)

        if loaded:
            time.sleep(3)
            edit = page.evaluate(r"""(() => { try {
              const body = document.querySelector('.vno-writer-body');
              if (!body) return 'no-body';
              const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
              let node, count = 0;
              while ((node = walker.nextNode())) {
                if (node.textContent.trim().length > 12 && ++count === 3) {
                  const range = document.createRange(); range.selectNodeContents(node);
                  const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
                  const editable = node.parentElement.closest('[contenteditable]'); if (editable) editable.focus();
                  document.execCommand('bold');
                  const start = document.createRange(); start.setStart(node, 0); start.collapse(true);
                  selection.removeAllRanges(); selection.addRange(start);
                  return 'insert=' + document.execCommand('insertText', false, 'ZZ');
                }
              }
              return 'no-text';
            } catch (e) { return 'err:' + e.message; } })()""")
            time.sleep(1)
            page.evaluate(r"""(() => {
              window.__saveErr = '';
              import('/platform/commands/command-bus.js')
                .then(module => module.globalCommandBus.execute('common.file.saveAs'))
                .catch(error => { window.__saveErr = String(error?.stack || error); });
              return 'queued';
            })()""")
            deadline = time.monotonic() + 600
            while time.monotonic() < deadline:
                error = str(page.evaluate("window.__saveErr || ''") or '')
                if error or (os.path.exists(OUT) and os.path.getsize(OUT) > 0):
                    break
                time.sleep(0.5)
        print("RESULT " + json.dumps({"loaded": loaded, "status": status, "edit": edit, "err": error}, ensure_ascii=False), flush=True)
    except Exception as exc:
        error = str(exc)
        print("CDP_ERROR:", type(exc).__name__, error, flush=True)
        print("RESULT " + json.dumps({"loaded": loaded, "status": status, "edit": edit, "err": error}, ensure_ascii=False), flush=True)
    finally:
        try:
            if page is not None: page.call("Page.close", timeout=5)
        except Exception:
            pass
        if page is not None: page.close()
        finished.set()
        try: window.destroy()
        except Exception: pass

threading.Thread(target=run_cdp, name="3t-writer-cdp-audit", daemon=True).start()
webview.start(debug=False)
if not finished.is_set(): window.destroy()
'''

probe_path = os.path.join(OUTDIR, "_probe_writer_batch.py")
with open(probe_path, "w", encoding="utf-8") as probe_file:
    probe_file.write(PROBE)

rows = []
for name in names:
    source = os.path.join(DOCDIR, name)
    output = os.path.join(OUTDIR, "_rt_" + name)
    if os.path.exists(output):
        os.remove(output)
    original_pages = word_pages(source)
    result = subprocess.run(
        [sys.executable, probe_path, ROOT, source, output, SP],
        capture_output=True,
        text=True,
        cwd=ROOT,
        timeout=1500,
        encoding="utf-8",
        errors="replace",
    )
    match = re.search(r"RESULT (\{.*\})", result.stdout or "")
    data = json.loads(match.group(1)) if match else {
        "loaded": False,
        "status": (result.stderr or result.stdout or "")[-120:],
        "edit": "",
        "err": "",
    }
    canvas_match = re.search(r"Trang 1 / (\d+)", data.get("status", ""))
    canvas_pages = int(canvas_match.group(1)) if canvas_match else "?"
    saved = os.path.exists(output)
    saved_pages = word_pages(output) if saved else "-"
    source_stats, output_stats = docx_stats(source), (docx_stats(output) if saved else {})
    rows.append((
        name,
        original_pages,
        canvas_pages,
        saved_pages,
        "yes" if saved else "NO",
        "yes" if data.get("loaded") else "NO",
        f"{source_stats.get('paras')}/{output_stats.get('paras', '-')}",
        f"{source_stats.get('sect')}/{output_stats.get('sect', '-')}",
        f"{source_stats.get('br')}/{output_stats.get('br', '-')}",
        f"{source_stats.get('pbb')}/{output_stats.get('pbb', '-')}",
        f"{source_stats.get('hdr')}/{output_stats.get('hdr', '-')}",
        f"{source_stats.get('ftr')}/{output_stats.get('ftr', '-')}",
        f"{source_stats.get('media')}/{output_stats.get('media', '-')}",
        output_stats.get("zz", "-"),
        (data.get("edit") or "")[:20],
        (data.get("err") or "")[:40],
    ))
    print(name, "word", original_pages, "canvas", canvas_pages, "saved", saved_pages, "loaded", data.get("loaded"), flush=True)
    with open(os.path.join(OUTDIR, "_batch_writer_report.md"), "w", encoding="utf-8") as report:
        report.write("| file | Word pages | canvas pages | saved pages (Word) | saved | loaded | paras o/s | sectPr o/s | br o/s | pbb o/s | hdr o/s | ftr o/s | media o/s | ZZ | edit | err |\n")
        report.write("|---|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|\n")
        for row in rows:
            report.write("| " + " | ".join(str(value) for value in row) + " |\n")

print("report:", os.path.join(OUTDIR, "_batch_writer_report.md"))
