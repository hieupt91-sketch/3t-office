#!/usr/bin/env python3
"""Validate the repo-local sidecar layout used by Xcode's Debug Run target."""

from __future__ import annotations

import os
import plistlib
import sys
from pathlib import Path


def _relative_link(path: Path, label: str, errors: list[str]) -> None:
    if not path.is_symlink():
        errors.append(f"{label} phải là symlink development: {path}")
        return
    target = os.readlink(path)
    if os.path.isabs(target):
        errors.append(f"{label} chứa symlink tuyệt đối: {target}")
    if not path.exists():
        errors.append(f"{label} đích symlink không tồn tại: {path}")


def validate(product_root: Path, product_name: str, architecture: str) -> list[str]:
    errors: list[str] = []
    app = product_root / f"{product_name}.app"
    plist_path = app / "Contents/Info.plist"
    if not plist_path.is_file():
        return [f"Thiếu app bundle hoặc Info.plist: {app}"]
    try:
        with plist_path.open("rb") as stream:
            info = plistlib.load(stream)
    except Exception as exc:
        return [f"Không đọc được Info.plist: {exc}"]

    executable = app / "Contents/MacOS" / str(info.get("CFBundleExecutable", ""))
    if not executable.is_file() or not os.access(executable, os.X_OK):
        errors.append(f"Thiếu launcher executable: {executable}")
    if not info.get("VNOfficeAppKind"):
        errors.append("Info.plist thiếu VNOfficeAppKind")

    runtime = product_root / "Runtime"
    _relative_link(runtime, "Runtime", errors)
    python = runtime / "bin/python3"
    if not python.is_file() or not os.access(python, os.X_OK):
        errors.append(f"Thiếu Runtime/bin/python3: {python}")

    libreoffice = product_root / "LibreOffice.app"
    _relative_link(libreoffice, "LibreOffice.app", errors)
    soffice = libreoffice / "Contents/MacOS/soffice"
    if not soffice.is_file() or not os.access(soffice, os.X_OK):
        errors.append(f"Thiếu LibreOffice soffice executable: {soffice}")

    version_root = product_root / "Versions/development"
    app_payload = version_root / "app"
    _relative_link(app_payload, "Versions/development/app", errors)
    if not (app_payload / "main.py").is_file():
        errors.append(f"Thiếu app payload main.py: {app_payload / 'main.py'}")
    if not (app_payload / "platform/security/office_encryption.py").is_file():
        errors.append("App payload thiếu platform/security/office_encryption.py")

    overlay = product_root / f"RuntimeOverlay/{architecture}/site-packages"
    marker = product_root / "RuntimeOverlay/runtime-arch.txt"
    if not marker.is_file() or marker.read_text(encoding="utf-8").strip() != architecture:
        errors.append(f"RuntimeOverlay/runtime-arch.txt phải xác nhận {architecture}")
    for package in ("cryptography", "cffi", "pypdf"):
        if not (overlay / package / "__init__.py").is_file():
            errors.append(f"Overlay thiếu {package} package: {overlay}")
    return errors


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: validate-xcode-run-payload.py PRODUCT_ROOT PRODUCT_NAME ARCH")
    failures = validate(Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3])
    if failures:
        raise SystemExit("FAIL: " + "; ".join(failures))
    print(f"PASS: {sys.argv[2]}.app Xcode Debug sidecar layout ({sys.argv[3]})")
