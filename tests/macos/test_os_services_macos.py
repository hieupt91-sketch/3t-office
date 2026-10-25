"""FIX-MAC-1 C-5: macOS OS-services backend (platform/os_services/macos.py).

All system calls go through injected fakes: no Finder window, no dialog and no `open` is started by these tests.
"""
from __future__ import annotations

import importlib
import importlib.util
import subprocess
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
PKG_DIR = ROOT / "platform" / "os_services"
NAME = "_vno_os_services_macos_test"


def load_package():
    sys.modules.pop(NAME, None)
    for key in [k for k in sys.modules if k.startswith(NAME + ".")]:
        sys.modules.pop(key)
    spec = importlib.util.spec_from_file_location(NAME, PKG_DIR / "__init__.py", submodule_search_locations=[str(PKG_DIR)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[NAME] = module
    spec.loader.exec_module(module)
    return module


class FakeRun:
    def __init__(self, returncode=0, error=None):
        self.calls = []
        self.returncode = returncode
        self.error = error

    def __call__(self, argv, **kwargs):
        self.calls.append((list(argv), kwargs))
        if self.error is not None:
            raise self.error
        return types.SimpleNamespace(returncode=self.returncode, stdout="", stderr="")


class FakePopen:
    def __init__(self, error=None):
        self.calls = []
        self.error = error

    def __call__(self, argv, **kwargs):
        self.calls.append((list(argv), kwargs))
        if self.error is not None:
            raise self.error
        return types.SimpleNamespace(pid=4242)


class MacBackendSelectionTests(unittest.TestCase):
    def setUp(self):
        self.pkg = load_package()

    def test_darwin_selects_the_macos_backend(self):
        self.assertEqual(self.pkg.backend_name_for("darwin"), "macos")
        services = self.pkg.get_services("darwin")
        self.assertEqual(type(services.launcher).__name__, "MacLauncher")
        self.assertEqual(type(services.data_dirs).__name__, "MacDataDirs")

    def test_linux_and_windows_keep_their_backends(self):
        self.assertEqual(self.pkg.backend_name_for("linux"), "portable")
        self.assertEqual(self.pkg.backend_name_for("win32"), "windows")


class MacDataDirsTests(unittest.TestCase):
    def setUp(self):
        load_package()
        self.macos = importlib.import_module(NAME + ".macos")
        self.portable = importlib.import_module(NAME + ".portable")

    def test_user_data_dir_is_unchanged_from_the_portable_backend_and_the_swift_launcher(self):
        dirs = self.macos.MacDataDirs()
        expected = Path.home() / "Library" / "Application Support" / "VNOffice"
        self.assertEqual(dirs.user_data_dir(), expected)
        with mock.patch.object(self.portable.sys, "platform", "darwin"):
            self.assertEqual(dirs.user_data_dir(), self.portable.PortableDataDirs().user_data_dir())
        swift = (ROOT / "ports" / "macos" / "launcher" / "AppDelegate.swift").read_text(encoding="utf-8")
        self.assertIn('.applicationSupportDirectory', swift)
        self.assertIn('appendingPathComponent("VNOffice"', swift)

    def test_profile_dirs_follow_the_app_kind(self):
        dirs = self.macos.MacDataDirs()
        self.assertEqual(dirs.document_profile_dir("sheet").name, "lo-profile-sheet")
        self.assertEqual(dirs.document_profile_dir("unknown").name, "lo-profile-shared")


class MacLauncherTests(unittest.TestCase):
    def setUp(self):
        load_package()
        self.macos = importlib.import_module(NAME + ".macos")
        self.temp = tempfile.TemporaryDirectory()
        self.file = Path(self.temp.name) / "Báo cáo \"quý\" -R.xlsx"
        self.file.write_bytes(b"x")

    def tearDown(self):
        self.temp.cleanup()

    def test_reveal_path_selects_the_file_with_open_dash_r_and_an_argv_list(self):
        run = FakeRun()
        result = self.macos.MacLauncher(run=run, popen=FakePopen()).reveal_path(self.file)
        self.assertTrue(result.is_ok)
        self.assertEqual(len(run.calls), 1)
        argv, kwargs = run.calls[0]
        self.assertEqual(argv, ["/usr/bin/open", "-R", str(self.file.resolve())])
        self.assertNotIn("shell", kwargs)
        self.assertIn("timeout", kwargs)

    def test_reveal_path_missing_file_reports_without_calling_open(self):
        run = FakeRun()
        result = self.macos.MacLauncher(run=run, popen=FakePopen()).reveal_path(Path(self.temp.name) / "khong-co.xlsx")
        self.assertFalse(result.is_ok)
        self.assertEqual(result.error.code, "invalid_input")
        self.assertEqual(run.calls, [])
        self.assertFalse(self.macos.MacLauncher(run=run).reveal_path("").is_ok)

    def test_reveal_path_failure_of_open_is_reported_not_raised(self):
        for run in (FakeRun(returncode=1), FakeRun(error=OSError("no open")), FakeRun(error=subprocess.TimeoutExpired("open", 10))):
            result = self.macos.MacLauncher(run=run, popen=FakePopen()).reveal_path(self.file)
            self.assertFalse(result.is_ok)
            self.assertEqual(result.error.code, "not_available")

    def test_open_path_uses_open_with_the_absolute_path(self):
        run = FakeRun()
        result = self.macos.MacLauncher(run=run, popen=FakePopen()).open_path(self.file)
        self.assertTrue(result.is_ok)
        self.assertEqual(run.calls[0][0], ["/usr/bin/open", str(self.file.resolve())])
        self.assertFalse(self.macos.MacLauncher(run=run).open_path(Path(self.temp.name) / "nope").is_ok)

    def test_show_error_starts_osascript_with_the_text_as_arguments_never_as_script(self):
        popen = FakePopen()
        title = "-3T Office — Lỗi"
        message = 'Dòng 1\n"trích" \\ end run; do shell script "rm -rf ~"'
        with mock.patch("sys.stderr"):
            result = self.macos.MacLauncher(run=FakeRun(), popen=popen).show_error(title, message)
        self.assertTrue(result.is_ok)
        argv, kwargs = popen.calls[0]
        self.assertEqual(argv[0], "/usr/bin/osascript")
        self.assertEqual(argv[-3:], ["--", title, message])
        script = " ".join(argv[1:-3])
        self.assertNotIn(message, script)
        self.assertNotIn(title, script)
        self.assertIn("display alert (item 1 of argv) message (item 2 of argv)", script)
        self.assertIn("giving up after", script)
        self.assertNotIn("shell", kwargs)
        self.assertIs(kwargs.get("stdin"), subprocess.DEVNULL)

    def test_show_error_never_raises_and_reports_failure(self):
        for error in (OSError("no osascript"), ValueError("embedded null byte")):
            with mock.patch("sys.stderr"):
                result = self.macos.MacLauncher(run=FakeRun(), popen=FakePopen(error=error)).show_error("t", "m")
            self.assertFalse(result.is_ok)
            self.assertEqual(result.error.code, "not_available")

    def test_engine_lookup_and_io_path_are_inherited_from_portable(self):
        portable = importlib.import_module(NAME + ".portable")
        self.assertIs(self.macos.MacLauncher.find_document_engine, portable.PortableLauncher.find_document_engine)
        self.assertIs(self.macos.MacLauncher.native_io_path, portable.PortableLauncher.native_io_path)

    def test_alert_script_is_valid_applescript(self):
        if sys.platform != "darwin":
            self.skipTest("osacompile chỉ có trên macOS")
        with tempfile.TemporaryDirectory() as out:
            argv = self.macos.alert_command("t", "m")
            script_args = argv[1:argv.index("--")]
            completed = subprocess.run(["/usr/bin/osacompile", "-o", str(Path(out) / "a.scpt"), *script_args],
                                       capture_output=True, text=True, timeout=30, check=False)
            self.assertEqual(completed.returncode, 0, completed.stderr)


if __name__ == "__main__":
    unittest.main()
