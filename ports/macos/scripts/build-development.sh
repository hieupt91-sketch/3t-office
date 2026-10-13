#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT="$MACOS_DIR/VNOfficeLauncher.xcodeproj"
REPO_ROOT="$(cd "$MACOS_DIR/../.." && pwd)"
OUTPUT_DIR="${1:-$REPO_ROOT/build/macos-development}"
if [[ "$OUTPUT_DIR" != /* ]]; then
  OUTPUT_DIR="$(pwd)/$OUTPUT_DIR"
fi
DERIVED_ROOT="$OUTPUT_DIR/.derived-data"
DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export DEVELOPER_DIR

if [[ ! -x "$DEVELOPER_DIR/usr/bin/xcodebuild" ]]; then
  echo "Không tìm thấy Xcode đầy đủ tại $DEVELOPER_DIR" >&2
  exit 2
fi

mkdir -p "$OUTPUT_DIR"

build_app() {
  local product_name="$1"
  local bundle_id="$2"
  local plist="$3"
  local icon_source="$4"
  local derived="$DERIVED_ROOT/$product_name"
  "$DEVELOPER_DIR/usr/bin/xcodebuild" \
    -project "$PROJECT" \
    -target VNOfficeLauncher \
    -configuration Release \
    SYMROOT="$derived/Build/Products" \
    OBJROOT="$derived/Build/Intermediates.noindex" \
    PRODUCT_NAME="$product_name" \
    PRODUCT_BUNDLE_IDENTIFIER="$bundle_id" \
    INFOPLIST_FILE="$MACOS_DIR/launcher/$plist" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    build
  rm -rf "$OUTPUT_DIR/$product_name.app"
  ditto "$derived/Build/Products/Release/$product_name.app" "$OUTPUT_DIR/$product_name.app"
  "$SCRIPT_DIR/generate-icns.sh" "$REPO_ROOT/branding/icons/$icon_source" \
    "$OUTPUT_DIR/$product_name.app/Contents/Resources/AppIcon.icns"
}

build_app Doc vn.office.doc Doc-Info.plist writer.svg
build_app Sheet vn.office.sheet Sheet-Info.plist sheet.svg
build_app Slide vn.office.slide Slide-Info.plist slides.svg

python3 "$SCRIPT_DIR/validate-development-bundles.py" "$OUTPUT_DIR"
echo "Development bundles: $OUTPUT_DIR"
