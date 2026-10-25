#!/bin/bash
# Equivalent of g0-corpus-cl/scripts/parity/run_parity.sh --all, bash-3.2 safe (no mapfile). Read-only on corpus tree.
# usage: G0_TREE=<checkout of claude/ooxml-g0-corpus-parity> run_g0_parity_mac.sh <ooxml-engine> <outdir>
# Outputs (JSON + saved files) go ONLY to <outdir>; python runs with -I -B so nothing is written into the corpus tree.
# Why: upstream scripts/parity/run_parity.sh uses `mapfile` (bash 4+) and fails on macOS /bin/bash 3.2.
set -uo pipefail
G0="${G0_TREE:-/Volumes/Data/Worktrees/g0-corpus-cl}"
[ $# -eq 2 ] || { echo "usage: $0 <ooxml-engine> <outdir>" >&2; exit 64; }
ENGINE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; mkdir -p "$2/tmp"; OUT="$(cd "$2" && pwd)"
export TMPDIR="$OUT/tmp"
cd "$G0"
worst=0
while IFS= read -r f; do
  j="$OUT/$(echo "$f" | tr '/' '_').json"
  python3 -I -B scripts/parity/parity_runner.py "$f" --engine "$ENGINE" --out "$OUT/artifacts/$(basename "$f")" --json "$j"; rc=$?
  printf '%-8s %s\n' "$([ $rc = 0 ] && echo PASS || ([ $rc = 2 ] && echo BLOCKED || echo FAIL))" "$f"
  [ $rc = 1 ] && worst=1; [ $rc = 2 ] && [ $worst = 0 ] && worst=2
done < <(python3 -I -B -c 'import json;[print(f["path"]) for f in json.load(open("docs/ooxml-corpus/MANIFEST.json"))["files"]]')
exit $worst
