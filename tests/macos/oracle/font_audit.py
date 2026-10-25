"""Fonts referenced by .docx/.pptx files vs fonts available to Office for Mac and to 3T (ORACLE-1).

Office for Mac renders with system fonts PLUS its own bundled fonts (…/Contents/Resources/DFonts);
3T renders through LibreOffice, which sees system fonts PLUS LibreOffice's bundled fonts only.
A font referenced by a document that Office has but LibreOffice lacks is a likely cause of a
page-count difference (input for MAC-9). No document content leaves the machine.

Usage: python tests/macos/oracle/font_audit.py FILE... [--out fonts.json] [--soffice PATH]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

OFFICE_FONT_DIRS = [Path(f"/Applications/Microsoft {app}.app/Contents/Resources/DFonts")
                    for app in ("Word", "PowerPoint", "Excel")]
THEME_PLACEHOLDER = re.compile(r"^\+(mn|mj)-(lt|ea|cs)$")
RFONTS_TAG = re.compile(r"<w:rFonts\b([^>]*)>")
RFONTS_ATTR = re.compile(r'w:(?:ascii|hAnsi|cs|eastAsia)="([^"]+)"')
# DrawingML run/theme fonts; theme <a:font script=…> fallback lists are deliberately skipped.
DML_FONT = re.compile(r'<a:(?:latin|ea|cs|sym)\b[^>]*\btypeface="([^"]+)"')
FONT_TABLE = re.compile(r'<w:font\s+w:name="([^"]+)"')


def referenced_fonts(path: Path) -> list[str]:
    """Explicit font family names referenced anywhere in the package's XML parts."""
    names: set[str] = set()
    with zipfile.ZipFile(path) as z:
        for part in z.namelist():
            if not part.endswith(".xml") or not part.startswith(("word/", "ppt/", "xl/")):
                continue
            xml = z.read(part).decode("utf-8", "replace")
            found = DML_FONT.findall(xml) + FONT_TABLE.findall(xml)
            for attrs in RFONTS_TAG.findall(xml):
                found += RFONTS_ATTR.findall(attrs)
            for name in found:
                name = name.strip()
                if name and not THEME_PLACEHOLDER.match(name):
                    names.add(name)
    return sorted(names, key=str.lower)


def _read_name_table(data: bytes, offset: int = 0) -> set[str]:
    """Family names (name IDs 1 and 16) from an sfnt font starting at `offset`."""
    num_tables = struct.unpack_from(">H", data, offset + 4)[0]
    for i in range(num_tables):
        tag, _cs, toff, _len = struct.unpack_from(">4sIII", data, offset + 12 + 16 * i)
        if tag != b"name":
            continue
        _fmt, count, string_off = struct.unpack_from(">HHH", data, toff)
        families = set()
        for j in range(count):
            pid, eid, _lid, nid, length, noff = struct.unpack_from(">HHHHHH", data, toff + 6 + 12 * j)
            if nid not in (1, 16):
                continue
            raw = data[toff + string_off + noff: toff + string_off + noff + length]
            if pid == 3 or (pid == 0):
                text = raw.decode("utf-16-be", "replace")
            elif pid == 1 and eid == 0:
                text = raw.decode("mac_roman", "replace")
            else:
                continue
            if text.strip():
                families.add(text.strip())
        return families
    return set()


def font_file_families(path: Path) -> set[str]:
    try:
        data = path.read_bytes()
    except OSError:
        return set()
    try:
        if data[:4] == b"ttcf":
            n = struct.unpack_from(">I", data, 8)[0]
            out: set[str] = set()
            for k in range(n):
                out |= _read_name_table(data, struct.unpack_from(">I", data, 12 + 4 * k)[0])
            return out
        if data[:4] in (b"\x00\x01\x00\x00", b"OTTO", b"true"):
            return _read_name_table(data)
    except struct.error:
        return set()
    return set()


def dir_families(dirs) -> set[str]:
    out: set[str] = set()
    for d in dirs:
        if not d.is_dir():
            continue
        for root, _dirs, files in os.walk(d):
            for f in files:
                if f.lower().endswith((".ttf", ".otf", ".ttc")):
                    out |= font_file_families(Path(root) / f)
    return out


def system_families() -> set[str]:
    proc = subprocess.run(["system_profiler", "SPFontsDataType", "-json"], capture_output=True, text=True, timeout=300)
    data = json.loads(proc.stdout or "{}")
    out = set()
    for item in data.get("SPFontsDataType", []):
        for face in item.get("typefaces", []):
            if face.get("family"):
                out.add(face["family"])
    return out


def lo_font_dirs(soffice: str | None) -> list[Path]:
    if not soffice:
        return []
    resources = Path(soffice).resolve().parent.parent / "Resources" / "fonts"
    return [resources]


def classify(referenced: list[str], system: set[str], office: set[str], lo: set[str]) -> dict:
    low = lambda s: {x.lower() for x in s}  # noqa: E731
    sys_l, off_l, lo_l = low(system), low(office), low(lo)
    missing_office = [f for f in referenced if f.lower() not in sys_l | off_l]
    missing_3t = [f for f in referenced if f.lower() not in sys_l | lo_l]
    office_only = [f for f in referenced if f.lower() in off_l and f.lower() not in sys_l | lo_l]
    return {"referenced": referenced, "missingForOffice": missing_office, "missingFor3T": missing_3t,
            "officeBundledOnly": office_only}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--soffice", default=os.environ.get("VNOFFICE_SOFFICE_PATH"))
    args = ap.parse_args(argv)
    system, office, lo = system_families(), dir_families(OFFICE_FONT_DIRS), dir_families(lo_font_dirs(args.soffice))
    rows = []
    for path in args.files:
        row = {"file": path.name, **classify(referenced_fonts(path), system, office, lo)}
        rows.append(row)
        print(f"{path.name}: referenced={row['referenced']} missingFor3T={row['missingFor3T']} "
              f"missingForOffice={row['missingForOffice']}")
    if args.out:
        args.out.write_text(json.dumps({"systemFamilies": len(system), "officeBundledFamilies": len(office),
                                        "libreOfficeBundledFamilies": len(lo), "rows": rows},
                                       ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
