"""Usage: python _roundtrip_save_sheet.py <worktree> <xlsx-in> <xlsx-out>
Opens the real app window on <xlsx-in>, triggers common.file.save with the native dialog
bypassed, writes <xlsx-out> and <xlsx-out>.sent.fods (the FODS payload the app sent)."""
import sys, time, os, socket, subprocess, json
ROOT, XLSX_PATH, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, ROOT)
import webview
import main as vnmain

with socket.socket() as debug_socket:
    debug_socket.bind(("127.0.0.1", 0))
    debug_port = debug_socket.getsockname()[1]
os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = f"--remote-debugging-port={debug_port}"

def cdp_evaluate(remote, expression):
    remote.stdin.write(json.dumps(expression) + "\n")
    remote.stdin.flush()
    response = json.loads(remote.stdout.readline())
    if "error" in response:
        raise RuntimeError(response["error"])
    return response.get("value")

server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([XLSX_PATH])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
_orig_save = api.save_document_dialog
def _dump_save(content, *a, **k):
    with open(OUT + ".sent.fods", "w", encoding="utf-8") as f:
        f.write(content)
    return _orig_save(content, *a, **k)
api.save_document_dialog = _dump_save
window = webview.create_window(title="VN Sheet - Roundtrip Save", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
stem = os.path.splitext(os.path.basename(XLSX_PATH))[0][:6]

def run_audit(win, remote):
    name = ''
    # VAT.xlsx (lan06): soffice convert ~7.5 phút → chờ tối đa 15 phút
    for _ in range(300):
        time.sleep(3)
        name = cdp_evaluate(remote, "(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
        if stem and stem in name:
            break
    print("LOADED:", name, flush=True)
    time.sleep(4)
    win.create_file_dialog = lambda *a, **k: OUT
    cdp_evaluate(remote, "window.__saveDone=0; window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.saveAs')).then(r => { window.__saveDone = 1; window.__saveRes = String(r); }, e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    done = 0; err = ''
    for _ in range(400):
        time.sleep(3)
        done = cdp_evaluate(remote, "window.__saveDone")
        err = cdp_evaluate(remote, "window.__saveErr")
        if done == 1 or err or (os.path.exists(OUT) and os.path.getsize(OUT) > 0):
            break
    print("SAVE_DONE:", done, "ERR:", err, flush=True)
    print("EXISTS:", os.path.exists(OUT), os.path.getsize(OUT) if os.path.exists(OUT) else 0, flush=True)
    cdp_evaluate(remote, "document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)


audit_errors = []

def after_load(win):
    remote = subprocess.Popen(["node", "--experimental-websocket", os.path.join(os.path.dirname(__file__), "_cdp_eval.mjs"), str(debug_port)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
    try:
        run_audit(win, remote)
    except Exception as exc:
        audit_errors.append(exc)
        print("AUDIT_ERROR:", repr(exc), flush=True)
    finally:
        remote.stdin.close()
        try:
            remote.wait(timeout=10)
        except subprocess.TimeoutExpired:
            remote.terminate()  # Only the CDP helper launched above.
            remote.wait(timeout=10)
        win.destroy()

webview.start(after_load, window, debug=False)
if audit_errors:
    raise SystemExit(1)
