#!/usr/bin/env python3
"""Script sinh cặp khóa Ed25519 cho hệ thống bản quyền 3T Office.

- Khóa riêng được ghi ra tệp được chỉ định dưới dạng base64 (TUYỆT ĐỐI KHÔNG in ra màn hình).
- Khóa công khai được in ra stdout dưới dạng base64 để cấu hình trên ứng dụng khách.
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519
except ImportError:
    sys.stderr.write("Lỗi: Cần cài đặt thư viện 'cryptography' để chạy script này.\n")
    sys.exit(1)


def generate_keypair(out_private_key_path: Path, force: bool = False) -> str:
    """Sinh cặp khóa Ed25519, lưu khóa riêng vào tệp và trả về khóa công khai base64."""
    if out_private_key_path.exists() and not force:
        raise FileExistsError(f"Tệp khóa riêng '{out_private_key_path}' đã tồn tại. Dùng --force để ghi đè.")

    # Sinh cặp khóa Ed25519 bằng CSPRNG
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_raw = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    priv_b64 = base64.b64encode(priv_raw).decode("ascii")

    pub_raw = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    pub_b64 = base64.b64encode(pub_raw).decode("ascii")

    # Ghi khóa riêng ra tệp chỉ định, bảo vệ phân quyền
    out_private_key_path.parent.mkdir(parents=True, exist_ok=True)
    out_private_key_path.write_text(priv_b64.strip() + "\n", encoding="ascii")
    try:
        os.chmod(out_private_key_path, 0o600)
    except OSError:
        pass

    return pub_b64


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sinh cặp khóa Ed25519 cho hệ thống bản quyền 3T Office"
    )
    parser.add_argument(
        "-o",
        "--out-private-key",
        required=True,
        type=Path,
        help="Đường dẫn tệp để lưu khóa riêng (base64)",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Ghi đè nếu tệp khóa riêng đã tồn tại",
    )

    args = parser.parse_args()

    try:
        pub_b64 = generate_keypair(args.out_private_key, force=args.force)
        # Chỉ in khóa công khai ra màn hình
        sys.stdout.write(pub_b64 + "\n")
    except Exception as exc:
        sys.stderr.write(f"Lỗi: {exc}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
