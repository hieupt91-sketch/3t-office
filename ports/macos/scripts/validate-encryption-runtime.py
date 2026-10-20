#!/usr/bin/env python3
"""Validate Office encryption in the exact Python runtime staged for Xcode."""

from __future__ import annotations

import argparse
import io
import secrets
import sys
import zipfile
from pathlib import Path


def _sample_package() -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_STORED) as package:
        package.writestr("[Content_Types].xml", "<Types/>")
        package.writestr("word/document.xml", "<document>runtime check</document>")
    return stream.getvalue()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-root", type=Path, required=True)
    args = parser.parse_args()
    app_root = args.app_root.resolve()
    if not (app_root / "platform/security/office_encryption.py").is_file():
        raise SystemExit(f"FAIL: app root không hợp lệ: {app_root}")

    sys.path.insert(0, str(app_root))
    try:
        import cryptography
        from cryptography.hazmat.backends.openssl.backend import backend
        from adapters.libreoffice.common import ooxml_encryption
    except Exception as exc:
        raise SystemExit(f"FAIL: runtime thiếu backend mã hóa: {type(exc).__name__}: {exc}") from exc

    if cryptography.__version__ != "44.0.2":
        raise SystemExit(f"FAIL: cryptography={cryptography.__version__}, cần 44.0.2 cho runtime pilot này")

    source = _sample_package()
    password = secrets.token_urlsafe(24)
    encrypted = ooxml_encryption.encrypt_package(source, password, spin_count=1000)
    if not ooxml_encryption.is_encrypted_package(encrypted):
        raise SystemExit("FAIL: output không phải container OOXML mã hóa")
    if ooxml_encryption.decrypt_package(encrypted, password) != source:
        raise SystemExit("FAIL: dữ liệu giải mã không khớp dữ liệu nguồn")

    print(f"PASS: cryptography={cryptography.__version__}")
    print(f"PASS: backend={backend.openssl_version_text()}")
    print("PASS: OOXML Agile AES-256 encrypt/decrypt runtime round-trip")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
