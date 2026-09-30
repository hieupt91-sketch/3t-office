"""Stream FODS into a compact, scratch-only SheetAdapter payload.

The payload has two parts: a sanitized FODS support document (all metadata and
style/feature XML, with worksheet cells removed) and a deflated NDJSON stream of
worksheet row/cell records. Only Python's standard library is used.
"""
import base64
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
import xml.parsers.expat as expat
import zlib
from io import BytesIO


NS_BY_URI = {
    "urn:oasis:names:tc:opendocument:xmlns:office:1.0": "office",
    "urn:oasis:names:tc:opendocument:xmlns:table:1.0": "table",
    "urn:oasis:names:tc:opendocument:xmlns:style:1.0": "style",
    "urn:oasis:names:tc:opendocument:xmlns:text:1.0": "text",
    "urn:oasis:names:tc:opendocument:xmlns:fo:1.0": "fo",
    "urn:oasis:names:tc:opendocument:xmlns:config:1.0": "config",
    "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0": "draw",
    "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0": "svg",
    "urn:oasis:names:tc:opendocument:xmlns:xlink:1.0": "xlink",
    "urn:oasis:names:tc:opendocument:xmlns:chart:1.0": "chart",
    "urn:oasis:names:tc:opendocument:xmlns:animation:1.0": "anim",
    "urn:oasis:names:tc:opendocument:xmlns:form:1.0": "form",
    "urn:oasis:names:tc:opendocument:xmlns:meta:1.0": "meta",
    "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0": "manifest",
    "http://purl.org/dc/elements/1.1/": "dc",
    "http://www.w3.org/1999/xlink": "xlink2",
    "http://www.w3.org/XML/1998/namespace": "xml",
    "urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0": "loext",
    "urn:org:documentfoundation:names:experimental:office:xmlns:table:1.0": "tableooo",
    "urn:org:documentfoundation:names:experimental:office:xmlns:calcext:1.0": "calcext",
    "https://vnoffice.vn/ns/spreadsheet/1.0": "vno",
}


def local(tag):
    return tag.rsplit("}", 1)[-1]


def qname(name):
    if name.startswith("{"):
        uri, tail = name[1:].split("}", 1)
        return f"{NS_BY_URI.get(uri, 'ns')}:{tail}"
    return name


def attrs_of(element):
    return [[qname(key), value] for key, value in element.attrib.items()]


def inner_xml(element):
    parts = []
    for child in element:
        rendered = ET.tostring(child, encoding="unicode", short_empty_elements=True)
        # Namespace declarations on every cell child are redundant in the outer
        # support document, but are retained in cell markup for helper parsers.
        parts.append(rendered)
    return "".join(parts)


def raw_style_blocks(path):
    """Preserve source line endings in styles; parseFods retains those XML strings."""
    spans = {}
    parser = expat.ParserCreate()
    starts = {}
    targets = {"office:styles", "office:automatic-styles", "office:font-face-decls"}

    def on_start(name, _attrs):
        if name in targets:
            starts[name] = parser.CurrentByteIndex

    def on_end(name):
        if name not in targets or name not in starts:
            return
        end = parser.CurrentByteIndex
        with open(path, "rb") as source:
            source.seek(end)
            closing = source.readline()
        close_end = end + len(closing.split(b">", 1)[0]) + 1 if closing.startswith(b"</") else end
        spans[name] = (starts.pop(name), close_end)

    parser.StartElementHandler = on_start
    parser.EndElementHandler = on_end
    with open(path, "rb") as source:
        parser.ParseFile(source)
    raw = {}
    with open(path, "rb") as source:
        for name, (start, end) in spans.items():
            source.seek(start)
            raw[name] = source.read(end - start).decode("utf-8", "replace")
    return raw


def stream_payload(source, target):
    started = time.perf_counter()
    compressed_rows = BytesIO()
    compressor = zlib.compressobj(level=6)
    row_count = cell_count = sheet_count = 0
    stack = []
    active_sheet = None
    root = None

    def emit(record):
        data = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        compressed_rows.write(compressor.compress(data))

    with open(source, "rb") as raw:
        for event, elem in ET.iterparse(raw, events=("start", "end", "start-ns")):
            if event == "start-ns":
                prefix, uri = elem
                if prefix and uri not in NS_BY_URI:
                    NS_BY_URI[uri] = prefix
                if prefix and uri:
                    try:
                        ET.register_namespace(prefix, uri)
                    except ValueError:
                        pass
                continue

            tag = local(elem.tag)
            if event == "start":
                parent = stack[-1] if stack else None
                if root is None:
                    root = elem
                if tag == "table" and parent is not None and local(parent.tag) == "spreadsheet":
                    name = elem.attrib.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name", "")
                    active_sheet = name if name != "local-table" else None
                    if active_sheet is not None:
                        emit(["sheet", active_sheet])
                        sheet_count += 1
                stack.append(elem)
                continue

            parent = stack[-2] if len(stack) > 1 and stack[-1] is elem else None

            if tag == "table-row" and active_sheet is not None:
                original_attrs = dict(elem.attrib)
                row_attrs = attrs_of(elem)
                cells = []
                for child in elem:
                    child_tag = local(child.tag)
                    if child_tag not in ("table-cell", "covered-table-cell"):
                        continue
                    cells.append([
                        1 if child_tag == "covered-table-cell" else 0,
                        attrs_of(child),
                        inner_xml(child),
                    ])
                    cell_count += 1
                emit(["row", row_attrs, cells])
                row_count += 1
                elem.clear()
                elem.attrib.update(original_attrs)
            elif tag == "table" and parent is not None and local(parent.tag) == "spreadsheet":
                if active_sheet is not None:
                    emit(["end-sheet"])
                active_sheet = None
            elif tag == "object" and parent is not None and local(parent.tag) == "draw":
                # parseFods strips embedded ODF objects before scanning tables.
                saved = dict(elem.attrib)
                elem.clear()
                elem.attrib.update(saved)

            if stack and stack[-1] is elem:
                stack.pop()

    compressed_rows.write(compressor.flush())
    row_data = compressed_rows.getvalue()
    support_xml = ET.tostring(root, encoding="unicode", short_empty_elements=True)
    raw_styles = raw_style_blocks(source)
    payload = {
        "format": "vno.sheet.payload.v1",
        "sourceBytes": os.path.getsize(source),
        "sheets": sheet_count,
        "rows": row_count,
        "cells": cell_count,
        "supportXml": support_xml,
        "rawStyleXml": raw_styles,
        "rowsDeflateBase64": base64.b64encode(row_data).decode("ascii"),
    }
    with open(target, "w", encoding="utf-8", newline="") as out:
        json.dump(payload, out, ensure_ascii=False, separators=(",", ":"))
    out_bytes = os.path.getsize(target)
    print(json.dumps({
        "seconds": round(time.perf_counter() - started, 3),
        "payload_bytes": out_bytes,
        "payload_mb": round(out_bytes / 1_000_000, 2),
        "compressed_rows_bytes": len(row_data),
        "support_xml_chars": len(support_xml),
        "sheets": sheet_count,
        "rows": row_count,
        "cells": cell_count,
    }, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/perf-proto/fods_to_sheet_payload.py <in.fods> <out.json>")
    stream_payload(sys.argv[1], sys.argv[2])
