#!/usr/bin/env bash
# Chạy parity cho 1 tệp hoặc toàn bộ corpus synthetic. Ghi JSON vào $OUT (mặc định: build/parity).
#   scripts/parity/run_parity.sh docs/ooxml-corpus/synthetic/docx/rich-word.docx
#   scripts/parity/run_parity.sh --all          # mọi tệp trong MANIFEST.json
#   scripts/parity/run_parity.sh --selftest     # tự kiểm harness bằng động cơ GIẢ
# Biến: OOXML_ENGINE=<đường dẫn ooxml-engine> (nếu không có, tìm trong ports/ios/OOXMLKit/.build; vẫn không có → BLOCKED).
# Mã thoát: 0 mọi tệp PASS; 1 có FAIL; 2 có BLOCKED (không FAIL).
set -uo pipefail
cd "$(dirname "$0")/../.."
OUT="${OUT:-build/parity}"; mkdir -p "$OUT"
PY=(python3 -I scripts/parity/parity_runner.py)
case "${1:-}" in
  --selftest) exec "${PY[@]}" --selftest ;;
  --all) mapfile -t FILES < <(python3 -I -c 'import json;[print(f["path"]) for f in json.load(open("docs/ooxml-corpus/MANIFEST.json"))["files"]]') ;;
  "") echo "dùng: $0 <tệp> | --all | --selftest"; exit 64 ;;
  *) FILES=("$@") ;;
esac
worst=0
for f in "${FILES[@]}"; do
  j="$OUT/$(echo "$f" | tr '/' '_').json"
  "${PY[@]}" "$f" --out "$OUT/artifacts/$(basename "$f")" --json "$j"; rc=$?
  printf '%-8s %s\n' "$([ $rc = 0 ] && echo PASS || ([ $rc = 2 ] && echo BLOCKED || echo FAIL))" "$f"
  [ $rc = 1 ] && worst=1; [ $rc = 2 ] && [ $worst = 0 ] && worst=2
done
exit $worst
