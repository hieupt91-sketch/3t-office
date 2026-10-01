"""CH-5.3: compare legacy .doc/.xls/.ppt conversions in 3T and Microsoft Office."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

from _ch5_samples import DEFAULT_SHARE_ROOT, copy_share_samples

ROOT = Path(__file__).resolve().parents[2]
LAYOUT = Path(__file__).resolve().parent
COM_PROBE = LAYOUT / "_office_fidelity_metrics.ps1"
CDP_PROBE = LAYOUT / "_cdp_roundtrip.mjs"
TARGET_FORMAT = {"doc": ("writer", "docx"), "xls": ("sheet", "xlsx"), "ppt": ("slides", "pptx")}


def run_desktop(app: str, source: Path, target: Path) -> dict:
    result = subprocess.run(
        ["node", str(CDP_PROBE), app, str(source), str(target)],
        capture_output=True, text=True, cwd=ROOT, timeout=1200, encoding="utf-8", errors="replace",
    )
    for line in reversed((result.stdout or "").splitlines()):
        if line.startswith("CH5_RESULT "):
            try:
                parsed = json.loads(line[len("CH5_RESULT "):])
                if result.returncode and not parsed.get("error"):
                    parsed["error"] = (result.stderr or "Desktop save failed")[-400:].replace("\n", " ")
                return parsed
            except json.JSONDecodeError:
                break
    return {"loaded": False, "saved": False, "error": (result.stderr or result.stdout or "No CDP result")[-400:].replace("\n", " ")}


def run_office_metrics(kind: str, source: Path, saved: Path, office_saved: Path) -> dict:
    result = subprocess.run(
        [
            "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(COM_PROBE),
            "-Format", kind, "-Source", str(source), "-Saved", str(saved),
            "-OfficeConverted", str(office_saved),
        ],
        capture_output=True, text=True, timeout=900, encoding="utf-8", errors="replace",
    )
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout or "Office COM conversion failed")[-400:].replace("\n", " "))
    for line in reversed((result.stdout or "").splitlines()):
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue
    raise RuntimeError("Office COM returned no JSON metrics.")


def equal_value(left, right) -> bool:
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return abs(float(left) - float(right)) <= 0.01
    return left == right


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--share-root", default=DEFAULT_SHARE_ROOT)
    parser.add_argument("--samples-per-type", type=int, default=3)
    parser.add_argument("--output-root", default=str(ROOT / "file test" / "lanlegacy"))
    args = parser.parse_args()
    stamp = datetime.now().strftime("run-%Y%m%d-%H%M%S")
    run_root = Path(args.output_root) / stamp
    originals = run_root / "original"
    three_t_dir = run_root / "3t-converted"
    office_dir = run_root / "office-converted"
    three_t_dir.mkdir(parents=True, exist_ok=True)
    office_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    counter = 0
    samples_found = 0

    for kind, (app, new_extension) in TARGET_FORMAT.items():
        copied = copy_share_samples(
            args.share_root, f".{kind}", originals, args.samples_per_type, prefix=kind
        )
        if not copied:
            rows.append((kind, "-", "BLOCKED: no LAN sample found", "-", "-", "-", "-"))
            print(f"{kind}: 0 sample files found")
            continue
        for _, source in copied:
            counter += 1
            samples_found += 1
            sample_id = f"{kind}-{counter:03d}"
            three_t = three_t_dir / f"{sample_id}.{new_extension}"
            office = office_dir / f"{sample_id}.{new_extension}"
            desktop = run_desktop(app, source, three_t)
            if not desktop.get("loaded") or not desktop.get("saved") or not three_t.is_file():
                rows.append((kind, sample_id, "FAIL: 3T desktop open/save", "-", "-", "-", str(desktop.get("error", ""))[:120]))
                continue
            try:
                metrics = run_office_metrics(kind, source, three_t, office)
                original = metrics["Original"]
                office_stats = metrics["OfficeConverted"] or {}
                three_t_stats = metrics["ThreeT"]
                for metric in sorted(set(office_stats) & set(three_t_stats)):
                    matches = equal_value(office_stats[metric], three_t_stats[metric])
                    rows.append((
                        kind, sample_id, "PASS" if matches else "GAP",
                        metric, original.get(metric, "-"), office_stats[metric], three_t_stats[metric],
                    ))
            except Exception as error:
                rows.append((kind, sample_id, "FAIL: Office conversion/measurement", "-", "-", "-", str(error)[:140]))

    report = run_root / "_batch_legacy_fidelity_report.md"
    with report.open("w", encoding="utf-8") as handle:
        handle.write("# CH-5.3 legacy-format fidelity audit\n\n")
        handle.write(f"LAN legacy samples copied: {samples_found}; report and document copies remain under `{args.output_root}`.\n\n")
        handle.write("The Office baseline is a hidden COM Save As from the copied original. 3T open, display, and save runs through the desktop WebView2 CDP session.\n\n")
        handle.write("| source format | sample | status | metric | original | Office Save As | 3T Save As |\n")
        handle.write("|---|---|---|---|---:|---:|---:|\n")
        for row in rows:
            handle.write("| " + " | ".join(str(value) for value in row) + " |\n")
    print(f"Legacy samples: {samples_found}; PPT legacy samples missing are reported as BLOCKED.")
    for row in rows:
        print("\t".join(str(value) for value in row))
    print(f"report: {report}")
    return 0 if samples_found and all(row[2] == "PASS" for row in rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
