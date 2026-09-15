import sys, time, os
sys.path.insert(0, sys.argv[1])
import webview
import main as vnmain

DOCX_PATH = sys.argv[2]
OUT = sys.argv[3]
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCX_PATH])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
_orig_save = api.save_document_dialog
def _dump_save(content, *a, **k):
    with open(OUT + ".sent.html", "w", encoding="utf-8") as f:
        f.write(content)
    print("SAVE_ARGS:", a, k, flush=True)
    return _orig_save(content, *a, **k)
api.save_document_dialog = _dump_save
window = webview.create_window(title="VN Writer - Roundtrip Save", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)

def after_load(win):
    name = ""
    for _ in range(50):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''")
        if name and not name.startswith("Tài liệu"):
            break
    print("LOADED:", name, flush=True)
    time.sleep(5)
    print('EDIT:', win.evaluate_js("(function(){ try { const body = document.querySelector('.vno-writer-body') || document.querySelector('[contenteditable=true]'); if (!body) return 'no-body'; const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let n, count = 0; while ((n = walker.nextNode())) { if (n.textContent.trim().length > 12) { count++; if (count === 3) { const r = document.createRange(); r.selectNodeContents(n); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); const ce = n.parentElement.closest('[contenteditable]'); if (ce) ce.focus(); const ok = document.execCommand('bold'); const r2 = document.createRange(); r2.setStart(n, 0); r2.collapse(true); s.removeAllRanges(); s.addRange(r2); const ok2 = document.execCommand('insertText', false, 'ZZ'); return 'bold=' + ok + ' insert=' + ok2 + ' :' + n.textContent.slice(0, 30); } } } return 'no-text'; } catch (e) { return 'err:' + e.message; } })()"), flush=True)
    time.sleep(2)
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveDone=0; window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).then(r => { window.__saveDone = 1; }, e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    for _ in range(80):
        time.sleep(3)
        if os.path.exists(OUT) or win.evaluate_js("window.__saveErr"):
            break
    time.sleep(6)
    print("ERR:", win.evaluate_js("window.__saveErr"), flush=True)
    print("EXISTS:", os.path.exists(OUT), os.path.getsize(OUT) if os.path.exists(OUT) else 0, flush=True)
    win.evaluate_js("document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)
    win.destroy()

webview.start(after_load, window, debug=False)
