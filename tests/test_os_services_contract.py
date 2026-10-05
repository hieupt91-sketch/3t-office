"""P1 contract tests for platform/os_services (no caller uses it yet; behaviour of the app is unchanged)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG_DIR = ROOT / "platform" / "os_services"
NAME = "_vno_os_services_test"


def load_package():
    sys.modules.pop(NAME, None)
    for key in [k for k in sys.modules if k.startswith(NAME + ".")]:
        sys.modules.pop(key)
    spec = importlib.util.spec_from_file_location(
        NAME, PKG_DIR / "__init__.py", submodule_search_locations=[str(PKG_DIR)],
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[NAME] = module
    spec.loader.exec_module(module)
    return module


class ServiceResultTests(unittest.TestCase):
    def setUp(self):
        self.pkg = load_package()

    def test_ok_and_fail_are_mutually_exclusive(self):
        ok = self.pkg.ServiceResult.ok("x")
        self.assertTrue(ok.is_ok)
        self.assertEqual(ok.unwrap(), "x")
        fail = self.pkg.ServiceResult.fail("busy", "Đang bận, thử lại sau.", retryable=True)
        self.assertFalse(fail.is_ok)
        self.assertTrue(fail.error.retryable)
        with self.assertRaises(RuntimeError):
            fail.unwrap()

    def test_cannot_build_an_empty_or_double_result(self):
        with self.assertRaises(ValueError):
            self.pkg.ServiceResult()
        with self.assertRaises(ValueError):
            self.pkg.ServiceResult(value=1, error=self.pkg.ServiceError("busy", "x"), _ok=True)

    def test_error_code_and_message_are_validated(self):
        with self.assertRaises(ValueError):
            self.pkg.ServiceError("nope", "x")
        with self.assertRaises(ValueError):
            self.pkg.ServiceError("busy", "  ")

    def test_successful_call_without_data_is_allowed(self):
        self.assertTrue(self.pkg.ServiceResult.ok().is_ok)


class FactoryTests(unittest.TestCase):
    def setUp(self):
        self.pkg = load_package()

    def test_loads_under_a_private_name_without_shadowing_the_stdlib_platform_module(self):
        import platform as stdlib_platform
        self.assertTrue(hasattr(stdlib_platform, "system"))
        self.assertEqual(self.pkg.__name__, NAME)

    def test_unregistered_platform_reports_not_supported_instead_of_picking_another_os(self):
        self.assertIsNone(self.pkg.backend_name_for("darwin"))
        with self.assertRaises(NotImplementedError):
            self.pkg.get_services("darwin")

    def test_registered_backend_is_selected_by_platform_prefix_and_completeness_is_checked(self):
        fake = types.ModuleType(NAME + ".fakeos")
        complete = {name: object() for name in self.pkg.SERVICE_FIELDS}
        fake.build_services = lambda: self.pkg.OSServices(**complete)
        sys.modules[NAME + ".fakeos"] = fake
        self.pkg.register_backend("fakeos", "fakeos")
        self.assertEqual(self.pkg.backend_name_for("fakeos-1"), "fakeos")
        services = self.pkg.get_services("fakeos-1")
        self.assertEqual(set(self.pkg.SERVICE_FIELDS), set(complete))
        self.assertIs(services.launcher, complete["launcher"])

        incomplete = dict(complete, launcher=None)
        fake.build_services = lambda: self.pkg.OSServices(**incomplete)
        with self.assertRaises(RuntimeError):
            self.pkg.get_services("fakeos-1")

    def test_contract_lists_the_ten_services_and_closed_child_purposes(self):
        self.assertEqual(len(self.pkg.SERVICE_FIELDS), 10)
        self.assertEqual(
            set(self.pkg.CHILD_PURPOSES),
            {"uno-worker", "document-engine", "print", "update-helper", "open-path"},
        )


class NeutralityTests(unittest.TestCase):
    def test_contract_names_no_os_api(self):
        text = (PKG_DIR / "base.py").read_text(encoding="utf-8").lower()
        for word in ("win32", "windll", "winreg", "powershell", "creationflags", "hwnd", "hresult", "taskkill"):
            self.assertNotIn(word, text, word)


if __name__ == "__main__":
    unittest.main()
