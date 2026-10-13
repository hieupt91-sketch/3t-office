from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from adapters.updater.updater import UpdaterManager


ROOT = Path(__file__).resolve().parents[2]
PKG_DIR = ROOT / "platform" / "os_services"
PKG_NAME = "_vno_os_services_macos_update_test"


def load_package():
    for key in [name for name in sys.modules if name == PKG_NAME or name.startswith(PKG_NAME + ".")]:
        sys.modules.pop(key, None)
    spec = importlib.util.spec_from_file_location(
        PKG_NAME, PKG_DIR / "__init__.py", submodule_search_locations=[str(PKG_DIR)],
    )
    package = importlib.util.module_from_spec(spec)
    sys.modules[PKG_NAME] = package
    spec.loader.exec_module(package)
    return package


class _DataDirs:
    def __init__(self, root: Path) -> None:
        self.root = root

    def user_data_dir(self) -> Path:
        return self.root


class _Result:
    def __init__(self, value=None, error=None) -> None:
        self.value = value
        self.error = error
        self.is_ok = error is None


class _RecordingApplier:
    def __init__(self, task_path: Path) -> None:
        self.task_path = task_path
        self.request = None
        self.launched = None

    def create_apply_task(self, request):
        self.request = request
        return _Result(self.task_path)

    def launch(self, task_path):
        self.launched = task_path
        return _Result(9876)


class MacOSUpdateServiceTests(unittest.TestCase):
    def setUp(self):
        self.package = load_package()
        self.macos = __import__(PKG_NAME + ".macos", fromlist=["MacOSUpdateApplier"])

    def _request(self, root: Path):
        app_root = root / "Application Support" / "VNOffice"
        old = app_root / "app-0.9.10"
        stage = app_root / "updates" / "0.9.11"
        (old / "app").mkdir(parents=True)
        stage.mkdir(parents=True)
        (old / "VERSION.txt").write_text("0.9.10\n", encoding="ascii")
        (app_root / "current").symlink_to(old.name, target_is_directory=True)
        request = {
            "app_kind": "writer",
            "install_dir": str(old),
            "stage_dir": str(stage),
            "updates_dir": str(stage.parent),
            "old_version": "0.9.10",
            "new_version": "0.9.11",
            "manifest": {"version": "0.9.11", "files": []},
            "replacements": [],
            "removals": [],
            "launch_args": ["--app=writer"],
            "restore_documents": [],
        }
        return app_root, old, stage, request

    def test_backend_selector_exposes_production_update_applier(self):
        services = self.package.get_services("darwin")
        self.assertIsInstance(services.update_applier, self.macos.MacOSUpdateApplier)

    def test_create_task_targets_version_tree_and_python_health_launch(self):
        with tempfile.TemporaryDirectory() as temp:
            app_root, old, stage, request = self._request(Path(temp))
            service = self.macos.MacOSUpdateApplier(_DataDirs(app_root), python_executable="/runtime/python3")
            result = service.create_apply_task(request)
            self.assertTrue(result.is_ok, result.error)
            task = json.loads(result.value.read_text(encoding="utf-8"))
            self.assertEqual(task["app_root"], str(app_root.resolve()))
            self.assertEqual(task["launch_executable"], "/runtime/python3")
            self.assertEqual(
                task["launch_args"],
                [str(app_root.resolve() / "app-0.9.11" / "app" / "main.py"), "--app=writer"],
            )
            self.assertEqual(service.install_root(old / "app"), old)
            self.assertFalse(any(stage.glob(".apply-task.*.tmp")))

    def test_launch_uses_argv_without_shell(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            helper = root / "apply helper.py"
            task = root / "apply task.json"
            helper.write_text("pass\n", encoding="utf-8")
            task.write_text("{}", encoding="utf-8")
            service = self.macos.MacOSUpdateApplier(
                _DataDirs(root), python_executable="/runtime/python3", helper_path=helper,
            )
            process = mock.Mock(pid=4321)
            process.wait.return_value = 0
            with mock.patch.object(self.macos.subprocess, "Popen", return_value=process) as popen:
                result = service.launch(task)
            self.assertTrue(result.is_ok)
            self.assertEqual(result.value, 4321)
            argv = popen.call_args.args[0]
            self.assertEqual(
                argv,
                ["/runtime/python3", "-m", "ports.macos.apply_helper", "--task", str(task.resolve())],
            )
            self.assertEqual(popen.call_args.kwargs["cwd"], str(helper.parents[2]))
            self.assertNotIn("shell", popen.call_args.kwargs)
            self.assertTrue(popen.call_args.kwargs["start_new_session"])

    def test_create_task_refuses_install_tree_outside_app_root(self):
        with tempfile.TemporaryDirectory() as temp:
            app_root, _, _, request = self._request(Path(temp))
            request["install_dir"] = str(Path(temp) / "outside" / "app-0.9.10")
            service = self.macos.MacOSUpdateApplier(_DataDirs(app_root))
            result = service.create_apply_task(request)
            self.assertFalse(result.is_ok)
            self.assertEqual(result.error.code, "invalid_input")

    def test_updater_manager_delegates_only_task_and_launch_to_os_service(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            stage = root / "updates" / "0.9.11"
            stage.mkdir(parents=True)
            task_path = stage / "apply-task.json"
            applier = _RecordingApplier(task_path)
            manager = UpdaterManager(
                install_dir=root / "app-0.9.10",
                updates_dir=root / "updates",
                current_version="0.9.10",
                update_applier=applier,
            )
            manager._manifest = {"version": "0.9.11", "files": []}
            manager._manifest_bytes = b"{}"
            manager._signature = b"signature"
            manager._changed = []
            manager._removals = ["app/obsolete.py"]

            created = manager.create_apply_task(
                app_kind="slides", install_root=root / "app-0.9.10", launch_args=["--app=slides"],
            )
            self.assertEqual(created, task_path)
            self.assertEqual(applier.request["removals"], ["app/obsolete.py"])
            self.assertEqual(applier.request["launch_args"], ["--app=slides"])
            self.assertTrue(manager.launch_apply_helper(created))
            self.assertEqual(applier.launched, task_path.resolve())


if __name__ == "__main__":
    unittest.main()
