#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""compare.py — khung cong doi chieu (parity gate) W2.

Cho moi tep trong bo thi lieu, so sanh:
  - ban goc;
  - ban qua OOXMLKit (CLI ParityCLI chay trong WSL; tools/parity/ooxml_cli);
  - ban qua duong LibreOffice hien tai cua app (tests/live/cdp/roundtrip-file.mjs —
    dung luong save that: serialize FODS/FODP/HTML -> soffice -> patch OOXML cua adapter).

Kiem tra:
  (a) gop ZIP: ten phan, kich thuoc, CRC;
  (b) XML chuan hoa (c14n) cua moi phan bi sua;
  (c) doc lai bang Office COM an (Excel: gia tri/cong thuc/dinh dang o; Word: trang/
      doan/bang/hinh; PowerPoint: slide/shape/ghi chu).

Bao cao: tools/parity/out/PARITY-REPORT.md — chi so lieu/hash/ten phan, khong noi dung.

Trung thuc: PASS = da chay va dat; FAIL = da chay, khong dat; NOT RUN = chua can bao;
BLOCKED = khong chay duoc, kem li do.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = SCRIPT_DIR / "out"
WSL_DISTRO = "Ubuntu"
WSL_CLI = "/root/parity/.build/debug/ParityCLI"
ROUNDTRIP_MJS = REPO_ROOT / "tests" / "live" / "cdp" / "roundtrip-file.mjs"

DEFAULT_XLSX_DIR = r"E:\VN OFice\file test\lan"
DEFAULT_DOCX_DIR = r"E:\VN OFice\file test\landocx"
DEFAULT_PPTX_DIR = r"E:\VN OFice\file test"
DEFAULT_PPTX_FILE = "sample-3.pptx"

WSL_TIMEOUT_S = 600
LO_TIMEOUT_S = 1800
ORACLE_TIMEOUT_S = 420
EXT_FOR = {"xlsx": ".xlsx", "docx": ".docx", "pptx": ".pptx"}
ORACLE_SCRIPT = {"xlsx": "oracle_excel.ps1", "docx": "oracle_word.ps1", "pptx": "oracle_pptx.ps1"}


# ---------------- bo thi lieu ----------------

def corpus(xlsx_dir: str, docx_dir: str, pptx_dir: str, pptx_file: str) -> list[dict[str, Any]]:
    """Bo tep theo phieu viec: lan01..lan28.xlsx (bo lan14), d01..d24.docx (bo d10 —
    tep d10.docx thuc chat la PDF), sample-3.pptx.
    Bo tep bo vao doc khong chua noi dung tai lieu — chi ten tep chinh phu so lieu."""
    files: list[dict[str, Any]] = []
    xd = Path(xlsx_dir)
    for i in range(1, 29):
        name = f"lan{i:02d}.xlsx"
        if name == "lan14.xlsx":
            continue
        p = xd / name
        if p.is_file():
            files.append({"kind": "xlsx", "app": "sheet", "path": p, "stem": p.stem})
    dd = Path(docx_dir)
    for i in range(1, 25):
        name = f"d{i:02d}.docx"
        if name == "d10.docx":
            continue
        p = dd / name
        if p.is_file():
            files.append({"kind": "docx", "app": "writer", "path": p, "stem": p.stem})
    pp = Path(pptx_dir) / pptx_file
    if pp.is_file():
        files.append({"kind": "pptx", "app": "slides", "path": pp, "stem": pp.stem})
    return files


def capped(files: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if limit <= 0:
        return files
    kept: list[dict[str, Any]] = []
    for kind in ("xlsx", "docx", "pptx"):
        kept += [f for f in files if f["kind"] == kind][:limit]
    return kept


def version_paths(kind: str, stem: str) -> dict[str, Path]:
    ext = EXT_FOR[kind]
    return {
        "ooxml_pass": OUT_DIR / "ooxml" / kind / f"{stem}.pass{ext}",
        "ooxml_edit": OUT_DIR / "ooxml" / kind / f"{stem}.edit{ext}",
        "lo": OUT_DIR / "lo" / kind / f"{stem}.lo{ext}",
    }


def ensure_dirs() -> None:
    for kind in ("xlsx", "docx", "pptx"):
        for v in ("ooxml", "lo"):
            (OUT_DIR / v / kind).mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "oracle").mkdir(parents=True, exist_ok=True)
    (OUT_DIR / ".gitignore").write_text("*\n!.gitignore\n!PARITY-REPORT.md\n", encoding="utf-8")


