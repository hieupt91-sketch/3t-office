"""Word for Mac oracle: page / paragraph / word count of .docx files (ORACLE-1).

Each file is copied read-only to the staging dir (~/Pictures/3t-oracle-staging, readable by
the sandboxed app without "Grant File Access"), opened read-only, repaginated, measured with
`compute statistics`, then closed without saving. The source file is never touched.

Usage (repo root, through the heavy lock):
  .../heavy-lock.sh <agent> -- /Volumes/Data/Worktrees/_lead/venv-dev/bin/python \
      tests/macos/oracle/word_stats.py tests/fixtures/real-office-samples/*.docx --out results.json
  --pdf-dir DIR also exports a PDF (DIR must be writable by the sandboxed Word).
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

APP = "Microsoft Word"


def build_script(staged: Path, pdf_path: Path | None = None) -> str:
    pdf = ""
    if pdf_path is not None:
        pdf = f"save as d file name {oc.as_string_literal(str(pdf_path))} file format format PDF\n"
    return f'''tell application "Microsoft Word"
with timeout of 180 seconds
set docsBefore to count of documents
open (POSIX file {oc.as_string_literal(str(staged))}) read only true confirm conversions false add to recent files false
set d to active document
repaginate d
set pg to compute statistics d statistic statistic pages
set para to compute statistics d statistic statistic paragraphs
set wds to compute statistics d statistic statistic words
set np to count of paragraphs of d
{pdf}close d saving no
end timeout
return {{pg, para, wds, np, docsBefore}}
end tell'''


def parse_result(stdout: str) -> dict:
    values = oc.parse_applescript(stdout)
    if not isinstance(values, list) or len(values) < 4:
        raise ValueError(f"unexpected Word result: {stdout!r}")
    pages, paragraphs, words, para_objects = (int(v) for v in values[:4])
    return {"pages": pages, "paragraphs": paragraphs, "words": words, "paragraphObjects": para_objects}


def measure(path: Path, pdf_dir: Path | None, timeout: float) -> dict:
    staged = oc.stage_copy(path)
    started = time.monotonic()
    try:
        pdf_path = (pdf_dir / f"{path.stem}.word-mac.pdf") if pdf_dir else None
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
            print(f"OK {path.name}: pages={row['pages']} paragraphs={row['paragraphs']} words={row['words']}", flush=True)
            rows.append(row)
    finally:
        oc.quit_if_launched(APP, was_running)
    if args.out:
        args.out.write_text(json.dumps({"generatedFrom": f"Word for Mac {oc.office_version(APP)}",
                                        "measuredAt": oc.now_iso(), "rows": rows}, ensure_ascii=False, indent=1) + "\n",
                            encoding="utf-8")
    return status


if __name__ == "__main__":
    sys.exit(main())
