"""Read a bounded first viewport from an XLSX package for fast local preview.

This module is deliberately read-only. LibreOffice remains authoritative for the
full workbook model, edits, save, and print.
"""

from __future__ import annotations

import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


_MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
_MAX_SHARED_STRINGS_BYTES = 64 * 1024 * 1024
_MAX_SHARED_STRINGS = 1_000_000
_MAX_SHARED_STRING_CHARS = 64 * 1024 * 1024
_CELL_REF = re.compile(r"^([A-Z]+)([1-9][0-9]*)$")
_DIMENSION_REF = re.compile(r"^[A-Z]+([1-9][0-9]*):([A-Z]+)([1-9][0-9]*)$")


def _column_number(label: str) -> int:
    number = 0
    for char in label:
        number = number * 26 + ord(char) - ord("A") + 1
    return number


def _resolve_sheet_target(target: str) -> str:
    target = str(target or "").replace("\\", "/")
    if not target or ":" in target or target.startswith("//"):
        raise ValueError("Workbook sheet relationship is not a local package path.")
    resolved = target.lstrip("/") if target.startswith("/") else posixpath.join("xl", target)
    resolved = posixpath.normpath(resolved)
    if resolved == ".." or resolved.startswith("../") or not resolved.startswith("xl/"):
        raise ValueError("Workbook sheet relationship escapes the XLSX package.")
    return resolved


def _read_shared_strings(package: zipfile.ZipFile) -> list[str]:
    try:
        info = package.getinfo("xl/sharedStrings.xml")
    except KeyError:
        return []
    if info.file_size > _MAX_SHARED_STRINGS_BYTES:
        raise ValueError("The XLSX shared-string table is too large for fast preview.")
    strings: list[str] = []
    total_chars = 0
    with package.open(info) as stream:
        for _, item in ET.iterparse(stream, events=("end",)):
            if item.tag == f"{{{_MAIN_NS}}}si":
                value = "".join(node.text or "" for node in item.iter() if node.tag == f"{{{_MAIN_NS}}}t")
                total_chars += len(value)
                if len(strings) >= _MAX_SHARED_STRINGS or total_chars > _MAX_SHARED_STRING_CHARS:
                    raise ValueError("The XLSX shared-string table exceeds the preview limit.")
                strings.append(value)
                item.clear()
    return strings


def _numeric_value(raw: str) -> int | float | str:
    try:
        if not any(char in raw for char in ".eE"):
            return int(raw)
        return float(raw)
    except (ValueError, OverflowError):
        return raw


def _parse_dimension(reference: str | None) -> tuple[int, int] | None:
    if not reference:
        return None
    end = str(reference).split(":", 1)[-1]
    match = re.fullmatch(r"([A-Z]+)([1-9][0-9]*)", end)
    if not match:
        return None
    return int(match.group(2)), _column_number(match.group(1))


