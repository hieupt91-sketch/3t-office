#!/usr/bin/env python3
"""Validate the third-party Python packages inside a VN Office macOS runtime.

Run it with the exact interpreter that ships (Runtime/bin/python3, or the Xcode
Debug overlay via PYTHONPATH). It fails when cryptography or pypdf is missing,
has the wrong version or lacks dist-info metadata, and smoke-runs the paths the
app uses: AES-GCM + OOXML Agile AES-256 encrypt/decrypt (cryptography) and
building/reading a small PDF plus the slides handout layout (pypdf).
Everything happens in memory or in a temporary folder; no document leaves the
machine.
"""

from __future__ import annotations

import argparse
import importlib
import importlib.metadata
import importlib.util
import io
import re
import secrets
import site
import sys
import tempfile
import zipfile
from pathlib import Path

LOCK_FILE = Path(__file__).resolve().parents[1] / "requirements-runtime-macos.lock"
REQUIRED = ("cryptography", "pypdf")


def _fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def _locked_versions(lock_file: Path) -> dict[str, str]:
    pins = dict(
        re.findall(r"^([A-Za-z0-9_.-]+)==([^\s\\]+)", lock_file.read_text(encoding="utf-8"), re.M)
    )
    missing = [name for name in REQUIRED if name not in pins]
    if missing:
        _fail(f"lock file {lock_file} thiếu pin cho: {', '.join(missing)}")
    return pins


def _check_installed(pins: dict[str, str]) -> dict[str, object]:
    modules: dict[str, object] = {}
    missing: list[str] = []
    for name in REQUIRED:
        try:
            modules[name] = importlib.import_module(name)
        except Exception as exc:  # report every missing module, not only the first
            missing.append(f"{name} ({type(exc).__name__}: {exc})")
    if missing:
        _fail(
            "runtime Python thiếu mô-đun bắt buộc: "
            + "; ".join(missing)
            + f". Interpreter: {sys.executable}. Cài bằng ports/macos/scripts/install-runtime-python-deps.sh"
        )

    user_site = site.getusersitepackages() if site.ENABLE_USER_SITE else None
    for name, module in modules.items():
        location = Path(getattr(module, "__file__", "") or "").resolve()
        if user_site and str(location).startswith(str(Path(user_site).resolve())):
            _fail(f"{name} được nạp từ user site-packages ({location}), không phải từ bundle")
        version = getattr(module, "__version__", None)
        if version != pins[name]:
            _fail(f"{name}={version}, cần {pins[name]} theo {LOCK_FILE.name}")
        try:
            meta_version = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            _fail(f"{name} thiếu thư mục dist-info (metadata license/phụ thuộc)")
        if meta_version != pins[name]:
            _fail(f"{name} dist-info={meta_version}, mô-đun={version}")
        print(f"PASS: {name}={version} ({location.parent})")
    return modules


def _sample_package() -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_STORED) as package:
        package.writestr("[Content_Types].xml", "<Types/>")
        package.writestr("word/document.xml", "<document>runtime check</document>")
    return stream.getvalue()


def _smoke_cryptography(app_root: Path) -> None:
    try:
        from cryptography.hazmat.backends.openssl.backend import backend
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from adapters.libreoffice.common import ooxml_encryption
    except Exception as exc:
        _fail(f"runtime thiếu backend mã hóa: {type(exc).__name__}: {exc}")

    key = AESGCM.generate_key(bit_length=256)
    nonce = secrets.token_bytes(12)
    aead = AESGCM(key)
    if aead.decrypt(nonce, aead.encrypt(nonce, b"vno-runtime", b"aad"), b"aad") != b"vno-runtime":
        _fail("AES-GCM round-trip không khớp")

    source = _sample_package()
    password = secrets.token_urlsafe(24)
    encrypted = ooxml_encryption.encrypt_package(source, password, spin_count=1000)
    if not ooxml_encryption.is_encrypted_package(encrypted):
        _fail("output không phải container OOXML mã hóa")
    if ooxml_encryption.decrypt_package(encrypted, password) != source:
        _fail("dữ liệu giải mã không khớp dữ liệu nguồn")

    print(f"PASS: backend={backend.openssl_version_text()}")
    print("PASS: AES-256-GCM round-trip")
    print("PASS: OOXML Agile AES-256 encrypt/decrypt runtime round-trip")


def _load_print_pipeline(app_root: Path):
    path = app_root / "platform/print/print_pipeline.py"
    spec = importlib.util.spec_from_file_location("_vno_runtime_check_print_pipeline", path)
    if spec is None or spec.loader is None:
        _fail(f"không nạp được {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _smoke_pypdf(app_root: Path) -> None:
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    for _ in range(4):
        writer.add_blank_page(width=720, height=405)
    stream = io.BytesIO()
    writer.write(stream)
    reader = PdfReader(io.BytesIO(stream.getvalue()))
    if len(reader.pages) != 4 or round(float(reader.pages[0].mediabox.width)) != 720:
        _fail("pypdf đọc lại PDF mẫu sai số trang hoặc kích thước")
    print("PASS: pypdf write/read 4-page PDF")

    pipeline = _load_print_pipeline(app_root)
    with tempfile.TemporaryDirectory(prefix="vno-runtime-pdf-") as folder:
        source = Path(folder) / "slides.pdf"
        output = Path(folder) / "handout.pdf"
        source.write_bytes(stream.getvalue())
        sheets = pipeline.build_slides_handout_pdf(str(source), str(output), 3)
        if sheets != 2 or len(PdfReader(str(output)).pages) != 2:
            _fail(f"bản phát tay 3 trang chiếu/tờ cho 4 trang phải ra 2 tờ, thấy {sheets}")
    print("PASS: slides handout layout (print_pipeline.build_slides_handout_pdf)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-root", type=Path, required=True)
    args = parser.parse_args()
    app_root = args.app_root.resolve()
    for required in ("platform/security/office_encryption.py", "platform/print/print_pipeline.py"):
        if not (app_root / required).is_file():
            _fail(f"app root không hợp lệ (thiếu {required}): {app_root}")

    pins = _locked_versions(LOCK_FILE)
    _check_installed(pins)
    sys.path.insert(0, str(app_root))
    _smoke_cryptography(app_root)
    _smoke_pypdf(app_root)
    print(f"PASS: runtime Python {sys.version.split()[0]} ({sys.executable}) có đủ cryptography + pypdf")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
