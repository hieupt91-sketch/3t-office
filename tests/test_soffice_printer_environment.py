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


if __name__ == "__main__":
    unittest.main()
