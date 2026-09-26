"""Compare the legacy three-pass cell overlays with the combined overlay.

Usage: python scripts/layout-audit/_compare_sheet_s29_metadata.py <lan05.xlsx> ...
Each input is converted once by the same local LibreOffice used by the app; the
two implementations then receive the identical FODS and XLSX bytes.
"""
import hashlib
import os
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
if not os.environ.get("LOCALAPPDATA"):
    os.environ["LOCALAPPDATA"] = r"E:\VNOffice-profiles\codex"

import main
patcher = main._ooxml_zip_patch()


def compare(path):
    with open(path, "rb") as stream:
        source = stream.read()
    with tempfile.TemporaryDirectory(prefix="vno_s29_compare_") as temp:
        fods_path = main._run_soffice_convert(path, "fods", temp, app_kind="sheet")
        with open(fods_path, "r", encoding="utf-8", errors="replace") as stream:
            fods = stream.read()
    normalized = patcher.normalize_source_xlsx(source)
    old = patcher._overlay_sheet_number_formats_from_xlsx(normalized, fods)
    old = patcher._promote_covered_formula_errors(old)
    old = patcher._overlay_sheet_original_strings_from_xlsx(normalized, old)
    old = patcher._overlay_sheet_xf_indices_from_xlsx(normalized, old)
    new = patcher._overlay_sheet_cell_metadata_from_xlsx(normalized, fods)
    new = patcher._promote_covered_formula_errors(new)
    old_hash = hashlib.sha256(old.encode("utf-8")).hexdigest()
    new_hash = hashlib.sha256(new.encode("utf-8")).hexdigest()
    if old != new:
        limit = min(len(old), len(new))
        offset = next((i for i in range(limit) if old[i] != new[i]), limit)
        raise AssertionError(f"{os.path.basename(path)} differs at character {offset}; legacy={old_hash}; combined={new_hash}")
    print(f"PASS {os.path.basename(path)} bytes={len(new.encode('utf-8'))} sha256={new_hash}", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python _compare_sheet_s29_metadata.py <lanNN.xlsx> [...]")
    for filename in sys.argv[1:]:
        compare(os.path.abspath(filename))
