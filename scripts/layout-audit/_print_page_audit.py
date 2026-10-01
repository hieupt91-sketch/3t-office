"""Compare app print-page counts with hidden Office COM for 3T Doc/Sheet/Slide.

Usage:
  python scripts/layout-audit/_print_page_audit.py <worktree> <out-dir> <file> [file ...]

Every app session is a real main.py/WebView2 desktop process driven only through CDP.
Office is opened hidden through COM, one file at a time, with RPC_E_CALL_REJECTED retry.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CDP_DRIVER = ROOT / "tests" / "live" / "cdp" / "print-page-count.mjs"
OFFICE_ORACLES = {
    "writer": "_word_oracle3.ps1",
    "sheet": "_excel_oracle_print_pages.ps1",
    "slides": "_powerpoint_oracle_pages.ps1",
}


def _app_for_file(path: Path) -> str | None:
    extension = path.suffix.lower()
    if extension in {".docx", ".doc", ".odt", ".fodt", ".rtf"}:
        return "writer"
    if extension in {".xlsx", ".xls", ".ods", ".fods", ".csv"}:
        return "sheet"
    if extension in {".pptx", ".ppt", ".odp", ".fodp"}:
        return "slides"
    return None


def _run_office_oracle(app: str, source: Path) -> tuple[str, str, str]:
    powershell = shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return "BLOCKED", "-", "PowerShell is unavailable for hidden Office COM."
    command = [powershell, "-NoProfile", "-File", str(ROOT / "scripts" / "layout-audit" / OFFICE_ORACLES[app])]
    if app == "writer":
        command.extend(["-File", str(source.resolve())])
    else:
        command.extend(["-File", str(source.resolve())])
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=420,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return "FAIL", "?", "Hidden Office COM page count timed out."
    output = ((result.stdout or "") + (result.stderr or "")).strip()
    match = re.search(r"OK pages=(\d+)", output)
    if match:
        return "PASS", match.group(1), output[-1200:]
    status = "BLOCKED" if output.startswith("BLOCKED") or "not registered" in output.lower() else "FAIL"
    return status, "?", output[-1200:] or "No Office page-count result."


def _run_app_audit(app: str, source: Path, output_pdf: Path) -> dict[str, Any]:
    node = shutil.which("node")
    if not node:
        return {"status": "BLOCKED", "error": "Node.js is unavailable."}
    command = [
        node,
        "--experimental-websocket",
        str(CDP_DRIVER),
        "--app",
        app,
        "--input",
        str(source.resolve()),
        "--output",
        str(output_pdf.resolve()),
    ]
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=1200,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"status": "FAIL", "error": "WebView2 print-page audit timed out after 20 minutes."}
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
    detail = (result.stderr or result.stdout or "No WebView2 print-page result.").strip()
    return {"status": "FAIL", "error": detail[-1600:]}


def _run_one(output_dir: Path, source: Path) -> dict[str, Any]:
    app = _app_for_file(source)
    if app is None:
        return {"file": source.name, "status": "BLOCKED", "error": "Unsupported document extension."}
    started = time.monotonic()
    pdf = output_dir / (source.stem + ".print.pdf")
    result: dict[str, Any] = {
        "file": source.name,
        "app": app,
        "app_status": "NOT RUN",
        "office_status": "NOT RUN",
        "office_pages": None,
        "office_detail": "",
    }
    if not source.is_file():
        result.update(status="BLOCKED", error="Input file does not exist.")
        return result

    app_result = _run_app_audit(app, source, pdf)
    result.update(app_result)
    office_status, office_pages, office_detail = _run_office_oracle(app, source)
    result.update({
        "app_status": app_result.get("status", "FAIL"),
        "office_status": office_status,
        "office_pages": office_pages,
        "office_detail": office_detail,
    })
    if app_result.get("status") != "PASS":
        result["status"] = app_result.get("status", "FAIL")
        result["seconds"] = round(time.monotonic() - started, 1)
        print(
            source.name, result["status"],
            "Office=" + str(office_pages),
            "app=" + str(result["app_status"]),
            "seconds=" + str(result["seconds"]),
            flush=True,
        )
        return result
    try:
        reference_pages = int(office_pages)
        result["print_delta_vs_office"] = int(result["print_pages"]) - reference_pages
        result["export_delta_vs_office"] = int(result["export_pages"]) - reference_pages
        result["print_export_delta"] = int(result["print_pages"]) - int(result["export_pages"])
    except (TypeError, ValueError):
        result["print_delta_vs_office"] = None
        result["export_delta_vs_office"] = None
        result["print_export_delta"] = int(result["print_pages"]) - int(result["export_pages"])
    result["seconds"] = round(time.monotonic() - started, 1)
    if office_status in {"FAIL", "BLOCKED"}:
        result["status"] = office_status
    print(
        source.name,
        result.get("status"),
        "app=" + str(result.get("app_status")),
        "Office=" + str(office_pages),
        "print=" + str(result.get("print_pages")),
        "PDF=" + str(result.get("export_pages")),
        "delta=" + str(result.get("print_delta_vs_office")),
        "seconds=" + str(result["seconds"]),
        flush=True,
    )
    return result


def _write_reports(output_dir: Path, results: list[dict[str, Any]]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "print_page_comparison.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8",
    )
    columns = [
        "app", "file", "status", "app_status", "office_status", "office_pages",
        "canvas_pages", "print_pages", "export_pages",
        "print_delta_vs_office", "export_delta_vs_office", "print_export_delta", "app_print_engine", "seconds",
    ]
    lines = [
        "# Print page-count comparison",
        "",
        "| " + " | ".join(columns) + " |",
        "|" + "|".join("---" for _ in columns) + "|",
    ]
    for row in results:
        values = [str(row.get(column, "-") if row.get(column) is not None else "-").replace("|", "/") for column in columns]
        lines.append("| " + " | ".join(values) + " |")
    lines.extend([
        "",
        f"Files: {len(results)}; PASS: {sum(row.get('status') == 'PASS' for row in results)}; "
        f"FAIL: {sum(row.get('status') == 'FAIL' for row in results)}; "
        f"BLOCKED: {sum(row.get('status') == 'BLOCKED' for row in results)}.",
        "",
        "Office, canvas, print-preview, and exported PDF page counts are shown separately. "
        "A zero delta means page counts match.",
    ])
    (output_dir / "print_page_comparison.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    arguments = sys.argv[1:] if argv is None else argv
    if len(arguments) < 3:
        print("Usage: python _print_page_audit.py <worktree> <out-dir> <file> [file ...]", file=sys.stderr)
        return 2
    _worktree = Path(arguments[0]).resolve()
    output_dir = Path(arguments[1]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    results = [_run_one(output_dir, Path(value).resolve()) for value in arguments[2:]]
    _write_reports(output_dir, results)
    print("report: " + str(output_dir / "print_page_comparison.md"))
    return 1 if any(row.get("status") in {"FAIL", "BLOCKED"} for row in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
