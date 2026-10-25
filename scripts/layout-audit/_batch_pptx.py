"""VN Slides desktop round-trip and fidelity audit hook for PPTX presentations.

Compatible with batch_document_audit.py pptx mode.
Usage:
  python scripts/layout-audit/_batch_pptx.py <worktree> <pptx-dir> <out-dir> [names...]
  python scripts/layout-audit/batch_document_audit.py pptx <worktree> <pptx-dir> <out-dir> [names...]
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
ORACLE_SCRIPT = SCRIPT_DIR / "_powerpoint_oracle_metrics.ps1"
NODE_ROUNDTRIP = REPO_ROOT / "tests" / "live" / "cdp" / "roundtrip-file.mjs"


def _powerpoint_oracle(path: Path, timeout: int = 300) -> dict[str, Any]:
    """Inspect presentation properties using hidden PowerPoint COM."""
    powershell = shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return {"status": "BLOCKED", "error": "PowerShell is unavailable for PowerPoint COM."}
    if not ORACLE_SCRIPT.is_file():
        return {"status": "BLOCKED", "error": f"Oracle script missing: {ORACLE_SCRIPT}"}

    command = [
        powershell,
        "-NoProfile",
        "-File",
        str(ORACLE_SCRIPT.resolve()),
        "-File",
        str(path.resolve()),
    ]
    try:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"status": "FAIL", "error": f"PowerPoint COM inspection timed out after {timeout}s."}

    stdout = (result.stdout or "").strip()
    # Try parsing last JSON line from stdout
    for line in reversed(stdout.splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                data = json.loads(line)
                return data
            except json.JSONDecodeError:
                pass

    detail = (stdout or result.stderr or "No PowerPoint oracle output.").strip()
    return {"status": "FAIL" if result.returncode != 0 else "BLOCKED", "error": detail[-1000:]}


def _run_desktop_roundtrip_pptx(
    source: Path,
    destination: Path,
    edit: bool = True,
    large_file: bool = False,
    timeout: int = 1800,
) -> dict[str, Any]:
    """Launch real VN Slides via CDP, edit slide 1 title minimally, and save via real pipeline."""
    node = shutil.which("node")
    if not node:
        return {"status": "BLOCKED", "message": "Node.js is not installed."}

    command = [
        node,
        "--experimental-websocket",
        str(NODE_ROUNDTRIP),
        "--app",
        "slides",
        "--input",
        str(source.resolve()),
        "--output",
        str(destination.resolve()),
    ]
    if edit:
        command.extend(["--edit", "true"])
    if large_file:
        command.extend(["--large-file", "true"])

    env = dict(os.environ)
    env.setdefault("VNO_AUDIT_MARK_DIRTY", "1")

    try:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
            env=env,
        )
    except subprocess.TimeoutExpired:
        return {"status": "FAIL", "message": f"Desktop CDP round-trip exceeded {timeout}s."}

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


def compare_pptx_metrics(orig: dict[str, Any], saved: dict[str, Any]) -> tuple[bool, list[str]]:
    """Compare PowerPoint COM metrics between original and saved roundtrip presentation.
    
    Checks:
    - slide count (so slide)
    - total shapes (so hinh)
    - total pictures (so anh)
    - has notes / slides with notes (co ghi chu)
    - has animation / slides with animation (co hoat anh)
    """
    diffs = []
    for metric, label in (
        ("slides", "slide count"),
        ("shapes", "shape count"),
        ("pics", "picture count"),
        ("withNotes", "notes count"),
        ("withAnim", "animation count"),
    ):
        v_orig = orig.get(metric)
        v_saved = saved.get(metric)
        if v_orig is not None and v_saved is not None:
            if v_orig != v_saved:
                diffs.append(f"{label} mismatch: orig={v_orig} saved={v_saved}")

    return (len(diffs) == 0, diffs)


def _pptx_inputs(input_dir: Path, names: list[str]) -> list[Path]:
    if names:
        paths = []
        for name in names:
            p = Path(name)
            if p.is_file():
                paths.append(p.resolve())
            else:
                leaf = p.name
                if leaf.lower().endswith(".pptx"):
                    paths.append((input_dir / leaf).resolve())
                else:
                    paths.append((input_dir / (leaf + ".pptx")).resolve())
        return paths
    return sorted(input_dir.glob("*.pptx"))


def run_batch(*args: Any, **kwargs: Any) -> list[dict[str, Any]]:
    """Execute PPTX batch audit.
    
    Can be called as:
      run_batch(root, input_dir, out_dir, names)
      run_batch(input_dir, out_dir, names)
    """
    if len(args) == 4:
        root_arg, input_arg, out_arg, names_arg = args
    elif len(args) == 3:
        input_arg, out_arg, names_arg = args
        root_arg = REPO_ROOT
    elif "input_dir" in kwargs and "out_dir" in kwargs:
        input_arg = kwargs["input_dir"]
        out_arg = kwargs["out_dir"]
        names_arg = kwargs.get("names", [])
        root_arg = kwargs.get("root", REPO_ROOT)
    else:
        raise ValueError("run_batch requires (input_dir, out_dir, names) or (root, input_dir, out_dir, names)")

    input_dir = Path(input_arg).resolve()
    out_dir = Path(out_arg).resolve()
    names = list(names_arg or [])

    os.environ.setdefault("VNO_AUDIT_MARK_DIRTY", "1")
    out_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, Any]] = []
    selected = _pptx_inputs(input_dir, names)

    for source in selected:
        started = time.monotonic()
        row: dict[str, Any] = {
            "app": "3T Slide",
            "file": source.name,
            "status": "FAIL",
            "saved": "no",
            "pages": "-",
            "Word pages": "-",
            "saved pages": "-",
            "page delta": "-",
            "diffs": "-",
            "office": "-",
            "lint": "-",
            "edit": "-",
            "details": "",
        }

        if not source.is_file():
            row.update(status="BLOCKED", details="Input presentation does not exist.")
            rows.append(row)
            continue

        # 1. Inspect original presentation with PowerPoint COM
        orig_oracle = _powerpoint_oracle(source)
        row["Word pages"] = str(orig_oracle.get("slides", "-"))

        # 2. Run app desktop roundtrip with minimal edit on slide 1
        saved = out_dir / (source.stem + ".roundtrip.pptx")
        large_file = source.stat().st_size > 15 * 1024 * 1024
        app_result = _run_desktop_roundtrip_pptx(source, saved, edit=True, large_file=large_file)

        row["saved"] = "yes" if saved.is_file() else "no"
        edit_result = app_result.get("edit") or {}
        row["edit"] = "PASS" if edit_result.get("pass") else "FAIL"

        details_parts = []
        if app_result.get("message"):
            details_parts.append(str(app_result["message"]))
        if edit_result.get("detail"):
            details_parts.append(str(edit_result["detail"]))

        # 3. If saved, inspect saved file with PowerPoint COM and compare
        if saved.is_file():
            saved_oracle = _powerpoint_oracle(saved)
            saved_slides = saved_oracle.get("slides", "-")
            row["saved pages"] = str(saved_slides)
            row["pages"] = str(saved_slides)

            try:
                orig_s = int(orig_oracle.get("slides", 0))
                saved_s = int(saved_slides)
                row["page delta"] = str(saved_s - orig_s)
            except (ValueError, TypeError):
                row["page delta"] = "?"

            orig_pass = orig_oracle.get("status") == "PASS"
            saved_pass = saved_oracle.get("status") == "PASS"

            if orig_pass and saved_pass:
                row["office"] = "PASS"
                matches, diff_list = compare_pptx_metrics(orig_oracle, saved_oracle)
                if matches and row["edit"] == "PASS" and app_result.get("status") == "PASS":
                    row["status"] = "PASS"
                    metric_summary = (
                        f"slides={saved_oracle.get('slides')}/{orig_oracle.get('slides')} "
                        f"shapes={saved_oracle.get('shapes')}/{orig_oracle.get('shapes')} "
                        f"pics={saved_oracle.get('pics')}/{orig_oracle.get('pics')} "
                        f"notes={saved_oracle.get('withNotes')}/{orig_oracle.get('withNotes')} "
                        f"anim={saved_oracle.get('withAnim')}/{orig_oracle.get('withAnim')}"
                    )
                    details_parts.append(metric_summary)
                else:
                    row["status"] = "FAIL"
                    if diff_list:
                        details_parts.extend(diff_list)
                    if row["edit"] != "PASS":
                        details_parts.append("Slide 1 edit failed")
                    if app_result.get("status") != "PASS":
                        details_parts.append(f"App roundtrip failed: {app_result.get('message', '')}")
            elif orig_oracle.get("status") == "BLOCKED" or saved_oracle.get("status") == "BLOCKED":
                row["office"] = "BLOCKED"
                row["status"] = "BLOCKED" if app_result.get("status") == "PASS" else "FAIL"
                details_parts.append(orig_oracle.get("error") or saved_oracle.get("error") or "PowerPoint COM blocked")
            else:
                row["office"] = "FAIL"
                row["status"] = "FAIL"
                details_parts.append(f"PowerPoint COM failed: orig={orig_oracle.get('error', '')} saved={saved_oracle.get('error', '')}")
        else:
            row["status"] = "FAIL"
            row["office"] = "-"
            details_parts.append("Saved presentation was not created")

        row["seconds"] = round(time.monotonic() - started, 1)
        row["details"] = "; ".join(p for p in details_parts if p)
        row["source"] = str(source)
        row["saved_path"] = str(saved)
        rows.append(row)

        print(
            source.name,
            row["status"],
            "PowerPoint=" + str(row["Word pages"]),
            "saved=" + str(row["saved pages"]),
            "edit=" + str(row["edit"]),
            "office=" + str(row["office"]),
            "seconds=" + str(row["seconds"]),
            flush=True,
        )

    return rows


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python _batch_pptx.py <worktree> <pptx-dir> <out-dir> [names...]")
        raise SystemExit(2)

    entry = Path(__file__).with_name("batch_document_audit.py")
    cmd = [
        sys.executable,
        str(entry),
        "pptx",
        sys.argv[1],
        sys.argv[2],
        sys.argv[3],
        *sys.argv[4:],
    ]
    raise SystemExit(subprocess.call(cmd))
