#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$MACOS_DIR/../.." && pwd)"
OUTPUT_DIR="${1:-$REPO_ROOT/build/macos-offline-pilot}"
VERSION="${VNO_PILOT_VERSION:-0.9.11}"
PYTHON_ROOT="${VNO_PYTHON_ROOT:-}"
SITE_PACKAGES="${VNO_SITE_PACKAGES:-}"
LIBREOFFICE_APP="${VNO_LIBREOFFICE_APP:-/Applications/LibreOffice.app}"

[[ "$OUTPUT_DIR" == /* ]] || OUTPUT_DIR="$(pwd)/$OUTPUT_DIR"
case "$OUTPUT_DIR" in
  /|"$HOME"|"$REPO_ROOT")
    echo "Từ chối output path không an toàn: $OUTPUT_DIR" >&2
    exit 2
    ;;
esac
if [[ -z "$PYTHON_ROOT" || -z "$SITE_PACKAGES" ]]; then
  echo "Đặt VNO_PYTHON_ROOT và VNO_SITE_PACKAGES từ runtime đã kiểm thử." >&2
  exit 2
fi
[[ -x "$PYTHON_ROOT/bin/python3" ]] || { echo "Python root không hợp lệ: $PYTHON_ROOT" >&2; exit 2; }
[[ -d "$SITE_PACKAGES/PySide6" && -d "$SITE_PACKAGES/webview" ]] || {
  echo "Site-packages thiếu PySide6 hoặc pywebview: $SITE_PACKAGES" >&2; exit 2;
}
[[ -x "$LIBREOFFICE_APP/Contents/MacOS/soffice" ]] || {
  echo "LibreOffice.app không hợp lệ: $LIBREOFFICE_APP" >&2; exit 2;
}

PARENT_DIR="$(dirname "$OUTPUT_DIR")"
mkdir -p "$PARENT_DIR"
STAGING="$(mktemp -d "$PARENT_DIR/.vno-pilot-staging.XXXXXX")"
cleanup() { rm -rf "$STAGING"; }
trap cleanup EXIT

"$SCRIPT_DIR/build-development.sh" "$STAGING"
rm -rf "$STAGING/.derived-data"
ditto "$PYTHON_ROOT" "$STAGING/Runtime"
mkdir -p "$STAGING/Runtime/lib/python3.12/site-packages"
ditto "$SITE_PACKAGES" "$STAGING/Runtime/lib/python3.12/site-packages"
ditto "$LIBREOFFICE_APP" "$STAGING/LibreOffice.app"

APP_ROOT="$STAGING/Versions/app-$VERSION/app"
mkdir -p "$APP_ROOT"
for item in main.py index.html apps platform adapters branding release-notes.txt THIRD-PARTY-NOTICES; do
  ditto "$REPO_ROOT/$item" "$APP_ROOT/$item"
done
mkdir -p "$STAGING/Versions/app-$VERSION"
printf '%s\n' "$VERSION" > "$STAGING/Versions/app-$VERSION/VERSION.txt"
ln -s "app-$VERSION" "$STAGING/Versions/current"

mkdir -p "$STAGING/Legal/Python-Packages"
ditto "$REPO_ROOT/THIRD-PARTY-NOTICES" "$STAGING/Legal/THIRD-PARTY-NOTICES.txt"
ditto "$MACOS_DIR/legal/SOURCE-OFFER.txt" "$STAGING/Legal/SOURCE-OFFER.txt"
ditto "$MACOS_DIR/legal/PILOT-README.txt" "$STAGING/PILOT-README.txt"
for metadata in "$SITE_PACKAGES"/*.dist-info; do
  [[ -d "$metadata" ]] || continue
  name="$(basename "$metadata")"
  mkdir -p "$STAGING/Legal/Python-Packages/$name"
  [[ -f "$metadata/METADATA" ]] && ditto "$metadata/METADATA" "$STAGING/Legal/Python-Packages/$name/METADATA"
  [[ -d "$metadata/licenses" ]] && ditto "$metadata/licenses" "$STAGING/Legal/Python-Packages/$name/licenses"
done
mkdir -p "$STAGING/Legal/LibreOffice"
for legal in LICENSE LICENSE.html NOTICE CREDITS.fodt; do
  [[ -f "$LIBREOFFICE_APP/Contents/Resources/$legal" ]] && \
    ditto "$LIBREOFFICE_APP/Contents/Resources/$legal" "$STAGING/Legal/LibreOffice/$legal"
done

PYTHON_VERSION="$("$STAGING/Runtime/bin/python3" -c 'import platform; print(platform.python_version())')"
PYSIDE_VERSION="$("$STAGING/Runtime/bin/python3" -c 'import importlib.metadata; print(importlib.metadata.version("PySide6"))')"
PYWEBVIEW_VERSION="$("$STAGING/Runtime/bin/python3" -c 'import importlib.metadata; print(importlib.metadata.version("pywebview"))')"
LIBREOFFICE_VERSION="$("$STAGING/LibreOffice.app/Contents/MacOS/soffice" --version | head -1)"
printf '%s\n' \
  "3T Office=$VERSION" \
  "Architecture=arm64 (Intel NOT SUPPORTED)" \
  "Python=$PYTHON_VERSION" \
  "PySide6=$PYSIDE_VERSION" \
  "pywebview=$PYWEBVIEW_VERSION" \
  "LibreOffice=$LIBREOFFICE_VERSION" \
  > "$STAGING/Legal/COMPONENTS.txt"

"$STAGING/Runtime/bin/python3" "$SCRIPT_DIR/validate-offline-pilot.py" "$STAGING" "$VERSION"
for app in Doc Sheet Slide; do
  VNO_LAUNCHER_PRINT_COMMAND=1 "$STAGING/$app.app/Contents/MacOS/$app" >/dev/null
done

rm -rf "$OUTPUT_DIR"
mv "$STAGING" "$OUTPUT_DIR"
trap - EXIT
echo "PASS: offline pilot arm64 tại $OUTPUT_DIR"
