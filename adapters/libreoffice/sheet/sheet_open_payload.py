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


_P1B_LARGE_FODS_CHARS = 20 * 1024 * 1024
_P1B_TABLE_MIN_CHARS = int(os.environ.get("VNO_P1_TABLE_MIN_CHARS", "").strip() or 0) or 2 * 1024 * 1024  # per-table pool threshold inside a big document
_P1B_MAX_WORKERS = int(os.environ.get("VNO_P1_WORKERS", "").strip() or 0) or (6 if (os.cpu_count() or 4) >= 8 else 4)


_ADLER_BASE = 65521


def _adler32_combine(adler1: int, adler2: int, length2: int) -> int:
    """zlib's adler32_combine: checksum of A+B from adler32(A), adler32(B) and len(B)."""
    remainder = length2 % _ADLER_BASE
    sum1 = adler1 & 0xFFFF
    sum2 = (remainder * sum1) % _ADLER_BASE
    sum1 += (adler2 & 0xFFFF) + _ADLER_BASE - 1
    sum2 += ((adler1 >> 16) & 0xFFFF) + ((adler2 >> 16) & 0xFFFF) + _ADLER_BASE - remainder
    if sum1 >= _ADLER_BASE:
        sum1 -= _ADLER_BASE
    if sum1 >= _ADLER_BASE:
        sum1 -= _ADLER_BASE
    if sum2 >= (_ADLER_BASE << 1):
        sum2 -= _ADLER_BASE << 1
    if sum2 >= _ADLER_BASE:
        sum2 -= _ADLER_BASE
    return sum1 | (sum2 << 16)


def deflate_segment(data: bytes) -> tuple[bytes, int, int]:
    """Independent raw-deflate piece (sync-flushed, not final) that _PayloadRows can splice into its stream."""
    compressor = zlib.compressobj(6, zlib.DEFLATED, -15)
    return compressor.compress(data) + compressor.flush(zlib.Z_SYNC_FLUSH), zlib.adler32(data), len(data)


class _PayloadRows:
    """One zlib stream (level 6). Rows may be appended as pieces deflated elsewhere (see add_segment)."""

    def __init__(self) -> None:
        self.buffer = BytesIO()
        self.compressor = zlib.compressobj(6, zlib.DEFLATED, -15)  # raw deflate; the zlib header/trailer are added in finish()
        self.adler = 1
        self.sheets = 0
        self.rows = 0

    def emit(self, record) -> None:
        line = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        self.adler = zlib.adler32(line, self.adler)
        self.buffer.write(self.compressor.compress(line))

    def add_segment(self, deflated: bytes, adler: int, length: int, count: int) -> None:
        """Append rows a worker already serialized and deflated with deflate_segment()."""
        self.buffer.write(self.compressor.flush(zlib.Z_SYNC_FLUSH))
        self.buffer.write(deflated)
        # The spliced bytes sit between this compressor's history and its next output, so back-references to that
        # history would point at the wrong data: continue with a fresh window.
        self.compressor = zlib.compressobj(6, zlib.DEFLATED, -15)
        self.adler = _adler32_combine(self.adler, adler, length)
        self.rows += count

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
        return b"\x78\x9c" + self.buffer.getvalue() + self.adler.to_bytes(4, "big")


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


def _transform_payload_rows_chunk(args):
    chunk, row_number, row_map = args[:3]
    want_jsonl = len(args) > 3 and args[3]
    from adapters.libreoffice.common import ooxml_zip_patch as patcher

    strip = patcher.strip_vno_xf_attributes if len(args) > 4 and args[4] else None
    # The parent leaves the big tables unstripped; strip row by row here (a whole-chunk strip would be one more copy).

    sorted_rows = sorted(row_map)
    target_index = 0
    out, support, cursor = [], [], 0

    def append_row_fragment(fragment):
        out.append(fragment)
        support.append(_empty_row(fragment))

    for start, end in patcher._flat_xml_blocks(chunk, ("table:table-row",)):
        untouched = chunk[cursor:start]
        row_xml = chunk[start:end]
        if strip is not None:
            untouched, row_xml = strip(untouched), strip(row_xml)
        out.append(untouched)
        support.append(untouched)
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
                        patcher._set_repeat(
                            row_xml,
                            "table:number-rows-repeated",
                            logical_row - at,
                        )
                    )
                single_row = patcher._set_repeat(
                    row_xml, "table:number-rows-repeated", 1
                )
                transformed = _cell_parts_with_xf(
                    single_row, row_map[logical_row], patcher
                )
                out.append(transformed)
                support.append(_empty_row(transformed))
                at = logical_row + 1
            if at < row_number + repeat:
                append_row_fragment(
                    patcher._set_repeat(
                        row_xml,
                        "table:number-rows-repeated",
                        row_number + repeat - at,
                    )
                )
        cursor, row_number = end, row_number + repeat
    trailing = chunk[cursor:]
    if strip is not None:
        trailing = strip(trailing)
    out.append(trailing)
    support.append(trailing)
    output = "".join(out)
    out.clear()
    support_xml = "".join(support)
    support.clear()
    if not want_jsonl:
        return output, support_xml
    # Serialize the sheet rows here, in the worker, so the parent only compresses (bytes lines: half the memory of str).
    lines, count = [], 0
    for row_start, row_end in patcher._flat_xml_blocks(output, ("table:table-row",)):
        lines.append(
            (
                json.dumps(["row-xml", output[row_start:row_end]], ensure_ascii=False, separators=(",", ":"))
                + "\n"
            ).encode("utf-8")
        )
        count += 1
    jsonl = b"".join(lines)
    lines = None
    return (output, support_xml, *deflate_segment(jsonl), count)


