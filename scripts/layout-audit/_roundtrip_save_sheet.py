"""Legacy batch Save As entry; desktop control uses WebView2 CDP only.

Usage: python _roundtrip_save_sheet.py <worktree> <xlsx-in> <xlsx-out>
The native save dialog is bypassed and the actual sent FODS is retained locally.
"""
import os
import socket
import subprocess
import sys
import time
import functools
from pathlib import Path

ROOT, XLSX_PATH, OUT = sys.argv[1:4]
sys.path.insert(0, ROOT)
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    debug_port = listener.getsockname()[1]
os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = (
    os.environ.get("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "")
    + f" --remote-debugging-port={debug_port}"
)
import webview
import main as vnmain

if os.environ.get("VNO_PERF_DEBUG") == "1":
    def measure(name):
        original = getattr(vnmain, name)
        @functools.wraps(original)
        def wrapped(*args, **kwargs):
            started = time.perf_counter()
            vnmain._open_perf_log("audit_" + name + "_begin")
            result = original(*args, **kwargs)
            vnmain._open_perf_log("audit_" + name, (time.perf_counter() - started) * 1000,
                                 chars=len(result) if isinstance(result, str) else 0)
            return result
        setattr(vnmain, name, wrapped)
    for name in ("_run_soffice_convert", "_apply_native_import_overlay",
                 "_optimize_fods_for_sheet", "_convert_save_source_to_native"):
        measure(name)

webview.settings["REMOTE_DEBUGGING_PORT"] = debug_port
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([XLSX_PATH])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
original_save = api.save_document_dialog


def dump_save(content, app_kind="writer", target_format=None,
              suggested_name="TaiLieu", source_path=None):
    Path(OUT + ".sent.fods").write_text(content, encoding="utf-8")
    return original_save(content, app_kind, target_format, suggested_name, source_path)


api.save_document_dialog = dump_save
window = webview.create_window(
    title="VN Sheet - Roundtrip Save",
    url=vnmain.build_launch_url(app_kind, initial_file, port=port),
    width=1400, height=900, js_api=api,
)
window.create_file_dialog = lambda *args, **kwargs: OUT


def after_load():
    global audit_exit
    try:
        result = subprocess.run([
            "node", "--experimental-websocket",
            str(Path(__file__).with_name("roundtrip-save-sheet.mjs")),
            str(debug_port), XLSX_PATH, OUT,
        ], check=False)
        audit_exit = result.returncode
    finally:
        window.destroy()


audit_exit = 1
try:
    webview.start(after_load, debug=False)
finally:
    server.shutdown()
    server.server_close()
raise SystemExit(audit_exit)
