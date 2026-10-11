import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import main


class ClipboardOsServiceRoutingTests(unittest.TestCase):
    def setUp(self):
        class ClipboardPayload:
            def __init__(self, text="", html=""):
                self.text = text
                self.html = html

        self.payload_type = ClipboardPayload
        self.package = types.ModuleType("_vno_os_services")
        self.package.ClipboardPayload = self.payload_type
        self.previous_package = sys.modules.get("_vno_os_services")
        sys.modules["_vno_os_services"] = self.package

    def tearDown(self):
        if self.previous_package is None:
            sys.modules.pop("_vno_os_services", None)
        else:
            sys.modules["_vno_os_services"] = self.previous_package

    def test_read_uses_clipboard_service_payload(self):
        service = SimpleNamespace(read=lambda: SimpleNamespace(
            is_ok=True,
            value=SimpleNamespace(text="Chào", html="<b>Chào</b>"),
            error=None,
        ))
        with patch.object(main, "_os_services", return_value=SimpleNamespace(data_dirs=None, clipboard_extras=service)):
            result = main.VnOfficeApi().read_clipboard_data()
        self.assertEqual(result, {"status": "ok", "text": "Chào", "html": "<b>Chào</b>"})

    def test_write_uses_clipboard_service_payload(self):
        written = []

        def write(payload):
            written.append(payload)
            return SimpleNamespace(is_ok=True, value=None, error=None)

        service = SimpleNamespace(write=write)
        with patch.object(main, "_os_services", return_value=SimpleNamespace(data_dirs=None, clipboard_extras=service)):
            result = main.VnOfficeApi().write_clipboard_data("Text", "<i>Text</i>")
        self.assertEqual(result, {"status": "ok"})
        self.assertEqual((written[0].text, written[0].html), ("Text", "<i>Text</i>"))
        self.assertIsInstance(written[0], self.payload_type)

    def test_read_keeps_windows_fallback_when_service_is_absent(self):
        expected = {"status": "ok", "text": "legacy", "html": ""}
        with patch.object(main, "_os_services", return_value=SimpleNamespace(data_dirs=None, clipboard_extras=None)), \
             patch.object(main, "_read_windows_clipboard_data", return_value=expected):
            result = main.VnOfficeApi().read_clipboard_data()
        self.assertEqual(result, expected)


if __name__ == "__main__":
    unittest.main()
