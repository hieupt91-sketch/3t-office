"""Embedded UI resources must revalidate after an application update."""
from __future__ import annotations

import sys
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402


class StaticServerCacheHeaderTests(unittest.TestCase):
    def test_ui_resources_are_revalidated(self):
        server, port = vnmain._start_static_server()
        try:
            for path in ("/index.html", "/apps/sheet/sheet-app.js", "/apps/sheet/sheet.css"):
                with self.subTest(path=path):
                    request = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method="HEAD")
                    with urllib.request.urlopen(request, timeout=10) as response:
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.headers.get("Cache-Control"), "no-cache")
                        modified = response.headers.get("Last-Modified")
                    conditional = urllib.request.Request(
                        f"http://127.0.0.1:{port}{path}",
                        headers={"If-Modified-Since": modified},
                    )
                    try:
                        urllib.request.urlopen(conditional, timeout=10)
                    except urllib.error.HTTPError as response:
                        self.assertEqual(response.code, 304)
                        self.assertEqual(response.headers.get("Cache-Control"), "no-cache")
                    else:
                        self.fail("matching If-Modified-Since should return 304")
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
