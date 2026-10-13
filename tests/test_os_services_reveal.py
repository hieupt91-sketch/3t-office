"""reveal_path của dịch vụ hệ điều hành: tệp không tồn tại báo lỗi tiếng Việt; tệp có thật gọi Explorer đúng một đối số /select,."""
from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
PKG_DIR = ROOT / "platform" / "os_services"
NAME = "_vno_os_services_reveal_test"


def load_package():
    sys.modules.pop(NAME, None)
    for key in [k for k in sys.modules if k.startswith(NAME + ".")]:
        sys.modules.pop(key)
    spec = importlib.util.spec_from_file_location(NAME, PKG_DIR / "__init__.py", submodule_search_locations=[str(PKG_DIR)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[NAME] = module
    spec.loader.exec_module(module)
    return module


class RevealPathTests(unittest.TestCase):
    def setUp(self):
        load_package()
        self.windows = importlib.import_module(NAME + ".windows")
        self.portable = importlib.import_module(NAME + ".portable")

    def test_missing_file_returns_vietnamese_error(self):
        result = self.windows.WindowsLauncher().reveal_path(Path("Z:/khong/ton/tai.xlsx"))
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "invalid_input")

    def test_existing_file_calls_explorer_with_select(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "bao cao.xlsx"
            target.write_bytes(b"x")
            with mock.patch("subprocess.Popen") as popen:
                result = self.windows.WindowsLauncher().reveal_path(target)
        self.assertTrue(result.is_ok)
        args = popen.call_args[0][0]
        self.assertEqual(args[0], "explorer.exe")
        self.assertTrue(args[1].startswith("/select,"))
        self.assertTrue(args[1].endswith("bao cao.xlsx"))

    def test_portable_reports_not_supported(self):
        result = self.portable.PortableLauncher().reveal_path(Path("x"))
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "not_supported")


if __name__ == "__main__":
    unittest.main()