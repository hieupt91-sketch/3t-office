#!/usr/bin/env python3
# stage_ooxmlkit.py — lech nguon OOXMLKit "sach" (cac byte mac git) ra thu muc staging:
#   python tools/parity/stage_ooxmlkit.py [out_dir] [worktree]
# Ly do: git tren Windows co core.autocrlf=true -> khi checkout, cac file text cua
# OOXMLKit (.swift, fixture text *.raw, xml.stored.deflate...) bi LF->CRLF, lam
# swift test FAIL do moi truong (khong phai loi thu vien). Script so khop tung
# blob trong git voi file tren dia; file nao khac thi ghi blob goc vao staging.
import subprocess
import sys
from pathlib import Path


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"E:\VNOffice-briefs\logs\w2-work\ooxmlkit-clean")
    worktree = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[2]
    prefix = "ports/ios/OOXMLKit"
    listing = subprocess.run(
        ["git", "-C", str(worktree), "ls-tree", "-r", "-z", "HEAD", prefix],
        capture_output=True, check=True).stdout.decode("utf-8", "replace")
    identical, rewritten = 0, []
    for rec in listing.split("\0"):
        if not rec:
            continue
        meta, path = rec.split("\t", 1)
        mode, kind, blob = meta.split(" ")
        if kind != "blob":
            continue
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        body = subprocess.run(
            ["git", "-C", str(worktree), "cat-file", "blob", blob],
            capture_output=True, check=True).stdout
        disk = worktree / path
        data = disk.read_bytes() if disk.is_file() else None
        if body != data:
            rewritten.append(path)
        else:
            identical += 1
        target.write_bytes(body)
    total = identical + len(rewritten)
    print(f"staging={out}")
    print(f"file_duoc_staging={total} trung_blob={identical} duoc_sua_blob={len(rewritten)}")
    for p in rewritten[:40]:
        print("rewritten:", p)
    if len(rewritten) > 40:
        print(f"... va {len(rewritten) - 40} file nua")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
