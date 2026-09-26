"""Compare current XLSX layout overlays with cached Excel geometry.

Usage: python _compare_sheet_s29_geometry.py <geom-directory> [...] <xlsx-directory>
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)
from adapters.libreoffice.common import ooxml_zip_patch as patcher

geom_dirs, xlsx_dir = sys.argv[1:-1], sys.argv[-1]
row_total = col_total = row_mismatch = col_mismatch = 0
col_examples = []
seen = set()
for geom_path in sorted(path for directory in geom_dirs for path in glob.glob(os.path.join(directory, "*.geom.json"))):
    stem = os.path.basename(geom_path).split(".")[0]
    if stem in seen:
        continue
    seen.add(stem)
    xlsx_path = os.path.join(xlsx_dir, stem + ".xlsx")
    if not os.path.isfile(xlsx_path):
        continue
    source = open(xlsx_path, "rb").read()
    sheet_names = list(patcher._resolve_xlsx_sheet_entries(source))
    fods = "".join(f'<table:table table:name="{patcher._escape_xml(name)}"/>' for name in sheet_names)
    overlaid = patcher._overlay_sheet_layout_from_xlsx(source, fods)
    layouts = {}
    for match in re.finditer(r'<table:table\b([^>]*)>', overlaid):
        attrs = patcher._xml_attrs(match.group(1))
        if attrs.get("table:name") and attrs.get("vno:xlsx-layout"):
            layouts[patcher._unescape_xml(attrs["table:name"])] = json.loads(patcher._unescape_xml(attrs["vno:xlsx-layout"]))
    geometry = json.load(open(geom_path, encoding="utf-8"))
    for sheet in geometry["sheets"]:
        layout = layouts.get(sheet["name"], {})
        key = patcher._sheet_name_equivalence_key(sheet["name"])
        if not layout:
            layout = next((v for k, v in layouts.items() if patcher._sheet_name_equivalence_key(k) == key), {})
        rows, columns = layout.get("rows", {}), layout.get("columns", {})
        default_row, default_col = layout.get("defaultRow"), layout.get("defaultCol")
        for index, expected in enumerate(sheet.get("rowPx", []), 1):
            row_total += 1
            actual = rows.get(str(index), default_row)
            if expected != 0 and (actual is None or abs(float(actual) - float(expected)) > 0.5):
                row_mismatch += 1
        for index, expected in enumerate(sheet.get("colPx", []), 1):
            col_total += 1
            name = patcher._column_name(index)
            actual = columns.get(name, default_col)
            # Depending on the XLSX's column record, Excel's rectangle either
            # includes the two-pixel gutter or is already content-normalized.
            # Accept those two established representations only.
            delta = abs(float(actual) - float(expected)) if actual is not None else float("inf")
            gutter_delta = abs(float(actual) - (float(expected) - 2.0)) if actual is not None else float("inf")
            if expected != 0 and min(delta, gutter_delta) > 0.5:
                col_mismatch += 1
                if len(col_examples) < 12:
                    col_examples.append((stem, sheet["name"], name, expected, actual))
print(f"rows: {row_mismatch}/{row_total} mismatch")
print(f"columns: {col_mismatch}/{col_total} mismatch")
for example in col_examples:
    print("column mismatch:", *example)
if row_mismatch or col_mismatch:
    raise SystemExit(1)
