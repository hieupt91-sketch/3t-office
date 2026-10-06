#!/usr/bin/env python3
"""So sánh phân trang và lượng chữ qua roundtrip VN Writer trên corpus cục bộ."""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORPORA = [Path(r"E:\VN OFice\file test\landocx"), Path(r"E:\VN OFice\file test\lan-legacy")]
DEFAULT_SOFFICE = Path(r"C:\Users\3T Computer\tools\libreoffice\program\soffice.exe")
NODE_SCRIPT = ROOT / "tests/live/cdp/roundtrip-file.mjs"
REPORT = ROOT / "docs/AUDIT-DOC-CORPUS-0610.md"
PAGE_TREE = re.compile(rb"/Type\s*/Pages\b[^>]*?/Count\s+(\d+)|/Count\s+(\d+)[^>]*?/Type\s*/Pages\b")
PAGE_OBJECT = re.compile(rb"/Type\s*/Page(?![A-Za-z])")


def page_count(pdf: Path) -> int:
    data = pdf.read_bytes()
    declared = [int(a or b) for a, b in PAGE_TREE.findall(data)]
    leaves = len(PAGE_OBJECT.findall(data))
    if not data.startswith(b"%PDF-") or not declared or leaves < 1 or max(declared) != leaves:
        raise RuntimeError("Không đếm chắc chắn được trang PDF (cây trang không nhất quán).")
    return max(declared)


def soffice_path() -> str:
    value = os.environ.get("VNOFFICE_SOFFICE_PATH")
    found = shutil.which(value) if value and not Path(value).exists() else value
    candidate = Path(found) if found else DEFAULT_SOFFICE
    if not candidate.is_file():
        raise FileNotFoundError(f"Không tìm thấy LibreOffice: {candidate}")
    return str(candidate)


def lo_convert(source: Path, target_dir: Path, fmt: str, soffice: str) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    profile = Path(tempfile.mkdtemp(prefix="vno-lo-profile-"))
    try:
        url = profile.resolve().as_uri()
        result = subprocess.run([soffice, "--headless", f"-env:UserInstallation={url}",
                                 "--convert-to", fmt, "--outdir", str(target_dir), str(source)],
                                capture_output=True, text=True, timeout=300)
        if result.returncode:
            raise RuntimeError(f"LibreOffice convert-to {fmt} rc={result.returncode}: {(result.stderr or result.stdout)[-1000:]}")
        output = target_dir / (source.stem + (".pdf" if fmt == "pdf" else ".txt"))
        if not output.is_file():
            raise RuntimeError(f"LibreOffice không tạo {output.name}: {(result.stderr or result.stdout)[-1000:]}")
        return output
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def char_count(path: Path, work: Path, soffice: str) -> int | None:
    # Specify encoding explicitly because Text defaults vary by LibreOffice profile.
    try:
        txt = lo_convert(path, work, "txt:Text (encoded):UTF8", soffice)
    except RuntimeError:
        # PDF inputs are page-counted separately and do not have a DOCX text
        # baseline. Do not turn a PDF text-filter limitation into a blocker.
        if path.read_bytes()[:5] == b"%PDF-":
            return None
        raise
    text = txt.read_text(encoding="utf-8", errors="replace")
    return sum(not char.isspace() for char in text)


def run_roundtrip(source: Path, output: Path, edit: bool) -> None:
    local = Path(tempfile.mkdtemp(prefix="vno-cdp-localappdata-"))
    env = os.environ.copy()
    env["VNO_CDP_LOCALAPPDATA"] = str(local)
    try:
        command = ["node", "--experimental-websocket", str(NODE_SCRIPT), "--app", "writer",
                   "--input", str(source), "--output", str(output)]
        if edit:
            command += ["--edit", "true"]
        result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, timeout=1800)
        if result.returncode:
            raise RuntimeError(f"CDP roundtrip rc={result.returncode}: {(result.stderr or result.stdout)[-1600:]}")
        if not output.is_file() or output.stat().st_size == 0:
            raise RuntimeError("CDP không tạo tệp đầu ra hợp lệ.")
    finally:
        shutil.rmtree(local, ignore_errors=True)


