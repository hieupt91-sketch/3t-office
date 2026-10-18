#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$IOS_DIR/../.." && pwd)"
DESTINATION="${1:?usage: stage-web-assets.sh DESTINATION}"

case "$DESTINATION" in
  /|"$HOME"|"$REPO_ROOT") echo "Từ chối destination không an toàn: $DESTINATION" >&2; exit 2;;
esac

rm -rf "$DESTINATION"
mkdir -p "$DESTINATION"
ditto "$REPO_ROOT/index.html" "$DESTINATION/index.html"
for directory in apps platform adapters branding; do
  rsync -a \
    --exclude='*.py' \
    --exclude='*.pyc' \
    --exclude='__pycache__/' \
    --exclude='*.exe' \
    --exclude='*.dll' \
    "$REPO_ROOT/$directory/" "$DESTINATION/$directory/"
done
ditto "$IOS_DIR/Web/mobile-shell.css" "$DESTINATION/mobile-shell.css"

if find "$DESTINATION" -type f \( -name '*.py' -o -name '*.exe' -o -name '*.dll' \) -print -quit | grep -q .; then
  echo "Asset iOS chứa runtime desktop không được phép" >&2
  exit 2
fi
echo "PASS: staged offline web assets tại $DESTINATION"
