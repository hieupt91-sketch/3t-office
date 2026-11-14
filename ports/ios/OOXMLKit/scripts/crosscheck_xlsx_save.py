#!/usr/bin/env python3
"""Kiểm chéo `xlsx.save` bằng bộ đọc ĐỘC LẬP (openpyxl + LibreOffice), không dùng chính thư viện để tự chấm.

Với mỗi tệp XLSX: sinh vài delta ngẫu nhiên có hạt giống (ghi giá trị/công thức/định dạng, xóa vùng) cho các sheet,
chạy `xlsx.save` qua `ooxml-engine`, rồi:
  1. `zipfile.testzip()` không lỗi;
  2. openpyxl mở được tệp kết quả và các ô đã ghi có đúng giá trị/công thức (ô nằm trong vùng xóa phải trống);
  3. (tùy chọn --libreoffice) LibreOffice headless chuyển được sang CSV không lỗi.
Tệp nguồn không bị sửa. Không mạng.

  python3 scripts/crosscheck_xlsx_save.py --engine .build/release/ooxml-engine [--libreoffice] [--rounds 5] file.xlsx|dir ...
"""
import argparse, json, random, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path

import openpyxl


def run_save(engine, src, dst, delta):
    req = json.dumps({"id": 1, "op": "xlsx.save", "args": {"source_document_path": str(src), "target_path": str(dst), "delta": delta}})
    out = subprocess.run([engine], input=req + "\n", capture_output=True, text=True, timeout=300)
    return json.loads(out.stdout.splitlines()[0])


def collect(paths):
    files = []
    for p in map(Path, paths):
        files += sorted(p.rglob("*.xlsx")) if p.is_dir() else [p]
    return [f for f in files if not f.name.startswith("~$")]


def make_delta(rng, wb):
    sheets = [ws for ws in wb.worksheets]
    cells, cleared, expect, wiped = [], [], {}, []
    for _ in range(rng.randint(1, 6)):
        ws = rng.choice(sheets)
        mr, mc = max(ws.max_row, 3), max(ws.max_column, 3)
        row, col = rng.randint(1, mr + 3), rng.randint(1, mc + 2)
        ref = f"{openpyxl.utils.get_column_letter(col)}{row}"
        kind = rng.choice(["num", "str", "bool", "formula"])
        if kind == "num":
            v = rng.randint(0, 9999) / 4; cells.append({"sheet": ws.title, "ref": ref, "value": v, "type": "number"}); expect[(ws.title, ref)] = ("v", v)
        elif kind == "str":
            v = f"chuỗi {rng.randint(0, 999)} <&> Việt Nam"; cells.append({"sheet": ws.title, "ref": ref, "value": v, "type": "string"}); expect[(ws.title, ref)] = ("v", v)
        elif kind == "bool":
            cells.append({"sheet": ws.title, "ref": ref, "value": True, "type": "bool"}); expect[(ws.title, ref)] = ("v", True)
        else:
            f = f"=SUM(A1:A{rng.randint(1, 5)})"; cells.append({"sheet": ws.title, "ref": ref, "formula": f, "cached": 3, "cachedType": "number"}); expect[(ws.title, ref)] = ("f", f)
    if rng.random() < 0.5:
        ws = rng.choice(sheets)
        r0, c0 = rng.randint(1, max(ws.max_row, 2)), rng.randint(1, max(ws.max_column, 2))
        rng_ref = f"{openpyxl.utils.get_column_letter(c0)}{r0}:{openpyxl.utils.get_column_letter(c0 + rng.randint(0, 2))}{r0 + rng.randint(0, 2)}"
        cleared.append({"sheet": ws.title, "range": rng_ref}); wiped.append((ws.title, rng_ref))
    return {"cells": cells, **({"cleared_cells": cleared} if cleared else {})}, expect, wiped


def in_range(ref, rng_ref):
    from openpyxl.utils.cell import range_boundaries, coordinate_from_string, column_index_from_string
    c0, r0, c1, r1 = range_boundaries(rng_ref)
    col, row = coordinate_from_string(ref)
    return c0 <= column_index_from_string(col) <= c1 and r0 <= row <= r1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", required=True); ap.add_argument("--rounds", type=int, default=5)
    ap.add_argument("--libreoffice", action="store_true"); ap.add_argument("--seed", type=int, default=20261114)
    ap.add_argument("paths", nargs="+")
    a = ap.parse_args()
    rng = random.Random(a.seed)
    tmp = Path(tempfile.mkdtemp(prefix="xlsx-crosscheck-"))
    bad, ok, skipped = [], 0, 0
    try:
        for f in collect(a.paths):
            # openpyxl không đọc được OOXML "Strict" (ô ra rỗng ngay cả ở tệp nguồn) nên không dùng làm bộ chấm cho loại này.
            if b"purl.oclc.org/ooxml" in zipfile.ZipFile(f).read("xl/workbook.xml"):
                skipped += 1; print(f"SKIP {f.name}: OOXML Strict (openpyxl không đọc được ô)"); continue
            try:
                src_wb = openpyxl.load_workbook(f)
            except Exception as ex:
                skipped += 1; print(f"SKIP {f.name}: openpyxl không mở được nguồn ({type(ex).__name__})"); continue
            for r in range(a.rounds):
                delta, expect, wiped = make_delta(rng, src_wb)
                out = tmp / f"{f.stem}-{r}.xlsx"
                resp = run_save(a.engine, f, out, delta)
                if not resp.get("ok"):
                    msg = (resp.get("error") or {}).get("message") or resp.get("result", {}).get("unsupported")
                    print(f"  engine từ chối {f.name} #{r}: {msg}"); continue
                label = f"{f.name} #{r} path={resp['result'].get('path')}"
                if zipfile.ZipFile(out).testzip() is not None:
                    bad.append(f"{label}: testzip lỗi"); continue
                try:
                    wb = openpyxl.load_workbook(out)
                except Exception as ex:
                    bad.append(f"{label}: openpyxl không mở được kết quả: {ex}\n    delta={json.dumps(delta, ensure_ascii=False)[:300]}"); continue
                for (sheet, ref), (kind, want) in expect.items():
                    if any(s == sheet and in_range(ref, w) for s, w in wiped):
                        got = wb[sheet][ref].value
                        if got not in (None, ""): bad.append(f"{label}: {sheet}!{ref} nằm trong vùng xóa nhưng còn {got!r}")
                        continue
                    cell = wb[sheet][ref]
                    if type(cell).__name__ == "MergedCell":
                        continue  # openpyxl không trả giá trị của ô không phải ô đầu vùng gộp (giới hạn bộ đọc, ô vẫn có trong tệp)
                    got = cell.value
                    if got != want and not (kind == "v" and isinstance(want, float) and isinstance(got, (int, float)) and abs(got - want) < 1e-9):
                        bad.append(f"{label}: {sheet}!{ref} = {got!r}, mong {want!r}")
                if a.libreoffice:
                    csvdir = tmp / "csv"; csvdir.mkdir(exist_ok=True)
                    p = subprocess.run(["soffice", "--headless", "--convert-to", "csv", "--outdir", str(csvdir), str(out)],
                                       capture_output=True, text=True, timeout=300)
                    if p.returncode != 0 or not list(csvdir.glob(out.stem + "*.csv")):
                        bad.append(f"{label}: LibreOffice không chuyển được ({p.returncode}) {p.stderr[:120]}")
                ok += 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"đạt {ok} lần lưu, bỏ qua {skipped} tệp nguồn, LỖI {len(bad)}")
    for b in bad: print("  FAIL", b)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
