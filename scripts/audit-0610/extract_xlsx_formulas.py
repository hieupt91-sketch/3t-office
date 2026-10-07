#!/usr/bin/env python3
"""
scripts/audit-0610/extract_xlsx_formulas.py
Trích xuất tất cả các ô công thức (<f>) và giá trị cache (<v>) từ tệp XLSX
sử dụng thư viện chuẩn của Python: zipfile, xml.etree.ElementTree.
KHÔNG sử dụng thư viện bên ngoài.
"""

import sys
import os
import json
import zipfile
import xml.etree.ElementTree as ET
import argparse


def strip_ns(tag):
    if not tag:
        return ""
    return tag.split("}")[-1] if "}" in tag else tag


def extract_workbook_sheets(z):
    wb_xml = z.read("xl/workbook.xml")
    wb_tree = ET.fromstring(wb_xml)
    
    rels_map = {}
    if "xl/_rels/workbook.xml.rels" in z.namelist():
        rels_xml = z.read("xl/_rels/workbook.xml.rels")
        rels_tree = ET.fromstring(rels_xml)
        for rel in rels_tree:
            r_id = rel.get("Id")
            target = rel.get("Target")
            if r_id and target:
                rels_map[r_id] = target

    sheets = []
    for elem in wb_tree.iter():
        if strip_ns(elem.tag) == "sheet":
            name = elem.get("name")
            r_id = None
            for attr_name, attr_val in elem.attrib.items():
                if strip_ns(attr_name) == "id":
                    r_id = attr_val
                    break
            
            target_file = None
            if r_id and r_id in rels_map:
                t = rels_map[r_id]
                if not t.startswith("xl/"):
                    t = "xl/" + t.lstrip("/")
                target_file = t
            
            if name and target_file and target_file in z.namelist():
                sheets.append({"name": name, "target": target_file})
                
    return sheets


def extract_shared_strings(z):
    sst = []
    if "xl/sharedStrings.xml" not in z.namelist():
        return sst

    sst_xml = z.read("xl/sharedStrings.xml")
    sst_tree = ET.fromstring(sst_xml)
    for si in sst_tree:
        if strip_ns(si.tag) == "si":
            parts = []
            for node in si.iter():
                if strip_ns(node.tag) == "t" and node.text:
                    parts.append(node.text)
            sst.append("".join(parts))
    return sst


def extract_formulas_from_xlsx(file_path):
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Không tìm thấy tệp: {file_path}")

    with zipfile.ZipFile(file_path, "r") as z:
        sheets = extract_workbook_sheets(z)
        shared_strings = extract_shared_strings(z)

        results = {
            "filePath": os.path.abspath(file_path),
            "fileName": os.path.basename(file_path),
            "sheetsCount": len(sheets),
            "totalFormulas": 0,
            "skippedSharedSlaves": 0,
            "skippedArray": 0,
            "skippedNoCache": 0,
            "formulas": []
        }

        for sheet_info in sheets:
            sheet_name = sheet_info["name"]
            sheet_target = sheet_info["target"]

            sheet_xml = z.read(sheet_target)
            sheet_tree = ET.fromstring(sheet_xml)

            for c in sheet_tree.iter():
                if strip_ns(c.tag) != "c":
                    continue

                coord = c.get("r")
                cell_type = c.get("t")

                f_elem = None
                v_elem = None
                for child in c:
                    child_tag = strip_ns(child.tag)
                    if child_tag == "f":
                        f_elem = child
                    elif child_tag == "v":
                        v_elem = child

                if f_elem is None:
                    continue

                results["totalFormulas"] += 1

                f_type = f_elem.get("t")
                if f_type == "array":
                    results["skippedArray"] += 1
                    continue

                f_text = f_elem.text
                if not f_text or not f_text.strip():
                    if f_type == "shared":
                        results["skippedSharedSlaves"] += 1
                    else:
                        results["skippedSharedSlaves"] += 1
                    continue

                formula_str = f_text.strip()

                if v_elem is None or v_elem.text is None:
                    results["skippedNoCache"] += 1
                    continue

                cache_raw = v_elem.text

                # Parse cache value & type
                val_type = "number"
                val = None

                if cell_type == "s":
                    val_type = "string"
                    try:
                        idx = int(cache_raw)
                        val = shared_strings[idx] if idx < len(shared_strings) else cache_raw
                    except (ValueError, IndexError):
                        val = cache_raw
                elif cell_type in ("str", "inlineStr"):
                    val_type = "string"
                    val = cache_raw
                elif cell_type == "b":
                    val_type = "boolean"
                    val = (cache_raw == "1" or cache_raw.lower() == "true")
                elif cell_type == "e":
                    val_type = "error"
                    val = cache_raw
                else:
                    try:
                        num = float(cache_raw)
                        val_type = "number"
                        val = num
                    except ValueError:
                        val_type = "string"
                        val = cache_raw

                results["formulas"].append({
                    "sheet": sheet_name,
                    "coord": coord,
                    "formula": formula_str,
                    "cacheVal": val,
                    "cacheType": val_type
                })

        return results


def main():
    parser = argparse.ArgumentParser(description="Extract formulas and cache from XLSX")
    parser.add_argument("file", help="Path to XLSX file")
    parser.add_argument("--out", "-o", help="Output JSON path")
    args = parser.parse_args()

    data = extract_formulas_from_xlsx(args.file)
    output_json = json.dumps(data, ensure_ascii=False, indent=2)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"Extracted {len(data['formulas'])} formulas to {args.out}")
    else:
        print(output_json)


if __name__ == "__main__":
    main()
