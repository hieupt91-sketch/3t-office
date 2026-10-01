"""Shared Vietnamese classification for document-open failures."""

from __future__ import annotations

import os
import re
from pathlib import Path

_COMPOUND_FILE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
_PASSWORD_MARKERS = (
    b"EncryptedPackage",
    "EncryptedPackage".encode("utf-16le"),
    b"EncryptionInfo",
    "EncryptionInfo".encode("utf-16le"),
)
_PASSWORD_ERROR = re.compile(r"password|encrypted|encryption|m[aậ]t kh[aẩ]u|m[aã] h[oó]a", re.I)
_LOCK_ERROR = re.compile(
    r"locked|being used|in use|sharing violation|permission denied|access denied|"
    r"cannot access|file is open|t[eệ]p .*kh[oô]ng th[eể] truy c[aậ]p|"
    r"kh[oó]a|[dđ]ang s[uử] d[uụ]ng|quy[eề]n truy c[aậ]p",
    re.I,
)
_CORRUPT_ERROR = re.compile(
    r"badzip|bad zip|corrupt|corrupted|damaged|malformed|invalid package|"
    r"parse error|not a zip|missing .*part|thi[eếu].*(?:th[aà]nh ph[aầ]n|ph[aầ]n)|"
    r"b[iị] h[oỏ]ng|kh[oô]ng [dđ][uú]ng [dđ][iị]nh d[aạ]ng",
    re.I,
)


def is_password_protected_ooxml(path: str | os.PathLike[str]) -> bool:
    """Detect encrypted OOXML containers (OLE headers with EncryptionInfo streams)."""
    try:
        with open(path, "rb") as handle:
            signature = handle.read(8)
            if signature != _COMPOUND_FILE_SIGNATURE:
                return False
            sample = signature + handle.read(4 * 1024 * 1024)
    except OSError:
        return False
    return any(marker in sample for marker in _PASSWORD_MARKERS)


def _has_owner_lock_file(path: Path) -> bool:
    return path.with_name("~$" + path.name).exists()


def open_failure_message(
    path: str | os.PathLike[str] | None,
    error: object = "",
    *,
    document_label: str = "Tài liệu",
) -> str:
    """Return a specific message and state that the current document remains open."""
    source = Path(path) if path else None
    detail = str(error or "")

    if source and source.exists() and source.suffix.lower() in {".docx", ".xlsx", ".pptx"}:
        if is_password_protected_ooxml(source):
            detail = f"{detail} password-protected encrypted OOXML"
    if source and _has_owner_lock_file(source):
        detail = f"{detail} file is locked by an Office owner file"
    if isinstance(error, PermissionError):
        detail = f"{detail} permission denied"
    winerror = getattr(error, "winerror", None)
    if winerror in {5, 32, 33}:
        detail = f"{detail} sharing violation"

    retained = f"{document_label} đang mở được giữ nguyên."
    if _PASSWORD_ERROR.search(detail):
        return f"Tệp được bảo vệ bằng mật khẩu nên 3T Office chưa thể mở. Hãy mở tệp bằng chương trình đã tạo, nhập mật khẩu và lưu một bản không mã hóa rồi thử lại. {retained}"
    if _LOCK_ERROR.search(detail):
        return f"Tệp đang bị khóa hoặc được chương trình khác sử dụng. Hãy đóng tệp ở chương trình đó, kiểm tra quyền truy cập rồi thử lại. {retained}"
    if _CORRUPT_ERROR.search(detail):
        return f"Tệp bị hỏng hoặc có cấu trúc không hợp lệ. Hãy kiểm tra bản sao lưu hoặc định dạng tệp rồi thử lại. {retained}"
    if source and not source.exists():
        return f"Không tìm thấy tệp đã chọn. Hãy kiểm tra đường dẫn rồi thử lại. {retained}"
    return f"Không thể mở tệp. Hãy kiểm tra định dạng và quyền truy cập rồi thử lại. {retained}"
