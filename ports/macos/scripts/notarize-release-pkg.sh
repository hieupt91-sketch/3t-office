#!/bin/bash
set -euo pipefail

PKG="${1:-}"
PROFILE="${VNO_NOTARY_PROFILE:-}"
if [[ -z "$PKG" || ! -f "$PKG" ]]; then
  echo "Cách dùng: VNO_NOTARY_PROFILE=<keychain-profile> $0 <file.pkg>" >&2
  exit 2
fi
if [[ -z "$PROFILE" ]]; then
  echo "Thiếu VNO_NOTARY_PROFILE (profile Keychain của notarytool)." >&2
  exit 2
fi

xcrun notarytool submit "$PKG" --keychain-profile "$PROFILE" --wait
xcrun stapler staple "$PKG"
xcrun stapler validate "$PKG"
spctl --assess --type install --verbose=2 "$PKG"
echo "PASS: notarization và stapling hoàn tất cho $PKG"
