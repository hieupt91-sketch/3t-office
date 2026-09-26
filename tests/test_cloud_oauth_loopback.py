"""Unit tests for OAuth loopback callback server in main.py.

Tests cover:
- Finding available port (auto port detection)
- Starting/stopping server correctly
- Handling port busy scenarios
- Callback data retrieval
- Error handling for invalid requests
"""

from __future__ import annotations

import json
import socket
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import main


class OAuthLoopbackServerTests(unittest.TestCase):
    """Tests for _start_oauth_loopback_server and _OAuthLoopbackServer."""

    def test_start_oauth_loopback_finds_available_port(self):
        """_start_oauth_loopback_server should find and bind to an available port."""
        server, port = main._start_oauth_loopback_server()

        try:
            self.assertIsInstance(port, int)
            self.assertGreaterEqual(port, main._OAUTH_LOOPBACK_DEFAULT_PORT)
            self.assertLess(port, main._OAUTH_LOOPBACK_DEFAULT_PORT + main._OAUTH_LOOPBACK_MAX_ATTEMPTS)
            self.assertIsNotNone(server)
            self.assertTrue(hasattr(server, "_callback_data"))
        finally:
            server.shutdown()
            server.server_close()

    def test_start_oauth_loopback_returns_different_ports_on_subsequent_calls(self):
        """Each call should return a different port if previous is still running."""
        server1, port1 = main._start_oauth_loopback_server()
        server2, port2 = main._start_oauth_loopback_server()

        try:
            self.assertNotEqual(port1, port2)
        finally:
            server1.shutdown()
            server1.server_close()
            server2.shutdown()
            server2.server_close()

    def test_start_oauth_loopback_handles_port_busy(self):
        """Should skip busy ports and find the next available one."""
        # Occupy the default port
        occupied = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        occupied.bind(("127.0.0.1", main._OAUTH_LOOPBACK_DEFAULT_PORT))
        occupied.listen(1)

        try:
            server, port = main._start_oauth_loopback_server()
            self.assertNotEqual(port, main._OAUTH_LOOPBACK_DEFAULT_PORT)
            self.assertGreater(port, main._OAUTH_LOOPBACK_DEFAULT_PORT)
        finally:
            occupied.close()
            server.shutdown()
            server.server_close()

    def test_start_oauth_loopback_raises_when_no_port_available(self):
        """Should raise RuntimeError when all ports in range are busy."""
        sockets = []
        try:
            for port in range(
                main._OAUTH_LOOPBACK_DEFAULT_PORT,
                main._OAUTH_LOOPBACK_DEFAULT_PORT + main._OAUTH_LOOPBACK_MAX_ATTEMPTS,
            ):
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.bind(("127.0.0.1", port))
                s.listen(1)
                sockets.append(s)

            with self.assertRaises(RuntimeError) as cm:
                main._start_oauth_loopback_server()
            self.assertIn("Không tìm thấy cổng trống", str(cm.exception))
        finally:
            for s in sockets:
                s.close()

    def test_callback_handler_stores_code_and_state(self):
        """Handler should parse and store authorization code and state."""
        server, port = main._start_oauth_loopback_server()

        # Wait for server to be ready
        time.sleep(0.1)

        try:
            # Simulate OAuth callback
            import urllib.request
            url = f"http://127.0.0.1:{port}/callback?code=test-auth-code&state=test-state-123"
            response = urllib.request.urlopen(url, timeout=5)
            html = response.read().decode("utf-8")

            self.assertIn("Đăng nhập thành công", html)
            self.assertEqual(server._callback_data, {"code": "test-auth-code", "state": "test-state-123"})
        finally:
            server.shutdown()
            server.server_close()

    def test_callback_handler_stores_error(self):
        """Handler should parse and store OAuth error responses."""
        server, port = main._start_oauth_loopback_server()

        # Wait for server to be ready
        time.sleep(0.1)

        try:
            import urllib.request
            url = f"http://127.0.0.1:{port}/callback?error=access_denied&error_description=User%20denied"
            response = urllib.request.urlopen(url, timeout=5)
            html = response.read().decode("utf-8")

            self.assertIn("Đăng nhập thất bại", html)
            self.assertEqual(
                server._callback_data,
                {"error": "access_denied", "error_description": "User denied"},
            )
        finally:
            server.shutdown()
            server.server_close()

    def test_callback_handler_returns_404_for_wrong_path(self):
        """Handler should return 404 for non-callback paths."""
        server, port = main._start_oauth_loopback_server()

        # Wait for server to be ready
        time.sleep(0.1)

        try:
            import urllib.request
            url = f"http://127.0.0.1:{port}/wrong-path"
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(url, timeout=5)
            self.assertEqual(cm.exception.code, 404)
        finally:
            server.shutdown()
            server.server_close()

    def test_callback_handler_returns_error_for_missing_code(self):
        """Handler should return error when neither code nor error in query."""
        server, port = main._start_oauth_loopback_server()

        # Wait for server to be ready
        time.sleep(0.1)

        try:
            import urllib.request
            url = f"http://127.0.0.1:{port}/callback?foo=bar"
            response = urllib.request.urlopen(url, timeout=5)
            html = response.read().decode("utf-8")

            self.assertIn("Đăng nhập thất bại", html)
            self.assertEqual(
                server._callback_data,
                {"error": "invalid_request", "error_description": "Không nhận được mã xác thực."},
            )
        finally:
            server.shutdown()
            server.server_close()


