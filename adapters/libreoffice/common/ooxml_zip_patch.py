"""Shared OOXML ZIP patcher + Sheet XLSX native export/import overlay.

Python twin of:
  adapters/libreoffice/common/ooxml-zip-patch.js
  adapters/libreoffice/sheet/xlsx-workbook-protection.js
  adapters/libreoffice/sheet/xlsx-native-postprocess.js

main.py calls:
  - postprocess_sheet_xlsx() after soffice FODS→XLSX (File → Lưu)
  - overlay_sheet_xlsx_fods() after soffice XLSX→FODS (File → Mở)

Keep the XML transform in lock step with the JS helpers.
"""

from __future__ import annotations

import argparse
import io
import re
import sys
import zipfile

XLSX_WORKBOOK_ENTRY = "xl/workbook.xml"

_PROTECTION_OPEN_RE = re.compile(
    r"<((?:[\w]+:)?workbookProtection)\b([^>]*?)(/?)\s*>",
    re.IGNORECASE,
)
_LOCK_STRUCTURE_RE = re.compile(
    r"\blockStructure\s*=\s*(['\"])[^'\"]*\1",
    re.IGNORECASE,
)
_BEFORE_SIBLING_RE = re.compile(
    r"<(?:[\w]+:)?(?:bookViews|sheets)\b",
    re.IGNORECASE,
)
_WORKBOOK_CLOSE_RE = re.compile(r"</(?:[\w]+:)?workbook\s*>", re.IGNORECASE)
_FODS_STRUCTURE_RE = re.compile(
    r"<office:spreadsheet\b[^>]*table:structure-protected\s*=\s*['\"]true['\"]",
    re.IGNORECASE,
)
_SPREADSHEET_OPEN_RE = re.compile(
    r"<office:spreadsheet\b([^>]*?)(/?)\s*>",
    re.IGNORECASE,
)
_STRUCTURE_ATTR_RE = re.compile(
    r"\btable:structure-protected\s*=\s*(['\"])[^'\"]*\1",
    re.IGNORECASE,
)
_LOCK_STRUCTURE_TRUE_RE = re.compile(
    r"\blockStructure\s*=\s*(['\"]?)(1|true)\1",
    re.IGNORECASE,
)


def fods_has_structure_protection(fods_xml: str | None) -> bool:
    return bool(_FODS_STRUCTURE_RE.search(fods_xml or ""))


def workbook_has_structure_lock(workbook_xml: str | None) -> bool:
    match = _PROTECTION_OPEN_RE.search(workbook_xml or "")
    if not match:
        return False
    attrs = match.group(2) or ""
    return bool(_LOCK_STRUCTURE_TRUE_RE.search(attrs))


def apply_fods_structure_protection(fods_xml: str) -> str:
    """Ensure office:spreadsheet carries table:structure-protected='true'."""
    xml = fods_xml or ""
    if not xml:
        return xml
    match = _SPREADSHEET_OPEN_RE.search(xml)
    if not match:
        return xml
    attrs = match.group(1) or ""
    self_close = match.group(2) == "/"
    if _STRUCTURE_ATTR_RE.search(attrs):
        attrs = _STRUCTURE_ATTR_RE.sub('table:structure-protected="true"', attrs)
    else:
        attrs = f"{attrs.rstrip()} table:structure-protected=\"true\""
    if attrs and not attrs.startswith(" "):
        attrs = f" {attrs}"
    next_tag = f"<office:spreadsheet{attrs}/>" if self_close else f"<office:spreadsheet{attrs}>"
    return xml[: match.start()] + next_tag + xml[match.end() :]


def overlay_fods_structure_protection(fods_xml: str, workbook_xml: str | None) -> str:
    """Inject table:structure-protected when original XLSX has lockStructure."""
    xml = fods_xml or ""
    if not workbook_has_structure_lock(workbook_xml):
        return xml
    return apply_fods_structure_protection(xml)


def apply_workbook_protection_lock_structure(workbook_xml: str) -> str:
    """Ensure workbookProtection lockStructure='1' at a schema-valid slot."""
    xml = workbook_xml or ""
    if not xml:
        return xml
    match = _PROTECTION_OPEN_RE.search(xml)
    if match:
        name = match.group(1)
        attrs = match.group(2) or ""
        self_close = match.group(3) == "/"
        if _LOCK_STRUCTURE_RE.search(attrs):
            attrs = _LOCK_STRUCTURE_RE.sub('lockStructure="1"', attrs)
        else:
            attrs = f"{attrs.rstrip()} lockStructure=\"1\""
        if attrs and not attrs.startswith(" "):
            attrs = f" {attrs}"
        next_tag = f"<{name}{attrs}/>" if self_close else f"<{name}{attrs}>"
        return xml[: match.start()] + next_tag + xml[match.end() :]
    insertion = '<workbookProtection lockStructure="1"/>'
    sibling = _BEFORE_SIBLING_RE.search(xml)
    if sibling:
        return xml[: sibling.start()] + insertion + xml[sibling.start() :]
    return _WORKBOOK_CLOSE_RE.sub(insertion + "</workbook>", xml, count=1)


