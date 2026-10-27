import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


WORKER_PATH = (
    Path(__file__).resolve().parents[1]
    / "adapters"
    / "libreoffice"
    / "common"
    / "soffice_uno_worker.py"
)
SPEC = importlib.util.spec_from_file_location("vno_soffice_uno_worker_test", WORKER_PATH)
WORKER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(WORKER)


class _Process:
    @staticmethod
    def poll():
        return None


class _Resolver:
    def __init__(self):
        self.calls = 0

    def resolve(self, _url):
        self.calls += 1
        if self.calls < 3:
            raise RuntimeError("not ready")
        return "context"


class _ServiceManager:
    def __init__(self, resolver):
        self.resolver = resolver

    def createInstanceWithContext(self, _name, _context):
        return self.resolver


class _Uno:
    def __init__(self, resolver):
        self.context = type("Context", (), {"ServiceManager": _ServiceManager(resolver)})()

    def getComponentContext(self):
        return self.context


class SofficeUnoWorkerStartupTest(unittest.TestCase):
    def test_connect_polls_at_twenty_milliseconds_and_reports_attempts(self):
        resolver = _Resolver()
        with patch.object(WORKER.time, "sleep") as sleep:
            context, attempts = WORKER._connect(_Uno(resolver), "test-pipe", _Process())
        self.assertEqual("context", context)
        self.assertEqual(3, attempts)
        self.assertEqual([unittest.mock.call(0.02), unittest.mock.call(0.02)], sleep.call_args_list)

    def test_ure_bootstrap_value_only_when_fundamental_ini_exists(self):
        with tempfile.TemporaryDirectory() as tmp:
            program_dir = Path(tmp)
            # macOS pilot bundle: no fundamental.ini anywhere -> None, so
            # the worker must not point soffice at a nonexistent bootstrap.
            self.assertIsNone(WORKER._ure_bootstrap_value(program_dir))
            (program_dir / "fundamental.ini").write_text("", encoding="utf-8")
            self.assertEqual(
                f"vnd.sun.star.pathname:{program_dir / 'fundamental.ini'}",
                WORKER._ure_bootstrap_value(program_dir),
            )

    def test_creation_flags_include_supported_windows_flags(self):
        expected = (
            getattr(subprocess, "CREATE_NO_WINDOW", 0)
            | getattr(subprocess, "ABOVE_NORMAL_PRIORITY_CLASS", 0)
        )
        self.assertEqual(expected, WORKER._soffice_creation_flags())


if __name__ == "__main__":
    unittest.main()