def audit(source: Path, soffice: str) -> dict:
    started = time.monotonic()
    row = {"name": source.name, "p0": None, "p1": None, "p2": None, "pages": None,
           "chars": None, "seconds": None, "status": "BLOCKED", "reason": ""}
    with tempfile.TemporaryDirectory(prefix="vno-corpus-audit-") as tmp:
        work = Path(tmp)
        try:
            p0pdf = lo_convert(source, work / "p0", "pdf", soffice)
            row["p0"] = page_count(p0pdf)
            if source.read_bytes()[:5] == b"%PDF-":
                row["reason"] = "Nguồn là PDF (header %PDF-), không phải DOC/DOCX; không thể roundtrip qua Writer."
                row["seconds"] = round(time.monotonic() - started, 1)
                return row
            original_chars = char_count(source, work / "text-original", soffice)
            if source.suffix.casefold() == ".docx":
                intermediate = work / "roundtrip.docx"
                run_roundtrip(source, intermediate, False)
                first = intermediate
            else:
                first = work / "roundtrip.docx"
                run_roundtrip(source, first, False)
            row["p1"] = page_count(lo_convert(first, work / "p1", "pdf", soffice))
            first_chars = char_count(first, work / "text-p1", soffice)
            row["chars"] = (None if original_chars is None or first_chars is None else
                             (0.0 if original_chars == 0 and first_chars == 0 else
                              None if original_chars == 0 else
                              round(abs(first_chars - original_chars) * 100 / original_chars, 3)))
            edited = work / "edited.docx"
            run_roundtrip(source, edited, True)
            row["p2"] = page_count(lo_convert(edited, work / "p2", "pdf", soffice))
            if row["p1"] == row["p0"] and row["chars"] is not None and row["chars"] <= 0.5:
                row["status"] = "PASS"
            else:
                row["status"] = "FAIL"
                row["reason"] = "P1 khác P0" if row["p1"] != row["p0"] else "Chênh ký tự vượt 0,5% hoặc không tính được"
        except Exception as exc:
            row["reason"] = f"{type(exc).__name__}: {exc}".replace("|", "\\|").replace("\n", " ")
    row["seconds"] = round(time.monotonic() - started, 1)
    return row


def write_report(rows: list[dict], selected: list[Path], soffice: str, report: Path) -> None:
    counts = {state: sum(r["status"] == state for r in rows) for state in ("PASS", "FAIL", "BLOCKED")}
    lines = ["# Audit roundtrip tài liệu: đối chiếu LibreOffice", "",
             "Ticket D7 — phép đo thay thế vì Word COM bị hộp thoại ‘Word không phải chương trình mặc định’ chặn. Số trang Word thật chưa được đo; P0 là LibreOffice headless làm chuẩn đối chiếu. Corpus chỉ đọc; đầu ra trung gian được tạo trong thư mục tạm và xóa sau mỗi tài liệu.", "",
             f"- Tài liệu được chọn: {len(selected)}; LibreOffice: `{soffice}`.",
             "- P0: số trang bản gốc; P1: số trang sau mở và lưu qua VN Writer; P2: số trang lượt mở, sửa qua CDP rồi lưu. Chênh ký tự = trị tuyệt đối phần trăm ký tự không phải khoảng trắng (bản gốc so với P1). PASS yêu cầu P1 = P0 và chênh ≤ 0,5%; P2 chỉ báo cáo.",
             f"- Tổng: PASS {counts['PASS']} / FAIL {counts['FAIL']} / BLOCKED {counts['BLOCKED']}.", "",
             "| Tên | P0 | P1 | P2 | Chênh trang (P1−P0) | Chênh ký tự % | Giây | Kết quả |",
             "|---|---:|---:|---:|---:|---:|---:|---|"]
    for row in rows:
        pages = row["pages"] if row["pages"] is not None else (row["p1"] - row["p0"] if row["p0"] is not None and row["p1"] is not None else "—")
        chars = f"{row['chars']:.3f}%" if row["chars"] is not None else "—"
        result = row["status"] + ((" — " + row["reason"]) if row["reason"] else "")
        lines.append(f"| {row['name'].replace('|', '\\|')} | {row['p0'] if row['p0'] is not None else '—'} | {row['p1'] if row['p1'] is not None else '—'} | {row['p2'] if row['p2'] is not None else '—'} | {pages} | {chars} | {row['seconds']:.1f} | {result} |")
    lines += ["", "## Tài liệu FAIL cần xem lại (không sửa)", ""]
    failures = [r for r in rows if r["status"] == "FAIL"]
    lines.extend([f"- `{r['name']}`: {r['reason']}; nghi ngờ sai khác phân trang hoặc nội dung cần kiểm tra thủ công." for r in failures] or ["Không có."])
    blocked = [r for r in rows if r["status"] == "BLOCKED"]
    lines += ["", "## BLOCKED", ""]
    lines.extend([f"- `{r['name']}`: {r['reason']}" for r in blocked] or ["Không có."])
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--only", help="Tên tệp chính xác (basename)")
    parser.add_argument("--report", type=Path, default=REPORT, help="Đường dẫn báo cáo Markdown")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit phải >= 0")
    sources = sorted((p for folder in CORPORA if folder.is_dir() for p in folder.iterdir()
                      if p.is_file() and p.suffix.casefold() in {".doc", ".docx"}), key=lambda p: (p.parent.name, p.name.casefold()))
    if args.only:
        sources = [p for p in sources if p.name.casefold() == args.only.casefold()]
    if args.limit is not None:
        sources = sources[:args.limit]
    if not sources:
        print("Không tìm thấy tài liệu phù hợp với bộ lọc.", file=sys.stderr)
        return 2
    try:
        soffice = soffice_path()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 2
    rows = []
    for index, source in enumerate(sources, 1):
        print(f"[{index}/{len(sources)}] {source.name}", flush=True)
        row = audit(source, soffice)
        rows.append(row)
        print(f"  {row['status']} P0={row['p0']} P1={row['p1']} P2={row['p2']} {row['seconds']}s", flush=True)
        write_report(rows, sources, soffice, args.report)
    write_report(rows, sources, soffice, args.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