def patch_ooxml_zip(zip_bytes: bytes, replacements: dict[str, str | bytes]) -> bytes:
    """Replace named ZIP entries; copy the rest. No third-party library."""
    source = io.BytesIO(zip_bytes)
    dest = io.BytesIO()
    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(
        dest, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        for item in zin.infolist():
            if item.is_dir() or not item.filename or item.filename.endswith("/"):
                continue
            if item.filename in replacements:
                payload = replacements[item.filename]
                data = payload.encode("utf-8") if isinstance(payload, str) else payload
            else:
                data = zin.read(item.filename)
            info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)
    return dest.getvalue()


def postprocess_sheet_xlsx(
    xlsx_bytes: bytes,
    *,
    source_fods: str | None = None,
    enabled: bool | None = None,
) -> bytes:
    """Return patched XLSX bytes, or the original buffer when no lock is needed."""
    if enabled is None:
        enabled = fods_has_structure_protection(source_fods)
    if not enabled:
        return xlsx_bytes
    try:
        current = _read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    except KeyError as exc:
        raise ValueError("XLSX thiếu xl/workbook.xml — không thể bổ sung workbookProtection") from exc
    xml = current.decode("utf-8")
    next_xml = apply_workbook_protection_lock_structure(xml)
    if next_xml == xml:
        return xlsx_bytes
    return patch_ooxml_zip(xlsx_bytes, {XLSX_WORKBOOK_ENTRY: next_xml})


def _read_zip_entry(zip_bytes: bytes, entry_name: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as package:
        return package.read(entry_name)


def read_zip_entry(zip_bytes: bytes, entry_name: str) -> bytes | None:
    """Public ZIP read used by File → Mở overlay. Returns None when missing."""
    try:
        return _read_zip_entry(zip_bytes, entry_name)
    except (KeyError, zipfile.BadZipFile, OSError, ValueError):
        return None


def overlay_sheet_xlsx_fods(xlsx_bytes: bytes, fods_xml: str | None) -> str:
    """Read xl/workbook.xml from the original XLSX and overlay FODS.

    LibreOffice XLSX→FODS drops lockStructure. Production File → Mở must
    restore table:structure-protected before SheetAdapter.parseFods().
    """
    xml = fods_xml or ""
    current = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    if not current:
        return xml
    workbook_xml = current.decode("utf-8", errors="replace")
    return overlay_fods_structure_protection(xml, workbook_xml)


def overlay_sheet_xlsx_fods_file(
    xlsx_path: str,
    fods_path: str,
    *,
    out_path: str | None = None,
) -> str:
    with open(xlsx_path, "rb") as handle:
        xlsx_bytes = handle.read()
    with open(fods_path, "r", encoding="utf-8", errors="replace") as handle:
        fods_xml = handle.read()
    overlaid = overlay_sheet_xlsx_fods(xlsx_bytes, fods_xml)
    dest = out_path or fods_path
    if overlaid != fods_xml or dest != fods_path:
        with open(dest, "w", encoding="utf-8", newline="") as handle:
            handle.write(overlaid)
    return dest


def postprocess_sheet_xlsx_file(
    xlsx_path: str,
    *,
    fods_path: str | None = None,
    enabled: bool | None = None,
    out_path: str | None = None,
) -> str:
    with open(xlsx_path, "rb") as handle:
        xlsx_bytes = handle.read()
    source_fods = None
    if fods_path:
        with open(fods_path, "r", encoding="utf-8", errors="replace") as handle:
            source_fods = handle.read()
    patched = postprocess_sheet_xlsx(
        xlsx_bytes, source_fods=source_fods, enabled=enabled
    )
    dest = out_path or xlsx_path
    if patched is not xlsx_bytes:
        with open(dest, "wb") as handle:
            handle.write(patched)
    elif dest != xlsx_path:
        with open(dest, "wb") as handle:
            handle.write(patched)
    return dest


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Patch xl/workbook.xml lockStructure after soffice FODS→XLSX, "
        "or overlay FODS from original XLSX lockStructure (File → Mở)."
    )
    parser.add_argument("--xlsx", required=True, help="Input .xlsx path")
    parser.add_argument("--fods", help="Source .fods used to detect table:structure-protected")
    parser.add_argument("--enable", action="store_true", help="Force lockStructure even without FODS")
    parser.add_argument("--out", help="Output path (default: overwrite --xlsx or --overlay-fods)")
    parser.add_argument(
        "--overlay-fods",
        help="Input FODS to overlay from --xlsx lockStructure (File → Mở path)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.overlay_fods:
        overlay_sheet_xlsx_fods_file(args.xlsx, args.overlay_fods, out_path=args.out)
        return 0
    enabled = True if args.enable else None
    postprocess_sheet_xlsx_file(
        args.xlsx, fods_path=args.fods, enabled=enabled, out_path=args.out
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
