"""P6 feasibility spike: stream a simple XLSX directly into a semantic payload.

This is deliberately not wired into the application.  ``read_simple_xlsx``
returns ``None`` whenever the package contains a feature outside the conservative
"simple workbook" contract documented in ``docs/SPIKE-P6-DIRECT-XLSX.md``.
Only Python's standard library is used.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import posixpath
import re
import sys
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Iterable
import xml.etree.ElementTree as ET


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
Q = lambda prefix, name: f"{{{NS[prefix]}}}{name}"
CELL_REF_RE = re.compile(r"^\$?([A-Z]{1,3})\$?([1-9][0-9]*)$")
UNSUPPORTED_PART_PREFIXES = (
    "xl/charts/", "xl/drawings/", "xl/pivotTables/", "xl/pivotCache/",
    "xl/tables/", "xl/externalLinks/", "xl/slicers/", "xl/ctrlProps/",
    "xl/embeddings/", "xl/threadedComments/", "xl/comments",
)
UNSUPPORTED_PARTS = {
    "xl/connections.xml", "xl/vbaProject.bin", "xl/persons/person.xml",
}
UNSUPPORTED_SHEET_TAGS = {
    "conditionalFormatting", "dataValidations", "tableParts", "drawing",
    "legacyDrawing", "legacyDrawingHF", "oleObjects", "controls", "picture",
    "extLst", "hyperlinks", "scenarios",
}
BUILTIN_NUMBER_FORMATS = {
    0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00",
    9: "0%", 10: "0.00%", 11: "0.00E+00", 12: "# ?/?", 13: "# ??/??",
    14: "mm-dd-yy", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy",
    18: "h:mm AM/PM", 19: "h:mm:ss AM/PM", 20: "h:mm", 21: "h:mm:ss",
    22: "m/d/yy h:mm", 37: "#,##0 ;(#,##0)", 38: "#,##0 ;[Red](#,##0)",
    39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)",
    45: "mm:ss", 46: "[h]:mm:ss", 47: "mmss.0", 48: "##0.0E+0", 49: "@",
}


@dataclass(frozen=True)
class SimpleCheck:
    simple: bool
    reasons: tuple[str, ...]


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _as_stream(source: str | Path | bytes | BinaryIO) -> BinaryIO:
    if isinstance(source, (str, Path)):
        return open(source, "rb")
    if isinstance(source, bytes):
        return io.BytesIO(source)
    return source


def _column_number(label: str) -> int:
    value = 0
    for char in label:
        value = value * 26 + ord(char) - 64
    return value


def _column_label(number: int) -> str:
    out = ""
    while number:
        number, tail = divmod(number - 1, 26)
        out = chr(65 + tail) + out
    return out


def _bool(value: str | None) -> bool:
    return str(value or "").lower() in {"1", "true", "yes", "on"}


def _number(raw: str) -> int | float | str:
    if not raw:
        return ""
    try:
        if re.fullmatch(r"[+-]?\d+", raw):
            return int(raw)
        value = float(raw)
        return value if math.isfinite(value) else raw
    except ValueError:
        return raw


def _text(element: ET.Element | None) -> str:
    return "" if element is None else "".join(element.itertext())


def _iter_xml(zf: zipfile.ZipFile, name: str, events=("end",)):
    with zf.open(name) as raw:
        yield from ET.iterparse(raw, events=events)


def _rels(zf: zipfile.ZipFile) -> dict[str, str]:
    result = {}
    rel_name = "xl/_rels/workbook.xml.rels"
    for _, elem in _iter_xml(zf, rel_name):
        if _local(elem.tag) == "Relationship":
            target = elem.get("Target", "").replace("\\", "/")
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            result[elem.get("Id", "")] = target
        elem.clear()
    return result


def _workbook_sheets(zf: zipfile.ZipFile) -> tuple[list[dict], bool]:
    relations = _rels(zf)
    sheets, date1904 = [], False
    with zf.open("xl/workbook.xml") as raw:
        for event, elem in ET.iterparse(raw, events=("start", "end")):
            tag = _local(elem.tag)
            if event == "start" and tag == "workbookPr":
                date1904 = _bool(elem.get("date1904"))
            elif event == "end" and tag == "sheet":
                rel_id = elem.get(Q("rel", "id"), "")
                sheets.append({
                    "name": elem.get("name", ""),
                    "state": elem.get("state", "visible"),
                    "path": relations.get(rel_id, ""),
                })
                elem.clear()
    return sheets, date1904


def detect_simple_xlsx(source: str | Path | bytes | BinaryIO) -> SimpleCheck:
    """Return a conservative eligibility decision without materializing sheets."""
    reasons: set[str] = set()
    stream = _as_stream(source)
    close_stream = stream is not source
    try:
        with zipfile.ZipFile(stream) as zf:
            names = set(zf.namelist())
            for name in names:
                if name in UNSUPPORTED_PARTS or name.startswith(UNSUPPORTED_PART_PREFIXES):
                    reasons.add(f"unsupported part: {name}")
            required = {"xl/workbook.xml", "xl/_rels/workbook.xml.rels"}
            for missing in sorted(required - names):
                reasons.add(f"missing part: {missing}")
            if reasons and required - names:
                return SimpleCheck(False, tuple(sorted(reasons)))
            sheets, _ = _workbook_sheets(zf)
            if not sheets:
                reasons.add("workbook has no sheets")
            for sheet in sheets:
                path = sheet["path"]
                if not path or path not in names:
                    reasons.add(f"missing worksheet part: {sheet['name']}")
                    continue
                for event, elem in _iter_xml(zf, path, events=("start", "end")):
                    tag = _local(elem.tag)
                    if event == "start" and tag in UNSUPPORTED_SHEET_TAGS:
                        reasons.add(f"{sheet['name']}: unsupported {tag}")
                    elif event == "start" and tag == "f" and elem.attrib:
                        reasons.add(f"{sheet['name']}: non-scalar formula")
                    if event == "end":
                        elem.clear()
            if "xl/sharedStrings.xml" in names:
                for event, elem in _iter_xml(zf, "xl/sharedStrings.xml", events=("start", "end")):
                    if event == "start" and _local(elem.tag) in {"r", "rPh", "phoneticPr"}:
                        reasons.add("rich or phonetic shared string")
                    if event == "end":
                        elem.clear()
            if "xl/workbook.xml" in names:
                for event, elem in _iter_xml(zf, "xl/workbook.xml", events=("start", "end")):
                    tag = _local(elem.tag)
                    if event == "start" and tag in {"externalReferences", "customWorkbookViews", "extLst"}:
                        reasons.add(f"unsupported workbook feature: {tag}")
                    if event == "end":
                        elem.clear()
    except (KeyError, ET.ParseError, zipfile.BadZipFile, OSError) as exc:
        reasons.add(f"invalid XLSX: {type(exc).__name__}: {exc}")
    finally:
        if close_stream:
            stream.close()
    return SimpleCheck(not reasons, tuple(sorted(reasons)))


def _shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    values: list[str] = []
    with zf.open("xl/sharedStrings.xml") as raw:
        for event, elem in ET.iterparse(raw, events=("end",)):
            if _local(elem.tag) == "si":
                values.append("".join(elem.itertext()))
                elem.clear()
    return values


def _color(elem: ET.Element | None) -> dict:
    if elem is None:
        return {}
    return {key: value for key, value in elem.attrib.items() if key in {"rgb", "indexed", "theme", "tint", "auto"}}


def _styles(zf: zipfile.ZipFile) -> list[dict]:
    if "xl/styles.xml" not in zf.namelist():
        return [{"xf": 0, "numFmtId": 0, "numberFormat": "General"}]
    root = ET.parse(zf.open("xl/styles.xml")).getroot()
    num_formats = dict(BUILTIN_NUMBER_FORMATS)
    numfmts = root.find(Q("main", "numFmts"))
    if numfmts is not None:
        for item in numfmts:
            num_formats[int(item.get("numFmtId", "0"))] = item.get("formatCode", "General")
    fonts = []
    for font in root.findall(f"{Q('main', 'fonts')}/{Q('main', 'font')}"):
        fonts.append({
            "name": font.find(Q("main", "name")).get("val", "") if font.find(Q("main", "name")) is not None else "",
            "size": _number(font.find(Q("main", "sz")).get("val", "")) if font.find(Q("main", "sz")) is not None else "",
            "bold": font.find(Q("main", "b")) is not None,
            "italic": font.find(Q("main", "i")) is not None,
            "underline": font.find(Q("main", "u")) is not None,
            "strike": font.find(Q("main", "strike")) is not None,
            "color": _color(font.find(Q("main", "color"))),
        })
    fills = []
    for fill in root.findall(f"{Q('main', 'fills')}/{Q('main', 'fill')}"):
        pattern = fill.find(Q("main", "patternFill"))
        fills.append({
            "pattern": pattern.get("patternType", "") if pattern is not None else "",
            "fgColor": _color(pattern.find(Q("main", "fgColor"))) if pattern is not None else {},
            "bgColor": _color(pattern.find(Q("main", "bgColor"))) if pattern is not None else {},
        })
    borders = []
    for border in root.findall(f"{Q('main', 'borders')}/{Q('main', 'border')}"):
        item = {}
        for side in ("left", "right", "top", "bottom", "diagonal"):
            edge = border.find(Q("main", side))
            item[side] = {"style": edge.get("style", ""), "color": _color(edge.find(Q("main", "color")))} if edge is not None else {}
        borders.append(item)
    styles = []
    cell_xfs = root.find(Q("main", "cellXfs"))
    for index, xf in enumerate(list(cell_xfs) if cell_xfs is not None else []):
        num_fmt_id = int(xf.get("numFmtId", "0"))
        alignment = xf.find(Q("main", "alignment"))
        styles.append({
            "xf": index,
            "numFmtId": num_fmt_id,
            "numberFormat": num_formats.get(num_fmt_id, "General"),
            "fontId": int(xf.get("fontId", "0")),
            "fillId": int(xf.get("fillId", "0")),
            "borderId": int(xf.get("borderId", "0")),
            "xfId": int(xf.get("xfId", "0")),
            "font": fonts[int(xf.get("fontId", "0"))] if int(xf.get("fontId", "0")) < len(fonts) else {},
            "fill": fills[int(xf.get("fillId", "0"))] if int(xf.get("fillId", "0")) < len(fills) else {},
            "border": borders[int(xf.get("borderId", "0"))] if int(xf.get("borderId", "0")) < len(borders) else {},
            "alignment": dict(alignment.attrib) if alignment is not None else {},
            "protection": dict(xf.find(Q("main", "protection")).attrib) if xf.find(Q("main", "protection")) is not None else {},
        })
    return styles or [{"xf": 0, "numFmtId": 0, "numberFormat": "General"}]


def _cell_value(cell: ET.Element, shared: list[str]) -> tuple[object, str, str]:
    cell_type = cell.get("t", "n")
    value_node = cell.find(Q("main", "v"))
    raw = "" if value_node is None or value_node.text is None else value_node.text
    if cell_type == "s":
        index = int(raw or "0")
        return (shared[index] if index < len(shared) else "", "string", raw)
    if cell_type == "inlineStr":
        return (_text(cell.find(Q("main", "is"))), "string", raw)
    if cell_type == "str":
        return raw, "string", raw
    if cell_type == "b":
        return raw == "1", "boolean", raw
    if cell_type == "e":
        return raw, "error", raw
    if cell_type == "d":
        return raw, "date", raw
    if raw == "":
        return "", "blank", raw
    return _number(raw), "number", raw


def _parse_sheet(zf: zipfile.ZipFile, sheet: dict, shared: list[str], styles: list[dict]) -> dict:
    cells, columns, rows, merges = [], [], [], []
    min_row = min_col = None
    max_row = max_col = 0
    dimension_ref = ""
    with zf.open(sheet["path"]) as raw:
        for event, elem in ET.iterparse(raw, events=("start", "end")):
            tag = _local(elem.tag)
            if event == "start" and tag == "dimension":
                dimension_ref = elem.get("ref", "")
            elif event == "end" and tag == "col":
                columns.append({
                    "min": int(elem.get("min", "1")), "max": int(elem.get("max", "1")),
                    "width": _number(elem.get("width", "")), "hidden": _bool(elem.get("hidden")),
                    "bestFit": _bool(elem.get("bestFit")), "customWidth": _bool(elem.get("customWidth")),
                    "style": int(elem.get("style", "0")),
                })
                elem.clear()
            elif event == "end" and tag == "row":
                row_number = int(elem.get("r", "0"))
                if elem.get("ht") is not None or elem.get("hidden") is not None or elem.get("s") is not None:
                    rows.append({
                        "r": row_number, "height": _number(elem.get("ht", "")),
                        "hidden": _bool(elem.get("hidden")), "customHeight": _bool(elem.get("customHeight")),
                        "style": int(elem.get("s", "0")),
                    })
                elem.clear()
            elif event == "end" and tag == "c":
                ref = elem.get("r", "")
                match = CELL_REF_RE.fullmatch(ref)
                if not match:
                    elem.clear()
                    continue
                col, row = _column_number(match.group(1)), int(match.group(2))
                style_index = int(elem.get("s", "0"))
                value, value_type, raw_value = _cell_value(elem, shared)
                formula_node = elem.find(Q("main", "f"))
                formula = "" if formula_node is None else "=" + (formula_node.text or "")
                style = styles[style_index] if style_index < len(styles) else {"xf": style_index, "numberFormat": "General"}
                cells.append({
                    "ref": ref, "value": value, "rawValue": raw_value, "formula": formula,
                    "type": value_type, "styleIndex": style_index,
                    "numberFormat": style.get("numberFormat", "General"),
                })
                min_row = row if min_row is None else min(min_row, row)
                min_col = col if min_col is None else min(min_col, col)
                max_row, max_col = max(max_row, row), max(max_col, col)
                elem.clear()
            elif event == "end" and tag == "mergeCell":
                merges.append(elem.get("ref", ""))
                elem.clear()
    used = None if min_row is None else {
        "minRow": min_row, "minCol": min_col, "maxRow": max_row, "maxCol": max_col,
        "ref": f"{_column_label(min_col)}{min_row}:{_column_label(max_col)}{max_row}",
    }
    return {
        "name": sheet["name"], "state": sheet["state"], "sourcePart": sheet["path"],
        "dimensionRef": dimension_ref, "usedRange": used, "columns": columns,
        "rows": rows, "merges": merges, "cells": cells,
    }


def read_simple_xlsx(source: str | Path | bytes | BinaryIO) -> dict | None:
    """Build a direct semantic payload, or ``None`` when fallback is required."""
    check = detect_simple_xlsx(source)
    if not check.simple:
        return None
    stream = _as_stream(source)
    close_stream = stream is not source
    try:
        with zipfile.ZipFile(stream) as zf:
            sheets, date1904 = _workbook_sheets(zf)
            shared = _shared_strings(zf)
            styles = _styles(zf)
            parsed = [_parse_sheet(zf, sheet, shared, styles) for sheet in sheets]
            return {
                "format": "vno.sheet.direct-xlsx.spike.v1",
                "date1904": date1904,
                "sheetCount": len(parsed),
                "cellCount": sum(len(sheet["cells"]) for sheet in parsed),
                "styles": styles,
                "sheets": parsed,
            }
    finally:
        if close_stream:
            stream.close()


def _main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--output", type=Path, help="Write compact JSON payload")
    parser.add_argument("--detect-only", action="store_true")
    args = parser.parse_args(argv)
    started = time.perf_counter()
    check = detect_simple_xlsx(args.xlsx)
    if args.detect_only or not check.simple:
        print(json.dumps({"simple": check.simple, "reasons": check.reasons,
                          "seconds": round(time.perf_counter() - started, 6)}, ensure_ascii=False))
        return 0 if check.simple else 2
    payload = read_simple_xlsx(args.xlsx)
    elapsed = time.perf_counter() - started
    if args.output:
        args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"simple": True, "seconds": round(elapsed, 6),
                      "sheets": payload["sheetCount"], "cells": payload["cellCount"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
