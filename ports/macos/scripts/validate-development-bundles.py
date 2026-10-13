#!/usr/bin/env python3
from __future__ import annotations

import plistlib
import sys
from pathlib import Path


EXPECTED = {
    "Doc": ("vn.office.doc", "writer", {"docx", "doc", "odt", "rtf", "txt"}),
    "Sheet": ("vn.office.sheet", "sheet", {"xlsx", "xls", "ods", "csv"}),
    "Slide": ("vn.office.slide", "slides", {"pptx", "ppt", "odp"}),
}


def validate(root: Path) -> None:
    for product, (bundle_id, app_kind, extensions) in EXPECTED.items():
        bundle = root / f"{product}.app"
        plist_path = bundle / "Contents" / "Info.plist"
        if not plist_path.is_file():
            raise SystemExit(f"Thiếu Info.plist: {plist_path}")
        with plist_path.open("rb") as stream:
            info = plistlib.load(stream)
        executable = bundle / "Contents" / "MacOS" / str(info.get("CFBundleExecutable", ""))
        actual_extensions = {
            value
            for item in info.get("CFBundleDocumentTypes", [])
            for value in item.get("CFBundleTypeExtensions", [])
        }
        checks = {
            "bundle id": info.get("CFBundleIdentifier") == bundle_id,
            "app kind": info.get("VNOfficeAppKind") == app_kind,
            "document types": actual_extensions == extensions,
            "executable": executable.is_file() and executable.stat().st_mode & 0o111,
            "icon": info.get("CFBundleIconFile") == "AppIcon" and (bundle / "Contents/Resources/AppIcon.icns").is_file(),
            "unsigned": not (bundle / "Contents" / "_CodeSignature").exists(),
        }
        failed = [name for name, passed in checks.items() if not passed]
        if failed:
            raise SystemExit(f"{product}.app không hợp lệ: {', '.join(failed)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: validate-development-bundles.py OUTPUT_DIR")
    validate(Path(sys.argv[1]).resolve())
    print("PASS: Doc.app, Sheet.app, Slide.app development bundles hợp lệ")
