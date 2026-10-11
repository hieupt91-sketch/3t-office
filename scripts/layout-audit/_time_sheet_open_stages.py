"""Usage: python scripts/layout-audit/_time_sheet_open_stages.py <source.xlsx> [out.fods]
Do thoi gian tung buoc cua duong mo Sheet trong Python:
- make_all_sheets_visible
- soffice convert XLSX -> FODS
- cac overlay ooxml_zip_patch
- optimize_fods_streaming
- reoverlay_sheet_xf_indices
"""
import os
import sys
import time
import tempfile
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

if not os.environ.get("LOCALAPPDATA"):
    os.environ["LOCALAPPDATA"] = r"E:\VNOffice-profiles\agy"

import main as vnmain
patcher = vnmain._ooxml_zip_patch()

stages = []

def time_stage(name, func, *args, **kwargs):
    t0 = time.time()
    res = func(*args, **kwargs)
    dt = time.time() - t0
    size_mb = (len(res) / 1e6) if isinstance(res, (str, bytes)) else 0
    size_str = f" ({size_mb:.1f} MB)" if size_mb > 0 else ""
    print(f"  [{dt:6.2f}s]{size_str} {name}", flush=True)
    stages.append((name, dt, size_mb))
    return res, dt

def run_open_stages(xlsx_path, out_fods=None):
    global stages
    stages = []
    xlsx_path = os.path.abspath(xlsx_path)
    print(f"\n=== TIMING SHEET OPEN STAGES: {xlsx_path} ===", flush=True)
    total_t0 = time.time()

    with open(xlsx_path, "rb") as f:
        original_xlsx = f.read()
    print(f"Input file size: {len(original_xlsx)/1e6:.2f} MB", flush=True)

    with tempfile.TemporaryDirectory(prefix="vno_open_stage_") as tmp:
        # Step 0: make_all_sheets_visible
        import_xlsx, dt_vis = time_stage("make_all_sheets_visible",
            patcher.make_all_sheets_visible_for_import, original_xlsx)

        convert_src = xlsx_path
        if import_xlsx != original_xlsx:
            convert_src = os.path.join(tmp, "import-visible.xlsx")
            with open(convert_src, "wb") as f:
                f.write(import_xlsx)

        # Step 1: soffice convert
        t_soffice0 = time.time()
        out_path = vnmain._run_soffice_convert(convert_src, "fods", tmp, app_kind="sheet")
        dt_soffice = time.time() - t_soffice0
        raw_fods_size = os.path.getsize(out_path) / 1e6
        print(f"  [{dt_soffice:6.2f}s] ({raw_fods_size:.1f} MB) soffice convert (XLSX -> FODS)", flush=True)
        stages.append(("soffice convert (XLSX -> FODS)", dt_soffice, raw_fods_size))

        with open(out_path, "r", encoding="utf-8", errors="replace") as f:
            raw_fods = f.read()

        # Step 2: detailed overlays in overlay_sheet_xlsx_fods
        print("--- Detailed overlays in overlay_sheet_xlsx_fods ---", flush=True)
        xml = raw_fods
        norm_xlsx = patcher.normalize_source_xlsx(original_xlsx)
        
        current = patcher.read_zip_entry(norm_xlsx, patcher.XLSX_WORKBOOK_ENTRY)
        if current:
            wb_xml = current.decode("utf-8", errors="replace")
            xml, _ = time_stage("overlay_fods_structure_protection", patcher.overlay_fods_structure_protection, xml, wb_xml)
            vis = patcher.parse_sheet_visibility_from_workbook(wb_xml)
            if vis:
                xml, _ = time_stage("apply_sheet_visibility_to_fods", patcher.apply_sheet_visibility_to_fods, xml, vis)
            xml, _ = time_stage("overlay_active_sheet_to_fods", patcher.overlay_active_sheet_to_fods, xml, wb_xml)

        xml, _ = time_stage("overlay_sheet_xlsx_freeze_panes", patcher.overlay_sheet_xlsx_freeze_panes, norm_xlsx, xml)
        xml, _ = time_stage("_overlay_autofilter_from_xlsx", patcher._overlay_autofilter_from_xlsx, norm_xlsx, xml)
        xml, _ = time_stage("_overlay_sheet_layout_from_xlsx", patcher._overlay_sheet_layout_from_xlsx, norm_xlsx, xml)
        xml, _ = time_stage("_overlay_sheet_cell_metadata_from_xlsx (formats + strings + xf)", patcher._overlay_sheet_cell_metadata_from_xlsx, norm_xlsx, xml)
        xml, _ = time_stage("_promote_covered_formula_errors", patcher._promote_covered_formula_errors, xml)
        tab_colors = patcher.parse_tab_colors_from_xlsx(norm_xlsx)
        if tab_colors:
            xml, _ = time_stage("apply_tab_colors_to_fods", patcher.apply_tab_colors_to_fods, xml, tab_colors)
        xml, _ = time_stage("_overlay_sheet_drawing_image_ids", patcher._overlay_sheet_drawing_image_ids, norm_xlsx, xml)

        # Step 3: optimize_fods_streaming
        print("--- Optimize and reoverlay ---", flush=True)
        xml, dt_opt = time_stage("optimize_fods_streaming", vnmain._optimize_fods_for_sheet, xml)

        # Step 4: reoverlay_sheet_xf_indices
        xml, dt_reoverlay = time_stage("reoverlay_sheet_xf_indices", patcher.reoverlay_sheet_xf_indices, original_xlsx, xml)

        total_dt = time.time() - total_t0
        print(f"Total Python pipeline time: {total_dt:.2f}s (output FODS: {len(xml)/1e6:.1f} MB)\n", flush=True)

        print(f"### Bảng thời gian Python pipeline: {os.path.basename(xlsx_path)} ({len(original_xlsx)/1e6:.2f} MB)", flush=True)
        print("| Giai đoạn | Thời gian (s) | Kích thước kết quả (MB) |", flush=True)
        print("| :--- | :--- | :--- |", flush=True)
        for name, dt, sz in stages:
            print(f"| {name} | {dt:.2f}s | {sz:.2f} MB |", flush=True)
        print(f"| **Tổng cộng (Python)** | **{total_dt:.2f}s** | **{len(xml)/1e6:.2f} MB** |\n", flush=True)

        if out_fods:
            with open(out_fods, "w", encoding="utf-8") as f:
                f.write(xml)
            print(f"Saved FODS to {out_fods}", flush=True)

    return total_dt

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python _time_sheet_open_stages.py <source.xlsx> [out.fods]")
        sys.exit(1)
    out = sys.argv[2] if len(sys.argv) > 2 else None
    run_open_stages(sys.argv[1], out)
