#!/usr/bin/env python3
"""Đo "mở → cuộn → sửa → lưu" của ooxml-engine trên tệp XLSX thật (Windows/macOS/Linux, chỉ thư viện chuẩn).

Mỗi kịch bản chạy trong một tiến trình engine MỚI (đo RAM đỉnh sạch), lặp N lần, báo trung vị và min–max.
Kịch bản:
  open      : open {lazy:true}                         (mở gói)
  screen    : open + sheet.readRows 60 hàng đầu        (màn hình đầu)
  scroll    : ... + readRows 60 hàng giữa tệp          (cuộn)
  save_val  : xlsx.save, delta ghi 1 ô giá trị         (sửa 1 ô rồi lưu)
  save_clr  : xlsx.save, delta ghi 1 ô + xóa 1 ô       (đường vá xóa ô)
Mỗi lần lưu còn kiểm: zipfile.testzip() không lỗi và `path` (patch|dom) được ghi lại.

Ví dụ:
  python scripts/ooxml_perf_check.py --engine path/to/ooxml-engine[.exe] --repeats 3 file1.xlsx dir_of_xlsx/
  python scripts/ooxml_perf_check.py --engine ... --json out.json "E:\\VN OFice\\file test\\lan"
Tệp nguồn KHÔNG bị sửa: lưu ra thư mục tạm. Không gửi dữ liệu ra ngoài; không mạng.
"""
import argparse, json, os, shutil, statistics, subprocess, sys, tempfile, time, zipfile
from pathlib import Path


def peak_rss_mb(proc):
    """RAM đỉnh (MB) của tiến trình con còn sống; None nếu không đọc được."""
    try:
        if sys.platform.startswith("linux"):
            for line in open(f"/proc/{proc.pid}/status"):
                if line.startswith("VmHWM:"):
                    return int(line.split()[1]) / 1024
        elif sys.platform == "win32":
            import ctypes
            from ctypes import wintypes

            class PMC(ctypes.Structure):
                _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                            ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                            ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                            ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                            ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t)]
            h = ctypes.windll.kernel32.OpenProcess(0x1000 | 0x0400, False, proc.pid)
            if h:
                pmc = PMC(); pmc.cb = ctypes.sizeof(PMC)
                ok = ctypes.windll.psapi.GetProcessMemoryInfo(h, ctypes.byref(pmc), pmc.cb)
                ctypes.windll.kernel32.CloseHandle(h)
                if ok:
                    return pmc.PeakWorkingSetSize / 1048576
        else:  # macOS: RSS hiện tại (không có đỉnh) — ghi nhận là xấp xỉ
            out = subprocess.run(["ps", "-o", "rss=", "-p", str(proc.pid)], capture_output=True, text=True).stdout.strip()
            return int(out) / 1024 if out else None
    except Exception:
        return None
    return None


class Engine:
    def __init__(self, exe):
        self.p = subprocess.Popen([exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", bufsize=1)
        self.n = 0

    def call(self, op, **args):
        self.n += 1
        self.p.stdin.write(json.dumps({"id": self.n, "op": op, "args": args}) + "\n")
        self.p.stdin.flush()
        t = time.perf_counter()
        line = self.p.stdout.readline()
        dt = (time.perf_counter() - t) * 1000
        if not line:
            raise RuntimeError("engine đóng kết nối")
        r = json.loads(line)
        if not r.get("ok"):
            raise RuntimeError(f"{op}: {r.get('error') or r}")
        return r["result"], dt

    def close(self):
        try:
            self.p.stdin.close(); self.p.wait(timeout=10)
        except Exception:
            self.p.kill()


def run_scenario(exe, src, scenario, tmp):
    e = Engine(exe)
    t0 = time.perf_counter()
    info = {}
    try:
        res, _ = e.call("open", path=str(src), lazy=True)
        h = res["handle"]
        sheets = [s for s in res["sheets"] if s.get("kind") == "worksheet"]
        sheet = sheets[0]["name"] if sheets else None
        if scenario in ("screen", "scroll"):
            r, _ = e.call("sheet.readRows", handle=h, sheetIndex=0, **{"from": 1, "count": 60})
            if scenario == "scroll":
                mid = max(1, r.get("lastRow", 1) // 2)
                e.call("sheet.readRows", handle=h, sheetIndex=0, **{"from": mid, "count": 60})
        if scenario in ("save_val", "save_clr"):
            e.call("close", handle=h)
            out = Path(tmp) / "out.xlsx"
            if out.exists():
                out.unlink()
            delta = {"cells": [{"sheet": sheet, "ref": "ZZ1", "value": "perf", "type": "string"}]}
            if scenario == "save_clr":
                delta["cleared_cells"] = [{"sheet": sheet, "range": "A2"}]
            r, _ = e.call("xlsx.save", source_document_path=str(src), target_path=str(out), delta=delta)
            info["path"] = r.get("path")
            info["ok"] = r.get("ok")
            info["testzip"] = zipfile.ZipFile(out).testzip() if out.exists() else "no-output"
        wall = (time.perf_counter() - t0) * 1000
        info["ms"] = wall
        info["rss_mb"] = peak_rss_mb(e.p)
        return info
    finally:
        e.close()


def collect(paths):
    out = []
    for raw in paths:
        p = Path(raw)
        out += sorted(p.rglob("*.xlsx")) if p.is_dir() else [p]
    return [f for f in out if f.suffix.lower() == ".xlsx" and not f.name.startswith("~$")]


def fmt(vals):
    vals = [v for v in vals if v is not None]
    return "—" if not vals else f"{statistics.median(vals):.0f} ({min(vals):.0f}–{max(vals):.0f})"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", required=True)
    ap.add_argument("--repeats", type=int, default=3)
    ap.add_argument("--json")
    ap.add_argument("paths", nargs="+")
    a = ap.parse_args()
    scenarios = ["open", "screen", "scroll", "save_val", "save_clr"]
    rows, bad = [], []
    tmp = tempfile.mkdtemp(prefix="ooxml-perf-")
    try:
        for f in collect(a.paths):
            size = f.stat().st_size / 1048576
            res = {"file": f.name, "size_mb": round(size, 2)}
            for sc in scenarios:
                runs = []
                for _ in range(a.repeats):
                    try:
                        runs.append(run_scenario(a.engine, f, sc, tmp))
                    except Exception as ex:
                        bad.append(f"{f.name}/{sc}: {ex}"); break
                res[sc] = {"ms": [r["ms"] for r in runs], "rss_mb": [r["rss_mb"] for r in runs],
                           "paths": sorted({str(r.get("path")) for r in runs if "path" in r}),
                           "testzip": sorted({str(r.get("testzip")) for r in runs if "testzip" in r})}
            rows.append(res)
            print(f"| {res['file']} | {res['size_mb']} | " + " | ".join(
                fmt(res[s]["ms"]) for s in scenarios) + f" | {fmt(res['save_val']['rss_mb'])} | "
                f"{'/'.join(res['save_val']['paths'])}, {'/'.join(res['save_clr']['paths'])} |", flush=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if a.json:
        Path(a.json).write_text(json.dumps({"engine": a.engine, "platform": sys.platform, "rows": rows, "errors": bad}, indent=1), encoding="utf-8")
    if bad:
        print("\nLỖI:\n" + "\n".join(bad), file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    print("| Tệp | MB | open ms | màn đầu ms | cuộn ms | lưu 1 ô ms | lưu ghi+xóa ms | RAM đỉnh lưu MB | path (ghi, xóa) |")
    print("|---|---|---|---|---|---|---|---|---|")
    sys.exit(main())