# ---------------- do khoi ZIP + c14n ----------------

def read_zip_map(path: Path) -> dict[str, tuple[int, int]]:
    try:
        with zipfile.ZipFile(path) as z:
            return {n: (z.getinfo(n).file_size, z.getinfo(n).CRC) for n in z.namelist()}
    except Exception:
        return {}


def zip_compare(base: Path, other: Path) -> dict[str, Any]:
    a, b = read_zip_map(base), read_zip_map(other)
    if not a:
        return {"ok": False, "reason": "khong mo duoc zip ban goc"}
    if not b:
        return {"ok": False, "reason": "khong mo duoc zip ban qua cong"}
    names_a, names_b = set(a), set(b)
    common = names_a & names_b
    changed = sorted(n for n in common if a[n] != b[n])
    return {
        "ok": True,
        "parts": len(names_a),
        "sameParts": len(common) - len(changed),
        "missing": sorted(names_a - names_b),
        "added": sorted(names_b - names_a),
        "changed": changed,
        "changedCount": len(changed),
    }


def c14n_digest(data: bytes) -> str | None:
    try:
        digest = ET.canonicalize(data.decode("utf-8"))
        return hashlib.sha256(digest.encode("utf-8")).hexdigest()
    except Exception:
        return None


def c14n_of_changed(orig: Path, out_path: Path, cap_mb: float = 8.0) -> dict[str, Any]:
    """Cho moi phan co noi dung thay doi (CRC khac), so digest c14n ban goc vs ban out."""
    info: dict[str, Any] = {"compared": 0, "equal": 0, "diff": 0, "skipped": 0, "changed_names": []}
    zc = zip_compare(orig, out_path)
    if not zc.get("ok"):
        return {"ok": False, "reason": zc.get("reason", "zip_compare that bai")}
    a, b = read_zip_map(orig), read_zip_map(out_path)
    with zipfile.ZipFile(orig) as za, zipfile.ZipFile(out_path) as zb:
        for name in zc["changed"]:
            if max(a[name][0], b[name][0]) > cap_mb * 1024 * 1024:
                info["skipped"] += 1
                continue
            try:
                da, db = za.read(name), zb.read(name)
            except Exception:
                info["skipped"] += 1
                continue
            info["changed_names"].append(name)
            info["compared"] += 1
            if da == db:
                info["equal"] += 1
                continue
            ha, hb = c14n_digest(da), c14n_digest(db)
            if ha and hb and ha == hb:
                info["equal"] += 1
            else:
                info["diff"] += 1
    info["ok"] = True
    return info


# ---------------- stage OOXMLKit ----------------

def wsl_path(p: Path | str) -> str:
    s = str(p).replace("/", "\\")
    m = re.match(r"^([A-Za-z]):(.*)$", s)
    if not m:
        raise ValueError("khong la duong dan Windows: " + s)
    return f"/mnt/{m.group(1).lower()}" + m.group(2).replace("\\", "/")


def run_wsl(args: list[str], timeout: int = WSL_TIMEOUT_S) -> dict[str, Any]:
    cmd = ["wsl", "-d", WSL_DISTRO, "-u", "root", "--"] + args
    t0 = time.monotonic()
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout, check=False)
        out, rc, err = r.stdout, r.returncode, r.stderr
    except subprocess.TimeoutExpired:
        out, rc, err = "", 1, f"timeout sau {timeout}s"
    return {"stdout": out, "stderr": err, "returncode": rc,
            "seconds": round(time.monotonic() - t0, 1)}


def parse_cli_json(stdout: str) -> dict[str, Any]:
    for line in (stdout or "").splitlines():
        s = line.strip()
        if s.startswith("{"):
            try:
                return json.loads(s)
            except json.JSONDecodeError:
                break
    return {"status": "FAIL", "error": "khong co JSON ra: " + ((stdout or "empty")[-200:])}


