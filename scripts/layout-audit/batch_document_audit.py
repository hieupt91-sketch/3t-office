"""Unified desktop round-trip and page-count audit for 3T Doc, Sheet, and Slide.

Commands:
  python scripts/layout-audit/batch_document_audit.py xlsx <worktree> [lanNN.xlsx ...]
  python scripts/layout-audit/batch_document_audit.py docx <worktree> <docx-dir> <out-dir> [name.docx ...]
  python scripts/layout-audit/batch_document_audit.py pptx <worktree> <pptx-dir> <out-dir> [name.pptx ...]
  python scripts/layout-audit/batch_document_audit.py all <worktree> --docx-dir <dir> --pptx-dir <dir> --out-dir <dir>

Desktop app work is performed by tests/live/cdp/roundtrip-file.mjs through WebView2 CDP.
Office reference checks use hidden COM sequentially with retry. Batch inputs and outputs stay local.
The pptx mode loads scripts/layout-audit/_batch_pptx.py:run_batch; CH-5 supplies that hook.
"""

from __future__ import annotations

import argparse
import glob
import importlib.util
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


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
NODE_ROUNDTRIP = REPO_ROOT / "tests" / "live" / "cdp" / "roundtrip-file.mjs"
NODE_AUDIT_SHEET = REPO_ROOT / "scripts" / "audit-sheet-import.mjs"


def _run_desktop_roundtrip(
    app: str,
    source: Path,
    destination: Path,
    edit: bool = False,
    large_file: bool = False,
) -> dict[str, Any]:
    node = shutil.which("node")
    if not node:
        return {"status": "BLOCKED", "message": "Node.js is not installed."}
    command = [
        node,
        "--experimental-websocket",
        str(NODE_ROUNDTRIP),
        "--app",
        app,
        "--input",
        str(source.resolve()),
        "--output",
        str(destination.resolve()),
    ]
    if edit:
        command.extend(["--edit", "true"])
    if large_file:
        command.extend(["--large-file", "true"])
    try:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=1800,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"status": "FAIL", "message": "Desktop CDP round-trip exceeded 30 minutes."}
    payload = None
    for line in (result.stdout or "").splitlines():
        if line.startswith("RESULT "):
            try:
                payload = json.loads(line[7:])
            except json.JSONDecodeError:
                pass
    if result.returncode == 0 and payload:
        payload["status"] = "PASS"
        return payload
    detail = (result.stderr or result.stdout or "No desktop round-trip result.").strip()
    return {"status": "FAIL", "message": detail[-1600:]}


def _xlsx_inputs(input_dir: Path, names: list[str]) -> list[Path]:
    if names:
        selected = names
    else:
        all_names = sorted(path.name for path in input_dir.glob("lan*.xlsx"))
        others = [n for n in all_names if n.lower() != "lan14.xlsx"]
        lan14 = [n for n in all_names if n.lower() == "lan14.xlsx"]
        selected = others + lan14
    paths = []
    for name in selected:
        leaf = Path(name).name
        if Path(leaf).suffix.lower() != ".xlsx":
            leaf += ".xlsx"
        paths.append(input_dir / leaf)
    return paths


