#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAYOUT="${1:-}"
IDENTITY="${VNO_SIGN_IDENTITY:-}"
ENTITLEMENTS="${VNO_SIGN_ENTITLEMENTS:-$MACOS_DIR/release/hardened-runtime.entitlements}"

if [[ -z "$LAYOUT" || ! -d "$LAYOUT" ]]; then
  echo "Cách dùng: VNO_SIGN_IDENTITY='Developer ID Application: ...' $0 <layout>" >&2
  exit 2
fi
if [[ -z "$IDENTITY" ]]; then
  echo "Thiếu VNO_SIGN_IDENTITY; không ký ad-hoc cho artifact phát hành." >&2
  exit 2
fi
[[ -f "$ENTITLEMENTS" ]] || { echo "Thiếu entitlements: $ENTITLEMENTS" >&2; exit 2; }

LAYOUT="$(cd "$LAYOUT" && pwd)"
case "$LAYOUT" in /|"$HOME") echo "Từ chối layout không an toàn: $LAYOUT" >&2; exit 2;; esac

sign_file() {
  codesign --force --timestamp --options runtime --sign "$IDENTITY" "$1"
}

# Ký từng Mach-O thật trước. Không theo symlink và không dùng --deep để ký.
while IFS= read -r -d '' candidate; do
  if file -b "$candidate" | grep -q 'Mach-O'; then
    sign_file "$candidate"
  fi
done < <(find "$LAYOUT" -type f -print0)

# Bundle lồng nhau phải ký từ sâu ra nông. Entitlement chỉ đặt ở executable app;
# thư viện và framework không nhận quyền của tiến trình chính.
while IFS= read -r bundle; do
  [[ -d "$bundle" ]] || continue
  if [[ "$bundle" == *.app ]]; then
    codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" \
      --sign "$IDENTITY" "$bundle"
  else
    codesign --force --timestamp --options runtime --sign "$IDENTITY" "$bundle"
  fi
done < <(find "$LAYOUT" -type d \( -name '*.framework' -o -name '*.xpc' -o -name '*.appex' -o -name '*.app' \) \
  | awk '{ print length, $0 }' | sort -rn | cut -d' ' -f2-)

for app in "$LAYOUT/LibreOffice.app" "$LAYOUT/Doc.app" "$LAYOUT/Sheet.app" "$LAYOUT/Slide.app"; do
  codesign --verify --deep --strict --verbose=2 "$app"
done
echo "PASS: Developer ID signing hoàn tất cho $LAYOUT"
