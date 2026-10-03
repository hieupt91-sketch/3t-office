"""The embedded static server must survive the page's start-up burst of parallel requests.

Regression (04/10/2026): socketserver's default listen backlog (5) overflowed when the UI fetched dozens of module/CSS
files at once; Windows answered ERR_CONNECTION_REFUSED and the window stayed blank in ~20% of launches.
"""
from __future__ import annotations

import sys
import threading
import unittest
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402


class StaticServerBacklogTests(unittest.TestCase):
    def test_backlog_is_large_enough_for_a_startup_burst(self):
        self.assertGreaterEqual(vnmain._QuietTCPServer.request_queue_size, 64)

    def test_parallel_burst_is_served_without_refusals(self):
        server, port = vnmain._start_static_server()
        try:
            def fetch(_):
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/index.html", timeout=10) as response:
                    return response.status

            with ThreadPoolExecutor(max_workers=80) as pool:
                statuses = list(pool.map(fetch, range(160)))
            self.assertEqual(set(statuses), {200})
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
