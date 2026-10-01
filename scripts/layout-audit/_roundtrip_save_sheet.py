"""Usage: python _roundtrip_save_sheet.py <worktree> <xlsx-in> <xlsx-out>.
Runs the actual 3T Sheet desktop through WebView2 remote debugging and CDP."""
import os
import subprocess
import sys

ROOT, XLSX_PATH, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3])
probe = os.path.join(ROOT, "scripts", "layout-audit", "_cdp_roundtrip.mjs")
raise SystemExit(subprocess.call(["node", probe, "sheet", XLSX_PATH, OUT], cwd=ROOT))
