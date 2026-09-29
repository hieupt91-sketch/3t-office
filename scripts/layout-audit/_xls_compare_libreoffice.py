#!/usr/bin/env python3
"""Usage: python _xls_compare_libreoffice.py <a.xls> <b.xls>
Compare two .xls files using LibreOffice headless to convert both to FODS,
then compare every cell of every sheet. Prints RESULT JSON on one line.
"""
import json
import os
import sys
import tempfile
import xml.etree.ElementTree as ET

# Ensure we can import main.py
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

import main


NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "xlink": "http://www.w3.org/1999/xlink",
}


def convert_to_fods(xls_path: str, tmpdir: str) -> str:
    """Convert .xls to .fods using LibreOffice headless."""
    out_path = main._run_soffice_convert(xls_path, "fods", tmpdir, app_kind="sheet")
    return out_path


def parse_fods(fods_path: str) -> dict:
    """Parse FODS and return {sheet_name: {(row, col): (value_str, formula_str)}}."""
    tree = ET.parse(fods_path)
    root = tree.getroot()
    sheets = {}
    for sheet_elem in root.findall(".//table:table", NS):
        sheet_name = sheet_elem.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name")
        cells = {}
        row_idx = 0
        for row_elem in sheet_elem.findall("table:table-row", NS):
            col_idx = 0
            for cell_elem in row_elem.findall("table:table-cell", NS):
                # Handle repeated columns
                repeat = int(cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated", "1"))
                # Get value
                value = ""
                value_type = cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value-type")
                if value_type == "float":
                    val = cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value")
                    if val is not None:
                        value = f"{float(val):.9f}".rstrip("0").rstrip(".")
                elif value_type == "string":
                    # String value is in text:p children
                    for p in cell_elem.findall("text:p", NS):
                        if p.text:
                            value += p.text
                elif value_type == "boolean":
                    val = cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}boolean-value")
                    value = "TRUE" if val == "true" else "FALSE"
                elif value_type == "currency":
                    val = cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value")
                    currency = cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}currency")
                    if val is not None:
                        value = f"{float(val):.9f}".rstrip("0").rstrip(".")
                # Get formula
                formula = cell_elem.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}formula", "")
                if formula.startswith("of:"):
                    formula = formula[3:]
                # Only record if has value or formula
                if value != "" or (formula and formula.startswith("=")):
                    for _ in range(repeat):
                        cells[(row_idx, col_idx)] = (value, formula)
                        col_idx += 1
            row_idx += 1
        sheets[sheet_name] = cells
    return sheets


def compare_sheets(sheets_a: dict, sheets_b: dict) -> tuple[int, int, int, list]:
    """Compare two sheet dicts. Returns (num_sheets, total_cells, diff_count, examples)."""
    total_cells = 0
    diff_count = 0
    examples = []
    all_sheet_names = set(sheets_a.keys()) | set(sheets_b.keys())
    for sname in sorted(all_sheet_names):
        a = sheets_a.get(sname, {})
        b = sheets_b.get(sname, {})
        if not a and not b:
            continue
        all_keys = set(a.keys()) | set(b.keys())
        for key in sorted(all_keys):
            total_cells += 1
            va, fa = a.get(key, ("", ""))
            vb, fb = b.get(key, ("", ""))
            # Compare values (numeric with tolerance)
            vals_equal = False
            if va == vb:
                vals_equal = True
            else:
                try:
                    fa_num = float(va)
                    fb_num = float(vb)
                    if abs(fa_num - fb_num) < 1e-9:
                        vals_equal = True
                except ValueError:
                    pass
            # Compare formulas
            forms_equal = (fa == fb) if (fa or fb) else True
            if not (vals_equal and forms_equal):
                diff_count += 1
                if len(examples) < 5:
                    r, c = key
                    cell_ref = f"{sname}!{chr(65 + c)}{r + 1}" if c < 26 else f"{sname}!R{r+1}C{c+1}"
                    examples.append(f"{cell_ref} src=[{va}|{fa}] saved=[{vb}|{fb}]")
        # Check for missing sheets
        if sname not in sheets_a:
            diff_count += len(b)
            if len(examples) < 5:
                examples.append(f"missing sheet {sname} in source")
        elif sname not in sheets_b:
            diff_count += len(a)
            if len(examples) < 5:
                examples.append(f"missing sheet {sname} in saved")
    return len(all_sheet_names), total_cells, diff_count, examples


def main_compare(a_path: str, b_path: str):
    with tempfile.TemporaryDirectory(prefix="xls_cmp_") as tmp:
        fods_a = convert_to_fods(a_path, tmp)
        fods_b = convert_to_fods(b_path, tmp)
        sheets_a = parse_fods(fods_a)
        sheets_b = parse_fods(fods_b)
        sheets_count, cells_count, diff_count, examples = compare_sheets(sheets_a, sheets_b)
        result = {
            "sheets": sheets_count,
            "cells": cells_count,
            "diff": diff_count,
            "examples": examples,
        }
        print(f"RESULT {json.dumps(result, ensure_ascii=False)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python _xls_compare_libreoffice.py <a.xls> <b.xls>", file=sys.stderr)
        sys.exit(2)
    a = sys.argv[1]
    b = sys.argv[2]
    if not os.path.isfile(a) or not os.path.isfile(b):
        print("Both files must exist", file=sys.stderr)
        sys.exit(2)
    try:
        main_compare(a, b)
    except main.DocumentEngineError as e:
        print(f'RESULT {{"error": "{e}"}}')
    except Exception as e:
        print(f'RESULT {{"error": "{type(e).__name__}: {e}"}}')