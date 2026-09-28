"""Scratch-only WebView2 bridge/parse probe for a local text payload."""
import json
import os
import sys
import threading
import time
import webview

_probe_window = None


class Api:
    def __init__(self, payload_path, mode):
        self.payload_path = payload_path
        self.mode = mode

    def get_payload(self):
        with open(self.payload_path, "r", encoding="utf-8", errors="replace") as source:
            return source.read()

    def report(self, result):
        print(json.dumps(result, indent=2), flush=True)
        threading.Timer(1.0, _probe_window.destroy).start()
        return True


def main(path, mode):
    api = Api(path, mode)
    html = """<!doctype html><meta charset=utf-8><script>
      async function run() {
        const t0 = performance.now();
        const payload = await window.pywebview.api.get_payload();
        const transferMs = performance.now() - t0;
        const chars = payload.length;
        const t1 = performance.now();
        let structure;
        if (MODE === 'json') structure = JSON.parse(payload);
        else structure = new DOMParser().parseFromString(payload, 'text/xml');
        const parseMs = performance.now() - t1;
        await window.pywebview.api.report({mode: MODE, chars, transfer_ms: transferMs,
          parse_ms: parseMs, parse_ok: MODE === 'json' ? Array.isArray(structure.sheets) : !structure.querySelector('parsererror')});
      }
      window.addEventListener('pywebviewready', run);
    </script>""".replace("MODE", json.dumps(mode))
    global _probe_window
    _probe_window = webview.create_window("Payload measurement scratch", html=html, js_api=api, width=640, height=400)
    webview.start(debug=False)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
