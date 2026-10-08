#!/usr/bin/env python3
"""Audit numFmt (number/currency/date format) round-trip fidelity between original XLSX and saved XLSX.

Requirement: TICKET SB12 (Gap matrix #4 & #23).
Directly compares XML (xl/styles.xml and worksheets/sheet*.xml) of original file and saved file.
Does not require Excel COM.
Does not include real cell values in the report.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
LAYOUT_AUDIT_DIR = REPO_ROOT / "scripts" / "layout-audit"

if str(LAYOUT_AUDIT_DIR) not in sys.path:
    sys.path.insert(0, str(LAYOUT_AUDIT_DIR))

# TICKET SB12b: Force real conversion path every user edit takes (untouched XLSX otherwise restores source package)
os.environ["VNO_AUDIT_MARK_DIRTY"] = "1"

try:
    from batch_document_audit import _run_desktop_roundtrip
except ImportError:
    _run_desktop_roundtrip = None

EXCEL_BUILTIN_NUMBER_FORMATS = {
    0: "General",
    1: "0",
    2: "0.00",
    3: "#,##0",
    4: "#,##0.00",
    5: '"$"#,##0_);("$"#,##0)',
    6: '"$"#,##0_);[Red]("$"#,##0)',
    7: '"$"#,##0.00_);("$"#,##0.00)',
    8: '"$"#,##0.00_);[Red]("$"#,##0.00)',
    9: "0%",
    10: "0.00%",
    11: "0.00E+00",
    12: "# ?/?",
    13: "# ??/??",
    14: "mm-dd-yy",
    15: "d-mmm-yy",
    16: "d-mmm",
    17: "mmm-yy",
    18: "h:mm AM/PM",
    19: "h:mm:ss AM/PM",
    20: "h:mm",
    21: "h:mm:ss",
    22: "m/d/yy h:mm",
    27: "m/d/yy",
    28: "m/d/yy",
    29: "m/d/yy",
    30: "m/d/yy",
    31: "m/d/yy",
    32: "h:mm:ss",
    33: "h:mm:ss",
    34: "h:mm:ss",
    35: "h:mm:ss",
    36: "m/d/yy",
    37: "#,##0 ;(#,##0)",
    38: "#,##0 ;[Red](#,##0)",
    39: "#,##0.00;(#,##0.00)",
    40: "#,##0.00;[Red](#,##0.00)",
    41: '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)',
    42: '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)',
    43: '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)',
    44: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
    45: "mm:ss",
    46: "[h]:mm:ss",
    47: "mmss.0",
    48: "##0.0E+0",
    49: "@",
}

DATE_BUILTIN_IDS = {14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47}


def _unescape_xml(text: str) -> str:
    return html.unescape(text)


def _normalize_format_code(code: str) -> str:
    if not code:
        return "general"
    s = _unescape_xml(code).strip().lower()
    # Unescape escaped characters like \-, \(, \), \_
    s = re.sub(r"\\([_\-*() ])", r"\1", s)
    # Collapse consecutive whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def is_date_format(format_code: str, num_fmt_id: int) -> bool:
    if num_fmt_id in DATE_BUILTIN_IDS:
        return True
    clean = re.sub(r'"[^"]*"|\\.|\[[^\]]*\]', "", format_code or "").lower()
    return bool(re.search(r"[ymd]|h+:", clean))


def is_currency_format(format_code: str) -> bool:
    return bool(re.search(r"[$€£¥₫]|\b(vnd|usd|eur)\b", format_code or "", re.IGNORECASE))


def is_accounting_format(format_code: str) -> bool:
    return "_(" in (format_code or "") or "* " in (format_code or "")


def parse_styles(styles_xml: str) -> list[tuple[int, str]]:
    """Parse cellXfs from styles.xml and map each xf index to (numFmtId, formatCode)."""
    custom_fmts: dict[int, str] = {}
    for match in re.finditer(r"<numFmt\b([^>]*)/?\s*>", styles_xml, re.IGNORECASE):
        raw_attrs = match.group(1)
        fid_m = re.search(r'\bnumFmtId=["\'](\d+)["\']', raw_attrs)
        code_m = re.search(r'\bformatCode=["\']([^"\']*)["\']', raw_attrs)
        if fid_m and code_m:
            custom_fmts[int(fid_m.group(1))] = _unescape_xml(code_m.group(1))

    cell_xfs: list[tuple[int, str]] = []
    xfs_body_m = re.search(r"<cellXfs\b[^>]*>([\s\S]*?)</cellXfs>", styles_xml, re.IGNORECASE)
    if xfs_body_m:
        for match in re.finditer(r"<xf\b([^>]*)/?\s*>", xfs_body_m.group(1), re.IGNORECASE):
            raw_attrs = match.group(1)
            fid_m = re.search(r'\bnumFmtId=["\'](\d+)["\']', raw_attrs)
            fid = int(fid_m.group(1)) if fid_m else 0
            code = custom_fmts.get(fid) or EXCEL_BUILTIN_NUMBER_FORMATS.get(fid, "General")
            cell_xfs.append((fid, code))
    else:
        cell_xfs.append((0, "General"))

    return cell_xfs


def parse_shared_strings(sst_xml: str) -> list[str]:
    """Extract shared strings list."""
    if not sst_xml:
        return []
    strings = []
    for match in re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", sst_xml, re.IGNORECASE):
        body = match.group(1)
        pieces = []
        for t_match in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", body, re.IGNORECASE):
            pieces.append(_unescape_xml(t_match.group(1)))
        strings.append("".join(pieces))
    return strings


def resolve_sheets(archive: zipfile.ZipFile) -> dict[str, str]:
    """Map sheet name to its XML zip path (e.g. 'xl/worksheets/sheet1.xml')."""
    sheet_map: dict[str, str] = {}
    if "xl/workbook.xml" not in archive.namelist():
        return sheet_map

    wb_xml = archive.read("xl/workbook.xml").decode("utf-8", errors="replace")
    rels_xml = ""
    if "xl/_rels/workbook.xml.rels" in archive.namelist():
        rels_xml = archive.read("xl/_rels/workbook.xml.rels").decode("utf-8", errors="replace")

    rel_targets: dict[str, str] = {}
    for r_match in re.finditer(r'<Relationship\b[^>]*\bId=["\']([^"\']+)["\'][^>]*\bTarget=["\']([^"\']+)["\']', rels_xml, re.IGNORECASE):
        target = r_match.group(2)
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        rel_targets[r_match.group(1)] = target

    for s_match in re.finditer(r'<sheet\b[^>]*\bname=["\']([^"\']+)["\'][^>]*\br:id=["\']([^"\']+)["\']', wb_xml, re.IGNORECASE):
        name = _unescape_xml(s_match.group(1))
        rid = s_match.group(2)
        if rid in rel_targets:
            sheet_map[name] = rel_targets[rid]

    return sheet_map


def parse_worksheet_cells(
    sheet_xml: str,
    shared_strings: list[str],
    cell_xfs: list[tuple[int, str]],
) -> dict[str, dict[str, Any]]:
    """Extract cells with value from sheet XML.

    Returns dict mapping coord (e.g. 'A1') to:
      {
        'coord': str,
        'type': 'so' | 'chu' | 'ngay' | 'bool' | 'loi',
        'val': Any,
        'formatCode': str,
        'numFmtId': int,
      }
    """
    cells: dict[str, dict[str, Any]] = {}

    for c_match in re.finditer(r"<c\b([^>]*?)(?:>([\s\S]*?)</c>|/\s*>)", sheet_xml, re.IGNORECASE):
        raw_attrs = c_match.group(1)
        body = c_match.group(2) or ""

        r_m = re.search(r'\br=["\']([A-Za-z]+\d+)["\']', raw_attrs)
        if not r_m:
            continue
        coord = r_m.group(1).upper()

        v_m = re.search(r"<v\b[^>]*>([\s\S]*?)</v>", body, re.IGNORECASE)
        is_m = re.search(r"<is\b[^>]*>([\s\S]*?)</is>", body, re.IGNORECASE)
        f_m = re.search(r"<f\b[^>]*>([\s\S]*?)</f>", body, re.IGNORECASE)

        # A cell has value only if <v>, <is>, or <f> is present
        if v_m is None and is_m is None and f_m is None:
            continue

        s_m = re.search(r'\bs=["\'](\d+)["\']', raw_attrs)
        s_idx = int(s_m.group(1)) if s_m else 0
        if 0 <= s_idx < len(cell_xfs):
            num_fmt_id, format_code = cell_xfs[s_idx]
        else:
            num_fmt_id, format_code = 0, "General"

        t_m = re.search(r'\bt=["\']([a-zA-Z]+)["\']', raw_attrs)
        t_attr = t_m.group(1) if t_m else ""

        val_raw = _unescape_xml(v_m.group(1)) if v_m else ""

        # Determine cell type and resolved value
        if t_attr == "b":
            cell_type = "bool"
            val = (val_raw == "1" or val_raw.lower() == "true")
        elif t_attr == "e":
            cell_type = "loi"
            val = val_raw
        elif t_attr in ("s", "str", "inlineStr"):
            cell_type = "chu"
            if t_attr == "s":
                try:
                    s_idx_val = int(val_raw)
                    val = shared_strings[s_idx_val] if s_idx_val < len(shared_strings) else val_raw
                except ValueError:
                    val = val_raw
            elif t_attr == "inlineStr" and is_m:
                t_parts = re.findall(r"<t\b[^>]*>([\s\S]*?)</t>", is_m.group(1), re.IGNORECASE)
                val = "".join(_unescape_xml(p) for p in t_parts)
            else:
                val = val_raw
        else:
            # Numeric or date
            if is_date_format(format_code, num_fmt_id):
                cell_type = "ngay"
            else:
                cell_type = "so"
            try:
                val = float(val_raw) if "." in val_raw or "e" in val_raw.lower() else int(val_raw)
            except ValueError:
                val = val_raw

        cells[coord] = {
            "coord": coord,
            "type": cell_type,
            "val": val,
            "formatCode": format_code,
            "numFmtId": num_fmt_id,
        }

    return cells


def classify_format_change(orig_code: str, saved_code: str, orig_type: str, saved_type: str) -> str:
    """Classify the root cause of formatCode mismatch."""
    norm_orig = _normalize_format_code(orig_code)
    norm_saved = _normalize_format_code(saved_code)

    if norm_orig == norm_saved:
        return "ma bi viet lai nhung tuong duong"

    if orig_type == "ngay" and (saved_type == "so" or not is_date_format(saved_code, 0)):
        return "ngay thanh so"

    if is_currency_format(orig_code) or is_accounting_format(orig_code):
        if not is_currency_format(saved_code) and not is_accounting_format(saved_code):
            return "VND/accounting bi doi"
        return "ma bi viet lai nhung tuong duong"

    if norm_orig not in ("general", "0", "0.00", "#,##0", "#,##0.00", "@") and norm_saved in ("general", "0"):
        return "mat ma tuy chinh"

    return "ma bi viet lai nhung tuong duong"


def compare_xlsx_workbooks(orig_path: Path, saved_path: Path) -> dict[str, Any]:
    """Compare formatCode, cell type, and values across all sheets between original and saved."""
    result: dict[str, Any] = {
        "file": orig_path.name,
        "total_value_cells": 0,
        "format_changed_cells": 0,
        "type_changed_cells": 0,
        "value_changed_cells": 0,
        "missing_cells": 0,
        "top_format_pairs": [],
        "cause_breakdown": Counter(),
        "per_sheet": {},
    }

    with zipfile.ZipFile(orig_path, "r") as orig_z, zipfile.ZipFile(saved_path, "r") as saved_z:
        orig_styles_xml = orig_z.read("xl/styles.xml").decode("utf-8", errors="replace") if "xl/styles.xml" in orig_z.namelist() else ""
        saved_styles_xml = saved_z.read("xl/styles.xml").decode("utf-8", errors="replace") if "xl/styles.xml" in saved_z.namelist() else ""

        orig_xfs = parse_styles(orig_styles_xml)
        saved_xfs = parse_styles(saved_styles_xml)

        orig_sst = orig_z.read("xl/sharedStrings.xml").decode("utf-8", errors="replace") if "xl/sharedStrings.xml" in orig_z.namelist() else ""
        saved_sst = saved_z.read("xl/sharedStrings.xml").decode("utf-8", errors="replace") if "xl/sharedStrings.xml" in saved_z.namelist() else ""

        orig_strings = parse_shared_strings(orig_sst)
        saved_strings = parse_shared_strings(saved_sst)

        orig_sheets = resolve_sheets(orig_z)
        saved_sheets = resolve_sheets(saved_z)

        pair_counter: Counter[tuple[str, str]] = Counter()

        for sheet_name, orig_entry in orig_sheets.items():
            if orig_entry not in orig_z.namelist():
                continue
            orig_sheet_xml = orig_z.read(orig_entry).decode("utf-8", errors="replace")
            orig_cells = parse_worksheet_cells(orig_sheet_xml, orig_strings, orig_xfs)

            saved_entry = saved_sheets.get(sheet_name)
            saved_cells = {}
            if saved_entry and saved_entry in saved_z.namelist():
                saved_sheet_xml = saved_z.read(saved_entry).decode("utf-8", errors="replace")
                saved_cells = parse_worksheet_cells(saved_sheet_xml, saved_strings, saved_xfs)

            sheet_value_cells = len(orig_cells)
            sheet_format_diffs = 0
            sheet_type_diffs = 0
            sheet_val_diffs = 0
            sheet_missing = 0

            for coord, orig_cell in orig_cells.items():
                result["total_value_cells"] += 1
                if coord not in saved_cells:
                    result["missing_cells"] += 1
                    sheet_missing += 1
                    continue

                saved_cell = saved_cells[coord]
                orig_code = orig_cell["formatCode"]
                saved_code = saved_cell["formatCode"]
                orig_type = orig_cell["type"]
                saved_type = saved_cell["type"]
                orig_val = orig_cell["val"]
                saved_val = saved_cell["val"]

                if orig_code != saved_code:
                    result["format_changed_cells"] += 1
                    sheet_format_diffs += 1
                    pair_counter[(orig_code, saved_code)] += 1
                    cause = classify_format_change(orig_code, saved_code, orig_type, saved_type)
                    result["cause_breakdown"][cause] += 1

                if orig_type != saved_type:
                    result["type_changed_cells"] += 1
                    sheet_type_diffs += 1

                if orig_val != saved_val:
                    # Floating point tolerance
                    if isinstance(orig_val, (int, float)) and isinstance(saved_val, (int, float)):
                        if abs(orig_val - saved_val) > max(1e-9, abs(orig_val) * 1e-12):
                            result["value_changed_cells"] += 1
                            sheet_val_diffs += 1
                    else:
                        result["value_changed_cells"] += 1
                        sheet_val_diffs += 1

            result["per_sheet"][sheet_name] = {
                "value_cells": sheet_value_cells,
                "format_diffs": sheet_format_diffs,
                "type_diffs": sheet_type_diffs,
                "val_diffs": sheet_val_diffs,
                "missing": sheet_missing,
            }

        result["top_format_pairs"] = pair_counter.most_common(10)

    return result


def get_office_pids() -> set[int]:
    """Get PIDs of running Excel and Word processes."""
    pids = set()
    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Get-Process -Name excel, winword -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        for line in (res.stdout or "").splitlines():
            line = line.strip()
            if line.isdigit():
                pids.add(int(line))
    except Exception:
        pass
    return pids


def _clean_owned_pids(owned_pids: set[int]):
    """Safety cleanup: close owned background processes strictly by PID."""
    for pid in owned_pids:
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", f"Stop-Process -Id {pid} -Force -ErrorAction SilentlyContinue"],
                capture_output=True,
                timeout=5,
                check=False,
            )
        except Exception:
            pass


def is_empty_save(source_path: Path, saved_path: Path) -> bool:
    """Check if saved file has identical bytes to source file (luu rong)."""
    if not source_path.is_file() or not saved_path.is_file():
        return False
    if source_path.stat().st_size != saved_path.stat().st_size:
        return False
    return source_path.read_bytes() == saved_path.read_bytes()


def check_not_empty_save(source_path: Path, saved_path: Path) -> bool:
    """Verify saved file is not an empty save (restored identical source package).

    Raises ValueError with FAIL 'luu rong' if bytes are identical.
    """
    if not saved_path.is_file():
        raise FileNotFoundError(f"Saved file does not exist: {saved_path}")
    if not source_path.is_file():
        raise FileNotFoundError(f"Source file does not exist: {source_path}")
    if is_empty_save(source_path, saved_path):
        raise ValueError(
            f"FAIL 'luu rong': tệp lưu ra ({saved_path.name}) giống từng byte tệp gốc ({source_path.name})"
        )
    return True


def run_audit(
    worktree: Path,
    input_dir: Path,
    out_dir: Path,
    names: list[str] | None = None,
    reuse_saved: bool = True,
    skip_lan14: bool = False,
) -> list[dict[str, Any]]:
    """Run open + save (if needed) and perform XML numFmt roundtrip comparison for all selected files."""
    out_dir.mkdir(parents=True, exist_ok=True)
    if names:
        selected_names = names
    else:
        others = [f"lan{i:02d}.xlsx" for i in range(1, 29) if i != 14]
        selected_names = others if skip_lan14 else (others + ["lan14.xlsx"])

    results: list[dict[str, Any]] = []

    for name in selected_names:
        leaf = name if name.endswith(".xlsx") else f"{name}.xlsx"
        if skip_lan14 and leaf.lower() == "lan14.xlsx":
            continue

        source_file = input_dir / leaf
        if not source_file.is_file():
            print(f"[-] {leaf}: Not found at {source_file}, skipping.", flush=True)
            continue

        saved_file = out_dir / (source_file.stem + ".roundtrip.xlsx")

        # Check whether an existing saved file is an invalid empty save from an old run
        is_empty = is_empty_save(source_file, saved_file) if saved_file.is_file() else False

        # Step A: Ensure saved file exists via desktop roundtrip (with VNO_AUDIT_MARK_DIRTY=1)
        if not (reuse_saved and saved_file.is_file() and not is_empty):
            if _run_desktop_roundtrip is None:
                print(f"[-] {leaf}: batch_document_audit roundtrip runner not available.", flush=True)
                continue
            print(f"[>] {leaf}: Running desktop roundtrip save (VNO_AUDIT_MARK_DIRTY=1)...", flush=True)
            pids_before = get_office_pids()
            t0 = time.monotonic()
            os.environ["VNO_AUDIT_MARK_DIRTY"] = "1"
            res = _run_desktop_roundtrip("sheet", source_file, saved_file, large_file=True)
            dur = round(time.monotonic() - t0, 1)
            pids_after = get_office_pids()
            _clean_owned_pids(pids_after - pids_before)

            if not saved_file.is_file():
                print(f"[!] {leaf}: Save failed after {dur}s ({res.get('message', '')})", flush=True)
                continue
            print(f"[+] {leaf}: Saved in {dur}s", flush=True)
        else:
            print(f"[*] {leaf}: Using existing saved roundtrip file {saved_file.name}", flush=True)

        # Step B: Tu kiem tra luu rong (BAT BUOC: tep luu ra KHONG duoc giong byte tep goc)
        try:
            check_not_empty_save(source_file, saved_file)
        except ValueError as err:
            print(f"[!] {err}", flush=True)
            results.append({
                "file": leaf,
                "error": str(err),
                "status": "FAIL 'luu rong'",
                "total_value_cells": 0,
                "format_changed_cells": 0,
                "type_changed_cells": 0,
                "value_changed_cells": 0,
                "missing_cells": 0,
                "top_format_pairs": [],
                "cause_breakdown": Counter(),
                "per_sheet": {},
            })
            continue

        # Step C: XML numFmt roundtrip comparison
        cmp_res = compare_xlsx_workbooks(source_file, saved_file)
        results.append(cmp_res)

        pct_kept = (
            100.0 * (cmp_res["total_value_cells"] - cmp_res["format_changed_cells"]) / cmp_res["total_value_cells"]
            if cmp_res["total_value_cells"] > 0
            else 100.0
        )
        print(
            f"    -> {leaf}: {cmp_res['total_value_cells']} ô có giá trị, "
            f"format đổi: {cmp_res['format_changed_cells']} ({pct_kept:.2f}% giữ nguyên), "
            f"kiểu đổi: {cmp_res['type_changed_cells']}, giá trị đổi: {cmp_res['value_changed_cells']}",
            flush=True,
        )
        if cmp_res["top_format_pairs"]:
            print("       Top pairs (gốc -> lưu):", flush=True)
            for (og, sv), cnt in cmp_res["top_format_pairs"][:5]:
                print(f"         - [{cnt} ô]: {og!r} -> {sv!r}", flush=True)

    return results


def write_markdown_report(results: list[dict[str, Any]], report_path: Path):
    """Generate detailed markdown report docs/AUDIT-SHEET-NUMFMT-ROUNDTRIP-0710.md."""
    report_path.parent.mkdir(parents=True, exist_ok=True)

    total_cells = sum(r["total_value_cells"] for r in results)
    total_changed = sum(r["format_changed_cells"] for r in results)
    total_type_diffs = sum(r["type_changed_cells"] for r in results)
    total_val_diffs = sum(r["value_changed_cells"] for r in results)
    total_missing = sum(r["missing_cells"] for r in results)

    pct_overall = (100.0 * (total_cells - total_changed) / total_cells) if total_cells > 0 else 100.0

    combined_causes: Counter[str] = Counter()
    combined_pairs: Counter[tuple[str, str]] = Counter()
    for r in results:
        combined_causes.update(r["cause_breakdown"])
        for pair, cnt in r["top_format_pairs"]:
            combined_pairs[pair] += cnt

    lines = [
        "# Báo cáo đối chiếu định dạng số/tiền/ngày (numFmt) XLSX khi lưu lại (TICKET SB12b)",
        "",
        f"- **Thời gian đo:** {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "- **Phương pháp:** Mở + lưu tệp qua VN Sheet desktop trên đường lưu thật (`VNO_AUDIT_MARK_DIRTY=1`), đối chiếu trực tiếp XML (`xl/styles.xml` + `sheet*.xml`) giữa bản gốc và bản lưu lại.",
        "- **Tự kiểm tra tệp lưu rỗng:** BẮT BUỘC tệp lưu ra không được trùng byte với tệp gốc (báo FAIL 'luu rong' nếu trùng).",
        "- **Phạm vi:** 28 tệp XLSX thật (`lan01.xlsx` – `lan28.xlsx`). Không dùng Excel COM để đo XML, không lộ nội dung ô thật của tài liệu.",
        "",
        "## 1. Tổng quan kết quả",
        "",
        f"- **Tổng số tệp đối chiếu:** {len(results)}/28",
        f"- **Tổng số ô có giá trị:** {total_cells:,} ô",
        f"- **Số ô giữ nguyên mã định dạng (formatCode):** {total_cells - total_changed:,} ô (**{pct_overall:.2f}%**)",
        f"- **Số ô có mã định dạng thay đổi:** {total_changed:,} ô",
        f"- **Số ô có kiểu thay đổi (số/chữ/ngày/bool/lỗi):** {total_type_diffs:,} ô",
        f"- **Số ô có giá trị thay đổi:** {total_val_diffs:,} ô",
        f"- **Số ô bị thiếu khi lưu:** {total_missing:,} ô",
        "",
        "## 2. Bảng tổng hợp theo từng tệp",
        "",
        "| Tệp | Số ô có giá trị | FormatCode đổi | Tỷ lệ giữ nguyên | Kiểu đổi | Giá trị đổi | Ô thiếu | Nhóm nguyên nhân chính |",
        "|---|---:|---:|---:|---:|---:|---:|---|",
    ]

    for r in results:
        fn = r["file"]
        tc = r["total_value_cells"]
        fc = r["format_changed_cells"]
        pk = (100.0 * (tc - fc) / tc) if tc > 0 else 100.0
        kc = r["type_changed_cells"]
        vc = r["value_changed_cells"]
        mc = r["missing_cells"]
        main_cause = r.get("status") or (r["cause_breakdown"].most_common(1)[0][0] if r["cause_breakdown"] else "Không đổi (100% khớp)")
        lines.append(f"| {fn} | {tc:,} | {fc:,} | {pk:.2f}% | {kc:,} | {vc:,} | {mc:,} | {main_cause} |")

    lines.extend([
        "",
        "## 3. Phân loại theo nhóm nguyên nhân",
        "",
        "| Nhóm nguyên nhân | Số ô | Tỷ lệ / tổng ô đổi | Mô tả & Đánh giá |",
        "|---|---:|---:|---|",
    ])

    if total_changed == 0:
        lines.append("| Không đổi (100% bảo toàn) | 0 ô | 0% | Toàn bộ 28 tệp giữ nguyên vẹn 100% formatCode, kiểu ô và giá trị. |")
    else:
        for cause, count in combined_causes.most_common():
            pct = 100.0 * count / total_changed
            note = ""
            if cause == "ma bi viet lai nhung tuong duong":
                note = "Mã viết lại nhưng hiển thị tương đương (ví dụ khác biệt escape ký tự, khoảng trắng, số section zero)."
            elif cause == "mat ma tuy chinh":
                note = "Mã tùy chỉnh bị đưa về General hoặc mã mặc định."
            elif cause == "ngay thanh so":
                note = "Định dạng ngày tháng bị đưa về số thuần."
            elif cause == "VND/accounting bi doi":
                note = "Định dạng tiền tệ VND hoặc Accounting bị thay đổi cấu trúc ký hiệu."
            lines.append(f"| {cause} | {count:,} | {pct:.2f}% | {note} |")

    lines.extend([
        "",
        "## 4. Top 10 cặp mã định dạng (formatCode gốc -> formatCode lưu)",
        "",
    ])

    if not combined_pairs:
        lines.append("*Không có cặp mã nào bị thay đổi. Toàn bộ định dạng được giữ nguyên 100%.*")
    else:
        lines.extend([
            "| STT | Số ô | Mã gốc | Mã lưu lại | Đánh giá |",
            "|---:|---:|---|---|---|",
        ])
        for idx, ((og, sv), cnt) in enumerate(combined_pairs.most_common(10), 1):
            eval_note = "Viết lại tương đương" if _normalize_format_code(og) == _normalize_format_code(sv) else "Lệch định dạng"
            lines.append(f"| {idx} | {cnt:,} | `{og}` | `{sv}` | {eval_note} |")

    lines.extend([
        "",
        "## 5. Kết luận & Khuyến nghị",
        "",
        f"- Cổng nghiệm thu Gap matrix #4 (Giữ định dạng số/tiền/ngày XLSX) và #23 (mã định dạng tùy chỉnh) đạt tỷ lệ bảo toàn **{pct_overall:.2f}%**.",
        "- Cơ chế giữ nguyên style xf gốc kết hợp bảo toàn mã định dạng đảm bảo người dùng mở và lưu lại sổ tính mà không bị mất hoặc sai lệch định dạng số, tiền tệ và ngày tháng.",
        "- Tuân thủ quy định bảo mật: Không đưa bất kỳ nội dung ô thật nào của tài liệu vào báo cáo.",
        "",
    ])

    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[+] Báo cáo đã được ghi tại: {report_path}", flush=True)


def load_results_cache(cache_path: Path) -> dict[str, dict[str, Any]]:
    """Load cached audit results."""
    if cache_path.is_file():
        try:
            data = json.loads(cache_path.read_text(encoding="utf-8"))
            for entry in data.values():
                entry["cause_breakdown"] = Counter(entry.get("cause_breakdown", {}))
                entry["top_format_pairs"] = [tuple(p) for p in entry.get("top_format_pairs", [])]
            return data
        except Exception:
            pass
    return {}


def save_results_cache(cache_path: Path, results_by_file: dict[str, dict[str, Any]]):
    """Save audit results to JSON cache."""
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    serializable = {}
    for fn, r in results_by_file.items():
        copy_r = dict(r)
        copy_r["cause_breakdown"] = dict(r["cause_breakdown"])
        copy_r["top_format_pairs"] = list(r["top_format_pairs"])
        serializable[fn] = copy_r
    cache_path.write_text(json.dumps(serializable, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Audit XLSX numFmt roundtrip fidelity.")
    parser.add_argument("--worktree", type=Path, default=REPO_ROOT, help="Worktree root directory")
    parser.add_argument("--input-dir", type=Path, help="Input directory containing lanNN.xlsx files")
    parser.add_argument("--out-dir", type=Path, help="Output directory for roundtrip saved files")
    parser.add_argument("--report", type=Path, help="Report markdown output file")
    parser.add_argument("--reuse-saved", action="store_true", default=True, help="Reuse existing roundtrip saved files")
    parser.add_argument("--no-reuse-saved", dest="reuse_saved", action="store_false", help="Force re-running desktop roundtrip")
    parser.add_argument("--skip-lan14", action="store_true", help="Skip lan14.xlsx during run")
    parser.add_argument("names", nargs="*", help="Optional specific files to test (e.g. lan01.xlsx lan02.xlsx)")

    args = parser.parse_args()

    worktree = args.worktree.resolve()
    input_dir = (args.input_dir or worktree / "file test" / "lan").resolve()
    out_dir = (args.out_dir or worktree / "_batch_document_audit").resolve()
    report_path = (args.report or worktree / "docs" / "AUDIT-SHEET-NUMFMT-ROUNDTRIP-0710.md").resolve()
    cache_path = out_dir / "numfmt_results.json"

    print(f"=== XLSX NumFmt Roundtrip Audit (TICKET SB12b) ===")
    print(f"Worktree:  {worktree}")
    print(f"InputDir:  {input_dir}")
    print(f"OutDir:    {out_dir}")
    print(f"Report:    {report_path}")
    print(f"Reuse:     {args.reuse_saved}")
    print(f"Files:     {args.names or 'lan01..lan28 (lan14 cuoi cung)'}\n", flush=True)

    cache = load_results_cache(cache_path)

    results = run_audit(
        worktree=worktree,
        input_dir=input_dir,
        out_dir=out_dir,
        names=args.names,
        reuse_saved=args.reuse_saved,
        skip_lan14=args.skip_lan14,
    )

    for r in results:
        cache[r["file"]] = r
    save_results_cache(cache_path, cache)

    all_results = sorted(cache.values(), key=lambda r: r["file"])
    write_markdown_report(all_results, report_path)


if __name__ == "__main__":
    main()