def stage_ooxml(files: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    ensure_dirs()
    results: dict[str, dict[str, Any]] = {}
    for f in files:
        kind, stem = f["kind"], f["stem"]
        src: Path = f["path"]
        vp = version_paths(kind, stem)
        row: dict[str, Any] = {"kind": kind}
        r = run_wsl([WSL_CLI, "pass", wsl_path(src), wsl_path(vp["ooxml_pass"])])
        cli = parse_cli_json(r["stdout"])
        row["pass_status"] = cli.get("status")
        if cli.get("error"):
            row["pass_error"] = cli["error"]
        row["pass_seconds"] = r["seconds"]
        if vp["ooxml_pass"].is_file() and row["pass_status"] == "PASS":
            row["pass_bytes_identical"] = src.read_bytes() == vp["ooxml_pass"].read_bytes()
            row["pass_zip"] = zip_compare(src, vp["ooxml_pass"])
        op = {"xlsx": "xlsx-edit", "docx": "docx-replace", "pptx": "pptx-title"}[kind]
        r = run_wsl([WSL_CLI, op, wsl_path(src), wsl_path(vp["ooxml_edit"])])
        cli = parse_cli_json(r["stdout"])
        row["edit_status"] = cli.get("status")
        row["edit_info"] = {k: v for k, v in cli.items() if k != "status"}
        if vp["ooxml_edit"].is_file() and row["edit_status"] == "PASS":
            row["edit_zip"] = zip_compare(src, vp["ooxml_edit"])
            row["edit_c14n"] = c14n_of_changed(src, vp["ooxml_edit"])
        results[stem] = row
        print("ooxml", stem, row.get("pass_status"), row.get("edit_status"),
              "byteIdentical=" + str(row.get("pass_bytes_identical")), flush=True)
    (OUT_DIR / "ooxml-stage.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    return results


# ---------------- stage duong LibreOffice cua app ----------------

def stage_lo(files: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    node = shutil.which("node")
    results: dict[str, dict[str, Any]] = {}
    if not node:
        for f in files:
            results[f["stem"]] = {"status": "BLOCKED", "message": "Node.js khong co trong PATH."}
        (OUT_DIR / "lo-stage.json").write_text(
            json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
        return results
    ensure_dirs()
    env_base = os.environ.copy()
    for f in files:
        kind, stem = f["kind"], f["stem"]
        src = f["path"]
        dest = version_paths(kind, stem)["lo"]
        t0 = time.monotonic()
        cmd = [node, "--experimental-websocket", str(ROUNDTRIP_MJS), "--app", f["app"],
               "--input", str(src), "--output", str(dest)]
        add_env: dict[str, str] = {}
        if kind == "docx":
            cmd += ["--edit", "true", "--large-file", "true"]
        if kind == "xlsx":
            cmd += ["--large-file", "true"]
        if kind in ("xlsx", "pptx"):
            add_env["VNO_AUDIT_MARK_DIRTY"] = "1"  # cong save real cua app giong audit chinh thuc
        env = dict(env_base)
        env.update(add_env)
        try:
            r = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True,
                               encoding="utf-8", errors="replace", timeout=LO_TIMEOUT_S,
                               env=env, check=False)
        except subprocess.TimeoutExpired:
            results[stem] = {"status": "FAIL", "message": f"timeout {LO_TIMEOUT_S}s",
                             "seconds": round(time.monotonic() - t0, 1)}
            print("lo", stem, "TIMEOUT", flush=True)
            continue
        result = None
        for line in (r.stdout or "").splitlines():
            if line.startswith("RESULT "):
                try:
                    result = json.loads(line[7:])
                except json.JSONDecodeError:
                    pass
        if r.returncode == 0 and result and dest.is_file() and dest.stat().st_size > 0:
            row: dict[str, Any] = {
                "status": "PASS",
                "seconds": round(time.monotonic() - t0, 1),
                "loadMs": (result.get("timings") or {}).get("loadMs"),
                "saveMs": (result.get("timings") or {}).get("saveMs"),
            }
            row["zip"] = zip_compare(src, dest)
            row["c14n"] = c14n_of_changed(src, dest)
        else:
            detail = ((r.stderr or "") + (r.stdout or "")).strip()
            row = {"status": "FAIL", "message": detail[-700:],
                   "seconds": round(time.monotonic() - t0, 1)}
        results[stem] = row
        print("lo", stem, row.get("status"), row.get("seconds"), flush=True)
    (OUT_DIR / "lo-stage.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    return results


# ---------------- stage oracle COM ----------------

def run_oracle(kind: str, path: Path, out_json: Path) -> dict[str, Any]:
    powershell = shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return {"status": "BLOCKED", "message": "PowerShell khong co."}
    pid_file = str(out_json.with_suffix(".pid"))
    cmd = [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass",
           "-File", str((SCRIPT_DIR / ORACLE_SCRIPT[kind]).resolve()),
           "-File", str(path.resolve()), "-OwnedPidFile", pid_file]
    t0 = time.monotonic()
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=ORACLE_TIMEOUT_S, check=False)
    except subprocess.TimeoutExpired:
        # Chi kill PID tu file pid — la CON NO do oracle cua minh ghi, theo quy tac
        # "chi kill PID cua minh", khong doa prozess nguoi dung.
        my_pid = 0
        try:
            my_pid = int(Path(pid_file).read_text().strip() or "0")
        except Exception:
            my_pid = 0
        if my_pid > 0:
            subprocess.run(["taskkill", "/PID", str(my_pid), "/T", "/F"],
                           check=False, capture_output=True)
        return {"status": "FAIL", "message": f"timeout {ORACLE_TIMEOUT_S}s (kill pid {my_pid})"}
    payload = None
    for line in (r.stdout or "").splitlines():
        s = line.strip()
        if s.startswith("{"):
            try:
                data = json.loads(s)
                if isinstance(data, dict):
                    payload = data
                    if payload.get("status") == "PASS":
                        break
            except json.JSONDecodeError:
                payload = {"status": "FAIL", "message": "JSON khong hop le: " + s[-160:]}
    if payload is None:
        return {"status": "FAIL",
                "message": ((r.stdout or "") + (r.stderr or ""))[-400:] or "khong co output"}
    payload["seconds"] = round(time.monotonic() - t0, 1)
    return payload


def stage_mso(files: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    ensure_dirs()
    oracle_dir = OUT_DIR / "oracle"
    lo_status = load_json(OUT_DIR / "lo-stage.json")
    ooxml_status = load_json(OUT_DIR / "ooxml-stage.json")
    results: dict[str, dict[str, Any]] = {}
    # Khi may khong chay duoc mot loai (vi du: Excel bi chan activation),
    # khong lap lai tung file cung loai — danh dau BLOCKED co ly do.
    kind_blocked: dict[str, str] = {}
    activation_marks = ("0xC004F056", "Activation Wizard", "Product Activation")
    for f in files:
        kind, stem = f["kind"], f["stem"]
        blocked_reason = kind_blocked.get(kind, "")
        if blocked_reason:
            results.setdefault(stem, {})["__blocked_kind"] = {
                "status": "BLOCKED", "message": "bo qua theo loai: " + blocked_reason}
            continue
        vp = version_paths(kind, stem)
        variants: list[tuple[str, Path]] = [("orig", f["path"])]
        if vp["ooxml_edit"].is_file() and ooxml_status.get(stem, {}).get("edit_status") == "PASS":
            variants.append(("ooxml", vp["ooxml_edit"]))
        if vp["lo"].is_file() and lo_status.get(stem, {}).get("status") == "PASS":
            variants.append(("lo", vp["lo"]))
        for name, path in variants:
            out_json = oracle_dir / f"{stem}.{name}.json"
            if out_json.is_file():
                cached = load_json_file(out_json, wrap_status=True)
                if cached and (kind != "xlsx" or cached.get("sheets", 0) > 0 or cached.get("status") != "PASS"):
                    results.setdefault(stem, {})[name] = cached
                    print("oracle (cache)", stem, name, flush=True)
                    continue
            res = run_oracle(kind, path, out_json)
            msg = str(res.get("message", "") or res.get("error", "") or "")
            if res.get("status") not in ("PASS",) and any(m in msg for m in activation_marks):
                kind_blocked[kind] = msg[:220]
            out_json.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
            results.setdefault(stem, {})[name] = res
            print("oracle", stem, name, res.get("status"), res.get("seconds", ""), flush=True)
    (OUT_DIR / "oracle-stage.json").write_text(
        json.dumps(results, ensure_ascii=False), encoding="utf-8")
    return results


def load_json(p: Path) -> dict[str, Any]:
    if p.is_file():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def load_json_file(p: Path, wrap_status: bool = False) -> dict[str, Any]:
    try:
        data = json.loads(p.read_text(encoding="utf-8-sig"))
        if not isinstance(data, dict):
            return {}
        if wrap_status and "status" not in data:
            return {}
        return data
    except Exception:
        return {}


# ---------------- phan tich oracle ----------------

def excel_dump_map(data: dict[str, Any]) -> dict[tuple[int, int, int], tuple[str, str, str, str]]:
    """(sheet, row, col) -> (type, value, formula, numberformat).*/
    Dump tung dong o oracle_excel la [sheetIndex, r, c, vt, vs, fs, ms]."""
    out: dict[tuple[int, int, int], tuple[str, str, str, str]] = {}
    for row in data.get("dump", []):
        try:
            s, r, c = int(row[0]), int(row[1]), int(row[2])
            out[(s, r, c)] = (row[3], row[4], row[5], row[6])
        except Exception:
            continue
    return out


def excel_diff(orig: dict[str, Any], other: dict[str, Any],
               exclude: tuple[int, int, int] | None = None) -> dict[str, Any]:
    d: dict[str, Any] = {"type": 0, "value": 0, "formula": 0, "numberformat": 0,
                         "only_orig": 0, "only_other": 0, "expectedExcluded": 0}
    if orig.get("status") != "PASS" or other.get("status") != "PASS":
        return {"error": "oracle chua PASS: " + str(orig.get("status")) + "/" + str(other.get("status"))}
    da, db = excel_dump_map(orig), excel_dump_map(other)
    for key in set(da) | set(db):
        va, vb = da.get(key), db.get(key)
        if va is None and vb is None:
            continue
        if exclude is not None and key == exclude:
            if va != vb:
                d["expectedExcluded"] += 1
            continue
        if va is None:
            d["only_other"] += 1
            continue
        if vb is None:
            d["only_orig"] += 1
            continue
        if va == vb:
            continue
        for idx, k in enumerate(("type", "value", "formula", "numberformat")):
            if va[idx] != vb[idx]:
                d[k] += 1
    d["cellsOrig"] = len(da)
    d["cellsOther"] = len(db)
    return d


def worst_excel_label(d: dict[str, Any]) -> str:
    if "error" in d:
        return "BLOCKED"
    total = (d.get("type", 0) + d.get("value", 0) + d.get("formula", 0) + d.get("numberformat", 0)
             + d.get("only_orig", 0) + d.get("only_other", 0))
    return "khac=0" if total == 0 else "khac=" + str(total)


def edited_xlsx_cell(ooxml_info: dict[str, Any]) -> tuple[int, int, int]:
    """(sheet=1, row, col=1) cua o oooxml da sua (cot A, hang o cuoi used range + 2)."""
    info = ooxml_info.get("edit_info") or {}
    ref = str(info.get("editedCell") or "A1")
    m = re.match(r"^([A-Za-z]+)(\d+)$", ref)
    if not m:
        return (1, 1, 1)
    col = 0
    for ch in m.group(1).upper():
        col = col * 26 + (ord(ch) - 64)
    return (1, int(m.group(2)), col)


def a1_of(cell: tuple[int, int, int]) -> str:
    s, r, c = cell
    letters = ""
    while c > 0:
        c, rem = divmod(c - 1, 26)
        letters = chr(65 + rem) + letters
    return f"{letters}{r}"


def word_diff(orig: dict[str, Any], other: dict[str, Any],
              text_sha_excluded: bool) -> dict[str, Any]:
    if orig.get("status") != "PASS" or other.get("status") != "PASS":
        return {"error": "oracle chua PASS"}
    keys = ("pages", "paragraphs", "tables", "inlineShapes", "shapes", "sections",
            "headers_nonempty", "footers_nonempty")
    d: dict[str, Any] = {}
    total = 0
    for k in keys:
        vo = orig.get(k)
        va = other.get(k)
        if vo is not None and va is not None:
            diff = vo - va
            if diff:
                d[k] = diff
                total += 1
    if not text_sha_excluded and orig.get("textSha256") != other.get("textSha256"):
        d["textSha256"] = 1
        total += 1
    d["structDiffs"] = total
    return d


def pptx_diff(orig: dict[str, Any], other: dict[str, Any],
              notes_sha_excluded: bool) -> dict[str, Any]:
    if orig.get("status") != "PASS" or other.get("status") != "PASS":
        return {"error": "oracle chua PASS"}
    keys = ("slides", "shapesTotal", "pictures", "charts", "textShapes",
            "withTitle", "withNotes")
    d: dict[str, Any] = {}
    total = 0
    for k in keys:
        vo = orig.get(k)
        va = other.get(k)
        if vo is not None and va is not None:
            diff = vo - va
            if diff:
                d[k] = diff
                total += 1
    if not notes_sha_excluded and orig.get("notesTextSha256") != other.get("notesTextSha256"):
        d["notesSha256"] = 1
        total += 1
    d["structDiffs"] = total
    return d


def byte_status(row_ox: dict[str, Any]) -> str:
    if row_ox.get("pass_status") != "PASS":
        return str(row_ox.get("pass_status", "NOT RUN"))
    bi = row_ox.get("pass_bytes_identical")
    if bi is True:
        return "BYTE-IDENTICAL"
    if bi is False:
        pz = row_ox.get("pass_zip") or {}
        return f"khac byte chi o vỏ ZIP: same={pz.get('sameParts', '?')}/{pz.get('parts', '?')} phan"
    return "n/a"


def fmt_excel(d: dict[str, Any]) -> str:
    if "error" in d:
        return "BLOCKED(" + str(d["error"])[:40] + ")"
    total = (d.get("type", 0) + d.get("value", 0) + d.get("formula", 0) + d.get("numberformat", 0)
             + d.get("only_orig", 0) + d.get("only_other", 0))
    if total == 0:
        return "0 lech"
    parts = [f"{k}={d[k]}" for k in ("type", "value", "formula", "numberformat", "only_orig", "only_other")
             if d.get(k)]
    return f"{total} lech [{', '.join(parts)}]"


def fmt_struct(d: dict[str, Any], sha_label: str | None = None) -> str:
    if "error" in d:
        return "BLOCKED(" + str(d["error"])[:40] + ")"
    total = d.get("structDiffs", 0)
    if total == 0:
        return "0 lech"
    detail = [f"{k}={v}" for k, v in d.items()
              if k != "structDiffs" and isinstance(v, int) and v]
    if sha_label and d.get(sha_label):
        detail.append(sha_label)
    return f"{total} lech [{', '.join(detail)}]"[:160]



def build_report(out: Path, files: list[dict[str, Any]]) -> str:
    ooxml_stage = load_json(out / "ooxml-stage.json")
    lo_stage = load_json(out / "lo-stage.json")
    oracle_stage = load_json(out / "oracle-stage.json")
    lines: list[str] = []
    add = lines.append
    add("# PARITY-REPORT — khung cong doi chieu W2 (OOXMLKit <-> LibreOffice/app <-> Office COM)")
    add("")
    add("Bo thi lieu: `file test\\lan\\lan01..lan28.xlsx` (bo lan14), `file test\\landocx\\d01..d24.docx` (bo d10 — d10.docx la PDF that), `file test\\sample-3.pptx`.")
    add("Ban LO: tao qua duong save that cua app (tests/live/cdp/roundtrip-file.mjs -> globalUnoBridge.saveRealFileInPlace). Sheet: VNO_AUDIT_MARK_DIRTY=1, khong sua noi dung. Writer: edit ban phim nhu audit chinh thuc (them chu ZZ). Slides: save khong sua.")
    add("Ban OOXMLKit edit: xlsx-edit (dat chuoi AGY-PARITY-EDIT vao 1 o moi ben duoi used range), docx-replace (thay doan dau 6 ky tu trong 1 doan van bang doan do + AGYPAR), pptx-title (dat tieu de slide 1).")
    add("Cac tep *.json trong tools/parity/out chua du lieu dump (co the co noi dung tai lieu) — .gitignore tu cho commit, chi giu PARITY-REPORT.md.")
    add("")
    for kind, title in (("xlsx", "Excel (XLSX - 3T Sheet)"), ("docx", "Word (DOCX - 3T Doc)"), ("pptx", "PowerPoint (PPTX - 3T Slides)")):
        add(f"## {title}")
        add("")
        if kind == "xlsx":
            add("| Tep | OOXMLKit: pass | giu nguyen byte? | OOXMLKit: save | phan khac (sua 1 o) | c14n part khac | Excel COM lech (OOXMLKit) | LO | Excel COM lech (LO) |")
            add("|---|---|---|---|---|---|---|---|---|")
            for f in [f for f in files if f["kind"] == kind]:
                stem = f["stem"]
                row_ox = ooxml_stage.get(stem, {})
                row_lo = lo_stage.get(stem, {})
                orc = oracle_stage.get(stem, {})
                ez = row_ox.get("edit_zip") or {}
                ec14 = row_ox.get("edit_c14n") or {}
                exc = edited_xlsx_cell(row_ox) if row_ox.get("edit_status") == "PASS" else None
                d_ox = excel_diff(orc.get("orig", {}), orc.get("ooxml", {}), exclude=exc)
                d_lo = excel_diff(orc.get("orig", {}), orc.get("lo", {}))
                add(f"| {stem} | {row_ox.get('pass_status', 'NOT RUN')} | {byte_status(row_ox)} | "
                    f"{row_ox.get('edit_status', 'NOT RUN')} | {ez.get('changedCount', 'n/a')}/{ez.get('parts', 'n/a')} | "
                    f"{ec14.get('equal', 0)}/{ec14.get('compared', 0)} | {fmt_excel(d_ox)} | "
                    f"{row_lo.get('status', 'NOT RUN')} | {fmt_excel(d_lo)} |")
        elif kind == "docx":
            add("| Tep | OOXMLKit: pass | giu nguyen byte? | OOXMLKit: save | phan khac (thay 1 doan) | c14n part khac | Word COM lech (OOXMLKit, bo hash van ban) | LO | Word COM lech (LO) |")
            add("|---|---|---|---|---|---|---|---|---|")
            for f in [f for f in files if f["kind"] == kind]:
                stem = f["stem"]
                row_ox = ooxml_stage.get(stem, {})
                row_lo = lo_stage.get(stem, {})
                orc = oracle_stage.get(stem, {})
                ez = row_ox.get("edit_zip") or {}
                ec14 = row_ox.get("edit_c14n") or {}
                d_ox = word_diff(orc.get("orig", {}), orc.get("ooxml", {}), text_sha_excluded=True)
                d_lo = word_diff(orc.get("orig", {}), orc.get("lo", {}), text_sha_excluded=False)
                add(f"| {stem} | {row_ox.get('pass_status', 'NOT RUN')} | {byte_status(row_ox)} | "
                    f"{row_ox.get('edit_status', 'NOT RUN')} | {ez.get('changedCount', 'n/a')}/{ez.get('parts', 'n/a')} | "
                    f"{ec14.get('equal', 0)}/{ec14.get('compared', 0)} | {fmt_struct(d_ox)} | "
                    f"{row_lo.get('status', 'NOT RUN')} | {fmt_struct(d_lo)} |")
        else:
            add("| Tep | OOXMLKit: pass | giu nguyen byte? | OOXMLKit: save (doi tieu de) | phan khac | c14n part khac | PPT COM lech (OOXMLKit) | LO | PPT COM lech (LO) |")
            add("|---|---|---|---|---|---|---|---|---|")
            for f in [f for f in files if f["kind"] == kind]:
                stem = f["stem"]
                row_ox = ooxml_stage.get(stem, {})
                row_lo = lo_stage.get(stem, {})
                orc = oracle_stage.get(stem, {})
                ez = row_ox.get("edit_zip") or {}
                ec14 = row_ox.get("edit_c14n") or {}
                d_ox = pptx_diff(orc.get("orig", {}), orc.get("ooxml", {}), notes_sha_excluded=False)
                d_lo = pptx_diff(orc.get("orig", {}), orc.get("lo", {}), notes_sha_excluded=False)
                add(f"| {stem} | {row_ox.get('pass_status', 'NOT RUN')} | {byte_status(row_ox)} | "
                    f"{row_ox.get('edit_status', 'NOT RUN')} | {ez.get('changedCount', 'n/a')}/{ez.get('parts', 'n/a')} | "
                    f"{ec14.get('equal', 0)}/{ec14.get('compared', 0)} | {fmt_struct(d_ox)} | "
                    f"{row_lo.get('status', 'NOT RUN')} | {fmt_struct(d_lo)} |")
        add("")
    add("## Chi tiet LO FAIL")
    add("")
    fails_lo = {s: v for s, v in lo_stage.items() if v.get("status") == "FAIL"}
    if fails_lo:
        add("| Tep | thong bao |")
        add("|---|---|")
        for s, v in fails_lo.items():
            msg = str(v.get("message", "khong ro"))[:160].replace("\n", " ").replace("|", "/")
            add(f"| {s} | {msg} |")
        add("")
    add("## Ket luan")
    add("")
    add("So lieu tong hop duoc dien tu ket qua that cac stage ooxml/lo/mso da chay (khong suy dien).")
    add("")
    add("## Phan OOXMLKit con thieu (tong hop tu README cua OOXMLKit)")
    add("")
    add("- XLSX: khong tinh lai cong thuc khi sua (chi ghi gia tri cache/dat co fullCalcOnLoad); chen/xoa cot chi ap dung trong pham vi du lieu bang; chua co API sua dinh dang co dieu kien, xac thuc du lieu, bnh luan, pivot, bieu do.")
    add("- DOCX: setText lam mat lien ket/truong trong doan; chua tao bang moi/danh sach co so/section/binh luan; chua co theo doi thay doi (track changes).")
    add("- PPTX: nhan ban slide khong chep ghi chu; chua co API sua bieu do; bonh luan slide chua duoc xu ly.")
    add("- Tong quat: khong ho tro tep co mat khau o ma hoa OLE/CFB; khong ho tro dinh dang nhi phan cu (DOC/XLS/PPT); DOM nap toan bo phan XML vao bo nho.")
    add("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="khung doi chieu parity gate W2")
    ap.add_argument("--stage", required=True, choices=["ooxml", "lo", "mso", "report", "all"])
    ap.add_argument("--limit", type=int, default=0,
                    help="gioi han N tep moi loai cho stage lo/mso (0 = tat ca bo)")
    ap.add_argument("--xlsx-dir", default=DEFAULT_XLSX_DIR)
    ap.add_argument("--docx-dir", default=DEFAULT_DOCX_DIR)
    ap.add_argument("--pptx-dir", default=DEFAULT_PPTX_DIR)
    ap.add_argument("--pptx-file", default=DEFAULT_PPTX_FILE)
    args = ap.parse_args()
    ensure_dirs()
    files = corpus(args.xlsx_dir, args.docx_dir, args.pptx_dir, args.pptx_file)
    print("corpus:", len(files), "tep", flush=True)
    sel = capped(files, args.limit)
    if args.stage in ("ooxml", "all"):
        stage_ooxml(files)
    if args.stage in ("lo", "all"):
        stage_lo(sel)
    if args.stage in ("mso", "all"):
        stage_mso(sel)
    if args.stage == "report":
        (OUT_DIR / "PARITY-REPORT.md").write_text(build_report(OUT_DIR, files), encoding="utf-8")
        print("da ghi", OUT_DIR / "PARITY-REPORT.md", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
