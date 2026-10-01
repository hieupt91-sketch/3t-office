"""CH-5.2: compare LAN PPTX counts in PowerPoint with a CDP desktop save round-trip."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from _ch5_samples import DEFAULT_SHARE_ROOT, copy_share_samples

ROOT = Path(__file__).resolve().parents[2]
LAYOUT = Path(__file__).resolve().parent
COM_PROBE = LAYOUT / "_office_fidelity_metrics.ps1"
CDP_PROBE = LAYOUT / "_cdp_roundtrip.mjs"


def run_office_metrics(source: Path, saved: Path, marker: str) -> dict:
    command = [
        "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(COM_PROBE),
        "-Format", "pptx", "-Source", str(source), "-Saved", str(saved), "-Marker", marker,
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=600, encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout or "PowerPoint COM measurement failed")[-400:].replace("\n", " "))
    for line in reversed((result.stdout or "").splitlines()):
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue
    raise RuntimeError("PowerPoint COM returned no JSON metrics.")


def run_desktop(source: Path, saved: Path, marker: str) -> tuple[dict, str]:
    result = subprocess.run(
        ["node", str(CDP_PROBE), "slides", str(source), str(saved), f"--marker={marker}"],
        capture_output=True, text=True, cwd=ROOT, timeout=1200, encoding="utf-8", errors="replace",
    )
    output = result.stdout or ""
    parsed = {}
    for line in reversed(output.splitlines()):
        if line.startswith("CH5_RESULT "):
            try:
                parsed = json.loads(line[len("CH5_RESULT "):])
            except json.JSONDecodeError:
                pass
            break
    if result.returncode and not parsed.get("error"):
        parsed["error"] = (result.stderr or output)[-400:].replace("\n", " ")
    return parsed, output


def same_count(left, right, key: str) -> bool:
    a, b = left.get(key), right.get(key)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) <= 0.01
    return a == b


def metric_pair(original: dict, saved: dict, key: str) -> str:
    return f"{original.get(key, '?')}/{saved.get(key, '?')}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--share-root", default=DEFAULT_SHARE_ROOT)
    parser.add_argument("--samples", type=int, default=10)
    parser.add_argument("--output-root", default=str(ROOT / "file test" / "lanpptx"))
    args = parser.parse_args()
    stamp = datetime.now().strftime("run-%Y%m%d-%H%M%S")
    run_root = Path(args.output_root) / stamp
    originals = run_root / "original"
    work = run_root / "working"
    saved_dir = run_root / "saved"
    copies = copy_share_samples(args.share_root, ".pptx", originals, args.samples, prefix="pptx")
    work.mkdir(parents=True, exist_ok=True)
    saved_dir.mkdir(parents=True, exist_ok=True)
    rows = []

    if not copies:
        rows.append(("pptx-000", "BLOCKED: no PPTX sample found on the share", "-", "-", "-", "-", "-", "-", "-", "-"))
    for index, (_, original) in enumerate(copies, 1):
        sample_id = f"pptx-{index:03d}"
        local_work = work / original.name
        saved = saved_dir / original.name
        marker = f"CH5-AUDIT-{index:03d}"
        shutil.copy2(original, local_work)
        desktop, _ = run_desktop(local_work, saved, marker)
        if not saved.is_file():
            rows.append((sample_id, "FAIL: desktop save missing", "-", "-", "-", "-", "-", "-", "no", "FAIL"))
            continue
        try:
            data = run_office_metrics(original, saved, marker)
            before, after = data["Original"], data["ThreeT"]
            invariant_keys = ("Slides", "Shapes", "Pictures", "NotesSlides", "NotesTextRuns", "SlideWidth", "SlideHeight")
            stable = all(same_count(before, after, key) for key in invariant_keys)
            text_runs_before, text_runs_after = before.get("TextRuns", 0), after.get("TextRuns", 0)
            text_runs_ok = abs(text_runs_before - text_runs_after) <= 1  # one marker run is expected
            marker_ok = bool(after.get("MarkerPresent"))
            desktop_ok = desktop.get("loaded") and desktop.get("saved")
            state = "PASS" if stable and text_runs_ok and marker_ok and desktop_ok else "FAIL"
            size_pair = f"{before.get('SlideWidth', '?')}×{before.get('SlideHeight', '?')}/{after.get('SlideWidth', '?')}×{after.get('SlideHeight', '?')}"
            rows.append((
                sample_id, state, metric_pair(before, after, "Slides"), metric_pair(before, after, "Shapes"),
                metric_pair(before, after, "Pictures"), metric_pair(before, after, "TextRuns"),
                metric_pair(before, after, "NotesSlides"), metric_pair(before, after, "NotesTextRuns"),
                size_pair, "yes" if marker_ok else "no",
            ))
        except Exception as error:
            rows.append((sample_id, f"FAIL: COM {str(error)[:120]}", "-", "-", "-", "-", "-", "-", "-", "no"))

    report = run_root / "_batch_pptx_fidelity_report.md"
    with report.open("w", encoding="utf-8") as handle:
        handle.write("# CH-5.2 PPTX fidelity audit\n\n")
        handle.write(f"LAN samples copied: {len(copies)}; report and document copies remain under `{args.output_root}`.\n\n")
        handle.write("Counts are hidden PowerPoint COM values before and after a 3T Slide desktop save. The marker may add one text run; larger text-run differences are reported as a failure.\n\n")
        handle.write("| sample | status | slides O/S | shapes O/S | pictures O/S | text runs O/S | notes slides O/S | note runs O/S | slide size O/S (pt) | marker saved |\n")
        handle.write("|---|---|---:|---:|---:|---:|---:|---:|---|---|\n")
        for row in rows:
            handle.write("| " + " | ".join(str(value) for value in row) + " |\n")
    print(f"PPTX samples: {len(copies)}")
    for row in rows:
        print("\t".join(str(value) for value in row))
    print(f"report: {report}")
    return 0 if copies and all(row[1] == "PASS" for row in rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
