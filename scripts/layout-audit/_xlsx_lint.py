"""Lint OOXML package well-formedness and common XLSX schema traps.

Usage: python _xlsx_lint.py <xlsx>

Uses namespace-aware XML parsing so valid namespace prefixes and empty/self-closing
worksheet rows are handled the same way as expanded elements.
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].split(":")[-1]


def _children(element: ET.Element | None, name: str) -> list[ET.Element]:
    if element is None:
        return []
    return [child for child in list(element) if _local_name(child.tag) == name]


def _find(root: ET.Element | None, name: str) -> ET.Element | None:
    if root is None:
        return None
    if _local_name(root.tag) == name:
        return root
    return next((element for element in root.iter() if _local_name(element.tag) == name), None)


def _column_number(label: str) -> int:
    value = 0
    for character in label:
        value = value * 26 + ord(character.upper()) - 64
    return value


def lint_xlsx(path: str | Path) -> list[str]:
    issues: list[str] = []
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        parsed: dict[str, ET.Element] = {}
        for name in sorted(names):
            if not (name.endswith(".xml") or name.endswith(".rels")):
                continue
            try:
                parsed[name] = ET.fromstring(archive.read(name))
            except Exception as exc:
                issues.append(f"NOT WELL-FORMED: {name} {exc}")

        styles = parsed.get("xl/styles.xml")
        expected_counts = {
            "fonts": "font",
            "fills": "fill",
            "borders": "border",
            "cellXfs": "xf",
            "numFmts": "numFmt",
            "cellStyleXfs": "xf",
            "cellStyles": "cellStyle",
            "dxfs": "dxf",
        }
        counts: dict[str, int] = {}
        for parent_name, child_name in expected_counts.items():
            parent = _find(styles, parent_name)
            actual = len(_children(parent, child_name))
            counts[parent_name] = actual
            declared = parent.get("count") if parent is not None else None
            if declared is not None and declared.isdigit() and actual != int(declared):
                issues.append(f"COUNT MISMATCH {parent_name}: count={declared} actual={actual}")

        fonts = counts.get("fonts", 0)
        fills = counts.get("fills", 0)
        borders = counts.get("borders", 0)
        cell_style_xfs = counts.get("cellStyleXfs", 0)
        declared_num_formats = {
            int(element.get("numFmtId", "0"))
            for element in _children(_find(styles, "numFmts"), "numFmt")
            if element.get("numFmtId", "").isdigit()
        }
        style_xfs = _children(_find(styles, "cellXfs"), "xf")
        for index, style in enumerate(style_xfs):
            for attribute, label, limit in (
                ("fontId", "fontId", fonts),
                ("fillId", "fillId", fills),
                ("borderId", "borderId", borders),
            ):
                raw = style.get(attribute, "0")
                if raw.isdigit() and int(raw) >= limit:
                    issues.append(f"xf {index}: {label} {raw} >= {limit}")
            raw_style = style.get("xfId", "0")
            if raw_style.isdigit() and int(raw_style) >= max(cell_style_xfs, 1):
                issues.append(f"xf {index}: xfId {raw_style} >= {cell_style_xfs}")
            raw_format = style.get("numFmtId", "0")
            if raw_format.isdigit():
                number_format = int(raw_format)
                if number_format >= 164 and number_format not in declared_num_formats:
                    issues.append(f"xf {index}: numFmtId {number_format} undeclared")

        shared_strings = _find(parsed.get("xl/sharedStrings.xml"), "sst")
        string_items = _children(shared_strings, "si")
        declared_unique = shared_strings.get("uniqueCount") if shared_strings is not None else None
        if declared_unique and declared_unique.isdigit() and int(declared_unique) != len(string_items):
            issues.append(f"SST uniqueCount={declared_unique} actual si={len(string_items)}")

        for name in sorted(names):
            if not name.startswith("xl/worksheets/sheet") or not name.endswith(".xml"):
                continue
            sheet = parsed.get(name)
            if sheet is None:
                continue
            columns = _find(sheet, "cols")
            if columns is not None and not _children(columns, "col"):
                issues.append(f"{name} EMPTY <cols>")
            previous_row = 0
            sheet_data = _find(sheet, "sheetData")
            for row in _children(sheet_data, "row"):
                raw_row = row.get("r", "")
                if not raw_row.isdigit():
                    issues.append(f"{name} row missing numeric r")
                    continue
                row_number = int(raw_row)
                if row_number <= previous_row:
                    issues.append(f"{name} row order broken at {row_number}")
                    break
                previous_row = row_number
                previous_column = 0
                for cell in _children(row, "c"):
                    reference = cell.get("r", "")
                    match = re.fullmatch(r"([A-Z]+)(\d+)", reference)
                    if not match:
                        issues.append(f"{name} invalid cell reference {reference!r}")
                        continue
                    column = _column_number(match.group(1))
                    cell_row = int(match.group(2))
                    if cell_row != row_number:
                        issues.append(f"{name} cell row mismatch {reference} in row {row_number}")
                    if column <= previous_column:
                        issues.append(f"{name} cell order broken at {reference}")
                        break
                    previous_column = column
                    if cell.get("t") == "s":
                        value = _find(cell, "v")
                        raw_index = value.text.strip() if value is not None and value.text else ""
                        if not raw_index.isdigit() or int(raw_index) >= len(string_items):
                            issues.append(f"{name} {reference} shared-string index {raw_index!r} >= {len(string_items)}")
                    raw_style = cell.get("s", "0")
                    if raw_style.isdigit() and int(raw_style) >= len(style_xfs):
                        issues.append(f"{name} {reference} xf {raw_style} >= {len(style_xfs)}")

            format_properties = _find(sheet, "sheetFormatPr")
            if format_properties is not None and "defaultRowHeight" not in format_properties.attrib:
                issues.append(f"{name} sheetFormatPr without defaultRowHeight")

            if columns is not None:
                previous_max = 0
                for column in _children(columns, "col"):
                    raw_min, raw_max = column.get("min", ""), column.get("max", "")
                    if not raw_min.isdigit() or not raw_max.isdigit():
                        issues.append(f"{name} invalid column range")
                        continue
                    minimum, maximum = int(raw_min), int(raw_max)
                    if minimum <= previous_max or maximum < minimum:
                        issues.append(f"{name} col range broken min={minimum} max={maximum}")
                        break
                    previous_max = maximum

    return issues


def main(argv: list[str] | None = None) -> int:
    arguments = sys.argv[1:] if argv is None else argv
    if len(arguments) != 1:
        print("Usage: python _xlsx_lint.py <xlsx>", file=sys.stderr)
        return 2
    try:
        issues = lint_xlsx(arguments[0])
    except Exception as exc:
        print(f"LINT ERROR: {exc}")
        return 1
    for issue in issues:
        print(issue)
    print("lint done")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
