#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bench_ooxml_engine.py — Benchmark OOXMLKit engine performance and parity.

Measures:
  (a) Open time (ms) across >= 3 runs (median, min, max)
  (b) Save delta time (ms) across >= 3 runs (median, min, max)
  (c) Peak working set (MB) of ooxml-engine process
  (d) Fidelity & byte preservation on untouched package parts
"""

import ctypes
import ctypes.wintypes
import json
import os
import subprocess
import time
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

# Process memory counters structure for Windows API
class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.wintypes.DWORD),
        ("PageFaultCount", ctypes.wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
    ]

psapi = ctypes.WinDLL("psapi")
GetProcessMemoryInfo = psapi.GetProcessMemoryInfo
GetProcessMemoryInfo.argtypes = [ctypes.wintypes.HANDLE, ctypes.POINTER(PROCESS_MEMORY_COUNTERS), ctypes.wintypes.DWORD]
GetProcessMemoryInfo.restype = ctypes.wintypes.BOOL

OpenProcess = ctypes.windll.kernel32.OpenProcess
OpenProcess.argtypes = [ctypes.wintypes.DWORD, ctypes.wintypes.BOOL, ctypes.wintypes.DWORD]
OpenProcess.restype = ctypes.wintypes.HANDLE
CloseHandle = ctypes.windll.kernel32.CloseHandle
CloseHandle.argtypes = [ctypes.wintypes.HANDLE]
CloseHandle.restype = ctypes.wintypes.BOOL

PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010

ENGINE_PATH = r"E:\VNOffice-codex-w1b\ports\ios\OOXMLKit\.build\out\Products\Release-windows-x86_64\ooxml-engine.exe"
SWIFT_PATH = r"D:\swift\Runtimes\6.4.1\usr\bin"
TEMP_DIR = r"E:\VNOffice-agy-BENCH\tools\parity\out"

def get_first_sheet_name(xlsx_path: str) -> str:
    try:
        with zipfile.ZipFile(xlsx_path) as z:
            tree = ET.fromstring(z.read("xl/workbook.xml"))
            for elem in tree.iter():
                if elem.tag.endswith("sheet") and "name" in elem.attrib:
                    return elem.attrib["name"]
    except Exception:
        pass
    return "Sheet1"

def run_one_engine_benchmark(kind: str, file_path: str, target_path: str, env: dict) -> dict:
    p = subprocess.Popen(
        [ENGINE_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        text=True,
        encoding="utf-8"
    )
    h_proc = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, p.pid)
    counters = PROCESS_MEMORY_COUNTERS()
    counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)

    open_ms = None
    save_ms = None
    peak_ws_open_mb = None
    peak_ws_save_mb = None
    save_res = {}
    verified = False
    diff_parts = []
    same_bytes_count = 0
    total_parts_count = 0

    try:
        # 1. Open
        req_open = {"id": 1, "op": "open", "args": {"path": file_path}}
        t0 = time.perf_counter()
        p.stdin.write(json.dumps(req_open) + "\n")
        p.stdin.flush()
        line_open = p.stdout.readline()
        t1 = time.perf_counter()
        open_ms = round((t1 - t0) * 1000, 2)
        res_open = json.loads(line_open)
        if not res_open.get("ok"):
            raise RuntimeError(f"Open failed: {res_open}")

        GetProcessMemoryInfo(h_proc, ctypes.byref(counters), counters.cb)
        peak_ws_open_mb = round(counters.PeakWorkingSetSize / (1024 * 1024), 2)

        # 2. Save Delta
        if os.path.exists(target_path):
            os.remove(target_path)

        if kind == "xlsx":
            sheet_name = get_first_sheet_name(file_path)
            delta = {"cells": [{"sheet": sheet_name, "ref": "A1", "type": "string", "value": "BENCH_EDIT"}]}
            req_save = {
                "id": 2,
                "op": "xlsx.save",
                "args": {
                    "source_document_path": file_path,
                    "target_path": target_path,
                    "delta": delta
                }
            }
        elif kind == "docx":
            delta = {"paragraphs": [{"op": "setText", "index": 0, "text": "BENCH_EDIT"}]}
            req_save = {
                "id": 2,
                "op": "docx.save",
                "args": {
                    "source_document_path": file_path,
                    "target_path": target_path,
                    "delta": delta
                }
            }
        elif kind == "pptx":
            delta = {"slides": [{"op": "slide.setTitle", "slide": 0, "text": "BENCH_EDIT"}]}
            req_save = {
                "id": 2,
                "op": "pptx.save",
                "args": {
                    "source_document_path": file_path,
                    "target_path": target_path,
                    "delta": delta
                }
            }
        else:
            raise ValueError(f"Unknown kind {kind}")

        t2 = time.perf_counter()
        p.stdin.write(json.dumps(req_save) + "\n")
        p.stdin.flush()
        line_save = p.stdout.readline()
        t3 = time.perf_counter()
        save_ms = round((t3 - t2) * 1000, 2)
        save_res = json.loads(line_save)
        if not save_res.get("ok") or not save_res.get("result", {}).get("ok"):
            raise RuntimeError(f"Save failed: {save_res}")

        GetProcessMemoryInfo(h_proc, ctypes.byref(counters), counters.cb)
        peak_ws_save_mb = round(counters.PeakWorkingSetSize / (1024 * 1024), 2)

        # 3. Verify correctness and byte preservation
        changed_parts = save_res["result"].get("changedParts", [])
        with zipfile.ZipFile(file_path) as z_orig, zipfile.ZipFile(target_path) as z_saved:
            orig_names = set(z_orig.namelist())
            saved_names = set(z_saved.namelist())
            total_parts_count = len(orig_names)
            for name in orig_names:
                if name not in saved_names:
                    diff_parts.append(name)
                    continue
                b_orig = z_orig.read(name)
                b_saved = z_saved.read(name)
                if b_orig == b_saved:
                    same_bytes_count += 1
                else:
                    diff_parts.append(name)
            for name in saved_names:
                if name not in orig_names and name not in diff_parts:
                    diff_parts.append(name)

            # Check edit present in changed parts
            found_edit = False
            for cp in changed_parts:
                if cp in saved_names:
                    part_str = z_saved.read(cp).decode("utf-8", errors="ignore")
                    if "BENCH_EDIT" in part_str:
                        found_edit = True
            verified = found_edit

    finally:
        p.stdin.close()
        p.wait()
        CloseHandle(h_proc)
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception:
                pass

    return {
        "open_ms": open_ms,
        "save_ms": save_ms,
        "peak_ws_open_mb": peak_ws_open_mb,
        "peak_ws_save_mb": peak_ws_save_mb,
        "changed_parts": save_res.get("result", {}).get("changedParts", []),
        "diff_parts": diff_parts,
        "same_bytes_count": same_bytes_count,
        "total_parts_count": total_parts_count,
        "verified": verified,
    }

def main():
    env = dict(os.environ)
    env["PATH"] = SWIFT_PATH + ";" + env.get("PATH", "")
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Corpus
    corpus = []
    # 27 XLSX
    xlsx_dir = r"E:\VN OFice\file test\lan"
    for i in range(1, 29):
        if i == 14: continue
        f = f"lan{i:02d}.xlsx"
        corpus.append({"name": f, "kind": "xlsx", "path": os.path.join(xlsx_dir, f)})

    # 8 DOCX
    docx_dir = r"E:\VN OFice\file test\landocx"
    for num in [1, 2, 3, 6, 7, 13, 20, 24]:
        f = f"d{num:02d}.docx"
        corpus.append({"name": f, "kind": "docx", "path": os.path.join(docx_dir, f)})

    # 1 PPTX
    corpus.append({"name": "sample-3.pptx", "kind": "pptx", "path": r"E:\VN OFice\file test\sample-3.pptx"})

    results = []
    print(f"Starting OOXML Engine benchmark on {len(corpus)} files (3 iterations each)...")
    for item in corpus:
        name = item["name"]
        kind = item["kind"]
        path = item["path"]
        target = os.path.join(TEMP_DIR, f"bench_{name}")
        file_size = os.path.getsize(path)

        open_times = []
        save_times = []
        peak_ws_list = []
        last_details = None

        print(f"Benchmarking {name} ({kind}, {round(file_size/1024, 1)} KB)...", end=" ", flush=True)
        for it in range(3):
            detail = run_one_engine_benchmark(kind, path, target, env)
            open_times.append(detail["open_ms"])
            save_times.append(detail["save_ms"])
            peak_ws_list.append(detail["peak_ws_save_mb"])
            last_details = detail

        open_times.sort()
        save_times.sort()
        peak_ws_list.sort()

        summary = {
            "name": name,
            "kind": kind,
            "size_bytes": file_size,
            "open": {
                "median_ms": open_times[1],
                "min_ms": open_times[0],
                "max_ms": open_times[2],
                "all_ms": open_times
            },
            "save": {
                "median_ms": save_times[1],
                "min_ms": save_times[0],
                "max_ms": save_times[2],
                "all_ms": save_times
            },
            "peak_ws_mb": {
                "median": peak_ws_list[1],
                "min": peak_ws_list[0],
                "max": peak_ws_list[2],
            },
            "same_bytes_count": last_details["same_bytes_count"],
            "total_parts_count": last_details["total_parts_count"],
            "changed_parts": last_details["changed_parts"],
            "verified": last_details["verified"],
        }
        results.append(summary)
        print(f"Open: {open_times[1]}ms (min {open_times[0]}, max {open_times[2]}), Save: {save_times[1]}ms, WS: {peak_ws_list[1]}MB, Parity: {summary['same_bytes_count']}/{summary['total_parts_count']} parts byte-identical")

    out_file = r"E:\VNOffice-agy-BENCH\tools\parity\out\engine_bench_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nAll 36 benchmarks complete! Saved to {out_file}")

if __name__ == "__main__":
    main()
