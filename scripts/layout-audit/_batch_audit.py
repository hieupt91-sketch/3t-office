"""Usage: python _batch_audit.py <worktree> [lanNN.xlsx ...]
For each xlsx in "file test/lan" (or the given names): real-app round-trip save, auditor,
Excel COM open check, and a summary table written to _batch_audit_report.md."""
import os, sys, subprocess, re, glob, time
ROOT = os.path.abspath(sys.argv[1])
SP = os.path.dirname(os.path.abspath(__file__))
LINTER_SP = os.environ.get("VNO_AUDIT_LINTER_DIR", SP)
names = sys.argv[2:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "file test", "lan", "lan*.xlsx")))
mapping = {}
mp = os.path.join(ROOT, "file test", "lan", "_map.txt")
if os.path.exists(mp):
    for line in open(mp, encoding="utf-8"):
        if "\t" in line:
            k, v = line.rstrip("\n").split("\t", 1); mapping[k] = v
rows = []
for name in names:
    started = time.monotonic()
    src = os.path.join(ROOT, "file test", "lan", name)
    out = os.path.join(ROOT, "_rt_" + name)
    audit = os.path.join(ROOT, "_audit_" + name.replace(".xlsx", ".txt"))
    if os.path.exists(out): os.remove(out)
    try:
        r = subprocess.run([sys.executable, os.path.join(SP, "_roundtrip_save_sheet.py"), ROOT, src, out], capture_output=True, text=True, cwd=ROOT, timeout=1200)
    except subprocess.TimeoutExpired as exc:
        r = subprocess.CompletedProcess(exc.cmd, 124, exc.stdout or "", exc.stderr or "")
    saved = os.path.exists(out)
    loaded = r.returncode == 0 and ("LOADED: " + name) in (r.stdout or "")
    total = ""; per_kind = ""
    if saved:
        with open(audit, "w", encoding="utf-8") as f:
            subprocess.run(["node", "scripts/audit-sheet-import.mjs", "--xlsx-vs-xlsx", src, out], stdout=f, stderr=subprocess.STDOUT, text=True, cwd=ROOT, timeout=600)
        txt = open(audit, encoding="utf-8", errors="replace").read()
        m = re.search(r"TONG sai lech: (\d+)", txt); total = m.group(1) if m else "?"
        kinds = {}
        for k, n in re.findall(r"^  (\w+): (\d+)$", txt, re.M):
            kinds[k] = kinds.get(k, 0) + int(n)
        per_kind = ", ".join(f"{k}={v}" for k, v in sorted(kinds.items(), key=lambda kv: -kv[1]))
    excel = "-"; lint = "-"
    if saved:
        e = subprocess.run(["powershell", "-NoProfile", "-File", os.path.join(SP, "_excel_open_test.ps1"), "-Files", out], capture_output=True, text=True, timeout=240)
        excel = (e.stdout.strip().splitlines() or ["?"])[-1]
        # Lint XML (well-formed, count=, chỉ số, thứ tự ô) để phân biệt file hỏng thật với Excel COM bị tranh
        lint_run = subprocess.run([sys.executable, os.path.join(LINTER_SP, "_xlsx_lint.py"), out], capture_output=True, text=True, timeout=300)
        parts_run = subprocess.run([sys.executable, os.path.join(LINTER_SP, "_xlsx_parts_lint.py"), out], capture_output=True, text=True, timeout=300)
        issues = [line for line in ((lint_run.stdout or "") + (parts_run.stdout or "")).splitlines()
                  if line.strip() and line.strip() not in ("lint done", "parts lint done")]
        if lint_run.returncode or parts_run.returncode:
            issues.append("linter failed: " + (lint_run.stderr or "") + (parts_run.stderr or ""))
        lint = "clean" if not issues else f"{len(issues)} issue(s): " + "; ".join(issues[:3])
    seconds = round(time.monotonic() - started, 1)
    rows.append((name, mapping.get(name, ""), ("yes" if saved else "NO") + ("" if loaded else " (not loaded)"), total, excel, lint, per_kind, seconds))
    print(name, "saved" if saved else "NOT SAVED", "total", total, "excel", excel, "lint", lint, "seconds", seconds, flush=True)
with open(os.path.join(ROOT, "_batch_audit_report.md"), "w", encoding="utf-8") as f:
    f.write("| file | original name | saved | total diffs | Excel opens | lint | diffs by kind | seconds |\n|---|---|---|---:|---|---|---|---:|\n")
    for r in rows:
        f.write("| " + " | ".join(str(x) for x in r) + " |\n")
print("report: _batch_audit_report.md")
sys.exit(0 if rows and all(r[2] == "yes" and r[3] == "0" and " OK sheets=" in r[4] and r[5] == "clean" for r in rows) else 1)
