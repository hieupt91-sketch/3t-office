"""Usage: python _sheet_matrix.py <worktree> [outdir] -- re-audit every _rt_lanNN.xlsx in <worktree> with the current auditor, write _sheet_matrix.md (kind x file) + top repeated patterns per kind"""
import os, sys, subprocess, re, glob, collections
ROOT = os.path.abspath(sys.argv[1]); OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else ROOT
rts = sorted(glob.glob(os.path.join(ROOT, "_rt_lan*.xlsx")))
matrix = {}; patterns = collections.defaultdict(collections.Counter); totals = {}
for rt in rts:
    name = os.path.basename(rt)[4:]
    src = os.path.join(ROOT, "file test", "lan", name)
    if not os.path.exists(src): continue
    r = subprocess.run(["node", "scripts/audit-sheet-import.mjs", "--xlsx-vs-xlsx", src, rt], capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT, timeout=900)
    txt = r.stdout
    kinds = collections.Counter(); current = None
    for line in txt.splitlines():
        m = re.match(r"^  (\w+): (\d+)$", line)
        if m: current = m.group(1); kinds[current] += int(m.group(2)); continue
        if line.startswith("    {") and current:
            patterns[current][re.sub(r'"coord":"[A-Z]+\d+",', "", line.strip())[:170]] += 1
    m = re.search(r"TONG sai lech: (\d+)", txt)
    totals[name] = int(m.group(1)) if m else -1
    matrix[name] = kinds
    print(name, totals[name], dict(kinds.most_common(4)), flush=True)
all_kinds = sorted({k for v in matrix.values() for k in v}, key=lambda k: -sum(v[k] for v in matrix.values()))
with open(os.path.join(OUT, "_sheet_matrix.md"), "w", encoding="utf-8") as f:
    f.write("| file | total | " + " | ".join(all_kinds) + " |\n|---|---:|" + "---:|" * len(all_kinds) + "\n")
    for name in matrix: f.write(f"| {name} | {totals[name]} | " + " | ".join(str(matrix[name].get(k, 0)) for k in all_kinds) + " |\n")
    f.write("\n| kind | files affected | total |\n|---|---:|---:|\n")
    for k in all_kinds: f.write(f"| {k} | {sum(1 for v in matrix.values() if v.get(k))} | {sum(v.get(k, 0) for v in matrix.values())} |\n")
    for k in all_kinds:
        f.write(f"\n### {k} — mẫu lặp nhiều nhất (trong 20 chi tiết đầu mỗi sheet)\n")
        for pat, n in patterns[k].most_common(8): f.write(f"- {n} × `{pat}`\n")
print("matrix:", os.path.join(OUT, "_sheet_matrix.md"))
