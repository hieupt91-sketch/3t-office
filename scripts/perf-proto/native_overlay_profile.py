"""Profile and benchmark the native Sheet XLSX metadata overlay.

This is a scratch-only prototype. It measures overlay_sheet_xlsx_fods with the
initial XF pass disabled (the Phase 1 path). Its optimized mode skips building
the XF index discarded by that path and uses a precompiled matcher for the only
three XLSX cell attributes this pass needs (r, s, and t).

Usage:
  python scripts/perf-proto/native_overlay_profile.py --xlsx lan06.xlsx --fods raw.fods --mode baseline --out result.fods
  python scripts/perf-proto/native_overlay_profile.py --xlsx lan06.xlsx --fods raw.fods --mode baseline --profile profile.prof
"""
from __future__ import annotations

import argparse
import cProfile
import hashlib
import json
import os
import pstats
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402

PATCHER_MODULE = vnmain._ooxml_zip_patch()
CELL_TARGET_ATTR_RE = re.compile(
    r"(?:^|\s)(r|s|t)\s*=\s*([\"'])(.*?)\2",
    re.IGNORECASE | re.DOTALL,
)
TOP_LEVEL = (
    "overlay_fods_structure_protection",
    "apply_sheet_visibility_to_fods",
    "overlay_active_sheet_to_fods",
    "overlay_sheet_xlsx_freeze_panes",
    "_overlay_autofilter_from_xlsx",
    "_overlay_sheet_layout_from_xlsx",
    "_overlay_sheet_cell_metadata_from_xlsx",
    "_promote_covered_formula_errors",
    "parse_tab_colors_from_xlsx",
    "apply_tab_colors_to_fods",
    "_overlay_sheet_drawing_image_ids",
)


def _metadata_without_xf(xlsx_bytes: bytes):
    """Build metadata maps for the Phase 1 route without the discarded XF map."""
    cached = PATCHER_MODULE._index_memo_get("sheet_metadata_no_initial_xf", xlsx_bytes)
    if cached is not PATCHER_MODULE._INDEX_MISS:
        return cached
    format_by_xf = PATCHER_MODULE._xlsx_number_formats(xlsx_bytes)
    shared_xml = (
        PATCHER_MODULE.read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml") or b""
    ).decode("utf-8", errors="replace")
    shared = []
    for item in re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", shared_xml, re.IGNORECASE):
        shared.append("".join(
            PATCHER_MODULE._unescape_xml(match.group(1))
            for match in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", item.group(1), re.IGNORECASE)
        ))

    formats, strings = {}, {}
    coordinate_re = re.compile(r"([A-Z]+)(\d+)", re.IGNORECASE)
    value_re = re.compile(r"<v\b[^>]*>([\s\S]*?)</v>", re.IGNORECASE)
    text_re = re.compile(r"<t\b[^>]*>([\s\S]*?)</t>", re.IGNORECASE)
    for sheet_name, entry_path in PATCHER_MODULE._resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = PATCHER_MODULE.read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_formats, sheet_strings = {}, {}
        sheet_xml = entry.decode("utf-8", errors="replace")
        for attrs_text, body in PATCHER_MODULE._iter_xlsx_cell_parts(sheet_xml):
            coordinate_text = style_text = kind_text = ""
            for attr_match in CELL_TARGET_ATTR_RE.finditer(attrs_text):
                attr_name = attr_match.group(1).lower()
                if attr_name == "r":
                    coordinate_text = attr_match.group(3)
                elif attr_name == "s":
                    style_text = attr_match.group(3)
                else:
                    kind_text = attr_match.group(3)
            coord = coordinate_re.fullmatch(coordinate_text)
            if not coord:
                continue
            column = 0
            for char in coord.group(1).upper():
                column = column * 26 + ord(char) - 64
            key = (int(coord.group(2)), column)
            style_index = int(style_text or 0)
            if 0 <= style_index < len(format_by_xf):
                code = format_by_xf[style_index]
                if code.lower() != "general":
                    sheet_formats[key] = code

            kind = kind_text.lower()
            if kind not in {"s", "str", "inlinestr"}:
                continue
            if kind == "s":
                raw = value_re.search(body)
                value = shared[int(raw.group(1))] if raw and int(raw.group(1)) < len(shared) else ""
            else:
                text_values = text_re.findall(body)
                raw_value = value_re.search(body)
                value = "".join(PATCHER_MODULE._unescape_xml(item) for item in text_values) or (
                    PATCHER_MODULE._unescape_xml(raw_value.group(1)) if raw_value else ""
                )
            sheet_strings[key] = value
        if sheet_formats:
            formats[sheet_name] = sheet_formats
        if sheet_strings:
            strings[sheet_name] = sheet_strings
    result = (formats, strings, {})
    PATCHER_MODULE._index_memo_put("sheet_metadata_no_initial_xf", xlsx_bytes, result)
    return result


