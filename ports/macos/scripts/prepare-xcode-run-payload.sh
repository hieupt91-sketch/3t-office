#!/bin/bash
set -euo pipefail

# Product > Run uses this Debug-only sidecar. Release packaging has its own
# materialized, offline version/runtime layout and must never call this script.
if [[ "${CONFIGURATION:-}" != "Debug" ]]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
MACOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
REPO_ROOT="$(cd "$MACOS_DIR/../.." && pwd -P)"
TARGET_DIR="${TARGET_BUILD_DIR:?Xcode did not provide TARGET_BUILD_DIR}"
PRODUCT="${PRODUCT_NAME:?Xcode did not provide PRODUCT_NAME}"
APP_ARCH="${CURRENT_ARCH:-}"
if [[ -z "$APP_ARCH" || "$APP_ARCH" == "undefined_arch" ]]; then
  read -r -a requested_architectures <<< "${ARCHS:-}"
  if [[ "${#requested_architectures[@]}" -eq 1 ]]; then
    APP_ARCH="${requested_architectures[0]}"
  elif [[ -n "${NATIVE_ARCH_ACTUAL:-}" ]] && [[ " ${ARCHS:-} " == *" $NATIVE_ARCH_ACTUAL "* ]]; then
    APP_ARCH="$NATIVE_ARCH_ACTUAL"
  else
    echo "Không xác định được kiến trúc Xcode Run; đặt ARCHS thành một kiến trúc trong Build Settings." >&2
    exit 2
  fi
fi
PILOT_ROOT_INPUT="${VNO_XCODE_PILOT_ROOT:-$MACOS_DIR/build/macos-offline-pilot-$APP_ARCH}"
if [[ -z "${VNO_XCODE_PILOT_ROOT:-}" && ! -d "$PILOT_ROOT_INPUT" && "$APP_ARCH" == "arm64" && -d "$MACOS_DIR/build/macos-offline-pilot-x86_64" ]]; then
  PILOT_ROOT_INPUT="$MACOS_DIR/build/macos-offline-pilot-x86_64"
fi
PILOT_ROOT="$(cd "$PILOT_ROOT_INPUT" 2>/dev/null && pwd -P)" || {
  echo "Không tìm thấy pilot macOS: $PILOT_ROOT_INPUT" >&2
  echo "Tạo pilot tại ports/macos/build/macos-offline-pilot-$APP_ARCH hoặc đặt VNO_XCODE_PILOT_ROOT trong Build Settings." >&2
  exit 2
}

RUNTIME_PYTHON="$PILOT_ROOT/Runtime/bin/python3"
[[ -x "$RUNTIME_PYTHON" ]] || { echo "Pilot thiếu Runtime/bin/python3: $RUNTIME_PYTHON" >&2; exit 2; }
[[ -d "$PILOT_ROOT/LibreOffice.app/Contents" ]] || {
  echo "Pilot thiếu LibreOffice.app: $PILOT_ROOT" >&2
  exit 2
}
[[ -f "$REPO_ROOT/main.py" && -f "$REPO_ROOT/platform/security/office_encryption.py" ]] || {
  echo "Checkout hiện tại thiếu main.py hoặc mã mã hóa OOXML." >&2
  exit 2
}

relative_path() {
  /usr/bin/python3 - "$1" "$2" <<'PY'
import os
import sys
print(os.path.relpath(os.path.realpath(sys.argv[1]), os.path.realpath(sys.argv[2])))
PY
}

link_relative() {
  local source="$1" destination="$2" parent relative
  parent="$(dirname "$destination")"
  mkdir -p "$parent"
  relative="$(relative_path "$source" "$parent")"
  if [[ -L "$destination" ]]; then
    if [[ "$(readlink "$destination")" == "$relative" ]]; then
      return
    fi
    rm "$destination"
  elif [[ -e "$destination" ]]; then
    echo "Refusing to replace non-symlink Xcode output: $destination" >&2
    exit 2
  fi
  ln -s "$relative" "$destination"
}

RUNTIME_ARCH=""
for candidate_arch in "$APP_ARCH" arm64 x86_64; do
  [[ -n "$candidate_arch" ]] || continue
  if [[ " $RUNTIME_ARCH " == *" $candidate_arch "* ]]; then
    continue
  fi
  detected_arch="$(/usr/bin/arch "-$candidate_arch" "$RUNTIME_PYTHON" -c 'import platform; print(platform.machine())' 2>/dev/null || true)"
  if [[ "$detected_arch" == "$candidate_arch" ]]; then
    RUNTIME_ARCH="$candidate_arch"
    echo "Python runtime arch: $RUNTIME_ARCH (Xcode launcher: $APP_ARCH)"
    break
  fi
done
if [[ -z "$RUNTIME_ARCH" ]]; then
  echo "Runtime pilot không chạy native hoặc qua Rosetta: $RUNTIME_PYTHON" >&2
  exit 2
fi

link_relative "$PILOT_ROOT/Runtime" "$TARGET_DIR/Runtime"
link_relative "$PILOT_ROOT/LibreOffice.app" "$TARGET_DIR/LibreOffice.app"
link_relative "$REPO_ROOT" "$TARGET_DIR/Versions/development/app"

OVERLAY="$TARGET_DIR/RuntimeOverlay/$RUNTIME_ARCH/site-packages"
VALIDATOR="$SCRIPT_DIR/validate-encryption-runtime.py"
PAYLOAD_VALIDATOR="$SCRIPT_DIR/validate-xcode-run-payload.py"
INSTALLER="$SCRIPT_DIR/install-runtime-python-deps.sh"
LOCK_FILE="$MACOS_DIR/requirements-runtime-macos.lock"
LOCK_STAMP="$TARGET_DIR/RuntimeOverlay/$RUNTIME_ARCH/lock.sha256"
LOCK_SHA="$(/usr/bin/shasum -a 256 "$LOCK_FILE" | /usr/bin/awk '{print $1}')"

validate_crypto() {
  PYTHONPATH="$OVERLAY${PYTHONPATH:+:$PYTHONPATH}" \
    /usr/bin/arch "-$RUNTIME_ARCH" "$RUNTIME_PYTHON" -s "$VALIDATOR" --app-root "$REPO_ROOT"
}

# Rebuild the overlay when it is missing or was made from another lock
# (e.g. an older overlay with cryptography only and no pypdf).
if [[ ! -d "$OVERLAY" || ! -f "$LOCK_STAMP" || "$(cat "$LOCK_STAMP")" != "$LOCK_SHA" ]]; then
  rm -rf "$OVERLAY"
  mkdir -p "$OVERLAY"
  echo "Cài cryptography + pypdf (khóa hash) vào Debug overlay cho $RUNTIME_ARCH..."
  # Debug-only: may download missing wheels into the local wheelhouse (hash-checked).
  "$INSTALLER" --python "$RUNTIME_PYTHON" --arch "$RUNTIME_ARCH" --target "$OVERLAY" \
    --download --app-root "$REPO_ROOT" --no-validate
  printf '%s\n' "$LOCK_SHA" > "$LOCK_STAMP"
fi

mkdir -p "$TARGET_DIR/RuntimeOverlay"
printf '%s\n' "$RUNTIME_ARCH" > "$TARGET_DIR/RuntimeOverlay/runtime-arch.txt"
validate_crypto
/usr/bin/arch "-$RUNTIME_ARCH" "$RUNTIME_PYTHON" "$PAYLOAD_VALIDATOR" "$TARGET_DIR" "$PRODUCT" "$RUNTIME_ARCH"
