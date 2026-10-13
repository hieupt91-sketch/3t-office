#!/usr/bin/env python3
from __future__ import annotations

import importlib.metadata
import os
import platform
import plistlib
import subprocess
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def architectures(path: Path) -> set[str]:
    result = subprocess.run(["/usr/bin/lipo", "-archs", str(path)], text=True, capture_output=True)
    if result.returncode:
        fail(f"không đọc được kiến trúc: {path}: {result.stderr.strip()}")
    return set(result.stdout.split())


def main(root: Path, version: str) -> None:
    root = root.resolve()
    current = root / "Versions/current"
    if not current.is_symlink() or os.readlink(current) != f"app-{version}":
        fail("Versions/current không trỏ tương đối tới đúng app version")
    main_script = current / "app/main.py"
    if not main_script.is_file():
        fail(f"thiếu {main_script}")

    required = [
        root / "Runtime/bin/python3",
        root / "LibreOffice.app/Contents/MacOS/soffice",
        root / "Legal/THIRD-PARTY-NOTICES.txt",
        root / "Legal/SOURCE-OFFER.txt",
        root / "Legal/COMPONENTS.txt",
        root / "PILOT-README.txt",
    ]
    for path in required:
        if not path.exists():
            fail(f"thiếu {path.relative_to(root)}")

    for product, kind in (("Doc", "writer"), ("Sheet", "sheet"), ("Slide", "slides")):
        plist_path = root / f"{product}.app/Contents/Info.plist"
        with plist_path.open("rb") as stream:
            info = plistlib.load(stream)
        if info.get("VNOfficeAppKind") != kind:
            fail(f"{product}.app sai app kind")
        executable = root / f"{product}.app/Contents/MacOS/{product}"
        if "arm64" not in architectures(executable):
            fail(f"{product}.app không có arm64")

    if "arm64" not in architectures(root / "Runtime/bin/python3"):
        fail("Python runtime không có arm64")
    if "arm64" not in architectures(root / "LibreOffice.app/Contents/MacOS/soffice"):
        fail("LibreOffice không có arm64")

    if platform.machine() != "arm64":
        fail("validator pilot 0.9.11 chỉ hỗ trợ host arm64")
    for link in root.rglob("*"):
        if not link.is_symlink():
            continue
        resolved = link.resolve(strict=False)
        try:
            resolved.relative_to(root)
        except ValueError:
            fail(f"symlink thoát artifact: {link.relative_to(root)} -> {os.readlink(link)}")
    for package in ("PySide6", "PySide6.QtWebEngineWidgets", "webview"):
        __import__(package)
    print("PASS: layout/runtime/imports/arm64; Intel NOT SUPPORTED")
    for package in ("PySide6", "pywebview"):
        print(f"  {package}={importlib.metadata.version(package)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        fail("usage: validate-offline-pilot.py ROOT VERSION")
    main(Path(sys.argv[1]), sys.argv[2])
