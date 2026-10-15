#!/bin/bash
set -euo pipefail
export COPYFILE_DISABLE=1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INPUT_LAYOUT="${1:-$REPO_ROOT/build/macos-offline-pilot}"
OUTPUT_PKG="${2:-$REPO_ROOT/build/3T-Office-0.9.11-arm64.pkg}"
VERSION="${VNO_PILOT_VERSION:-0.9.11}"

[[ "$INPUT_LAYOUT" == /* ]] || INPUT_LAYOUT="$(pwd)/$INPUT_LAYOUT"
[[ "$OUTPUT_PKG" == /* ]] || OUTPUT_PKG="$(pwd)/$OUTPUT_PKG"
[[ -d "$INPUT_LAYOUT" ]] || { echo "Không thấy layout offline: $INPUT_LAYOUT" >&2; exit 2; }
case "$OUTPUT_PKG" in /|"$HOME"|"$REPO_ROOT") echo "Từ chối output không an toàn: $OUTPUT_PKG" >&2; exit 2;; esac

PACKAGED_PYTHON="$INPUT_LAYOUT/Runtime/bin/python3"
[[ -x "$PACKAGED_PYTHON" ]] || { echo "Thiếu Python đóng gói: $PACKAGED_PYTHON" >&2; exit 2; }
"$PACKAGED_PYTHON" "$SCRIPT_DIR/validate-offline-pilot.py" "$INPUT_LAYOUT" "$VERSION"

OUTPUT_PARENT="$(dirname "$OUTPUT_PKG")"
mkdir -p "$OUTPUT_PARENT"
STAGING="$(mktemp -d "$OUTPUT_PARENT/.vno-pkg-staging.XXXXXX")"
TEMP_PKG="$OUTPUT_PARENT/.$(basename "$OUTPUT_PKG").staging"
cleanup() { rm -rf "$STAGING"; rm -f "$TEMP_PKG"; }
trap cleanup EXIT

PAYLOAD="$STAGING/payload"
mkdir -p "$PAYLOAD/3T Office"
ditto --norsrc --noextattr --noqtn "$INPUT_LAYOUT" "$PAYLOAD/3T Office"
find "$PAYLOAD" -name '._*' -type f -delete
# pkgbuild serializes extended attributes thành AppleDouble `._*` trong payload.
# Artifact phát hành không cần Finder metadata/quarantine từ máy build.
xattr -cr "$PAYLOAD"
if [[ -n "${VNO_SIGN_IDENTITY:-}" ]]; then
  "$SCRIPT_DIR/sign-offline-layout.sh" "$PAYLOAD/3T Office"
else
  echo "CẢNH BÁO: application payload chưa ký; PKG chỉ dùng QA nội bộ." >&2
fi

COMPONENT="$STAGING/3TOffice-component.pkg"
pkgbuild --quiet --root "$PAYLOAD" --install-location /Applications \
  --identifier vn.office.suite.pkg --version "$VERSION" "$COMPONENT"

RESOURCES="$MACOS_DIR/release"
PRODUCT_ARGS=(--distribution "$RESOURCES/Distribution.xml" --resources "$RESOURCES" --package-path "$STAGING")
if [[ -n "${VNO_INSTALLER_IDENTITY:-}" ]]; then
  PRODUCT_ARGS+=(--sign "$VNO_INSTALLER_IDENTITY" --timestamp)
else
  echo "CẢNH BÁO: installer chưa ký; không phát hành công khai." >&2
fi
productbuild --quiet "${PRODUCT_ARGS[@]}" "$TEMP_PKG"
pkgutil --check-signature "$TEMP_PKG" || true
mv -f "$TEMP_PKG" "$OUTPUT_PKG"
trap - EXIT
rm -rf "$STAGING"
echo "PASS: PKG tại $OUTPUT_PKG"
