import sys
import unittest
import importlib.util
import importlib
from pathlib import Path

from qtpy.QtCore import QMimeData


_ROOT = Path(__file__).resolve().parents[2]
_OS_SERVICES_DIR = _ROOT / "platform" / "os_services"
_SPEC = importlib.util.spec_from_file_location(
    "_mac_clipboard_os_services", _OS_SERVICES_DIR / "__init__.py",
    submodule_search_locations=[str(_OS_SERVICES_DIR)],
)
_OS_SERVICES = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _OS_SERVICES
_SPEC.loader.exec_module(_OS_SERVICES)
MacClipboardExtras = importlib.import_module("_mac_clipboard_os_services.macos").MacClipboardExtras
ClipboardPayload = _OS_SERVICES.ClipboardPayload


@unittest.skipUnless(sys.platform == "darwin", "The macOS Qt clipboard provider is Darwin-only.")
class MacClipboardExtrasTests(unittest.TestCase):
    def test_read_returns_text_and_html_without_accessing_system_clipboard(self):
        mime_data = QMimeData()
        mime_data.setText("Clipboard text")
        mime_data.setHtml("<b>Clipboard text</b>")

        class Clipboard:
            def mimeData(self):
                return mime_data

            def text(self):
                return "fallback text"

        result = MacClipboardExtras(clipboard_getter=Clipboard).read()

        self.assertTrue(result.is_ok)
        self.assertEqual(result.value, ClipboardPayload("Clipboard text", "<b>Clipboard text</b>"))

    def test_write_sets_text_and_html_without_changing_the_system_clipboard(self):
        class Clipboard:
            value = None

            def setMimeData(self, value):
                self.value = value

        clipboard = Clipboard()
        result = MacClipboardExtras(clipboard_getter=lambda: clipboard).write(
            ClipboardPayload("Clipboard text", "<i>Clipboard text</i>")
        )

        self.assertTrue(result.is_ok)
        self.assertEqual(clipboard.value.text(), "Clipboard text")
        self.assertEqual(clipboard.value.html(), "<i>Clipboard text</i>")

    def test_missing_qt_application_returns_a_service_error(self):
        result = MacClipboardExtras(clipboard_getter=lambda: (_ for _ in ()).throw(RuntimeError())).read()

        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "not_available")


if __name__ == "__main__":
    unittest.main()
