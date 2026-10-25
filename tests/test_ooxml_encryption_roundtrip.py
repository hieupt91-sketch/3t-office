from __future__ import annotations

import os
import secrets
import shutil
import sys
import subprocess
import tempfile
import ctypes
from pathlib import Path

import pytest

import main


pytestmark = pytest.mark.skipif(
    sys.platform != "win32",
    reason="the roundtrip test validates the Windows CFB container with ole32 and Office readback with PowerShell",
)


ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "tests" / "fixtures" / "real-office-samples"
OFFICE_READER = ROOT / "tests" / "live" / "office-encrypted-read.ps1"


@pytest.fixture(scope="module")
def encryption_roundtrip_root():
    """Share a seeded LibreOffice profile across the three serialization cases."""
    with tempfile.TemporaryDirectory(prefix="vno-encryption-module-", ignore_cleanup_errors=True) as temp:
        root = Path(temp)
        local_app_data = root / "localappdata"
        local_app_data.mkdir()
        profile_root = local_app_data / main.APP_DATA_DIR_NAME
        # Optional per-app profile seeds keep benchmark runs from paying first-run LibreOffice setup costs.
        for app_kind in ("writer", "sheet", "slides"):
            profile_dir = profile_root / f"lo-profile-{app_kind}"
            seed_dir = os.environ.get(f"VNO_TEST_SO_PROFILE_{app_kind.upper()}")
            if seed_dir and Path(seed_dir).is_dir():
                profile_dir.mkdir(parents=True)
                shutil.copytree(
                    Path(seed_dir) / "user",
                    profile_dir / "user",
                    ignore=shutil.ignore_patterns("extensions", "uno_packages"),
                )
                warm_marker = Path(seed_dir) / ".vnoffice-open-filters-warm-v1"
                if warm_marker.is_file():
                    shutil.copyfile(warm_marker, profile_dir / warm_marker.name)
            else:
                main._seed_profile_dir(app_kind, profile_dir)
        try:
            yield root, local_app_data
        finally:
            main._PERSISTENT_SOFFICE.shutdown()


class _EphemeralSecret:
    __slots__ = ("_value",)

    def __init__(self, value: str | None = None):
        # 14 ký tự: Documents.Open/Presentations.Open qua COM từ chối mọi mật khẩu từ 16 ký tự trở lên
        # (đo 19/10: ngay cả tệp do chính Word lưu cũng không mở lại được), nên mật khẩu thử phải ngắn hơn.
        self._value = value if value is not None else secrets.token_urlsafe(10)

    def reveal(self) -> str:
        return self._value


def _office_open(path: Path, plain_path: Path, app: str, secret: _EphemeralSecret, local_app_data: Path) -> str:
    if app == "sheet":
        pytest.skip("Excel COM is blocked by the unactivated environment; XLSX is checked by LibreOffice.")
    result = subprocess.run(
        ["powershell", "-NoProfile", "-File", str(OFFICE_READER), "-Path", str(path), "-PlainPath", str(plain_path), "-App", app],
        input=(secret.reveal() + "\n").encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        timeout=150,
        env={**os.environ, "LOCALAPPDATA": str(local_app_data)},
        check=False,
    )
    return result.stdout.decode("utf-8", errors="replace").strip()


def _structured_storage_open_result(path: Path) -> int:
    ole32 = ctypes.OleDLL("ole32")
    open_storage = ole32.StgOpenStorage
    open_storage.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_ulong, ctypes.c_void_p, ctypes.c_ulong, ctypes.POINTER(ctypes.c_void_p)]
    open_storage.restype = ctypes.c_long
    storage = ctypes.c_void_p()
    return int(open_storage(str(path), None, 0x10, None, 0, ctypes.byref(storage)))


@pytest.mark.parametrize(
    ("app", "source_name", "extension"),
    [
        ("writer", "sample-writer.docx", "docx"),
        ("sheet", "sample-sheet.xlsx", "xlsx"),
        ("slides", "sample-slides.pptx", "pptx"),
    ],
)
def test_vn_save_password_open_roundtrip(app: str, source_name: str, extension: str, monkeypatch, encryption_roundtrip_root):
    if not main.SOFFICE_PATH:
        pytest.skip("LibreOffice is unavailable.")
    module_root, local_app_data = encryption_roundtrip_root
    root = module_root / app
    root.mkdir()
    monkeypatch.setenv("LOCALAPPDATA", str(local_app_data))
    source = SAMPLES / source_name
    target = root / f"protected.{extension}"
    api = main.VnOfficeApi(app_kind=app)
    try:
        opened = api.open_document_dialog(app, str(source))
        assert opened.get("status") == "ok", opened.get("message", "open failed")
        secret = _EphemeralSecret()
        assert api.set_document_password(secret.reveal()).get("status") == "ok"
        saved = api.save_document_in_place(opened["content"], app, str(target), str(source))
        assert saved.get("status") == "ok", saved.get("message", "save failed")
        encrypted = target.read_bytes()
        assert main._ooxml_encryption().is_encrypted_package(encrypted)
        storage_result = _structured_storage_open_result(target)
        assert storage_result == 0, f"Windows structured storage rejected CFB container: {storage_result & 0xFFFFFFFF:08X}"

        reopened = api.open_document_dialog(app, str(target), secret.reveal())
        assert reopened.get("status") == "ok", reopened.get("message", "protected open failed")
        assert reopened.get("content"), "protected package opened without document content"
        wrong = api.open_document_dialog(app, str(target), secret.reveal() + "wrong")
        assert wrong.get("status") == "wrong_password", "incorrect password was not rejected clearly"

        if app in {"writer", "slides"}:
            office_app = "word" if app == "writer" else "powerpoint"
            # Keep the Office integration check focused on the encrypted output produced by this roundtrip.
            # Mở bản sao: bộ dựng tài liệu của ứng dụng có thể còn giữ khóa trên tệp đích khi Office mở nó.
            office_copy = root / f"office-open.{extension}"
            shutil.copyfile(target, office_copy)
            office_result = _office_open(office_copy, source, office_app, secret, local_app_data)
            assert office_result == "OPENED", f"Office COM open result: {office_result}"
    finally:
        api.close_autorecover_session()

