"""Scratch XLSX -> FODS/payload runner with payload capture in final XF pass.

Set SHEET_OPEN_SKIP_INITIAL_XF=1 before running. The legacy mode reports the
Phase 1 Python stage costs. Payload mode replaces only the final XF reoverlay
with an equivalent prototype traversal that emits payload rows while it emits
the final FODS rows; it never saves and reparses the finished FODS.
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
import tempfile
import time
import zlib
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

if os.environ.get("SHEET_OPEN_SKIP_INITIAL_XF", "").strip().lower() not in {"1", "true", "yes", "on"}:
    raise SystemExit("Set SHEET_OPEN_SKIP_INITIAL_XF=1 to run this phase-2 prototype.")

import main as vnmain  # noqa: E402
class PayloadRows:
    def __init__(self):
        self.buffer = BytesIO()
        self.compressor = zlib.compressobj(level=6)
        self.sheets = self.rows = 0

    def emit(self, record):
        line = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        self.buffer.write(self.compressor.compress(line))

    def begin_sheet(self, name):
        self.emit(["sheet", name])
        self.sheets += 1

    def end_sheet(self):
        self.emit(["end-sheet"])

    def add_row(self, row_xml, patcher=None):
        # Keep cells as XML fragments inside a row record. The final XF walk
        # already has these rows; decoding every cell into Python arrays added
        # about 38 seconds on LAN14.
        self.emit(["row-xml", row_xml])
        self.rows += 1

    def finish(self):
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


class _RowRecordSink(PayloadRows):
    pass


def _integrated_xf_pass(xlsx_bytes: bytes | None, fods_xml: str, patcher):
    """Equivalent final XF pass; row/cell payload records are emitted in-line."""
    sink = _RowRecordSink()
    clean = (
        re.sub(r'\s+vno:xf\s*=\s*(["\'])\d+\1', "", fods_xml, flags=re.IGNORECASE)
        if xlsx_bytes else fods_xml
    )
    if xlsx_bytes:
        normalized_xlsx = patcher.normalize_source_xlsx(xlsx_bytes)
        by_sheet = patcher._xlsx_cells_with_xf_indices(normalized_xlsx)
    else:
        by_sheet = {}
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
                sink.add_row(fragment, patcher)
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
    return final_fods, payload


def run_from_existing_fods(fods_path, payload_path, xlsx_path=None, final_fods_path=None):
    """Run only the fused final pass against a stored FODS corpus artifact."""
    patcher = vnmain._ooxml_zip_patch()
    patcher._INDEX_MEMO.clear()
    with open(fods_path, "r", encoding="utf-8", errors="replace", newline="") as source:
        fods_xml = source.read()
    xlsx_bytes = Path(xlsx_path).read_bytes() if xlsx_path else None
    started = time.perf_counter()
    final_fods, payload = _integrated_xf_pass(xlsx_bytes, fods_xml, patcher)
    Path(payload_path).resolve().parent.mkdir(parents=True, exist_ok=True)
    with open(payload_path, "w", encoding="utf-8", newline="") as target:
        json.dump(payload, target, ensure_ascii=False, separators=(",", ":"))
    elapsed = time.perf_counter() - started
    if final_fods_path:
        Path(final_fods_path).resolve().parent.mkdir(parents=True, exist_ok=True)
        Path(final_fods_path).write_text(final_fods, encoding="utf-8", newline="")
    print(json.dumps({
        "mode": "existing-fods+xf+row-capture" if xlsx_bytes else "existing-fods-row-capture",
        "seconds": round(elapsed, 3),
        "payload_bytes": Path(payload_path).stat().st_size,
        "payload_mb": round(Path(payload_path).stat().st_size / 1_000_000, 2),
        "sheets": payload["sheets"],
        "rows": payload["rows"],
        "rows_encoding": payload["rowsEncoding"],
        "input_fods_bytes": len(fods_xml.encode("utf-8")),
    }, indent=2), flush=True)


def _stage(name, fn, *args, stages, **kwargs):
    start = time.perf_counter()
    value = fn(*args, **kwargs)
    elapsed = time.perf_counter() - start
    size = len(value) if isinstance(value, (str, bytes)) else None
    stages.append((name, elapsed, size))
    print(f"[{elapsed:8.3f}s] {name}" + (f" ({size / 1_000_000:.2f} MB)" if size is not None else ""), flush=True)
    return value


def run(source_path, payload_path=None, fods_path=None):
    source_path = str(Path(source_path).resolve())
    stages = []
    total_start = time.perf_counter()
    original_xlsx = _stage("read source XLSX", Path(source_path).read_bytes, stages=stages)
    patcher = vnmain._ooxml_zip_patch()
    patcher._INDEX_MEMO.clear()
    import_xlsx = _stage(
        "make all sheets visible",
        patcher.make_all_sheets_visible_for_import,
        original_xlsx,
        stages=stages,
    )
    with tempfile.TemporaryDirectory(prefix="vno_phase2_open_") as temp_dir:
        convert_src = source_path
        if import_xlsx != original_xlsx:
            convert_src = str(Path(temp_dir) / "import-visible.xlsx")
            Path(convert_src).write_bytes(import_xlsx)
        out_path = _stage(
            "soffice XLSX -> FODS",
            vnmain._run_soffice_convert,
            convert_src,
            "fods",
            temp_dir,
            app_kind="sheet",
            stages=stages,
        )
        raw_fods = _stage(
            "read converted FODS",
            lambda: Path(out_path).read_text(encoding="utf-8", errors="replace"),
            stages=stages,
        )
        xml = _stage(
            "OOXML overlays (Phase 1 initial XF skipped)",
            vnmain._apply_native_import_overlay,
            source_path,
            raw_fods,
            "sheet",
            stages=stages,
        )
        xml = _stage("optimize FODS", vnmain._optimize_fods_for_sheet, xml, stages=stages)
        if payload_path:
            start = time.perf_counter()
            xml, payload = _integrated_xf_pass(original_xlsx, xml, patcher)
            Path(payload_path).resolve().parent.mkdir(parents=True, exist_ok=True)
            with open(payload_path, "w", encoding="utf-8", newline="") as target:
                json.dump(payload, target, ensure_ascii=False, separators=(",", ":"))
            elapsed = time.perf_counter() - start
            stages.append(("final XF reoverlay + in-pass payload", elapsed, len(xml)))
            print(f"[{elapsed:8.3f}s] final XF reoverlay + in-pass payload ({len(xml) / 1_000_000:.2f} MB)", flush=True)
            print(json.dumps({
                "payload_bytes": Path(payload_path).stat().st_size,
                "payload_mb": round(Path(payload_path).stat().st_size / 1_000_000, 2),
                "payload_sheets": payload["sheets"],
                "payload_rows": payload["rows"],
                "rows_encoding": payload["rowsEncoding"],
            }, indent=2), flush=True)
        else:
            xml = _stage(
                "final XF reoverlay",
                patcher.reoverlay_sheet_xf_indices,
                original_xlsx,
                xml,
                stages=stages,
            )
        total = time.perf_counter() - total_start
        print(f"TOTAL XLSX -> {'payload' if payload_path else 'FODS'} Python: {total:.3f}s", flush=True)
        if fods_path:
            Path(fods_path).resolve().parent.mkdir(parents=True, exist_ok=True)
            write_start = time.perf_counter()
            Path(fods_path).write_text(xml, encoding="utf-8", newline="")
            print(f"FODS artifact write (excluded from total): {time.perf_counter() - write_start:.3f}s", flush=True)
        print("STAGE_SECONDS=" + json.dumps({name: round(seconds, 3) for name, seconds, _ in stages}), flush=True)
        return total


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--existing-fods":
        if len(sys.argv) not in (4, 5, 6):
            raise SystemExit(
                "Usage: python scripts/perf-proto/phase2_stream_open.py --existing-fods <in.fods> <payload.json> [source.xlsx] [final.fods]"
            )
        run_from_existing_fods(
            sys.argv[2], sys.argv[3],
            sys.argv[4] if len(sys.argv) >= 5 else None,
            sys.argv[5] if len(sys.argv) >= 6 else None,
        )
    elif len(sys.argv) not in (2, 3, 4):
        raise SystemExit(
            "Usage: python scripts/perf-proto/phase2_stream_open.py <source.xlsx> [payload.json] [final.fods]"
        )
    else:
        run(sys.argv[1], sys.argv[2] if len(sys.argv) >= 3 else None, sys.argv[3] if len(sys.argv) >= 4 else None)
