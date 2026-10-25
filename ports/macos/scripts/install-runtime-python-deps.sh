#!/bin/bash
# Install the hash-locked third-party Python packages (cryptography, pypdf and
# their dependencies) into a VN Office macOS Python runtime, then validate them
# inside that same interpreter.
#
# Offline-reproducible: wheels come only from a local wheelhouse
# (pip install --no-index --require-hashes --only-binary=:all:). Use --download
# once on a networked build machine to fill the wheelhouse; afterwards the
# install step needs no network. No document content is involved.
#
# Usage:
#   install-runtime-python-deps.sh --python <Runtime/bin/python3> [options]
#   install-runtime-python-deps.sh --runtime <Runtime dir> [options]
# Options:
#   --target DIR      install into DIR (Xcode Debug overlay) instead of the
#                     runtime's own site-packages
#   --arch ARCH       run the interpreter as arm64 or x86_64 (/usr/bin/arch)
#   --wheelhouse DIR  wheel cache (default: ports/macos/build/wheelhouse)
#   --download        fill the wheelhouse from PyPI first (network, hash-checked)
#   --app-root DIR    checkout used by the validator (default: this repo)
#   --no-validate     skip validate-encryption-runtime.py (not for packaging)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
MACOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
REPO_ROOT="$(cd "$MACOS_DIR/../.." && pwd -P)"
LOCK_FILE="$MACOS_DIR/requirements-runtime-macos.lock"
VALIDATOR="$SCRIPT_DIR/validate-encryption-runtime.py"

PYTHON=""
TARGET=""
ARCH=""
WHEELHOUSE="$MACOS_DIR/build/wheelhouse"
DOWNLOAD=0
APP_ROOT="$REPO_ROOT"
VALIDATE=1

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//' >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --python) PYTHON="${2:?}"; shift 2 ;;
    --runtime) PYTHON="${2:?}/bin/python3"; shift 2 ;;
    --target) TARGET="${2:?}"; shift 2 ;;
    --arch) ARCH="${2:?}"; shift 2 ;;
    --wheelhouse) WHEELHOUSE="${2:?}"; shift 2 ;;
    --download) DOWNLOAD=1; shift ;;
    --app-root) APP_ROOT="${2:?}"; shift 2 ;;
    --no-validate) VALIDATE=0; shift ;;
    -h|--help) usage ;;
    *) echo "Tham số không hợp lệ: $1" >&2; usage ;;
  esac
done

[[ -n "$PYTHON" ]] || { echo "Thiếu --python hoặc --runtime." >&2; usage; }
[[ -x "$PYTHON" ]] || { echo "Không chạy được Python runtime: $PYTHON" >&2; exit 2; }
[[ -f "$LOCK_FILE" ]] || { echo "Thiếu lock file: $LOCK_FILE" >&2; exit 2; }

run_python() {
  # -s: never let ~/Library/Python user site-packages satisfy a bundle check.
  if [[ -n "$ARCH" ]]; then
    /usr/bin/arch "-$ARCH" "$PYTHON" -s "$@"
  else
    "$PYTHON" -s "$@"
  fi
}

PIP_COMMON=(--disable-pip-version-check --no-input --require-hashes --only-binary=:all:)

mkdir -p "$WHEELHOUSE"
if [[ "$DOWNLOAD" -eq 1 ]]; then
  echo "Tải wheel đã khóa hash vào wheelhouse: $WHEELHOUSE"
  run_python -m pip download "${PIP_COMMON[@]}" --dest "$WHEELHOUSE" -r "$LOCK_FILE"
fi

install_args=(--no-index --find-links "$WHEELHOUSE")
if [[ -n "$TARGET" ]]; then
  mkdir -p "$TARGET"
  install_args+=(--target "$TARGET" --upgrade)
fi

echo "Cài gói Python đã khóa (cryptography, pypdf) cho runtime: $PYTHON${TARGET:+ -> $TARGET}"
if ! run_python -m pip install "${PIP_COMMON[@]}" "${install_args[@]}" -r "$LOCK_FILE"; then
  echo "FAIL: không cài được gói từ wheelhouse ngoại tuyến $WHEELHOUSE." >&2
  echo "Chạy lại với --download trên máy có mạng để nạp wheel (đã kiểm hash), rồi build lại." >&2
  exit 1
fi

if [[ "$VALIDATE" -eq 1 ]]; then
  if [[ -n "$TARGET" ]]; then
    PYTHONPATH="$TARGET${PYTHONPATH:+:$PYTHONPATH}" run_python "$VALIDATOR" --app-root "$APP_ROOT"
  else
    run_python "$VALIDATOR" --app-root "$APP_ROOT"
  fi
fi