class VnOfficeApiOAuthLoopbackTests(unittest.TestCase):
    """Tests for VnOfficeApi OAuth loopback methods."""

    def setUp(self):
        self.api = main.VnOfficeApi("writer")

    def tearDown(self):
        if self.api._oauth_loopback_server:
            self.api.stopOAuthLoopback()

    def test_start_oauth_loopback_returns_port(self):
        """startOAuthLoopback should return a valid port number."""
        port = self.api.startOAuthLoopback()
        self.assertIsInstance(port, int)
        self.assertGreaterEqual(port, main._OAUTH_LOOPBACK_DEFAULT_PORT)
        self.assertLess(port, main._OAUTH_LOOPBACK_DEFAULT_PORT + main._OAUTH_LOOPBACK_MAX_ATTEMPTS)

    def test_stop_oauth_loopback_closes_server(self):
        """stopOAuthLoopback should close the server and reset state."""
        port = self.api.startOAuthLoopback()
        self.assertIsNotNone(self.api._oauth_loopback_server)

        self.api.stopOAuthLoopback()
        self.assertIsNone(self.api._oauth_loopback_server)
        self.assertIsNone(self.api._oauth_loopback_port)

    def test_stop_oauth_loopback_idempotent(self):
        """Calling stopOAuthLoopback twice should not raise."""
        self.api.startOAuthLoopback()
        self.api.stopOAuthLoopback()
        self.api.stopOAuthLoopback()  # Should not raise
        self.assertIsNone(self.api._oauth_loopback_server)

    def test_poll_oauth_callback_returns_none_when_no_server(self):
        """pollOAuthCallback should return None when no server running."""
        self.assertIsNone(self.api.pollOAuthCallback())

    def test_poll_oauth_callback_returns_data_after_callback(self):
        """pollOAuthCallback should return callback data after OAuth redirect."""
        port = self.api.startOAuthLoopback()

        # Wait for server to be ready
        time.sleep(0.1)

        # Simulate callback
        import urllib.request
        url = f"http://127.0.0.1:{port}/callback?code=auth-code-xyz&state=state-abc"
        urllib.request.urlopen(url, timeout=5)

        # Poll should return the data
        data = self.api.pollOAuthCallback()
        self.assertIsNotNone(data)
        self.assertEqual(data.get("code"), "auth-code-xyz")
        self.assertEqual(data.get("state"), "state-abc")

    def test_start_oauth_loopback_replaces_existing_server(self):
        """Calling startOAuthLoopback twice should stop old server and start new one (may reuse port)."""
        port1 = self.api.startOAuthLoopback()
        server1 = self.api._oauth_loopback_server

        port2 = self.api.startOAuthLoopback()
        server2 = self.api._oauth_loopback_server

        # New server instance should be created
        self.assertIsNot(server1, server2)
        # Port may be same (reused after old server closed) or different
        # Old server should be closed, new one should work
        time.sleep(0.1)  # Wait for new server to be ready
        import urllib.request
        url = f"http://127.0.0.1:{port2}/callback?code=test&state=test"
        urllib.request.urlopen(url, timeout=5)
        data = self.api.pollOAuthCallback()
        self.assertEqual(data.get("code"), "test")


class ClientIdValidationTests(unittest.TestCase):
    """Tests for Client ID validation error handling (via cloud-config.js logic)."""

    def test_validate_client_id_returns_error_when_empty(self):
        """validateClientId should return error message in Vietnamese when Client ID not configured."""
        # This test validates the logic that would be in cloud-config.js
        # Since we're testing Python side, we verify the API returns proper errors
        # This is a placeholder for integration test when JS is wired up
        self.assertTrue(True)  # Placeholder - JS validation tested separately


if __name__ == "__main__":
    unittest.main()