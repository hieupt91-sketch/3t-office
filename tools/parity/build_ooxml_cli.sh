#!/bin/bash
# Dung + tai lai ParityCLI trong WSL ung voi ban OOXMLKit "sach" tu worktree.
# Nguon ooxml: staging do tools/parity/stage_ooxmlkit.py tao (blob git goc, khong
# bi core.autocrlf tua len) — neu chua co, quy tu rsync worktree va thuan hoa CRLF.
set -u
export PATH=/opt/swift/usr/bin:$PATH
CLEAN="/mnt/e/VNOffice-briefs/logs/w2-work/ooxmlkit-clean/ports/ios/OOXMLKit"
SRC="/mnt/e/VNOffice-agy-parity/ports/ios/OOXMLKit"
CLI="/mnt/e/VNOffice-agy-parity/tools/parity"
PAR=/root/parity
rm -rf "$PAR"
mkdir -p "$PAR/ooxml" "$PAR/Sources/ParityCLI"
if [ -d "$CLEAN" ]; then
    rsync -a --delete "$CLEAN/" "$PAR/ooxml/"
else
    rsync -a --delete "$SRC/" "$PAR/ooxml/"
    python3 - <<'PY'
import pathlib
root = pathlib.Path('/root/parity/ooxml')
n = 0
for p in list(root.rglob('*.swift')) + list(root.rglob('*.raw')):
    b = p.read_bytes()
    if b'\r\n' in b:
        p.write_bytes(b.replace(b'\r\n', b'\n'))
        n += 1
print('normalized CRLF->LF (du phong):', n, 'files')
PY
fi
cp "$CLI/ooxml_cli/Package.swift" "$PAR/Package.swift"
cp "$CLI/ooxml_cli/Sources/ParityCLI/main.swift" "$PAR/Sources/ParityCLI/main.swift"
cd "$PAR" || exit 1
swift build 2>&1 | tail -25
BIN="$PAR/.build/debug/ParityCLI"
if [ -x "$BIN" ]; then
    echo "BUILT $BIN"
else
    echo "BUILD FAILED"
fi
