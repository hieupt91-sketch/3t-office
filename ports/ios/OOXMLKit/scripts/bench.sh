#!/usr/bin/env bash
# G1 benchmark: sinh XLSX tổng hợp ~1MB/~10MB rồi đo từng chế độ trong tiến trình riêng. Baseline Linux — KHÔNG phải số thiết bị.
set -eo pipefail
cd "$(dirname "$0")/.."
swift build -c release --product ooxml-bench >/dev/null
B=.build/release/ooxml-bench
D=$(mktemp -d)
$B gen 1000000 "$D/s1.xlsx"; $B gen 10000000 "$D/s10.xlsx"
for f in s1 s10; do
  for m in zip-list open-eager open-lazy workbook-eager workbook-lazy save-eager save-lazy; do
    for i in 1 2 3; do $B run $m "$D/$f.xlsx"; done
  done
done
rm -rf "$D"
