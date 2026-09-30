"""Byte-compare the scratch metadata overlay with the current overlay.

Usage:
  python scripts/perf-proto/compare_native_overlay.py NAME XLSX FODS [NAME XLSX FODS ...]

Each triple uses the same XLSX bytes and FODS text for both implementations.
The prototype comparison uses the Phase 1 path (initial XF stamp skipped).
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "perf-proto"))
import native_overlay_profile as prototype  # noqa: E402

patcher = prototype.PATCHER_MODULE


def digest(text: str) -> tuple[int, str]:
    encoded = text.encode("utf-8")
    return len(encoded), hashlib.sha256(encoded).hexdigest()


def compare(name: str, xlsx_path: str, fods_path: str) -> bool:
    xlsx = Path(xlsx_path).read_bytes()
    fods = Path(fods_path).read_text(encoding="utf-8", errors="replace")
    original_builder = patcher._xlsx_cells_with_metadata
    try:
        patcher._INDEX_MEMO.clear()
        start = time.perf_counter()
        current = patcher.overlay_sheet_xlsx_fods(xlsx, fods, skip_initial_xf=True)
        current_seconds = time.perf_counter() - start
        current_bytes, current_hash = digest(current)

        patcher._INDEX_MEMO.clear()
        patcher._xlsx_cells_with_metadata = prototype._metadata_without_xf
        start = time.perf_counter()
        candidate = patcher.overlay_sheet_xlsx_fods(xlsx, fods, skip_initial_xf=True)
        candidate_seconds = time.perf_counter() - start
        candidate_bytes, candidate_hash = digest(candidate)
        identical = candidate == current
        print(json.dumps({
            "name": name,
            "byte_identical": identical,
            "current_bytes": current_bytes,
            "candidate_bytes": candidate_bytes,
            "current_sha256": current_hash,
            "candidate_sha256": candidate_hash,
            "current_seconds": round(current_seconds, 3),
            "candidate_seconds": round(candidate_seconds, 3),
        }, ensure_ascii=False), flush=True)
        del current, candidate
        return identical
    finally:
        patcher._xlsx_cells_with_metadata = original_builder
        patcher._INDEX_MEMO.clear()


def main() -> int:
    args = sys.argv[1:]
    if not args or len(args) % 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    passed = True
    for i in range(0, len(args), 3):
        passed = compare(*args[i : i + 3]) and passed
    print("PARITY " + ("PASS" if passed else "FAIL"), flush=True)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