def _run_sheet_diff(source: Path, saved: Path) -> tuple[str, str]:
    node = shutil.which("node")
    if not node:
        return "-", "BLOCKED: Node.js is not installed."
    try:
        result = subprocess.run(
            [node, str(NODE_AUDIT_SHEET), "--xlsx-vs-xlsx", str(source), str(saved)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=600,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return "?", "FAIL: XLSX comparison exceeded 10 minutes."
    output = (result.stdout or "") + (result.stderr or "")
    match = re.search(r"TONG sai lech:\s*(\d+)", output)
    return (match.group(1) if match else "?"), output[-1200:]


def _run_xlsx_lints(saved: Path) -> tuple[str, str]:
    reports = []
    clean = True
    for script, clean_line in (
        (SCRIPT_DIR / "_xlsx_lint.py", "lint done"),
        (SCRIPT_DIR / "_xlsx_parts_lint.py", "parts lint done"),
    ):
        try:
            result = subprocess.run(
                [sys.executable, str(script), str(saved)],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=300,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            clean = False
            reports.append(type(exc).__name__ + ": " + str(exc))
            continue
        lines = [line.strip() for line in ((result.stdout or "") + (result.stderr or "")).splitlines() if line.strip() and line.strip() != clean_line]
        if result.returncode != 0 or lines:
            clean = False
            reports.extend(lines or ["linter exit code " + str(result.returncode)])
    return ("clean" if clean else "issues"), "; ".join(reports[:4])


def _is_empty_save(source: Path, saved: Path) -> bool:
    if not source.is_file() or not saved.is_file():
        return False
    if source.stat().st_size != saved.stat().st_size:
        return False
    return source.read_bytes() == saved.read_bytes()


def _run_excel_open_test(paths: list[Path]) -> tuple[str, str]:
    powershell = shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return "BLOCKED", "PowerShell is unavailable."
    command = [powershell, "-NoProfile", "-File", str(SCRIPT_DIR / "_excel_open_test.ps1"), "-Files"]
    command.extend(str(path.resolve()) for path in paths)
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=900,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return "FAIL", "Hidden Excel open checks exceeded 15 minutes; no process was stopped by PID."
    output = (result.stdout or "").strip()
    status = "PASS" if result.returncode == 0 else ("BLOCKED" if output.startswith("BLOCKED") else "FAIL")
    return status, output[-1200:]


def _run_xlsx(root: Path, input_dir: Path, out_dir: Path, names: list[str], reuse_saved: bool = False) -> list[dict[str, Any]]:
    # An unedited XLSX is saved by restoring the source package (identity copy). Mark the workbook dirty so the
    # audit exercises the real conversion path every user edit takes. Set VNO_AUDIT_MARK_DIRTY=0 to opt out.
    os.environ.setdefault("VNO_AUDIT_MARK_DIRTY", "1")
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    selected = _xlsx_inputs(input_dir, names)
    for index, source in enumerate(selected):
        started = time.monotonic()
        row: dict[str, Any] = {
            "app": "3T Sheet", "file": source.name, "saved": "no",
            "diffs": "-", "office": "-", "lint": "-", "details": "",
        }
        if not source.is_file():
            row.update(status="BLOCKED", details="Input workbook does not exist.")
            rows.append(row)
            continue
        saved = out_dir / (source.stem + ".roundtrip.xlsx")
        can_reuse = reuse_saved and saved.is_file() and not _is_empty_save(source, saved)
        if can_reuse:
            source_payload = {"status": "PASS", "message": "Using existing saved roundtrip file"}
        else:
            source_payload = _run_desktop_roundtrip("sheet", source, saved, large_file=True)
        row["saved"] = "yes" if saved.is_file() else "no"
        row["status"] = source_payload.get("status", "FAIL")
        row["details"] = source_payload.get("message", "")
        if saved.is_file():
            row["diffs"], diff_output = _run_sheet_diff(source, saved)
            lint, lint_output = _run_xlsx_lints(saved)
            row["lint"] = lint
            row["details"] = "; ".join(part for part in (row["details"], diff_output, lint_output) if part)
            if row["diffs"] != "0" or lint != "clean":
                row["status"] = "FAIL"
            excel_status, excel_output = _run_excel_open_test([saved])
            row["office"] = excel_status
            if excel_status not in {"PASS", "BLOCKED"}:
                row["status"] = "FAIL"
                row["details"] = "; ".join(part for part in (row["details"], excel_output) if part)
            elif excel_status == "BLOCKED" and row["status"] == "PASS":
                row["status"] = "BLOCKED"
                row["details"] = "; ".join(part for part in (row["details"], excel_output) if part)
            row["seconds"] = round(time.monotonic() - started, 1)
            row["source"] = str(source)
            row["saved_path"] = str(saved)
        rows.append(row)
        print(
            source.name, row["status"], "saved=" + row["saved"],
            "diffs=" + row["diffs"], "lint=" + row["lint"],
            "excel=" + row["office"], "seconds=" + str(round(time.monotonic() - started, 1)),
            flush=True,
        )
    return rows


def _docx_stats(path: Path) -> dict[str, Any]:
    try:
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", "replace")
            body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", xml)
            names = archive.namelist()
        return {
            "paras": len(re.findall(r"<w:p(?:\s|>)", body)),
            "tables": body.count("<w:tbl>"),
            "sectionBreaks": len(re.findall(r"<w:pPr>(?:(?!</w:pPr>)[\s\S])*?<w:sectPr", body)),
            "pageBreaks": len(re.findall(r'<w:br\b[^>]*w:type="page"', body)),
            "headers": sum(name.startswith("word/header") and name.endswith(".xml") for name in names),
            "footers": sum(name.startswith("word/footer") and name.endswith(".xml") for name in names),
            "media": sum(name.startswith("word/media/") for name in names),
            "containsZZ": "ZZ" in body,
        }
    except Exception as exc:
        return {"error": str(exc)[:180]}


def _word_page_count(path: Path) -> tuple[str, str]:
    powershell = shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return "BLOCKED", "PowerShell is unavailable for hidden Word COM."
    try:
        result = subprocess.run(
            [powershell, "-NoProfile", "-File", str(SCRIPT_DIR / "_word_oracle3.ps1"), "-File", str(path.resolve())],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return "FAIL", "Hidden Word page count exceeded five minutes."
    output = (result.stdout or "").strip()
    match = re.search(r"OK pages=(\d+)", output)
    return (match.group(1), output) if match else ("?", output[-1000:] or "No page-count result.")


def _docx_inputs(input_dir: Path, names: list[str]) -> list[Path]:
    selected = names or sorted(path.name for path in input_dir.glob("*.docx"))
    return [input_dir / Path(name).name for name in selected]


def _run_docx(input_dir: Path, out_dir: Path, names: list[str]) -> list[dict[str, Any]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for source in _docx_inputs(input_dir, names):
        started = time.monotonic()
        row: dict[str, Any] = {
            "app": "3T Doc", "file": source.name, "saved": "no",
            "Word pages": "-", "saved pages": "-", "page delta": "-",
            "edit": "-", "details": "",
        }
        if not source.is_file():
            row.update(status="BLOCKED", details="Input document does not exist.")
            rows.append(row)
            continue
        original_pages, original_detail = _word_page_count(source)
        saved = out_dir / (source.stem + ".roundtrip.docx")
        source_payload = _run_desktop_roundtrip("writer", source, saved, edit=True)
        row["status"] = source_payload.get("status", "FAIL")
        row["saved"] = "yes" if saved.is_file() else "no"
        edit_result = source_payload.get("edit") or {}
        row["edit"] = "PASS" if edit_result.get("pass") else "FAIL"
        row["Word pages"] = original_pages
        row["details"] = source_payload.get("message", original_detail)
        if saved.is_file():
            saved_pages, saved_detail = _word_page_count(saved)
            row["saved pages"] = saved_pages
            try:
                row["page delta"] = str(int(saved_pages) - int(original_pages))
            except (TypeError, ValueError):
                row["page delta"] = "?"
            if row["page delta"] != "0" or row["edit"] != "PASS":
                row["status"] = "FAIL"
            row["structure"] = json.dumps(_docx_stats(source), ensure_ascii=False) + " → " + json.dumps(_docx_stats(saved), ensure_ascii=False)
            if saved_pages == "?" or original_pages == "?":
                row["details"] = "; ".join(part for part in (row["details"], saved_detail) if part)
                if row["status"] == "PASS":
                    row["status"] = "BLOCKED"
        row["seconds"] = round(time.monotonic() - started, 1)
        row["source"] = str(source)
        row["saved_path"] = str(saved)
        rows.append(row)
        print(
            source.name, row["status"], "Word=" + str(row["Word pages"]),
            "saved=" + str(row["saved pages"]), "edit=" + row["edit"],
            "seconds=" + str(row["seconds"]), flush=True,
        )
    return rows


def _run_pptx(input_dir: Path, out_dir: Path, names: list[str]) -> list[dict[str, Any]]:
    plugin = SCRIPT_DIR / "_batch_pptx.py"
    if not plugin.is_file():
        return [{
            "app": "3T Slide", "file": "-", "status": "BLOCKED",
            "saved": "-", "pages": "-", "details": "PPTX audit hook is ready; CH-5 must provide _batch_pptx.py:run_batch.",
        }]
    spec = importlib.util.spec_from_file_location("vno_batch_pptx", plugin)
    if not spec or not spec.loader:
        return [{"app": "3T Slide", "file": "-", "status": "FAIL", "details": "Could not load _batch_pptx.py."}]
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    runner = getattr(module, "run_batch", None)
    if not callable(runner):
        return [{"app": "3T Slide", "file": "-", "status": "FAIL", "details": "_batch_pptx.py must expose run_batch(root, input_dir, out_dir, names)."}]
    input_dir = input_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    result = runner(str(REPO_ROOT), str(input_dir), str(out_dir.resolve()), names)
    return list(result or [])


def _write_report(rows: list[dict[str, Any]], out_dir: Path, legacy_name: str | None = None) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    columns = ["app", "file", "status", "saved", "diffs", "Word pages", "saved pages", "page delta", "office", "lint", "edit", "seconds", "details"]
    report = out_dir / "batch_document_audit_report.md"
    with report.open("w", encoding="utf-8") as handle:
        handle.write("| " + " | ".join(columns) + " |\n")
        handle.write("|" + "|".join("---" for _ in columns) + "|\n")
        for row in rows:
            values = [str(row.get(column, "-") or "-").replace("|", "/").replace("\n", " ") for column in columns]
            handle.write("| " + " | ".join(values) + " |\n")
        handle.write(f"\nFiles: {len(rows)}; PASS: {sum(row.get('status') == 'PASS' for row in rows)}; FAIL: {sum(row.get('status') == 'FAIL' for row in rows)}; BLOCKED: {sum(row.get('status') == 'BLOCKED' for row in rows)}.\n")
    if legacy_name:
        (out_dir / legacy_name).write_text(report.read_text(encoding="utf-8"), encoding="utf-8")
    return report


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="mode", required=True)
    xlsx = subparsers.add_parser("xlsx", help="Run the 3T Sheet desktop round-trip audit.")
    xlsx.add_argument("worktree", type=Path)
    xlsx.add_argument("names", nargs="*")
    xlsx.add_argument("--input-dir", type=Path)
    xlsx.add_argument("--out-dir", type=Path)
    xlsx.add_argument("--reuse-saved", dest="reuse_saved", action="store_true", default=False, help="Reuse valid non-empty saved roundtrip files (default: True).")
    xlsx.add_argument("--no-reuse-saved", dest="reuse_saved", action="store_false", help="Force re-running desktop roundtrip save.")

    xls = subparsers.add_parser("xls", help="Run the legacy XLS desktop round-trip audit.")
    xls.add_argument("worktree", type=Path)
    xls.add_argument("names", nargs="*")
    xls.add_argument("--input-dir", type=Path)
    xls.add_argument("--out-dir", type=Path)

    for mode in ("docx", "pptx"):
        batch = subparsers.add_parser(mode, help=f"Run the {mode.upper()} desktop audit.")
        batch.add_argument("worktree", type=Path)
        batch.add_argument("input_dir", type=Path)
        batch.add_argument("out_dir", type=Path)
        batch.add_argument("names", nargs="*")

    all_modes = subparsers.add_parser("all", help="Run available audits and write one three-app report.")
    all_modes.add_argument("worktree", type=Path)
    all_modes.add_argument("--xlsx-dir", type=Path)
    all_modes.add_argument("--docx-dir", type=Path)
    all_modes.add_argument("--pptx-dir", type=Path)
    all_modes.add_argument("--out-dir", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    worktree = args.worktree.resolve()
    out_dir = getattr(args, "out_dir", None)
    if args.mode == "xlsx":
        input_dir = (args.input_dir or worktree / "file test" / "lan").resolve()
        out_dir = (out_dir or worktree / "_batch_document_audit").resolve()
        rows = _run_xlsx(worktree, input_dir, out_dir, args.names, reuse_saved=getattr(args, "reuse_saved", False))
        report = _write_report(rows, out_dir, "_batch_audit_report.md")
    elif args.mode == "xls":
        input_dir = (args.input_dir or worktree / "file test" / "lan-legacy").resolve()
        out_dir = (out_dir or worktree / "_batch_xls_out").resolve()
        plugin = SCRIPT_DIR / "_batch_xls_roundtrip.py"
        cmd = [sys.executable, str(plugin), str(worktree), str(input_dir), str(out_dir)] + list(args.names or [])
        proc = subprocess.run(cmd, cwd=REPO_ROOT, check=False)
        report = out_dir / "_batch_xls_report.md"
        print("report: " + str(report))
        return proc.returncode
    elif args.mode == "docx":
        out_dir = args.out_dir.resolve()
        rows = _run_docx(args.input_dir.resolve(), out_dir, args.names)
        report = _write_report(rows, out_dir, "_batch_writer_report.md")
    elif args.mode == "pptx":
        out_dir = args.out_dir.resolve()
        rows = _run_pptx(args.input_dir.resolve(), out_dir, args.names)
        report = _write_report(rows, out_dir)
    else:
        out_dir = (args.out_dir or worktree / "_batch_document_audit").resolve()
        rows = []
        xlsx_dir = (args.xlsx_dir or worktree / "file test" / "lan").resolve()
        docx_dir = (args.docx_dir or worktree / "file test" / "landocx").resolve()
        pptx_dir = (args.pptx_dir or worktree / "file test" / "lanpptx").resolve()
        if xlsx_dir.is_dir():
            rows.extend(_run_xlsx(worktree, xlsx_dir, out_dir / "xlsx", []))
        else:
            rows.append({"app": "3T Sheet", "file": "-", "status": "BLOCKED", "details": "XLSX input directory is missing."})
        if docx_dir.is_dir():
            rows.extend(_run_docx(docx_dir, out_dir / "docx", []))
        else:
            rows.append({"app": "3T Doc", "file": "-", "status": "BLOCKED", "details": "DOCX input directory is missing."})
        rows.extend(_run_pptx(pptx_dir, out_dir / "pptx", []))
        report = _write_report(rows, out_dir)
    print("report: " + str(report))
    failures = sum(row.get("status") == "FAIL" for row in rows)
    blocked = sum(row.get("status") == "BLOCKED" for row in rows)
    return 1 if failures or blocked else 0


if __name__ == "__main__":
    raise SystemExit(main())
