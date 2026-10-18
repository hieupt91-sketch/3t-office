#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$IOS_DIR/../.." && pwd)"
OUTPUT_ROOT="${1:-$REPO_ROOT/build/ios-simulator}"
DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export DEVELOPER_DIR

[[ "$OUTPUT_ROOT" == /* ]] || OUTPUT_ROOT="$(pwd)/$OUTPUT_ROOT"
"$SCRIPT_DIR/stage-web-assets.sh" "$OUTPUT_ROOT/Web"

xcodebuild \
  -project "$IOS_DIR/VNOfficeIOS.xcodeproj" \
  -scheme VNOfficeIOS \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath "$OUTPUT_ROOT/DerivedData" \
  CODE_SIGNING_ALLOWED=NO \
  VNO_STAGED_WEB_ROOT="$OUTPUT_ROOT/Web" \
  build

APP="$OUTPUT_ROOT/DerivedData/Build/Products/Debug-iphonesimulator/3T Office.app"
[[ -d "$APP" ]] || { echo "Không tìm thấy app Simulator: $APP" >&2; exit 2; }
echo "PASS: iOS Simulator app tại $APP"
