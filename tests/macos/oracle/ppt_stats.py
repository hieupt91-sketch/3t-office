"""PowerPoint for Mac oracle: slide count of .pptx files (ORACLE-1).

Each file is copied read-only to the staging dir (~/Pictures/3t-oracle-staging), opened,
counted, optionally exported to PDF, then closed without saving. The source is never touched.

Usage (repo root, through the heavy lock):
  .../heavy-lock.sh <agent> -- /Volumes/Data/Worktrees/_lead/venv-dev/bin/python \
      tests/macos/oracle/ppt_stats.py tests/fixtures/real-office-samples/*.pptx --out results.json
  --pdf-dir DIR also exports a PDF (DIR must be writable by the sandboxed PowerPoint).
  --dry-run prints the AppleScript for the first file.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import oracle_common as oc  # noqa: E402

APP = "Microsoft PowerPoint"


def build_script(staged: Path, pdf_path: Path | None = None) -> str:
    pdf = ""
    if pdf_path is not None:
        pdf = f"save p in (POSIX file {oc.as_string_literal(str(pdf_path))}) as save as PDF\n"
    return f'''tell application "Microsoft PowerPoint"
with timeout of 180 seconds
open (POSIX file {oc.as_string_literal(str(staged))})
set p to active presentation
set n to count of slides of p
set hiddenCount to 0
repeat with s in slides of p
try
if hidden of slide show transition of s then set hiddenCount to hiddenCount + 1
end try
end repeat
{pdf}close p saving no
end timeout
return {{n, hiddenCount}}
end tell'''


def parse_result(stdout: str) -> dict:
    values = oc.parse_applescript(stdout)
    if not isinstance(values, list) or len(values) < 2:
        raise ValueError(f"unexpected PowerPoint result: {stdout!r}")
    return {"slides": int(values[0]), "hiddenSlides": int(values[1])}


def measure(path: Path, pdf_dir: Path | None, timeout: float) -> dict:
    staged = oc.stage_copy(path)
    started = time.monotonic()
    try:
        pdf_path = (pdf_dir / f"{path.stem}.ppt-mac.pdf") if pdf_dir else None
        result = parse_result(oc.run_osascript(build_script(staged, pdf_path), timeout=timeout))
        if pdf_path:
            result["pdf"] = str(pdf_path)
    finally:
        oc.unstage(staged)
    result.update(file=path.name, seconds=round(time.monotonic() - started, 2))
    return result


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--pdf-dir", type=Path)
    ap.add_argument("--timeout", type=float, default=240.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    if args.dry_run:
        print(build_script(args.files[0], args.pdf_dir / "x.pdf" if args.pdf_dir else None))
        return 0
    was_running = oc.app_is_running(APP)
    rows, status = [], 0
    try:
        for path in args.files:
            try:
                row = measure(path, args.pdf_dir, args.timeout)
            except (oc.OfficeBlocked, ValueError) as exc:
                row = {"file": path.name, "status": "BLOCKED" if isinstance(exc, oc.OfficeBlocked) else "FAIL",
                       "error": str(exc)}
                status = 3
                print(f"{row['status']} {path.name}: {exc}", flush=True)
                rows.append(row)
                if isinstance(exc, oc.OfficeBlocked) and exc.code in (-1743, -1712):
                    break
                continue
            row["status"] = "OK"
            print(f"OK {path.name}: slides={row['slides']}", flush=True)
            rows.append(row)
    finally:
        oc.quit_if_launched(APP, was_running)
    if args.out:
        args.out.write_text(json.dumps({"generatedFrom": f"PowerPoint for Mac {oc.office_version(APP)}",
                                        "measuredAt": oc.now_iso(), "rows": rows}, ensure_ascii=False, indent=1) + "\n",
                            encoding="utf-8")
    return status


if __name__ == "__main__":
    sys.exit(main())
