"""Per-app launchers: own name/icon in Open with, taskbar and shortcuts (same on every machine)."""

import ctypes
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main

REPO = Path(__file__).resolve().parents[1]
NSIS = (REPO / "scripts" / "installer" / "vnoffice.nsi").read_text(encoding="utf-8")
EXES = {"writer": "Doc.exe", "sheet": "Sheet.exe", "slides": "Slide.exe"}
TITLES = {"writer": "Doc", "sheet": "Sheet", "slides": "Slide"}


class InstallerRegistrationTests(unittest.TestCase):
    def test_shortcuts_target_launchers_not_the_python_interpreter(self):
        for line in NSIS.splitlines():
            if line.strip().startswith("CreateShortCut") and "3T Office\\Doc.lnk" in line:
                self.assertIn("Doc.exe", line)
        shortcut_lines = [l for l in NSIS.splitlines() if l.strip().startswith("CreateShortCut") and "Uninstall" not in l and "Gỡ" not in l]
        self.assertEqual(len(shortcut_lines), 6)  # 3 Start Menu + 3 Desktop
        for line in shortcut_lines:
            self.assertNotIn("pythonw.exe", line)

    def test_open_with_is_registered_for_every_supported_extension_without_the_assoc_task(self):
        core = NSIS.split('Section "-Core" SEC_CORE', 1)[1].split("SectionEnd", 1)[0]
        for ext, exe in [(".docx", "Doc.exe"), (".doc", "Doc.exe"), (".odt", "Doc.exe"), (".rtf", "Doc.exe"),
                         (".txt", "Doc.exe"), (".xlsx", "Sheet.exe"), (".xls", "Sheet.exe"), (".ods", "Sheet.exe"),
                         (".csv", "Sheet.exe"), (".pptx", "Slide.exe"), (".ppt", "Slide.exe"), (".odp", "Slide.exe")]:
            self.assertIn(f'RegisterOpenWith "{ext}" "{exe}"', core)
        for exe, friendly in (("Doc.exe", "Doc"), ("Sheet.exe", "Sheet"), ("Slide.exe", "Slide")):
            self.assertIn(f'RegisterApplication "{exe}" "{friendly}"', core)

    def test_upgrade_replaces_the_legacy_shared_python_open_with_entry(self):
        core = NSIS.split('Section "-Core" SEC_CORE', 1)[1].split("SectionEnd", 1)[0]
        for progid, exe in (("VNOffice.Writer.Document", "Doc.exe"), ("VNOffice.Sheet.Workbook", "Sheet.exe"),
                            ("VNOffice.Slides.Presentation", "Slide.exe")):
            self.assertIn(f'RefreshLegacyProgid "{progid}" "{exe}"', core)
            self.assertIn(f'CleanLegacyOpenWithProgid ".docx" "{progid}"' if exe == "Doc.exe" else progid, core)

    def test_uninstall_removes_open_with_and_application_keys(self):
        uninstall = NSIS.split('Section "Uninstall"', 1)[1]
        for exe in EXES.values():
            self.assertIn(f'Software\\Classes\\Applications\\{exe}', uninstall)
            self.assertIn(f'UnregisterOpenWith ".docx" "Doc.exe"' if exe == "Doc.exe" else exe, uninstall)

    def test_file_type_commands_use_launchers_with_friendly_names(self):
        assoc = NSIS.split('Section /o "$(TASK_ASSOC)" SEC_ASSOC', 1)[1].split("SectionEnd", 1)[0]
        self.assertIn('"VNOffice.Writer.Document" "writer" "Doc.exe" "Doc"', assoc)
        self.assertIn('"VNOffice.Sheet.Workbook" "sheet" "Sheet.exe" "Sheet"', assoc)
        self.assertIn('"VNOffice.Slides.Presentation" "slides" "Slide.exe" "Slide"', assoc)
        macro = NSIS.split("!macro RegisterFileType", 1)[1].split("!macroend", 1)[0]
        self.assertNotIn("pythonw.exe", macro)

    def test_installer_and_pilot_builders_require_the_launchers(self):
        build_installer = (REPO / "scripts" / "build-installer.ps1").read_text(encoding="utf-8")
        build_pilot = (REPO / "scripts" / "build-pilot.ps1").read_text(encoding="utf-8")
        for exe in EXES.values():
            self.assertIn(exe, build_installer)
            self.assertIn(f'File "${{PackageDir}}\\{exe}"', NSIS)
        self.assertIn("build-launchers.ps1", build_pilot)


class TaskbarRelaunchTests(unittest.TestCase):
    def test_relaunch_uses_launcher_and_its_icon_when_installed_next_to_app_folder(self):
        with tempfile.TemporaryDirectory() as root:
            app_dir = Path(root) / "app"
            app_dir.mkdir()
            for exe in EXES.values():
                (Path(root) / exe).write_bytes(b"MZ")
            fake_main = app_dir / "main.py"
            fake_main.write_text("", encoding="utf-8")
            with patch.object(main, "__file__", str(fake_main)):
                for kind, exe in EXES.items():
                    info = main._taskbar_relaunch_info(kind)
                    self.assertIn(exe, info["command"])
                    self.assertNotIn("pythonw", info["command"].lower())
                    self.assertTrue(info["icon_resource"].endswith(exe + ",0"))

    def test_relaunch_without_launcher_keeps_interpreter_command_and_app_icon(self):
        info = main._taskbar_relaunch_info("sheet")
        self.assertIn("--app=sheet", info["command"])
        self.assertTrue(info["icon_resource"].endswith("sheet.ico,0"))


@unittest.skipUnless(os.name == "nt", "launchers are Windows executables")
class LauncherBuildTests(unittest.TestCase):
    def test_build_produces_three_exes_with_distinct_names_and_icons(self):
        csc = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Microsoft.NET" / "Framework64" / "v4.0.30319" / "csc.exe"
        if not csc.is_file():
            self.skipTest(".NET Framework compiler not available")
        with tempfile.TemporaryDirectory() as out:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                 str(REPO / "scripts" / "installer" / "build-launchers.ps1"), "-OutDir", out, "-Version", "9.8.7"],
                capture_output=True, text=True, timeout=180,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            shell32 = ctypes.windll.shell32
            shell32.ExtractIconExW.argtypes = [ctypes.c_wchar_p, ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint]
            icons = {}
            for kind, exe in EXES.items():
                path = Path(out) / exe
                self.assertTrue(path.is_file())
                version = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     f"$v=(Get-Item -LiteralPath '{path}').VersionInfo; '{{0}}|{{1}}|{{2}}' -f $v.FileDescription,$v.ProductName,$v.FileVersion"],
                    capture_output=True, text=True, timeout=60,
                ).stdout.strip()
                self.assertEqual(version, f"{TITLES[kind]}|3T Office|9.8.7.0")
                self.assertGreaterEqual(shell32.ExtractIconExW(str(path), -1, None, None, 0), 1)
                icons[kind] = path.stat().st_size
            self.assertEqual(len(set(icons.values())), 3)  # different embedded icons => different files


if __name__ == "__main__":
    unittest.main()
