#!/bin/bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: generate-icns.sh SOURCE.svg OUTPUT.icns" >&2
  exit 2
fi

SOURCE="$1"
OUTPUT="$2"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT
ICONSET="$TEMP_ROOT/AppIcon.iconset"
MASTER="$TEMP_ROOT/master.png"
mkdir -p "$ICONSET" "$(dirname "$OUTPUT")"

sips -s format png --resampleHeightWidth 1024 1024 "$SOURCE" --out "$MASTER" >/dev/null
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$MASTER" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$MASTER" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$OUTPUT"
