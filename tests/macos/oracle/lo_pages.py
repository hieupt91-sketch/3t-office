"""3T side of the Doc/Slide parity check: page / slide count via the pilot LibreOffice (ORACLE-1).

Mirrors main.py `_run_soffice_convert(..., "pdf", app_kind=writer|slides)` CLI path: same
headless flags and export filters (writer_pdf_Export / impress_pdf_Export), but with a
throw-away profile and output dir OUTSIDE the repo. Page count reuses
platform/print/print_pipeline.py `fast_pdf_page_count` (loaded read-only), with an
independent /Type /Page object count as fallback. Also reads the structural slide count
(ppt/presentation.xml <p:sldId>) and hidden slides (show="0").

Usage (repo root, through the heavy lock):
  export VNOFFICE_SOFFICE_PATH=.../LibreOffice.app/Contents/MacOS/soffice
  .../heavy-lock.sh <agent> -- /Volumes/Data/Worktrees/_lead/venv-dev/bin/python \
     tests/macos/oracle/lo_pages.py FILE... --work-dir /tmp/scratch --out lo.json
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FILTERS = {".docx": ("writer", "writer_pdf_Export"), ".doc": ("writer", "writer_pdf_Export"),
           ".odt": ("writer", "writer_pdf_Export"), ".pptx": ("slides", "impress_pdf_Export"),
           ".ppt": ("slides", "impress_pdf_Export"), ".odp": ("slides", "impress_pdf_Export")}
_PAGE_OBJECT_RE = re.compile(rb"/Type\s*/Page(?![A-Za-z])")


def _load_fast_counter():
    path = REPO / "platform" / "print" / "print_pipeline.py"
    spec = importlib.util.spec_from_file_location("vno_print_pipeline_ro", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.fast_pdf_page_count


def pdf_page_count(pdf: Path) -> tuple[int | None, str]:
    try:
        n = _load_fast_counter()(str(pdf))
    except Exception:  # loader problems fall through to the independent count, reported as such
        n = None
    if n is not None:
        return n, "fast_pdf_page_count"
    objects = len(_PAGE_OBJECT_RE.findall(pdf.read_bytes()))
    return (objects or None), "page-objects"


def pptx_structure(path: Path) -> dict:
    with zipfile.ZipFile(path) as z:
        pres = z.read("ppt/presentation.xml").decode("utf-8", "replace")
        ids = re.findall(r"<p:sldId\b[^>]*r:id=\"([^\"]+)\"", pres)
        rels = z.read("ppt/_rels/presentation.xml.rels").decode("utf-8", "replace")
        hidden = 0
        for rid in ids:
            m = re.search(rf'Id="{re.escape(rid)}"[^>]*Target="([^"]+)"', rels) or \
                re.search(rf'Target="([^"]+)"[^>]*Id="{re.escape(rid)}"', rels)
            if not m:
                continue
            target = m.group(1)
            part = target.lstrip("/") if target.startswith("/") else "ppt/" + target
            try:
                head = z.read(part)[:600].decode("utf-8", "replace")
            except KeyError:
                continue
            if re.search(r'<p:sld\b[^>]*\bshow="(0|false)"', head):
                hidden += 1
    return {"structSlides": len(ids), "structHidden": hidden}


def convert(path: Path, soffice: str, work: Path, timeout: float) -> dict:
    kind, filt = FILTERS[path.suffix.lower()]
    out_dir = work / f"out-{path.stem}"
    out_dir.mkdir(parents=True, exist_ok=True)
    profile = work / f"lo-profile-{kind}"
    cmd = [soffice, "--headless", "--invisible", "--nocrashreport", "--nodefault", "--nolockcheck", "--nologo",
           "--norestore", f"-env:UserInstallation={profile.as_uri()}", "--convert-to", f"pdf:{filt}",
           "--outdir", str(out_dir), str(path)]
    started = time.monotonic()
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    seconds = round(time.monotonic() - started, 2)
    pdf = out_dir / f"{path.stem}.pdf"
    if proc.returncode != 0 or not pdf.is_file():
        return {"file": path.name, "status": "FAIL", "seconds": seconds,
                "error": (proc.stderr or proc.stdout).strip()[-400:]}
    pages, method = pdf_page_count(pdf)
    row = {"file": path.name, "status": "OK", "kind": kind, "pages": pages, "countMethod": method,
           "seconds": seconds, "pdf": str(pdf)}
    if kind == "slides":
        row.update(pptx_structure(path) if path.suffix.lower() == ".pptx" else {})
    return row


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--soffice", default=os.environ.get("VNOFFICE_SOFFICE_PATH"))
    ap.add_argument("--work-dir", type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--timeout", type=float, default=300.0)
    args = ap.parse_args(argv)
    if not args.soffice or not Path(args.soffice).is_file():
        print("BLOCKED: set VNOFFICE_SOFFICE_PATH or --soffice to the pilot soffice", file=sys.stderr)
        return 2
    work = args.work_dir or Path(tempfile.mkdtemp(prefix="3t-oracle-lo-"))
    if REPO in work.resolve().parents or work.resolve() == REPO:
        print("refusing to write PDFs inside the repo; pass --work-dir outside it", file=sys.stderr)
        return 2
    work.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in args.files:
        try:
            row = convert(path.resolve(), args.soffice, work, args.timeout)
        except subprocess.TimeoutExpired:
            row = {"file": path.name, "status": "FAIL", "error": f"soffice timeout {args.timeout}s"}
        rows.append(row)
        print(f"{row['status']} {path.name}: pages={row.get('pages')} ({row.get('seconds')}s)", flush=True)
    if args.out:
        version = ""
        try:
            version = subprocess.run([args.soffice, "--version"], capture_output=True, text=True, timeout=60).stdout.strip()
        except Exception:
            pass
        args.out.write_text(json.dumps({"generatedFrom": f"3T pilot LibreOffice {version}".strip(), "rows": rows},
                                       ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0 if all(r["status"] == "OK" for r in rows) else 1


if __name__ == "__main__":
    sys.exit(main())