def _instrument_top_level():
    elapsed: dict[str, float] = {}
    calls: dict[str, int] = {}
    originals = {}
    for name in TOP_LEVEL:
        original = getattr(PATCHER_MODULE, name, None)
        if not callable(original):
            continue
        originals[name] = original

        def wrapped(*args, __name=name, __original=original, **kwargs):
            start = time.perf_counter()
            try:
                return __original(*args, **kwargs)
            finally:
                elapsed[__name] = elapsed.get(__name, 0.0) + time.perf_counter() - start
                calls[__name] = calls.get(__name, 0) + 1

        setattr(PATCHER_MODULE, name, wrapped)
    return elapsed, calls, originals


def _restore(originals):
    for name, function in originals.items():
        setattr(PATCHER_MODULE, name, function)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--fods", required=True, help="Raw FODS produced by LibreOffice XLSX -> FODS")
    parser.add_argument("--mode", choices=("baseline", "optimized", "p1"), default="baseline")
    parser.add_argument("--out", help="Write the overlay output to this path")
    parser.add_argument("--profile", help="Write a cProfile .prof file and print cumulative leaders")
    parser.add_argument("--profile-lines", type=int, default=35)
    parser.add_argument("--prepare-raw", action="store_true", help="Convert --xlsx to raw --fods and exit")
    args = parser.parse_args()

    xlsx_path, fods_path = Path(args.xlsx).resolve(), Path(args.fods).resolve()
    if args.prepare_raw:
        import tempfile

        original = xlsx_path.read_bytes()
        import_bytes = PATCHER_MODULE.make_all_sheets_visible_for_import(original)
        with tempfile.TemporaryDirectory(prefix="vno_native_overlay_raw_") as temp_dir:
            convert_src = xlsx_path
            if import_bytes != original:
                convert_src = Path(temp_dir) / "import-visible.xlsx"
                convert_src.write_bytes(import_bytes)
            out_path = vnmain._run_soffice_convert(
                str(convert_src), "fods", temp_dir, app_kind="sheet"
            )
            fods_path.parent.mkdir(parents=True, exist_ok=True)
            fods_path.write_bytes(Path(out_path).read_bytes())
        print(json.dumps({
            "mode": "prepare-raw-fods",
            "xlsx": str(xlsx_path),
            "fods": str(fods_path),
            "fods_bytes": fods_path.stat().st_size,
        }, indent=2), flush=True)
        return
    xlsx_bytes = xlsx_path.read_bytes()
    fods_xml = fods_path.read_text(encoding="utf-8", errors="replace")
    PATCHER_MODULE._INDEX_MEMO.clear()
    timings, calls, originals = _instrument_top_level()
    if args.mode == "optimized":
        originals["_xlsx_cells_with_metadata"] = PATCHER_MODULE._xlsx_cells_with_metadata
        PATCHER_MODULE._xlsx_cells_with_metadata = _metadata_without_xf

    overlay = (
        PATCHER_MODULE.overlay_sheet_xlsx_fods_p1
        if args.mode == "p1"
        else PATCHER_MODULE.overlay_sheet_xlsx_fods
    )
    profiler = cProfile.Profile() if args.profile else None
    started = time.perf_counter()
    try:
        if profiler:
            output = profiler.runcall(
                overlay,
                xlsx_bytes,
                fods_xml,
                skip_initial_xf=True,
            )
        else:
            output = overlay(
                xlsx_bytes,
                fods_xml,
                skip_initial_xf=True,
            )
    finally:
        elapsed = time.perf_counter() - started
        _restore(originals)

    output_bytes = output.encode("utf-8")
    result = {
        "mode": args.mode,
        "xlsx": str(xlsx_path),
        "fods": str(fods_path),
        "input_chars": len(fods_xml),
        "output_chars": len(output),
        "output_bytes": len(output_bytes),
        "sha256": hashlib.sha256(output_bytes).hexdigest(),
        "seconds": round(elapsed, 3),
        "substage_seconds": {name: round(value, 3) for name, value in timings.items()},
        "substage_calls": calls,
    }
    if args.out:
        output_path = Path(args.out).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output, encoding="utf-8", newline="")
        result["output"] = str(output_path)
    print(json.dumps(result, indent=2, ensure_ascii=False), flush=True)
    if profiler:
        profile_path = Path(args.profile).resolve()
        profile_path.parent.mkdir(parents=True, exist_ok=True)
        profiler.dump_stats(str(profile_path))
        stats = pstats.Stats(profiler).strip_dirs().sort_stats("cumulative")
        print(f"\nPROFILE TOP {args.profile_lines} CUMULATIVE: {profile_path}", flush=True)
        stats.print_stats(args.profile_lines)


if __name__ == "__main__":
    main()
