"""Compatibility entry; new runs should use batch_document_audit.py docx."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ENTRY = Path(__file__).with_name("batch_document_audit.py")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python _batch_writer.py <worktree> <docx-dir> <out-dir> [names...]")
        raise SystemExit(2)
    raise SystemExit(subprocess.call([
        sys.executable, str(ENTRY), "docx", sys.argv[1], sys.argv[2], sys.argv[3], *sys.argv[4:],
    ]))
