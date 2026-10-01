"""Copy private LAN documents to the ignored local test area; never stages them."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _ch5_samples import DEFAULT_SHARE_ROOT, copy_share_samples


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", required=True, choices=("xlsx", "docx", "pptx", "doc", "xls", "ppt"))
    parser.add_argument("--count", type=int, required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--share-root", default=DEFAULT_SHARE_ROOT)
    parser.add_argument("--prefix")
    args = parser.parse_args()
    copied = copy_share_samples(
        args.share_root, f".{args.type}", args.destination, args.count, prefix=args.prefix
    )
    for source, target in copied:
        print(f"COPIED\t{target.name}\t{source.name}")
    print(f"COUNT\t{len(copied)}\tTYPE\t{args.type}")
    if not copied:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
