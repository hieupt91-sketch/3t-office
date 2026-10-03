"""Build the compact Sheet open payload during the final XF FODS traversal.

This module is part of the 3T Sheet adapter. It deliberately consumes the
already optimized FODS string and the same XF coordinates used by the existing
patcher; it never serializes a completed FODS document in a second pass.
"""

from __future__ import annotations

import base64
import json
import os
import re
import zlib
from io import BytesIO


class _PayloadRows:
    def __init__(self) -> None:
        self.buffer = BytesIO()
        self.compressor = zlib.compressobj(level=6)
        self.sheets = 0
        self.rows = 0

    def emit(self, record) -> None:
        line = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        self.buffer.write(self.compressor.compress(line))

    def begin_sheet(self, name: str) -> None:
        self.emit(["sheet", name])
        self.sheets += 1

    def end_sheet(self) -> None:
        self.emit(["end-sheet"])

    def add_row(self, row_xml: str) -> None:
        self.emit(["row-xml", row_xml])
        self.rows += 1

    def finish(self) -> bytes:
        self.buffer.write(self.compressor.flush())
        return self.buffer.getvalue()


def _empty_row(row_xml: str) -> str:
    open_end = row_xml.find(">")
    if open_end < 0:
        return row_xml
    opening = row_xml[: open_end + 1]
    if opening.rstrip().endswith("/>"):
        return opening
    return opening[:-1] + "/>"


def _cell_parts_with_xf(row_xml, targets, patcher):
    pieces, cursor, column = [], 0, 1
    sorted_columns, target_index = sorted(targets), 0
    for start, end in patcher._flat_xml_blocks(
        row_xml, ("table:table-cell", "table:covered-table-cell")
    ):
        pieces.append(row_xml[cursor:start])
        cell = row_xml[start:end]
        repeat = patcher._repeat_count(cell, "table:number-columns-repeated")
        while target_index < len(sorted_columns) and sorted_columns[target_index] < column:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_columns) and sorted_columns[hit_end] < column + repeat:
            hit_end += 1
        hits = [(col, targets[col]) for col in sorted_columns[target_index:hit_end]]
        target_index = hit_end
        if not hits:
            output_cells = [cell]
        else:
            output_cells = []
            at = column
            for col, xf_index in hits:
                if col > at:
                    output_cells.append(
                        patcher._set_repeat(cell, "table:number-columns-repeated", col - at)
                    )
                output_cells.append(
                    patcher._set_orig_xf_attr(
                        patcher._set_repeat(cell, "table:number-columns-repeated", 1), xf_index
                    )
                )
                at = col + 1
            if at < column + repeat:
                output_cells.append(
                    patcher._set_repeat(cell, "table:number-columns-repeated", column + repeat - at)
                )
        pieces.extend(output_cells)
        cursor, column = end, column + repeat
    pieces.append(row_xml[cursor:])
    return "".join(pieces)


def _row_with_xf_and_record(row_xml, targets, patcher, sink):
    transformed = _cell_parts_with_xf(row_xml, targets, patcher)
    sink.add_row(transformed)
    return transformed


