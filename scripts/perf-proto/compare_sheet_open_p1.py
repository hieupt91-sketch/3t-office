"""Compare every P1 Sheet-open checkpoint with the preserved legacy path.

The script converts each XLSX to raw FODS once, then runs both paths in fresh
index-cache states. It hashes overlay, optimized FODS, final XF FODS, and a
stable JSON serialization of the payload dictionary.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402
from adapters.libreoffice.sheet.sheet_open_payload import (  # noqa: E402
    build_sheet_open_payload,
    build_sheet_open_payload_legacy,
)


PATCHER = vnmain._ooxml_zip_patch()
LAN_NAME_RE = re.compile(r"lan\d{2}\.xlsx$", re.IGNORECASE)


def _sha_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _stable_payload_sha(payload: dict) -> tuple[str, int]:
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest(), len(serialized)


def _raw_fods(xlsx_path: Path, xlsx_bytes: bytes, cache_path: Path) -> str:
    if cache_path.is_file():
        return cache_path.read_text(encoding="utf-8", errors="replace")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    import_bytes = PATCHER.make_all_sheets_visible_for_import(xlsx_bytes)
    with tempfile.TemporaryDirectory(prefix="vno_p1_compare_") as temp_dir:
        source = xlsx_path
        if import_bytes != xlsx_bytes:
            source = Path(temp_dir) / "import-visible.xlsx"
            source.write_bytes(import_bytes)
        converted = vnmain._run_soffice_convert(
            str(source), "fods", temp_dir, app_kind="sheet"
        )
        cache_path.write_bytes(Path(converted).read_bytes())
    return cache_path.read_text(encoding="utf-8", errors="replace")


def _run_path(
    mode: str,
    xlsx_bytes: bytes,
    raw_fods: str,
    *,
    skip_initial_xf: bool,
) -> dict:
    PATCHER._INDEX_MEMO.clear()
    timings = {}
    started = time.perf_counter()
    if mode == "legacy":
        overlay = PATCHER.overlay_sheet_xlsx_fods(
            xlsx_bytes, raw_fods, skip_initial_xf=skip_initial_xf
        )
    else:
        overlay = PATCHER.overlay_sheet_xlsx_fods_p1(
            xlsx_bytes, raw_fods, skip_initial_xf=skip_initial_xf
        )
    timings["overlay"] = time.perf_counter() - started
    overlay_sha = _sha_text(overlay)

    started = time.perf_counter()
    if mode == "legacy":
        optimized = PATCHER.optimize_fods_streaming_legacy(overlay)
    else:
        optimized = PATCHER.optimize_fods_streaming(overlay)
    timings["optimize"] = time.perf_counter() - started
    optimized_sha = _sha_text(optimized)
    del overlay

    started = time.perf_counter()
    if mode == "legacy":
        final_fods, payload = build_sheet_open_payload_legacy(
            xlsx_bytes, optimized, PATCHER
        )
    else:
        previous = os.environ.pop("VNO_OPEN_LEGACY", None)
        try:
            final_fods, payload = build_sheet_open_payload(
                xlsx_bytes, optimized, PATCHER
            )
        finally:
            if previous is not None:
                os.environ["VNO_OPEN_LEGACY"] = previous
    timings["payload"] = time.perf_counter() - started
    del optimized
    payload_sha, payload_bytes = _stable_payload_sha(payload)
    result = {
        "checkpoint_sha256": {
            "overlay": overlay_sha,
            "optimize": optimized_sha,
            "final_fods": _sha_text(final_fods),
            "payload_stable_json": payload_sha,
        },
        "chars": {
            "final_fods": len(final_fods),
            "payload_stable_json_bytes": payload_bytes,
        },
        "seconds": {name: round(value, 3) for name, value in timings.items()},
    }
    result["seconds"]["python_total"] = round(sum(timings.values()), 3)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--raw-cache", required=True)
    parser.add_argument("--result", required=True)
    parser.add_argument(
        "--only",
        action="append",
        help="File stem such as lan14; repeat for multiple files",
    )
    parser.add_argument("--skip-initial-xf", action="store_true")
    args = parser.parse_args()

    corpus = Path(args.corpus).resolve()
    only = {item.lower() for item in (args.only or [])}
    files = sorted(
        (
            path
            for path in corpus.iterdir()
            if path.is_file()
            and LAN_NAME_RE.fullmatch(path.name)
            and (not only or path.stem.lower() in only)
        ),
        key=lambda path: path.name.lower(),
    )
    if not files:
        raise SystemExit("No matching lanNN.xlsx files")

    report = {
        "corpus": str(corpus),
        "skip_initial_xf": bool(args.skip_initial_xf),
        "files": [],
    }
    failures = 0
    for xlsx_path in files:
        xlsx_bytes = xlsx_path.read_bytes()
        raw = _raw_fods(
            xlsx_path,
            xlsx_bytes,
            Path(args.raw_cache).resolve() / f"{xlsx_path.stem}.raw.fods",
        )
        legacy = _run_path(
            "legacy", xlsx_bytes, raw, skip_initial_xf=args.skip_initial_xf
        )
        p1 = _run_path("p1", xlsx_bytes, raw, skip_initial_xf=args.skip_initial_xf)
        equal = {
            key: legacy["checkpoint_sha256"][key]
            == p1["checkpoint_sha256"][key]
            for key in legacy["checkpoint_sha256"]
        }
        passed = all(equal.values())
        failures += 0 if passed else 1
        report["files"].append(
            {
                "file": xlsx_path.name,
                "legacy": legacy,
                "p1": p1,
                "equal": equal,
                "pass": passed,
            }
        )
        print(
            f"{xlsx_path.stem}: {'PASS' if passed else 'FAIL'} "
            f"legacy={legacy['seconds']['python_total']:.3f}s "
            f"p1={p1['seconds']['python_total']:.3f}s",
            flush=True,
        )
        del raw

    report["summary"] = {
        "files": len(files),
        "pass": len(files) - failures,
        "fail": failures,
    }
    result_path = Path(args.result).resolve()
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"SUMMARY files={len(files)} pass={len(files) - failures} fail={failures}",
        flush=True,
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
