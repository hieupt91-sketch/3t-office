"""Scratch-only probe: stream FODS rows to a compact JSON-shaped workbook subset.

This is a sizing/timing prototype, not a replacement parser: it intentionally
preserves row/cell attributes and textual cell payloads but does not model every
ODF feature or workbook rule.
"""
import json
import re
import sys
import time
import xml.etree.ElementTree as ET


def local(tag):
    return tag.rsplit("}", 1)[-1]


NS_PREFIX = {
    "urn:oasis:names:tc:opendocument:xmlns:table:1.0": "table",
    "urn:oasis:names:tc:opendocument:xmlns:office:1.0": "office",
    "urn:oasis:names:tc:opendocument:xmlns:text:1.0": "text",
    "urn:oasis:names:tc:opendocument:xmlns:style:1.0": "style",
    "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0": "draw",
    "urn:oasis:names:tc:opendocument:xmlns:xlink:1.0": "xlink",
    "urn:oasis:names:tc:opendocument:xmlns:fo:1.0": "fo",
    "urn:oasis:names:tc:opendocument:xmlns:config:1.0": "config",
    "https://vnoffice.vn/ns/spreadsheet/1.0": "vno",
    "http://www.w3.org/XML/1998/namespace": "xml",
}


def attr_name(key):
    if key.startswith("{"):
        namespace, name = key[1:].split("}", 1)
        return f"{NS_PREFIX.get(namespace, 'ns')}:{name}"
    return key


def probe(source, target):
    start = time.perf_counter()
    rows = cells = sheets = 0
    # Intern qualified attribute names once. Sparse numeric keys reduce repeated
    # namespace/name strings while retaining every row/cell attribute.
    names = set()
    attr_pattern = re.compile(rb"([A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*)=")
    with open(source, "rb") as raw:
        carry = b""
        while chunk := raw.read(4 * 1024 * 1024):
            scan = carry + chunk
            names.update(match.group(1).decode("ascii", "ignore") for match in attr_pattern.finditer(scan))
            carry = scan[-256:]
    attr_ids = {name: str(index) for index, name in enumerate(sorted(names))}
    local_ids = {}
    for name, index in attr_ids.items():
        local_ids.setdefault(name.rsplit(":", 1)[-1], index)
    with open(target, "w", encoding="utf-8", newline="") as out:
        out.write('{"attributes":')
        out.write(json.dumps(sorted(names), ensure_ascii=False, separators=(",", ":")))
        out.write(',"sheets":[')
        first_sheet = True
        in_sheet = False
        first_row = True
        for event, elem in ET.iterparse(source, events=("start", "end")):
            tag = local(elem.tag)
            if event == "start" and tag == "table":
                name = elem.attrib.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name", "")
                if name != "local-table":
                    if not first_sheet:
                        out.write(",")
                    out.write('{"name":')
                    out.write(json.dumps(name, ensure_ascii=False, separators=(",", ":")))
                    out.write(',"rows":[')
                    first_sheet = False
                    first_row = True
                    in_sheet = True
                    sheets += 1
            elif event == "end" and tag == "table-row" and in_sheet:
                row_cells = []
                for child in elem:
                    if local(child.tag) not in {"table-cell", "covered-table-cell"}:
                        continue
                    value = "".join(child.itertext())
                    attrs = [[attr_ids.get(attr_name(key), local_ids.get(local(key))), val]
                             for key, val in child.attrib.items()]
                    row_cells.append([0 if local(child.tag) == "table-cell" else 1, attrs, value])
                if not first_row:
                    out.write(",")
                row_attrs = [[attr_ids.get(attr_name(key), local_ids.get(local(key))), val]
                             for key, val in elem.attrib.items()]
                out.write(json.dumps([row_attrs, row_cells], ensure_ascii=False, separators=(",", ":")))
                first_row = False
                rows += 1
                cells += len(row_cells)
                elem.clear()
            elif event == "end" and tag == "table" and in_sheet:
                out.write("]}")
                in_sheet = False
                elem.clear()
        out.write("]}")
    elapsed = time.perf_counter() - start
    print(json.dumps({"seconds": round(elapsed, 3), "json_bytes": __import__("os").path.getsize(target),
                      "json_mb": round(__import__("os").path.getsize(target) / 1e6, 2),
                      "sheets": sheets, "rows": rows, "cells": cells}, indent=2))


if __name__ == "__main__":
    probe(sys.argv[1], sys.argv[2])
