"""reveal_path của dịch vụ hệ điều hành: tệp không tồn tại báo lỗi tiếng Việt; tệp có thật gọi Explorer đúng một đối số /select,."""
from __future__ import annotations

import importlib.util
import subprocess
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
        self.macos = importlib.import_module(NAME + ".macos")

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

    def test_macos_missing_file_returns_vietnamese_error(self):
        result = self.macos.MacOSLauncher().reveal_path(Path("/khong/ton/tai.xlsx"))
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "invalid_input")
        self.assertIn("Không tìm thấy tệp", result.error.message)

    def test_macos_existing_unicode_file_uses_safe_open_reveal_argv(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "Báo cáo tháng 10.xlsx"
            target.write_bytes(b"x")
            completed = mock.Mock(returncode=0)
            with mock.patch(NAME + ".macos.subprocess.run", return_value=completed) as run:
                result = self.macos.MacOSLauncher().reveal_path(target)

        self.assertTrue(result.is_ok)
        args = run.call_args.args[0]
        self.assertEqual(args, ["open", "-R", str(target.resolve())])
        self.assertFalse(run.call_args.kwargs.get("shell", False))
        self.assertEqual(run.call_args.kwargs["timeout"], 15)

    def test_macos_open_nonzero_exit_reports_not_available(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "bao cao.xlsx"
            target.write_bytes(b"x")
            with mock.patch(NAME + ".macos.subprocess.run", return_value=mock.Mock(returncode=1)):
                result = self.macos.MacOSLauncher().reveal_path(target)
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "not_available")

    def test_macos_open_timeout_is_retryable(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "bao cao.xlsx"
            target.write_bytes(b"x")
            with mock.patch(
                NAME + ".macos.subprocess.run",
                side_effect=subprocess.TimeoutExpired(cmd=["open", "-R", str(target)], timeout=15),
            ):
                result = self.macos.MacOSLauncher().reveal_path(target)
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "timeout")
        self.assertTrue(result.error.retryable)

    def test_macos_open_permission_error_is_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "bao cao.xlsx"
            target.write_bytes(b"x")
            with mock.patch(NAME + ".macos.subprocess.run", side_effect=PermissionError):
                result = self.macos.MacOSLauncher().reveal_path(target)
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "permission_denied")


if __name__ == "__main__":
    unittest.main()