def parse_xlsx_preview(
    source_path: str | Path,
    max_rows: int = 40,
    max_cols: int = 20,
    *,
    sheet_index: int | None = None,
    start_row: int = 0,
    start_col: int = 0,
) -> dict[str, Any]:
    """Return a bounded viewport and workbook sheet names using local OOXML only."""
    row_limit = max(1, min(int(max_rows), 200))
    col_limit = max(1, min(int(max_cols), 100))
    start_row = max(0, int(start_row))
    start_col = max(0, int(start_col))
    with zipfile.ZipFile(source_path, "r") as package:
        names = set(package.namelist())
        if "xl/workbook.xml" not in names or "xl/_rels/workbook.xml.rels" not in names:
            raise ValueError("The XLSX workbook manifest is incomplete.")
        workbook = ET.fromstring(package.read("xl/workbook.xml"))
        relationships = ET.fromstring(package.read("xl/_rels/workbook.xml.rels"))
        relationship_targets = {}
        for relation in relationships.findall(f"{{{_PKG_REL_NS}}}Relationship"):
            if relation.attrib.get("TargetMode", "").lower() == "external":
                continue
            relationship_targets[relation.attrib.get("Id", "")] = relation.attrib.get("Target", "")

        workbook_view = workbook.find(f"{{{_MAIN_NS}}}bookViews/{{{_MAIN_NS}}}workbookView")
        try:
            active_index = int(workbook_view.attrib.get("activeTab", "0")) if workbook_view is not None else 0
        except (TypeError, ValueError):
            active_index = 0
        sheet_elements = workbook.findall(f"{{{_MAIN_NS}}}sheets/{{{_MAIN_NS}}}sheet")
        if not sheet_elements:
            raise ValueError("The XLSX workbook contains no worksheets.")
        active_index = max(0, min(active_index, len(sheet_elements) - 1))
        if sheet_index is not None:
            active_index = max(0, min(int(sheet_index), len(sheet_elements) - 1))
        sheets = [
            {"name": element.attrib.get("name", f"Sheet{index + 1}"), "rows": 1, "cols": 1,
             "dimensions_known": False}
            for index, element in enumerate(sheet_elements)
        ]
        active_sheet = sheet_elements[active_index]
        relationship_id = active_sheet.attrib.get(f"{{{_REL_NS}}}id", "")
        sheet_target = _resolve_sheet_target(relationship_targets.get(relationship_id, ""))
        if sheet_target not in names:
            raise ValueError("The active XLSX worksheet is missing.")
        shared_strings = _read_shared_strings(package)

        row_count = col_count = 1
        dimension_ref = None
        values: list[list[Any]] = []
        formulas: list[list[str]] = []
        strings: list[list[str]] = []
        with package.open(sheet_target) as sheet_stream:
            last_row_index = 0
            stop_row = start_row + row_limit
            for _, element in ET.iterparse(sheet_stream, events=("end",)):
                if element.tag == f"{{{_MAIN_NS}}}dimension":
                    dimension_ref = element.attrib.get("ref")
                    dimensions = _parse_dimension(dimension_ref)
                    if dimensions:
                        row_count, col_count = dimensions
                    element.clear()
                elif element.tag == f"{{{_MAIN_NS}}}row":
                    try:
                        row_index = int(element.attrib.get("r", ""))
                    except ValueError:
                        row_index = 0
                    if row_index < 1:
                        row_index = last_row_index + 1
                    last_row_index = row_index
                    if start_row < row_index <= stop_row:
                        local_row = row_index - start_row - 1
                        while len(values) <= local_row:
                            width = min(max(col_count - start_col, 1), col_limit)
                            values.append([""] * width)
                            formulas.append([""] * width)
                            strings.append([""] * width)
                        row_values = values[local_row]
                        row_formulas = formulas[local_row]
                        row_strings = strings[local_row]
                        for cell in element.findall(f"{{{_MAIN_NS}}}c"):
                            reference = _CELL_REF.fullmatch(cell.attrib.get("r", ""))
                            if reference is None:
                                continue
                            row_from_ref = int(reference.group(2))
                            column = _column_number(reference.group(1)) - 1
                            if row_from_ref != row_index or column < start_col or column >= start_col + col_limit:
                                continue
                            local_col = column - start_col
                            if local_col >= len(row_values):
                                if dimension_ref:
                                    continue
                                extra = local_col + 1 - len(row_values)
                                row_values.extend([""] * extra)
                                row_formulas.extend([""] * extra)
                                row_strings.extend([""] * extra)
                                col_count = max(col_count, column + 1)
                            value_node = cell.find(f"{{{_MAIN_NS}}}v")
                            formula_node = cell.find(f"{{{_MAIN_NS}}}f")
                            raw_value = value_node.text if value_node is not None and value_node.text is not None else ""
                            cell_type = cell.attrib.get("t", "")
                            value: Any = raw_value
                            if cell_type == "s" and raw_value:
                                string_index = int(raw_value)
                                if string_index < 0 or string_index >= len(shared_strings):
                                    raise ValueError("The XLSX cell refers to a missing shared string.")
                                value = shared_strings[string_index]
                            elif cell_type == "inlineStr":
                                value = "".join(node.text or "" for node in cell.iter() if node.tag == f"{{{_MAIN_NS}}}t")
                            elif cell_type == "b":
                                value = raw_value == "1"
                            elif cell_type in {"", "n"} and raw_value:
                                value = _numeric_value(raw_value)
                            row_values[local_col] = value
                            row_strings[local_col] = value if isinstance(value, str) else ("TRUE" if value is True else "FALSE" if value is False else str(value))
                            if formula_node is not None and formula_node.text:
                                row_formulas[local_col] = "=" + formula_node.text
                    element.clear()
                    if row_index >= stop_row:
                        break

        row_count = max(1, row_count)
        col_count = max(1, col_count)
        preview_rows = max(1, min(max(0, row_count - start_row), row_limit))
        preview_cols = max(1, min(max(0, col_count - start_col), col_limit))
        if not dimension_ref:
            preview_cols = max(preview_cols, min(max((len(row) for row in values), default=0), col_limit))
        while len(values) < preview_rows:
            values.append([""] * preview_cols)
            formulas.append([""] * preview_cols)
            strings.append([""] * preview_cols)
        values = [(row[:preview_cols] + [""] * max(0, preview_cols - len(row))) for row in values[:preview_rows]]
        formulas = [(row[:preview_cols] + [""] * max(0, preview_cols - len(row))) for row in formulas[:preview_rows]]
        strings = [(row[:preview_cols] + [""] * max(0, preview_cols - len(row))) for row in strings[:preview_rows]]
        active_name = active_sheet.attrib.get("name", f"Sheet{active_index + 1}")
        sheets[active_index].update({"rows": row_count, "cols": col_count, "dimensions_known": bool(dimension_ref)})
        return {
            "ok": True,
            "sheet": active_index,
            "sheets": sheets,
            "window": {
                "ok": True,
                "values": values,
                "formulas": formulas,
                "strings": strings,
                "col_widths": [2646] * preview_cols,
                "row_heights": [529] * preview_rows,
                "col_hidden": [False] * preview_cols,
                "row_hidden": [False] * preview_rows,
                "formats": [],
                "sheet_rows": row_count,
                "sheet_cols": col_count,
            },
            "active_sheet_name": active_name,
            "rows": preview_rows,
            "cols": preview_cols,
        }


def parse_xlsx_preview_window(
    source_path: str | Path, sheet_index: int, r0: int, c0: int, r1: int, c1: int
) -> dict[str, Any]:
    """Read one bounded 40×20 viewport, used until the UNO preview session attaches."""
    first_row, first_col = max(0, int(r0)), max(0, int(c0))
    last_row, last_col = int(r1), int(c1)
    if last_row < first_row or last_col < first_col:
        raise ValueError("XLSX preview window coordinates are invalid.")
    row_count, col_count = last_row - first_row + 1, last_col - first_col + 1
    if row_count > 40 or col_count > 20:
        raise ValueError("XLSX preview windows are limited to 40 rows by 20 columns.")
    return parse_xlsx_preview(
        source_path,
        max_rows=row_count,
        max_cols=col_count,
        sheet_index=sheet_index,
        start_row=first_row,
        start_col=first_col,
    )
