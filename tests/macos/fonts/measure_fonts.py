"""MAC-9: page count + embedded font names of LibreOffice PDF exports, before/after the font substitution table.

Uses the same headless flags and PDF filters as main.py `_run_soffice_convert(..., "pdf", app_kind=...)`
(writer_pdf_Export / impress_pdf_Export). Each run gets a throw-away profile under --work-dir (outside the repo):
  --mode before : no font configuration (the engine's default before MAC-9: bundled fonts only)
  --mode after  : the font configuration main.py writes at start-up (adapters/libreoffice/common/engine_fonts.py
                  + the OS backend's folders and substitution table), selected with FONTCONFIG_FILE
Font names come straight from the /BaseFont entries of the PDF (no PDF library needed); the subset prefix
"ABCDEF+" is dropped. Page count reuses platform/print/print_pipeline.py `fast_pdf_page_count`.

Run heavy batches through the shared lock:
  /Volumes/Data/Worktrees/_lead/heavy-lock.sh <agent> -- python tests/macos/fonts/measure_fonts.py \
      --mode before --work-dir <scratch>/m-before --out <scratch>/before.json FILE...
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FILTERS = {".docx": ("writer", "writer_pdf_Export"), ".doc": ("writer", "writer_pdf_Export"),
           ".odt": ("writer", "writer_pdf_Export"), ".pptx": ("slides", "impress_pdf_Export"),
           ".odp": ("slides", "impress_pdf_Export")}
_BASEFONT_RE = re.compile(rb"/BaseFont\s*/([^\s/\[\]<>()]+)")


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pdf_fonts(data: bytes) -> list[str]:
    names = set()
    for raw in _BASEFONT_RE.findall(data):
        name = re.sub(rb"#([0-9A-Fa-f]{2})", lambda m: bytes([int(m.group(1), 16)]), raw).decode("utf-8", "replace")
        names.add(name.split("+", 1)[1] if re.match(r"^[A-Z]{6}\+", name) else name)
    return sorted(names)


def document_fonts():
    """The OS DocumentFonts service exactly as the app uses it (None on an OS without one)."""
    services_pkg = REPO / "platform" / "os_services"
    spec = importlib.util.spec_from_file_location("_vno_os_services", services_pkg / "__init__.py",
                                                  submodule_search_locations=[str(services_pkg)])
    module = importlib.util.module_from_spec(spec)
    sys.modules["_vno_os_services"] = module
    spec.loader.exec_module(module)
    return module.get_services().document_fonts


def engine_env(work: Path, mode: str) -> dict:
    """before: the engine's own default (no font configuration); after: the file main.py writes at start-up."""
    env = {k: v for k, v in os.environ.items() if k != "FONTCONFIG_FILE"}
    if mode == "after":
        adapter = _load("vno_engine_fonts", REPO / "adapters" / "libreoffice" / "common" / "engine_fonts.py")
        result = adapter.write_engine_font_config(work / "engine-fonts", document_fonts())
        if not result.ok:
            raise RuntimeError(f"font configuration not written: {result.reason}")
        env.update(adapter.engine_environment(result))
    return env


def convert(paths: list[Path], soffice: str, work: Path, mode: str, timeout: float) -> list[dict]:
    counter = _load("vno_print_pipeline_ro", REPO / "platform" / "print" / "print_pipeline.py").fast_pdf_page_count
    rows = []
    env = engine_env(work, mode)
    groups: dict[str, list[Path]] = {}
    for path in paths:
        groups.setdefault(path.suffix.lower(), []).append(path)
    for suffix, files in groups.items():
        kind, filt = FILTERS[suffix]
        profile = work / f"lo-profile-{kind}"
        shutil.rmtree(profile, ignore_errors=True)
        out_dir = work / f"pdf-{kind}"
        out_dir.mkdir(parents=True, exist_ok=True)
        cmd = [soffice, "--headless", "--invisible", "--nocrashreport", "--nodefault", "--nolockcheck", "--nologo",
               "--norestore", f"-env:UserInstallation={profile.as_uri()}", "--convert-to", f"pdf:{filt}",
               "--outdir", str(out_dir), *map(str, files)]
        started = time.monotonic()
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
        seconds = round(time.monotonic() - started, 2)
        for path in files:
            pdf = out_dir / f"{path.stem}.pdf"
            if not pdf.is_file():
                rows.append({"file": path.name, "status": "FAIL", "rc": proc.returncode,
                             "error": (proc.stderr or proc.stdout).strip()[-300:]})
                continue
            data = pdf.read_bytes()
            rows.append({"file": path.name, "status": "OK", "kind": kind, "pages": counter(str(pdf)),
                         "fonts": pdf_fonts(data), "pdf": str(pdf), "batchSeconds": seconds})
    return rows


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--mode", choices=("before", "after"), required=True)
    ap.add_argument("--soffice", default=os.environ.get("VNOFFICE_SOFFICE_PATH"))
    ap.add_argument("--work-dir", type=Path, required=True)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--timeout", type=float, default=900.0)
    args = ap.parse_args(argv)
    if not args.soffice or not Path(args.soffice).is_file():
        print("BLOCKED: set VNOFFICE_SOFFICE_PATH or --soffice", file=sys.stderr)
        return 2
    work = args.work_dir.resolve()
    if work == REPO or REPO in work.parents:
        print("refusing to write inside the repo; pass --work-dir outside it", file=sys.stderr)
        return 2
    work.mkdir(parents=True, exist_ok=True)
    rows = convert([p.resolve() for p in args.files], args.soffice, work, args.mode, args.timeout)
    for row in rows:
        print(f"{row['status']} {row['file']}: pages={row.get('pages')} fonts={','.join(row.get('fonts', []))}")
    if args.out:
        args.out.write_text(json.dumps({"mode": args.mode, "rows": rows}, ensure_ascii=False, indent=1) + "\n",
                            encoding="utf-8")
    return 0 if all(r["status"] == "OK" for r in rows) else 1


if __name__ == "__main__":
    sys.exit(main())
