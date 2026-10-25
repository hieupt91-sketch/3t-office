#!/usr/bin/env python3
from __future__ import annotations

import plistlib
import sys
from pathlib import Path


EXPECTED = {
    "Doc": ("vn.office.doc", "writer", {"docx", "doc", "odt", "rtf", "txt"}),
    "Sheet": ("vn.office.sheet", "sheet", {"xlsx", "xls", "ods", "csv", "xltx", "xlt"}),
    "Slide": ("vn.office.slide", "slides", {"pptx", "ppt", "odp"}),
}

# UTI do bundle khai (imported): định danh -> (phần mở rộng, MIME).
EXPECTED_UTI = {
    "Doc": {
        "org.openxmlformats.wordprocessingml.document": (
            "docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        "com.microsoft.word.doc": ("doc", "application/msword"),
        "org.oasis-open.opendocument.text": (
            "odt",
            "application/vnd.oasis.opendocument.text",
        ),
    },
    "Sheet": {
        "org.openxmlformats.spreadsheetml.sheet": (
            "xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
        "com.microsoft.excel.xls": ("xls", "application/vnd.ms-excel"),
        "org.oasis-open.opendocument.spreadsheet": (
            "ods",
            "application/vnd.oasis.opendocument.spreadsheet",
        ),
        "org.openxmlformats.spreadsheetml.template": (
            "xltx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
        ),
        "com.microsoft.excel.xlt": ("xlt", "application/vnd.ms-excel"),
    },
    "Slide": {
        "org.openxmlformats.presentationml.presentation": (
            "pptx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ),
        "com.microsoft.powerpoint.ppt": ("ppt", "application/vnd.ms-powerpoint"),
        "org.oasis-open.opendocument.presentation": (
            "odp",
            "application/vnd.oasis.opendocument.presentation",
        ),
    },
}

# UTI `public.*` do hệ thống (CoreTypes) export: bundle chỉ tham chiếu, không khai.
SYSTEM_UTI = {
    "Doc": {"public.rtf", "public.plain-text"},
    "Sheet": {"public.comma-separated-values-text"},
    "Slide": set(),
}


def _uti_checks(info: dict, product: str) -> list[str]:
    """Trả về danh sách lỗi về phần đăng ký UTI của bundle."""
    errors: list[str] = []
    expected = EXPECTED_UTI[product]
    declarations = {
        item.get("UTTypeIdentifier"): item
        for item in info.get("UTImportedTypeDeclarations", [])
    }
    if set(declarations) != set(expected):
        errors.append(
            "UTImportedTypeDeclarations: "
            f"thiếu {sorted(set(expected) - set(declarations))}, "
            f"thừa {sorted(set(declarations) - set(expected))}"
        )
    for identifier, (extension, mime_type) in expected.items():
        declaration = declarations.get(identifier)
        if not declaration:
            continue
        tags = declaration.get("UTTypeTagSpecification", {})
        if extension not in tags.get("public.filename-extension", []):
            errors.append(f"UTI {identifier}: thiếu phần mở rộng {extension}")
        if tags.get("public.mime-type") != mime_type:
            errors.append(
                f"UTI {identifier}: MIME {tags.get('public.mime-type')!r} != {mime_type!r}"
            )
        if not declaration.get("UTTypeDescription"):
            errors.append(f"UTI {identifier}: thiếu UTTypeDescription")

    registered: set[str] = set()
    for item in info.get("CFBundleDocumentTypes", []):
        registered.update(item.get("LSItemContentTypes", []))
        if item.get("CFBundleTypeRole") != "Editor":
            errors.append(f"CFBundleTypeRole phải là Editor, thấy {item.get('CFBundleTypeRole')!r}")
        if item.get("LSHandlerRank") != "Alternate":
            errors.append(f"LSHandlerRank phải là Alternate, thấy {item.get('LSHandlerRank')!r}")
    wanted = set(expected) | SYSTEM_UTI[product]
    if registered != wanted:
        errors.append(
            "LSItemContentTypes: "
            f"thiếu {sorted(wanted - registered)}, thừa {sorted(registered - wanted)}"
        )
    return errors


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
        uti_errors = _uti_checks(info, product)
        if uti_errors:
            raise SystemExit(f"{product}.app đăng ký UTI sai: {'; '.join(uti_errors)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: validate-development-bundles.py OUTPUT_DIR")
    validate(Path(sys.argv[1]).resolve())
    print("PASS: Doc.app, Sheet.app, Slide.app development bundles hợp lệ")
