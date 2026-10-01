"""IPC protocol and owner-election tests for per-app desktop instances."""

import concurrent.futures
import importlib.util
import json
import socket
import tempfile
import threading
import time
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "platform" / "single_instance.py"
SPEC = importlib.util.spec_from_file_location("vno_single_instance_tests", MODULE_PATH)
single_instance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(single_instance)


class SingleInstanceTests(unittest.TestCase):
    def test_forward_open_and_new_document_requests(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            received = []
            received_event = threading.Event()

            def on_request(request):
                received.append(request)
                received_event.set()

            owner = single_instance.SingleInstanceServer("writer", temp_dir, on_request)
            owner.start()
            try:
                opened = single_instance.forward_launch_request(temp_dir, "writer", r"C:\Docs\memo.docx")
                self.assertTrue(opened["accepted"])
                self.assertTrue(received_event.wait(2))
                self.assertEqual(received[-1]["path"], r"C:\Docs\memo.docx")

                received_event.clear()
                blank = single_instance.forward_launch_request(temp_dir, "writer", None)
                self.assertTrue(blank["accepted"])
                self.assertTrue(received_event.wait(2))
                self.assertIsNone(received[-1]["path"])
            finally:
                owner.stop()

    def test_crash_left_endpoint_is_replaced_after_owner_lock_releases(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            first = single_instance.SingleInstanceServer("sheet", temp_dir, lambda _request: None)
            first.start()
            stale_session = json.loads(first.endpoint_path.read_text(encoding="utf-8"))["session_id"]
            server = first._server
            server.shutdown()
            server.server_close()
            first._server = None
            first._server_thread.join(timeout=2)
            first._server_thread = None
            first.release_owner_lock()

            received = []
            replacement = single_instance.SingleInstanceServer("sheet", temp_dir, received.append)
            replacement.start()
            try:
                endpoint = json.loads(replacement.endpoint_path.read_text(encoding="utf-8"))
                self.assertNotEqual(endpoint["session_id"], stale_session)
                result = single_instance.forward_launch_request(temp_dir, "sheet", None)
                self.assertTrue(result["accepted"])
                deadline = time.monotonic() + 2
                while not received and time.monotonic() < deadline:
                    time.sleep(0.01)
                self.assertEqual(len(received), 1)
            finally:
                replacement.stop()
                first.stop()

    def test_unresponsive_owner_is_fenced_and_stale_endpoint_is_taken_over(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            ownership_lost = threading.Event()
            first = single_instance.SingleInstanceServer(
                "writer", temp_dir, lambda _request: None, on_ownership_lost=ownership_lost.set
            )
            first.start()
            old_session = first.session_id
            stale_server = first._server
            stale_server.shutdown()
            stale_server.server_close()
            first._server = None
            first._server_thread.join(timeout=2)
            first._server_thread = None

            replacement = single_instance.SingleInstanceServer("writer", temp_dir, lambda _request: None)
            with self.assertRaises(single_instance.InstanceAlreadyRunning):
                replacement.start()
            self.assertTrue(replacement.take_over_unresponsive(timeout=0.1))
            try:
                self.assertNotEqual(replacement.session_id, old_session)
                self.assertTrue(ownership_lost.wait(2))
                routed = single_instance.forward_launch_request(temp_dir, "writer", None)
                self.assertTrue(routed["accepted"])
            finally:
                replacement.stop()
                first.stop()

    def test_shutdown_releases_owner_lock_only_after_endpoint_stops(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            owner = single_instance.SingleInstanceServer("writer", temp_dir, lambda _request: None)
            owner.start()
            contender = single_instance.SingleInstanceServer("writer", temp_dir, lambda _request: None)
            try:
                owner.stop_listener()
                with self.assertRaises(single_instance.InstanceAlreadyRunning):
                    contender.start()
                self.assertFalse(contender.take_over_unresponsive(timeout=0.1))
                owner.release_owner_lock()
                contender.start()
            finally:
                owner.stop()
                contender.stop()

    def test_missing_endpoint_can_be_taken_over_after_shutdown_grace(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            owner = single_instance.SingleInstanceServer("sheet", temp_dir, lambda _request: None)
            owner.start()
            owner.stop_listener()
            contender = single_instance.SingleInstanceServer("sheet", temp_dir, lambda _request: None)
            try:
                with self.assertRaises(single_instance.InstanceAlreadyRunning):
                    contender.start()
                self.assertFalse(contender.take_over_unresponsive())
                self.assertTrue(contender.take_over_unresponsive(allow_missing=True))
                self.assertTrue(contender.endpoint_path.is_file())
            finally:
                contender.stop()
                owner.release_owner_lock()
                owner.stop()

    def test_invalid_token_is_rejected_without_dispatch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            received = []
            owner = single_instance.SingleInstanceServer("slides", temp_dir, received.append)
            owner.start()
            try:
                endpoint = json.loads(owner.endpoint_path.read_text(encoding="utf-8"))
                request = {
                    "protocol": single_instance.PROTOCOL_VERSION,
                    "app_kind": "slides",
                    "token": "0" * 64,
                    "request_id": "1" * 32,
                    "path": None,
                }
                with socket.create_connection(("127.0.0.1", endpoint["port"]), timeout=1) as connection:
                    connection.sendall(json.dumps(request).encode("utf-8") + b"\n")
                    response = json.loads(connection.makefile("rb").readline().decode("utf-8"))
                self.assertFalse(response["accepted"])
                self.assertEqual(received, [])
            finally:
                owner.stop()

    def test_authenticated_ping_checks_router_health_without_opening_document(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            received = []
            owner = single_instance.SingleInstanceServer(
                "slides", temp_dir, received.append, on_ping=lambda: False
            )
            owner.start()
            try:
                response = single_instance.forward_launch_request(
                    temp_dir, "slides", None, ping=True, timeout=1
                )
                self.assertFalse(response["accepted"])
                self.assertFalse(response["pong"])
                self.assertEqual(received, [])
            finally:
                owner.stop()

    def test_concurrent_launches_elect_one_owner_and_forward_the_rest(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            launch_count = 8
            barrier = threading.Barrier(launch_count)
            owner_instances = []
            owner_guard = threading.Lock()
            accepted_requests = []

            def on_request(request):
                accepted_requests.append(request)

            def launch(index):
                barrier.wait(timeout=3)
                for _attempt in range(60):
                    candidate = single_instance.SingleInstanceServer("writer", temp_dir, on_request)
                    try:
                        candidate.start()
                        with owner_guard:
                            owner_instances.append(candidate)
                        return "owner"
                    except single_instance.InstanceAlreadyRunning:
                        result = single_instance.forward_launch_request(
                            temp_dir, "writer", f"document-{index}.docx", timeout=0.3
                        )
                        if result and result.get("accepted"):
                            return "forwarded"
                        time.sleep(0.02)
                return "failed"

            with concurrent.futures.ThreadPoolExecutor(max_workers=launch_count) as pool:
                results = list(pool.map(launch, range(launch_count)))
            try:
                self.assertEqual(results.count("owner"), 1, results)
                self.assertEqual(results.count("forwarded"), launch_count - 1, results)
                self.assertEqual(len(accepted_requests), launch_count - 1)
            finally:
                for owner in owner_instances:
                    owner.stop()

    def test_each_app_kind_gets_an_independent_owner_endpoint(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            owners = [
                single_instance.SingleInstanceServer(kind, temp_dir, lambda _request: None)
                for kind in ("writer", "sheet", "slides")
            ]
            try:
                for owner in owners:
                    owner.start()
                self.assertEqual(len({owner.endpoint_path for owner in owners}), 3)
                self.assertEqual(len({owner.token for owner in owners}), 3)
            finally:
                for owner in owners:
                    owner.stop()


if __name__ == "__main__":
    unittest.main()
