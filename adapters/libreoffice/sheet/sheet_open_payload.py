"""Build the compact Sheet open payload during the final XF FODS traversal.

This module is part of the 3T Sheet adapter. It deliberately consumes the
already optimized FODS string and the same XF coordinates used by the existing
patcher; it never serializes a completed FODS document in a second pass.
"""

from __future__ import annotations

import base64
import json
import re
import zlib
from html import unescape as _html_unescape
from io import BytesIO


_ROW_CHUNK_LIMIT = 1000
_PREVIEW_ROW_LIMIT = 80
_TABLE_TAG_RE = re.compile(r"</?table:table(?=[\s/>])[^>]*>", re.IGNORECASE)
_TABLE_ROW_OPEN_RE = re.compile(r"<table:table-row(?=[\s/>])", re.IGNORECASE)
_TABLE_COLUMN_RE = re.compile(r"<table:table-column(?=[\s/>])[^>]*(?:/>|>)", re.IGNORECASE)


def build_sheet_open_preview(fods_xml: str, max_rows: int = _PREVIEW_ROW_LIMIT) -> dict:
    """Extract a compact first-screen payload without traversing workbook rows.

    The converted FODS already contains LibreOffice's cell styles and column
    widths. Keep those for the initial viewport; the normal XLSX overlays are
    applied by the background full-payload builder before hydration completes.
    """
    source = str(fods_xml or "")
    stack = []
    tables = []
    for match in _TABLE_TAG_RE.finditer(source):
        tag = match.group(0)
        if tag.startswith("</"):
            if stack:
                opening = stack.pop()
                if not stack and opening["name"].lower() != "local-table":
                    tables.append({**opening, "end": match.end()})
        else:
            name_match = re.search(r"(?:^|\s)table:name=[\"']([^\"']*)[\"']", tag, re.IGNORECASE)
            name = _html_unescape(name_match.group(1)) if name_match else ""
            opening_end = match.end()
            if tag.rstrip().endswith("/>"):
                if not stack and name.lower() != "local-table":
                    tables.append({"name": name, "start": match.start(), "open_end": opening_end, "end": opening_end})
            else:
                stack.append({"name": name, "start": match.start(), "open_end": opening_end})
    if not tables:
        raise ValueError("Converted FODS has no worksheet tables")

    first_table = tables[0]["start"]
    last_table = tables[-1]["end"]
    prefix = source[:first_table]
    active_match = re.search(
        r"<config:config-item\b[^>]*config:name=[\"']ActiveTable[\"'][^>]*>([\s\S]*?)</config:config-item>",
        prefix,
        re.IGNORECASE,
    )
    active_sheet = _html_unescape(active_match.group(1).strip()) if active_match else ""
    names = [table["name"] for table in tables]
    if active_sheet not in names:
        active_sheet = names[0]

    compact_tables = []
    preview_records = []
    preview_rows = 0
    retained_preview_rows = 0
    row_limit = max(1, int(max_rows))
    for table in tables:
        opening = source[table["start"]:table["open_end"]]
        table_end = table["end"]
        first_row = _TABLE_ROW_OPEN_RE.search(source, table["open_end"], table_end)
        column_end = first_row.start() if first_row else table_end
        columns = [m.group(0) for m in _TABLE_COLUMN_RE.finditer(source, table["open_end"], column_end)]
        compact_tables.append(opening + "".join(columns) + "</table:table>")
        preview_records.append(["sheet", table["name"]])
        if table["name"] == active_sheet:
            cursor = first_row.start() if first_row else table_end
            while retained_preview_rows < row_limit:
                row_open = _TABLE_ROW_OPEN_RE.search(source, cursor, table_end)
                if not row_open:
                    break
                tag_end = source.find(">", row_open.start(), table_end)
                if tag_end < 0:
                    break
                if source[row_open.start():tag_end + 1].rstrip().endswith("/>"):
                    row_end = tag_end + 1
                else:
                    close_at = source.find("</table:table-row", tag_end + 1, table_end)
                    if close_at < 0:
                        break
                    close_end = source.find(">", close_at, table_end)
                    if close_end < 0:
                        break
                    row_end = close_end + 1
                preview_records.append(["row-xml", source[row_open.start():row_end]])
                preview_rows += 1
                retained_preview_rows += 1
                cursor = row_end
        preview_records.append(["end-sheet"])

    suffix = source[last_table:]
    support_xml = prefix + "".join(compact_tables) + suffix
    raw_styles = {}
    for tag in ("office:styles", "office:automatic-styles", "office:font-face-decls"):
        match = re.search(r"<" + re.escape(tag) + r"\b[^>]*>[\s\S]*?</" + re.escape(tag) + r"\s*>", support_xml)
        if match:
            raw_styles[tag] = match.group(0)
    jsonl = "".join(
        json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
        for record in preview_records
    ).encode("utf-8")
    return {
        "format": "vno.sheet.payload.v2",
        "rowsEncoding": "deflate-base64-jsonl-row-xml",
        "sourceBytes": len(source),
        "sheets": len(tables),
        "rows": preview_rows,
        "rowsDeflateBase64": base64.b64encode(zlib.compress(jsonl, level=6)).decode("ascii"),
        "supportXml": support_xml,
        "rawStyleXml": raw_styles,
        "partialPreview": True,
    }


