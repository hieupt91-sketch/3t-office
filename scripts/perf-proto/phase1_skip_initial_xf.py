"""Phase 1 prototype (docs/PLAN-SHEET-OPEN-PERF.md): skip the XF stamp in the first
metadata overlay, because optimize_fods_streaming drops/merges it and
reoverlay_sheet_xf_indices strips every vno:xf and reattaches it anyway.

Runs the open pipeline twice per workbook on the SAME LibreOffice FODS:
  A = current  : overlay (formats+strings+xf) -> optimize -> reoverlay xf
  B = prototype: overlay (formats+strings)    -> optimize -> reoverlay xf
Prints stage timings, FODS sizes, and whether A and B are byte-identical; writes
both results next to --out so the JS model can be compared if they differ.
Does not modify product code.

Usage: python scripts/perf-proto/phase1_skip_initial_xf.py <xlsx> --out <dir>
"""
import argparse
import os
import sys
import tempfile
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
import main as vnmain  # noqa: E402

patcher = vnmain._ooxml_zip_patch()


def timed(label, func, *args):
    started = time.perf_counter()
    result = func(*args)
    print(f"  {label:34s} {time.perf_counter() - started:8.2f}s  {len(result) / 1e6:8.1f} M chars", flush=True)
    return result


def pipeline(src_path, xlsx_bytes, lo_fods, skip_initial_xf):
    original = patcher._xlsx_cells_with_metadata
    if skip_initial_xf:
        def without_xf(data):
            formats, strings, _xfs = original(data)
            return formats, strings, {}
        patcher._xlsx_cells_with_metadata = without_xf
    try:
        started = time.perf_counter()
        fods = timed("native import overlay", vnmain._apply_native_import_overlay, src_path, lo_fods, "sheet")
    finally:
        patcher._xlsx_cells_with_metadata = original
    fods = timed("optimize_fods_streaming", vnmain._optimize_fods_for_sheet, fods)
    fods = timed("reoverlay_sheet_xf_indices", patcher.reoverlay_sheet_xf_indices, xlsx_bytes, fods)
    print(f"  {'TOTAL after LibreOffice':34s} {time.perf_counter() - started:8.2f}s", flush=True)
    return fods


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    src = os.path.abspath(args.xlsx)
    xlsx_bytes = open(src, "rb").read()
    stem = os.path.splitext(os.path.basename(src))[0]
    with tempfile.TemporaryDirectory(prefix="vno_phase1_") as tmp:
        import_src = src
        visible = patcher.make_all_sheets_visible_for_import(xlsx_bytes)
        if visible != xlsx_bytes:
            import_src = os.path.join(tmp, "import-visible.xlsx")
            open(import_src, "wb").write(visible)
        started = time.perf_counter()
        lo_path = vnmain._run_soffice_convert(import_src, "fods", tmp, app_kind="sheet")
        lo_fods = open(lo_path, encoding="utf-8").read()
        print(f"{stem}: LibreOffice xlsx->fods {time.perf_counter() - started:.2f}s, {len(lo_fods) / 1e6:.1f} M chars", flush=True)
    print("A = current pipeline", flush=True)
    a = pipeline(src, xlsx_bytes, lo_fods, skip_initial_xf=False)
    print("B = skip initial XF stamp", flush=True)
    b = pipeline(src, xlsx_bytes, lo_fods, skip_initial_xf=True)
    open(os.path.join(args.out, f"{stem}.A.fods"), "w", encoding="utf-8").write(a)
    open(os.path.join(args.out, f"{stem}.B.fods"), "w", encoding="utf-8").write(b)
    print(f"{stem}: A == B byte-identical: {a == b}  (A {len(a) / 1e6:.1f} M, B {len(b) / 1e6:.1f} M)", flush=True)


if __name__ == "__main__":
    main()
