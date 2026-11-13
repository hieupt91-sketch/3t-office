#!/usr/bin/env python3
"""Đo thời gian mở tệp OOXML qua ooxml-engine (P1, issue #18).

Đo 2 pha engine (mở gói + đọc dữ liệu) theo phương pháp
docs/ooxml/BENCH-OLD-VS-NEW-24-10.md: mỗi tệp đo độc lập N lần
(mặc định 3), báo trung vị + min/max. Pha dựng hình (render_ms) chỉ đo
được ở UI thật qua CDP nên luôn là null (NOT RUN) ở đây.

Ví dụ:
    OOXML_ENGINE_PATH=/path/to/ooxml-engine \
        python3 scripts/measure_ooxml_open.py file.xlsx file.docx
    python3 scripts/measure_ooxml_open.py --repeats 5 --engine ./ooxml-engine dir/
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import statistics
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

# Nạp engine_client theo đường dẫn tệp (như main.py) thay vì
# `from platform.ooxml...`: tên `platform` trùng module stdlib.
_CLIENT_SPEC = importlib.util.spec_from_file_location(
    "vno_ooxml_engine_client_cli",
    ROOT / "platform" / "ooxml" / "engine_client.py",
)
_client_module = importlib.util.module_from_spec(_CLIENT_SPEC)
_CLIENT_SPEC.loader.exec_module(_client_module)
EngineClient = _client_module.EngineClient


SUPPORTED_EXTENSIONS = {".xlsx", ".docx", ".pptx"}


def summarize(values: list[float]) -> dict[str, float | None]:
    """Trung vị + min/max của các lần đo; rỗng -> None."""
    if not values:
        return {"median": None, "min": None, "max": None, "n": 0}
    return {
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
        "n": len(values),
    }


def collect_files(paths: list[str]) -> list[Path]:
    found: list[Path] = []
    for raw in paths:
        target = Path(raw)
        if target.is_dir():
            found.extend(sorted(
                p for p in target.rglob("*")
                if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
            ))
        elif target.is_file() and target.suffix.lower() in SUPPORTED_EXTENSIONS:
            found.append(target)
        else:
            print(f"Bỏ qua (không phải tệp OOXML hỗ trợ): {raw}", file=sys.stderr)
    return found


def measure_files(files: list[Path], *, repeats: int,
                  client_factory: Any = None) -> list[dict[str, Any]]:
    """Đo từng tệp `repeats` lần bằng một engine process chung (ấm)."""
    factory = client_factory or EngineClient
    client = factory()
    results: list[dict[str, Any]] = []
    try:
        for target in files:
            runs: list[dict[str, Any]] = []
            for _ in range(max(1, repeats)):
                runs.append(client.measure_open(target))
            ok_runs = [r for r in runs if r.get("ok") is True]
            failed = [r for r in runs if r.get("ok") is not True]
            first = runs[0] if runs else {}
            results.append({
                "path": str(target),
                "kind": first.get("kind"),
                "ok": bool(ok_runs),
                "runs": len(runs),
                "failed_runs": len(failed),
                "package_ms": summarize([r["package_ms"] for r in ok_runs
                                         if r.get("package_ms") is not None]),
                "data_ms": summarize([r["data_ms"] for r in ok_runs
                                      if r.get("data_ms") is not None]),
                "engine_total_ms": summarize([r["engine_total_ms"] for r in ok_runs
                                              if r.get("engine_total_ms") is not None]),
                "render_ms": None,  # NOT RUN — đo ở UI qua CDP (lát S4)
                "first_screen_ms": summarize([r["first_screen_ms"] for r in ok_runs
                                              if r.get("first_screen_ms") is not None]),
                "first_screen_package_ms": summarize(
                    [r["first_screen_package_ms"] for r in ok_runs
                     if r.get("first_screen_package_ms") is not None]),
                "first_screen_data_ms": summarize(
                    [r["first_screen_data_ms"] for r in ok_runs
                     if r.get("first_screen_data_ms") is not None]),
                "first_screen_counts": (
                    ok_runs[0].get("first_screen_counts", {}) if ok_runs else {}),
                "first_screen_errors": sorted(
                    {str(r.get("first_screen_error")) for r in ok_runs
                     if r.get("first_screen_error")}),
                "peak_rss_kb": summarize([r["peak_rss_kb"] for r in ok_runs
                                          if r.get("peak_rss_kb") is not None]),
                "counts": ok_runs[0].get("counts", {}) if ok_runs else {},
                "errors": sorted({str(r.get("error", "open/read thất bại"))
                                  for r in failed}),
            })
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Đo thời gian mở tệp OOXML qua ooxml-engine (P1).")
    parser.add_argument("paths", nargs="+", help="Tệp hoặc thư mục chứa tệp OOXML.")
    parser.add_argument("--repeats", type=int, default=3,
                        help="Số lần đo mỗi tệp (mặc định 3).")
    parser.add_argument("--engine", default=None,
                        help="Đường dẫn tới ooxml-engine (mặc định: tự tìm).")
    parser.add_argument("--timeout", type=float, default=30.0,
                        help="Timeout mỗi lệnh engine, giây (mặc định 30).")
    parser.add_argument("--json-out", default=None,
                        help="Ghi kết quả JSON vào tệp này (ngoài stdout).")
    args = parser.parse_args(argv)

    files = collect_files(args.paths)
    if not files:
        print("Không tìm thấy tệp OOXML nào (.xlsx/.docx/.pptx).", file=sys.stderr)
        return 2

    def factory() -> EngineClient:
        return EngineClient(args.engine, timeout=args.timeout)

    results = measure_files(files, repeats=args.repeats, client_factory=factory)
    payload = {"tool": "measure-ooxml-open", "p1": "#18", "results": results}
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    print(text)
    if args.json_out:
        Path(args.json_out).write_text(text + "\n", encoding="utf-8")
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