class _PayloadRows:
    def __init__(self) -> None:
        self.chunk_buffer = BytesIO()
        self.chunk_compressor = zlib.compressobj(level=6)
        self.chunk_records = 0
        self.chunk_rows = 0
        self.row_chunks: list[dict[str, object]] = []
        self.sheet_names: list[str] = []
        self.preview_rows_by_sheet: dict[str, list[str]] = {}
        self.current_sheet = ""
        self.sheets = 0
        self.rows = 0

    def emit(self, record) -> None:
        line = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        self.chunk_buffer.write(self.chunk_compressor.compress(line))
        self.chunk_records += 1

    def begin_sheet(self, name: str) -> None:
        self.emit(["sheet", name])
        self.current_sheet = name
        self.sheet_names.append(name)
        self.preview_rows_by_sheet[name] = []
        self.sheets += 1

    def end_sheet(self) -> None:
        self.emit(["end-sheet"])
        self.current_sheet = ""

    def add_row(self, row_xml: str) -> None:
        self.emit(["row-xml", row_xml])
        if self.current_sheet and len(self.preview_rows_by_sheet[self.current_sheet]) < _PREVIEW_ROW_LIMIT:
            self.preview_rows_by_sheet[self.current_sheet].append(row_xml)
        self.rows += 1
        self.chunk_rows += 1
        if self.chunk_rows >= _ROW_CHUNK_LIMIT:
            self._finish_chunk()

    def _finish_chunk(self) -> None:
        if not self.chunk_records:
            return
        self.chunk_buffer.write(self.chunk_compressor.flush())
        self.row_chunks.append({
            "data": base64.b64encode(self.chunk_buffer.getvalue()).decode("ascii"),
            "rows": self.chunk_rows,
        })
        self.chunk_buffer = BytesIO()
        self.chunk_compressor = zlib.compressobj(level=6)
        self.chunk_records = 0
        self.chunk_rows = 0

    def finish(self) -> list[dict[str, object]]:
        self._finish_chunk()
        return self.row_chunks

    def preview(self, active_sheet: str) -> tuple[str, int]:
        records = []
        rows = 0
        for name in self.sheet_names:
            records.append(["sheet", name])
            if name == active_sheet:
                selected = self.preview_rows_by_sheet.get(name, [])
                records.extend([["row-xml", row] for row in selected])
                rows += len(selected)
            records.append(["end-sheet"])
        content = "".join(
            json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
            for record in records
        )
        compressed = zlib.compress(content.encode("utf-8"), level=6)
        return base64.b64encode(compressed).decode("ascii"), rows


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


def build_sheet_open_payload(xlsx_bytes: bytes, fods_xml: str, patcher) -> tuple[str, dict]:
    """Return the final XF-adjusted FODS and its validated v2 open payload."""
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

    row_chunks = sink.finish()
    raw_styles = {}
    for tag in ("office:styles", "office:automatic-styles", "office:font-face-decls"):
        match = re.search(r"<" + re.escape(tag) + r"\b[^>]*>[\s\S]*?</" + re.escape(tag) + r"\s*>", support_xml)
        if match:
            raw_styles[tag] = match.group(0)
    active_match = re.search(
        r'<config:config-item\b[^>]*config:name=["\']ActiveTable["\'][^>]*>([\s\S]*?)</config:config-item>',
        support_xml,
        re.IGNORECASE,
    )
    active_sheet = _html_unescape(active_match.group(1).strip()) if active_match else ""
    if active_sheet not in sink.sheet_names:
        active_sheet = sink.sheet_names[0] if sink.sheet_names else ""
    preview_rows_deflate_base64, preview_rows = sink.preview(active_sheet)
    payload = {
        "format": "vno.sheet.payload.v2",
        "rowsEncoding": "deflate-base64-jsonl-row-xml",
        "sourceBytes": len(final_fods.encode("utf-8")),
        "sheets": sink.sheets,
        "rows": sink.rows,
        "rowChunks": row_chunks,
        "previewRowsDeflateBase64": preview_rows_deflate_base64,
        "previewRows": preview_rows,
        "supportXml": support_xml,
        "rawStyleXml": raw_styles,
    }
    if not payload["sheets"] or not payload["rows"] or not payload["supportXml"]:
        raise ValueError("Sheet open payload is incomplete")
    if len(final_fods.encode("utf-8")) != payload["sourceBytes"]:
        raise ValueError("Sheet open payload source size is inconsistent")
    return final_fods, payload
