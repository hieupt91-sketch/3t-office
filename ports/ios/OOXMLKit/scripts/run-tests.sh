#!/usr/bin/env bash
# Chạy toàn bộ test OOXMLKit + kiểm chéo tệp kết quả bằng bộ đọc độc lập.
#   scripts/run-tests.sh            # debug
#   CONFIG=release scripts/run-tests.sh
# Cần: Swift 5.9+ (Xcode 15+ hoặc toolchain Linux). Kiểm chéo cần python3; openpyxl/python-docx/python-pptx là tùy chọn
# (thiếu thì cột thư viện báo NOT RUN, phần zlib/CRC/expat vẫn chạy).
set -euo pipefail
cd "$(dirname "$0")/.."
ART="${OOXMLKIT_ARTIFACTS:-$(mktemp -d)/ooxmlkit-artifacts}"
rm -rf "$ART"; mkdir -p "$ART"
CONFIG="${CONFIG:-debug}"
EXTRA=()
[ "$CONFIG" = "release" ] && EXTRA=(-Xswiftc -enable-testing)
echo "== swift test ($CONFIG) — tệp kết quả: $ART"
OOXMLKIT_ARTIFACTS="$ART" swift test -c "$CONFIG" "${EXTRA[@]}" 2>&1 | tee "$ART/../swift-test.log" | grep -E "error:|Executed [0-9]+ tests" | tail -20
echo "== Kiểm chéo độc lập"
python3 -I scripts/verify_artifacts.py "$ART" --json "$ART/../verify.json"
