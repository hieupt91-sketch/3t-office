import os
import unittest
from unittest.mock import patch

import main


class SofficePrinterEnvironmentTest(unittest.TestCase):
    def test_processing_children_disable_printer_discovery_without_changing_app_environment(self):
        original = {"PATH": "test-path", "EXISTING_SETTING": "kept"}
        with patch.dict(os.environ, original, clear=True):
            child_environment = main._libreoffice_child_environment()

            self.assertEqual("1", child_environment["SAL_DISABLE_DEFAULTPRINTER"])
            self.assertEqual("1", child_environment["SAL_DISABLE_PRINTERLIST"])
            self.assertEqual("kept", child_environment["EXISTING_SETTING"])
            self.assertNotIn("SAL_DISABLE_DEFAULTPRINTER", os.environ)
            self.assertNotIn("SAL_DISABLE_PRINTERLIST", os.environ)

    def test_print_helper_keeps_printer_discovery(self):
        with patch.dict(os.environ, {"SAL_DISABLE_PRINTERLIST": "1", "SAL_DISABLE_DEFAULTPRINTER": "1"}, clear=True):
            env = main._libreoffice_child_environment(printer_access=True)
        self.assertNotIn("SAL_DISABLE_PRINTERLIST", env)
        self.assertNotIn("SAL_DISABLE_DEFAULTPRINTER", env)

    def test_print_operation_uses_separate_printer_worker(self):
        started = []

        class FakeWorker:
            def __init__(self, app_kind, printer_access=False):
                self.app_kind = app_kind
                self.printer_access = printer_access
                self.process = None

            def start(self):
                started.append(self.printer_access)

                class Alive:
                    def poll(self_inner):
                        return None

                self.process = Alive()

            def operation(self, operation, payload, timeout=180):
                return {"ok": True, "printer_access": self.printer_access}

            def stop(self, grace_seconds=2.0):
                self.process = None

        with patch.object(main, "_SofficeUnoWorker", FakeWorker):
            manager = type(main._PERSISTENT_SOFFICE)()
            first = manager.operation("writer", "inspect_pdf", pdf_path="x.pdf")
            printed = manager.operation("writer", "print_pdf", pdf_path="x.pdf", printer="P", copies=1, pages="")
            after = manager.operation("writer", "inspect_pdf", pdf_path="x.pdf")
        self.assertFalse(first["printer_access"])
        self.assertTrue(printed["printer_access"])
        self.assertFalse(after["printer_access"])
        self.assertEqual([False, True, False], started)


if __name__ == "__main__":
    unittest.main()
