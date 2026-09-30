"""Measure bridge and payload loading in a local WebView2 window."""
import json
import pathlib
import sys
import threading
import webview

_probe_window = None


class Api:
    def __init__(self, payload_path, source_path=None):
        self.payload_path = payload_path
        self.source_path = source_path

    def get_payload(self):
        with open(self.payload_path, "r", encoding="utf-8", errors="strict") as source:
            return source.read()

    def get_source_fods(self):
        if not self.source_path:
            return None
        with open(self.source_path, "r", encoding="utf-8", errors="strict", newline="") as source:
            return source.read()

    def report(self, result):
        print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
        threading.Timer(0.5, _probe_window.destroy).start()
        return True


def main(path, source_path=None):
    global _probe_window
    api = Api(path, source_path)
    html = pathlib.Path(__file__).with_name("webview_payload_probe.html").resolve().as_uri()
    _probe_window = webview.create_window(
        "Sheet payload measurement scratch", url=html, js_api=api, width=640, height=400
    )
    webview.start(debug=False)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python scripts/perf-proto/webview_payload_probe.py <payload.json> [source.fods]")
    main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else None)
