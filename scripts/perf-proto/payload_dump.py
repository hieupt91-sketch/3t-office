"""Dump the Sheet open payload of the cached LAN FODS files (oracle for the payload v3 gates, docs/PLAN-PAYLOAD-V3.md).

Usage: python scripts/perf-proto/payload_dump.py OUT_DIR [lan01 lan14 ...]
Reads  file test/lan/lanNN.xlsx and the cached LibreOffice FODS E:\\VNOffice-profiles\\claude-fonttable\\fods\\lanNN.fods,
runs overlay -> optimize -> payload exactly as main.py does, and writes OUT_DIR/lanNN.json (the payload dict) plus
OUT_DIR/lanNN.final.sha256 (hash of the final FODS kept in the fallback session).
"""

import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
FODS_DIR = Path(os.environ.get("VNO_CACHED_FODS_DIR", r"E:\VNOffice-profiles\claude-fonttable\fods"))


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("LOCALAPPDATA", str(out_dir / "profile"))
    import main as app
    from adapters.libreoffice.sheet.sheet_open_payload import build_sheet_open_payload

    patcher = app._ooxml_zip_patch()
    names = sys.argv[2:] or [p.stem for p in sorted((ROOT / "file test" / "lan").glob("lan??.xlsx"))]
    for name in names:
        xlsx = (ROOT / "file test" / "lan" / f"{name}.xlsx").read_bytes()
        fods = (FODS_DIR / f"{name}.fods").read_text(encoding="utf-8", errors="replace")
        patcher._INDEX_MEMO.clear()
        patcher.prefetch_sheet_open_metadata(xlsx)
        content = patcher.overlay_sheet_xlsx_fods_p1(xlsx, fods)
        content = app._optimize_fods_for_sheet(content)
        final_fods, payload = build_sheet_open_payload(xlsx, content, patcher)
        (out_dir / f"{name}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        (out_dir / f"{name}.final.sha256").write_text(hashlib.sha256(final_fods.encode("utf-8")).hexdigest(), encoding="utf-8")
        print(name, "rows", payload["rows"], "sheets", payload["sheets"], flush=True)
    patcher._shutdown_p1_process_pool()
    return 0


if __name__ == "__main__":
    sys.exit(main())