def build_sheet_open_payload_legacy(xlsx_bytes: bytes, fods_xml: str, patcher) -> tuple[str, dict]:
    """Return the final XF-adjusted FODS and its validated v2 open payload."""
    # superseded by P1 - xoa chi khi chu so huu duyet
    sink = _PayloadRows()
    clean = re.sub(
        r'\s+vno:xf\s*=\s*(["\'])\d+\1', "", fods_xml, flags=re.IGNORECASE
    )
    normalized_xlsx = patcher.normalize_source_xlsx(xlsx_bytes)
    by_sheet = patcher._xlsx_cells_with_xf_indices(normalized_xlsx)
    output_parts, support_parts, cursor = [], [], 0

    def transform_table(table_xml):
        opening_match = re.match(r"<[^>]+", table_xml)
        attrs = patcher._xml_attrs(opening_match.group(0)) if opening_match else {}
        name = attrs.get("table:name", "")
        active = bool(name and name != "local-table")
        if active:
            sink.begin_sheet(name)
        targets = by_sheet.get(name, {})
        row_map = {}
        for (row, col), xf_index in targets.items():
            row_map.setdefault(row, {})[col] = xf_index
        sorted_rows = sorted(row_map)
        target_index = 0
        row_number = 1
        out, support, table_cursor = [], [], 0

        def append_row_fragment(fragment):
            out.append(fragment)
            if active:
                sink.add_row(fragment)
            support.append(_empty_row(fragment))

        for start, end in patcher._flat_xml_blocks(table_xml, ("table:table-row",)):
            untouched = table_xml[table_cursor:start]
            out.append(untouched)
            support.append(untouched)
            row_xml = table_xml[start:end]
            repeat = patcher._repeat_count(row_xml, "table:number-rows-repeated")
            while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
                target_index += 1
            hit_end = target_index
            while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
                hit_end += 1
            hits = sorted_rows[target_index:hit_end]
            target_index = hit_end
            if not hits:
                append_row_fragment(row_xml)
            else:
                at = row_number
                for logical_row in hits:
                    if logical_row > at:
                        append_row_fragment(
                            patcher._set_repeat(row_xml, "table:number-rows-repeated", logical_row - at)
                        )
                    single_row = patcher._set_repeat(row_xml, "table:number-rows-repeated", 1)
                    transformed = _row_with_xf_and_record(single_row, row_map[logical_row], patcher, sink)
                    out.append(transformed)
                    support.append(_empty_row(transformed))
                    at = logical_row + 1
                if at < row_number + repeat:
                    append_row_fragment(
                        patcher._set_repeat(row_xml, "table:number-rows-repeated", row_number + repeat - at)
                    )
            table_cursor, row_number = end, row_number + repeat
        trailing = table_xml[table_cursor:]
        out.append(trailing)
        support.append(trailing)
        if active:
            sink.end_sheet()
        return "".join(out), "".join(support)

    for start, end in patcher._flat_xml_blocks(clean, ("table:table",)):
        outside = clean[cursor:start]
        output_parts.append(outside)
        support_parts.append(outside)
        table_xml = clean[start:end]
        output_table, support_table = transform_table(table_xml)
        output_parts.append(output_table)
        support_parts.append(support_table)
        cursor = end
    output_parts.append(clean[cursor:])
    support_parts.append(clean[cursor:])
    final_fods = "".join(output_parts)
    support_xml = "".join(support_parts)
    if by_sheet and not re.search(r"xmlns:vno\s*=", final_fods, re.IGNORECASE):
        match = patcher._OFFICE_DOCUMENT_OPEN_RE.search(final_fods)
        if match:
            replacement = f'<office:document{match.group(1)} xmlns:vno="{patcher.SHEET_VNO_NS}">'
            final_fods = final_fods[: match.start()] + replacement + final_fods[match.end() :]
            sm = patcher._OFFICE_DOCUMENT_OPEN_RE.search(support_xml)
            if sm:
                support_xml = support_xml[: sm.start()] + replacement + support_xml[sm.end() :]

    compressed_rows = sink.finish()
    raw_styles = {}
    for tag in ("office:styles", "office:automatic-styles", "office:font-face-decls"):
        match = re.search(r"<" + re.escape(tag) + r"\b[^>]*>[\s\S]*?</" + re.escape(tag) + r"\s*>", support_xml)
        if match:
            raw_styles[tag] = match.group(0)
    payload = {
        "format": "vno.sheet.payload.v2",
        "rowsEncoding": "deflate-base64-jsonl-row-xml",
        "sourceBytes": len(final_fods.encode("utf-8")),
        "sheets": sink.sheets,
        "rows": sink.rows,
        "supportXml": support_xml,
        "rawStyleXml": raw_styles,
        "rowsDeflateBase64": base64.b64encode(compressed_rows).decode("ascii"),
    }
    if not payload["sheets"] or not payload["rows"] or not payload["supportXml"]:
        raise ValueError("Sheet open payload is incomplete")
    if len(final_fods.encode("utf-8")) != payload["sourceBytes"]:
        raise ValueError("Sheet open payload source size is inconsistent")
    return final_fods, payload


def build_sheet_open_payload(xlsx_bytes: bytes, fods_xml: str, patcher) -> tuple[str, dict]:
    """Build the P1 payload by default, retaining the owner-requested rollback."""
    value = os.environ.get("VNO_OPEN_LEGACY", "").strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return build_sheet_open_payload_legacy(xlsx_bytes, fods_xml, patcher)

    class _P1PatcherProxy:
        def __init__(self, target) -> None:
            self._target = target

        def __getattr__(self, name):
            return getattr(self._target, name)

        def _xlsx_cells_with_xf_indices(self, source: bytes):
            return self._target._xlsx_cells_with_xf_indices_p1(source)

    return build_sheet_open_payload_legacy(
        xlsx_bytes, fods_xml, _P1PatcherProxy(patcher)
    )
