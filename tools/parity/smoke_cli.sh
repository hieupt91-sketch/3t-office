#!/bin/bash
# Smoke test ParityCLI: lan 1 tep moi loai, moi op print JSON.
PAR=/root/parity/../../mnt/e/VNOffice-briefs/logs/w2-work
OUT=/mnt/e/VNOffice-briefs/logs/w2-work/smoke
mkdir -p "$OUT"
BIN=/root/parity/.build/debug/ParityCLI
FILES_XLSX="/mnt/e/VN OFice/file test/lan/lan01.xlsx"
FILES_DOCX="/mnt/e/VN OFice/file test/landocx/d01.docx"
FILES_PPTX="/mnt/e/VN OFice/file test/sample-3.pptx"
for f in "$FILES_XLSX" "$FILES_DOCX" "$FILES_PPTX"; do
    b=$(basename "$f")
    echo "== pass $b"
    "$BIN" pass "$f" "$OUT/pass-$b"
done
echo "== xlsx-edit lan01"
"$BIN" xlsx-edit "$FILES_XLSX" "$OUT/edit-lan01.xlsx"
echo "== docx-replace d01"
"$BIN" docx-replace "$FILES_DOCX" "$OUT/edit-d01.docx"
echo "== pptx-title sample-3"
"$BIN" pptx-title "$FILES_PPTX" "$OUT/edit-sample-3.pptx"