def build_sheet_open_payload_legacy(xlsx_bytes: bytes, fods_xml: str, patcher) -> tuple[str, dict]:
    """Return the final XF-adjusted FODS and its validated v2 open payload."""
    # superseded by P1b - xoa chi khi chu so huu duyet
    sink = _PayloadRows()
    strip_xf = getattr(patcher, "strip_vno_xf_attributes", None)
    # Big FODS: strip vno:xf per table (in the workers for the big ones) instead of one pass over the whole string.
    defer_strip = (
        strip_xf is not None
        and len(fods_xml) > _P1B_LARGE_FODS_CHARS
        and os.environ.get("VNO_PAYLOAD_STRIP_IN_WORKERS", "").strip() != "0"
    )
    if defer_strip:
        clean = fods_xml
    else:
        clean = strip_xf(fods_xml) if strip_xf is not None else re.sub(
            r'\s+vno:xf\s*=\s*(["\'])\d+\1', "", fods_xml, flags=re.IGNORECASE
        )
    normalized_xlsx = patcher.normalize_source_xlsx(xlsx_bytes)
    by_sheet = patcher._xlsx_cells_with_xf_indices(normalized_xlsx)
    output_parts, support_parts, cursor = [], [], 0

    def transform_table(table_xml):
        worker_strip = defer_strip and len(table_xml) > _P1B_TABLE_MIN_CHARS
        if defer_strip and not worker_strip:
            table_xml = strip_xf(table_xml)
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

        if len(clean) > _P1B_LARGE_FODS_CHARS and len(table_xml) > _P1B_TABLE_MIN_CHARS:
            prefix, chunks, suffix = patcher._p1_metadata_table_chunks(
                table_xml, _P1B_MAX_WORKERS
            )
            if worker_strip:
                if len(chunks) > 1:
                    prefix, suffix = strip_xf(prefix), strip_xf(suffix)
                else:
                    table_xml = strip_xf(table_xml)
                    prefix, chunks, suffix = None, [], None
            if len(chunks) > 1:
                tasks = []
                for chunk, logical_start, logical_end in chunks:
                    subset = {
                        row: values
                        for row, values in row_map.items()
                        if logical_start <= row < logical_end
                    }
                    tasks.append((chunk, logical_start, subset, active, worker_strip))
                transformed_chunks = list(
                    patcher._p1_process_pool().map(
                        _transform_payload_rows_chunk, tasks
                    )
                )
                tasks = chunks = None
                output_chunks = [item[0] for item in transformed_chunks]
                support_chunks = [item[1] for item in transformed_chunks]
                if active:
                    for item in transformed_chunks:
                        sink.add_segment(item[2], item[3], item[4], item[5])
                    sink.end_sheet()
                transformed_chunks = None
                return (
                    "".join([prefix, *output_chunks, suffix]),
                    "".join([prefix, *support_chunks, suffix]),
                )

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
        if defer_strip:
            outside = strip_xf(outside)
        output_parts.append(outside)
        support_parts.append(outside)
        table_xml = clean[start:end]
        output_table, support_table = transform_table(table_xml)
        output_parts.append(output_table)
        support_parts.append(support_table)
        cursor = end
    tail = clean[cursor:]
    if defer_strip:
        tail = strip_xf(tail)
    output_parts.append(tail)
    support_parts.append(tail)
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
    source_bytes = len(final_fods.encode("utf-8"))
    payload = {
        "format": "vno.sheet.payload.v2",
        "rowsEncoding": "deflate-base64-jsonl-row-xml",
        "sourceBytes": source_bytes,
        "sheets": sink.sheets,
        "rows": sink.rows,
        "supportXml": support_xml,
        "rawStyleXml": raw_styles,
        "rowsDeflateBase64": base64.b64encode(compressed_rows).decode("ascii"),
    }
    if not payload["sheets"] or not payload["rows"] or not payload["supportXml"]:
        raise ValueError("Sheet open payload is incomplete")
    if source_bytes != payload["sourceBytes"]:
        raise ValueError("Sheet open payload source size is inconsistent")
    return final_fods, payload


def build_sheet_open_payload(xlsx_bytes: bytes, fods_xml: str, patcher) -> tuple[str, dict]:
    """Build the P1 payload by default, retaining the owner-requested rollback."""
    try:
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
    finally:
        patcher._shutdown_p1_process_pool()
