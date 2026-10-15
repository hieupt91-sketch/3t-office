#!/usr/bin/env python3
"""Expand a product archive and validate its offline installation payload."""

from __future__ import annotations

import argparse
import os
import plistlib
import subprocess
import tempfile
from pathlib import Path


EXPECTED_APPS = {
    "Doc.app": ("writer", "vn.office.doc"),
    "Sheet.app": ("sheet", "vn.office.sheet"),
    "Slide.app": ("slides", "vn.office.slide"),
}


def validate_payload(applications: Path) -> list[str]:
    errors: list[str] = []
    product = applications / "3T Office"
    required = [
        product / "Runtime/bin/python3",
        product / "LibreOffice.app/Contents/MacOS/soffice",
        product / "Versions/current/app/main.py",
        product / "Legal/COMPONENTS.txt",
        product / "PILOT-README.txt",
    ]
    for path in required:
        if not path.exists():
            errors.append(f"thiếu 3T Office/{path.relative_to(product)}")
    for name, (kind, bundle_id) in EXPECTED_APPS.items():
        bundle = product / name
        plist_path = bundle / "Contents/Info.plist"
        executable = bundle / "Contents/MacOS" / name.removesuffix(".app")
        if not plist_path.is_file() or not executable.is_file():
            errors.append(f"bundle không đầy đủ: {name}")
            continue
        with plist_path.open("rb") as handle:
            plist = plistlib.load(handle)
        if plist.get("VNOfficeAppKind") != kind:
            errors.append(f"{name}: VNOfficeAppKind sai")
        if plist.get("CFBundleIdentifier") != bundle_id:
            errors.append(f"{name}: CFBundleIdentifier sai")
    if product.exists():
        product_real = product.resolve()
        for path in product.rglob("*"):
            if not path.is_symlink():
                continue
            target = path.resolve(strict=False)
            if target != product_real and product_real not in target.parents:
                errors.append(f"symlink thoát product root: {path.relative_to(product)} -> {os.readlink(path)}")
    unexpected = [child.name for child in applications.iterdir() if child.name != "3T Office"]
    if unexpected:
        errors.append(f"payload /Applications có mục ngoài allowlist: {', '.join(sorted(unexpected))}")
    return errors


def find_payload(expanded: Path) -> Path:
    matches = list(expanded.rglob("Payload/3T Office"))
    if len(matches) != 1:
        raise RuntimeError(f"cần đúng một payload 3T Office, thấy {len(matches)}")
    return matches[0].parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pkg", type=Path)
    args = parser.parse_args()
    pkg = args.pkg.resolve()
    if not pkg.is_file():
        parser.error(f"không thấy PKG: {pkg}")
    with tempfile.TemporaryDirectory(prefix="vno-pkg-validate-") as temp:
        expanded = Path(temp) / "expanded"
        subprocess.run(["pkgutil", "--expand-full", str(pkg), str(expanded)], check=True)
        errors = validate_payload(find_payload(expanded))
        if errors:
            for error in errors:
                print(f"FAIL: {error}")
            return 1
    print("PASS: PKG metadata/payload/layout")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
