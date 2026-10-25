from __future__ import annotations

import importlib.util
import os
import plistlib
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "ports/macos/scripts/validate-xcode-run-payload.py"


def _relative_symlink(target: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.symlink_to(os.path.relpath(target, destination.parent))


def test_debug_crypto_constraint_stays_inside_root_requirement() -> None:
    root_requirement = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    constraint = (ROOT / "ports/macos/requirements-xcode-run-constraints.txt").read_text(
        encoding="utf-8"
    )
    assert "cryptography>=44.0.0,<51.0.0" in root_requirement
    assert "cryptography==44.0.2" in constraint
    assert "/Users/" not in constraint


def test_shared_xcode_run_scheme_uses_debug_without_machine_paths() -> None:
    project = (ROOT / "ports/macos/VNOfficeLauncher.xcodeproj/project.pbxproj").read_text(
        encoding="utf-8"
    )
    scheme_path = (
        ROOT
        / "ports/macos/VNOfficeLauncher.xcodeproj/xcshareddata/xcschemes/VNOfficeLauncher.xcscheme"
    )
    scheme = ET.parse(scheme_path).getroot()
    launch = scheme.find("LaunchAction")
    assert launch is not None and launch.attrib.get("buildConfiguration") == "Debug"
    assert "$(SRCROOT)/build/macos-xcode-run" in project
    assert "$(SRCROOT)" in project
    assert "/Users/" not in project


def test_xcode_run_validator_accepts_relative_offline_sidecars(tmp_path: Path) -> None:
    product_root = tmp_path / "Products" / "Debug" / "arm64"
    product = product_root / "VNOfficeLauncher.app"
    executable = product / "Contents/MacOS/VNOfficeLauncher"
    executable.parent.mkdir(parents=True)
    executable.write_text("launcher", encoding="utf-8")
    executable.chmod(0o755)
    with (product / "Contents/Info.plist").open("wb") as stream:
        plistlib.dump(
            {
                "CFBundleExecutable": "VNOfficeLauncher",
                "VNOfficeAppKind": "writer",
            },
            stream,
        )

    pilot = tmp_path / "pilot"
    python = pilot / "Runtime/bin/python3"
    python.parent.mkdir(parents=True)
    python.write_text("python", encoding="utf-8")
    python.chmod(0o755)
    soffice = pilot / "LibreOffice.app/Contents/MacOS/soffice"
    soffice.parent.mkdir(parents=True)
    soffice.write_text("soffice", encoding="utf-8")
    soffice.chmod(0o755)
    _relative_symlink(pilot / "Runtime", product_root / "Runtime")
    _relative_symlink(pilot / "LibreOffice.app", product_root / "LibreOffice.app")

    app_payload = tmp_path / "checkout"
    (app_payload / "platform/security").mkdir(parents=True)
    (app_payload / "main.py").write_text("pass\n", encoding="utf-8")
    (app_payload / "platform/security/office_encryption.py").write_text(
        "pass\n", encoding="utf-8"
    )
    _relative_symlink(app_payload, product_root / "Versions/development/app")

    overlay = product_root / "RuntimeOverlay/arm64/site-packages"
    overlay.parent.mkdir(parents=True)
    (overlay.parent.parent / "runtime-arch.txt").write_text("arm64\n", encoding="utf-8")
    (overlay / "cryptography").mkdir(parents=True)
    (overlay / "cryptography/__init__.py").write_text("__version__ = '44.0.2'\n", encoding="utf-8")
    (overlay / "cffi").mkdir()
    (overlay / "cffi/__init__.py").write_text("pass\n", encoding="utf-8")
    (overlay / "pypdf").mkdir()
    (overlay / "pypdf/__init__.py").write_text("__version__ = '6.21.2'\n", encoding="utf-8")

    completed = subprocess.run(
        [sys.executable, str(VALIDATOR), str(product_root), "VNOfficeLauncher", "arm64"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert "PASS: VNOfficeLauncher.app Xcode Debug sidecar layout (arm64)" in completed.stdout


def test_xcode_run_validator_rejects_overlay_without_pypdf(tmp_path: Path) -> None:
    product_root = tmp_path / "Products" / "Debug" / "arm64"
    contents = product_root / "VNOfficeLauncher.app/Contents"
    contents.mkdir(parents=True)
    with (contents / "Info.plist").open("wb") as stream:
        plistlib.dump({"CFBundleExecutable": "VNOfficeLauncher", "VNOfficeAppKind": "writer"}, stream)
    overlay = product_root / "RuntimeOverlay/arm64/site-packages"
    (overlay / "cryptography").mkdir(parents=True)
    (overlay / "cryptography/__init__.py").write_text("", encoding="utf-8")
    (overlay / "cffi").mkdir()
    (overlay / "cffi/__init__.py").write_text("", encoding="utf-8")
    (product_root / "RuntimeOverlay/runtime-arch.txt").write_text("arm64\n", encoding="utf-8")
    spec = importlib.util.spec_from_file_location("_vno_xcode_payload_validator", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    errors = module.validate(product_root, "VNOfficeLauncher", "arm64")
    assert any("Overlay thiếu pypdf package" in error for error in errors), errors
