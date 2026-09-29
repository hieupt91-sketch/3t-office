"""Local, UNC, and HTTPS update source access with bounded reads and resumable blobs."""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path, PurePosixPath

from .manifest import MAX_FILE_BYTES

DEFAULT_TIMEOUT_SECONDS = 12
_HEX_RE = re.compile(r"^[0-9a-f]{64}$")


class UpdateSourceError(OSError):
    pass


def is_unc_path(source: str) -> bool:
    """Recognize a Windows UNC source independent of the host OS (useful for validation)."""
    normalized = str(source).replace("/", "\\")
    return normalized.startswith("\\\\") and len(normalized.strip("\\").split("\\")) >= 2


def _relative_parts(relative_path: str) -> tuple[str, ...]:
    if not isinstance(relative_path, str) or not relative_path or "\\" in relative_path:
        raise UpdateSourceError("Đường dẫn nguồn không hợp lệ")
    path = PurePosixPath(relative_path)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise UpdateSourceError("Đường dẫn nguồn không an toàn")
    return path.parts


def _https_url(source: str, relative_path: str) -> str:
    parsed = urllib.parse.urlsplit(source)
    if parsed.scheme.lower() != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise UpdateSourceError("Nguồn cập nhật Internet phải là HTTPS hợp lệ")
    if parsed.query or parsed.fragment:
        raise UpdateSourceError("URL nguồn không được chứa query hoặc fragment")
    prefix = parsed.path.rstrip("/")
    suffix = "/".join(urllib.parse.quote(part, safe="-._~") for part in _relative_parts(relative_path))
    return urllib.parse.urlunsplit(("https", parsed.netloc, prefix + "/" + suffix, "", ""))


def _local_file(source: str, relative_path: str) -> Path:
    root = Path(source).expanduser()
    candidate = root.joinpath(*_relative_parts(relative_path))
    try:
        resolved_root = root.resolve(strict=False)
        resolved_candidate = candidate.resolve(strict=False)
        if os.path.commonpath((str(resolved_root), str(resolved_candidate))).casefold() != str(resolved_root).casefold():
            raise UpdateSourceError("Đường dẫn nguồn thoát khỏi thư mục nguồn")
    except ValueError as exc:
        raise UpdateSourceError("Đường dẫn nguồn không hợp lệ") from exc
    return candidate


def _read_stream(stream, max_bytes: int) -> bytes:
    content = stream.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise UpdateSourceError("Tệp nguồn vượt quá giới hạn kích thước")
    return content


def read_source_bytes(source: str, relative_path: str, *, max_bytes: int, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> bytes:
    if not source:
        raise UpdateSourceError("Chưa cấu hình nguồn cập nhật")
    if source.lower().startswith("https://"):
        url = _https_url(source, relative_path)
        request = urllib.request.Request(url, headers={"User-Agent": "VNOffice-Updater/1"})
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if not response.geturl().lower().startswith("https://"):
                    raise UpdateSourceError("Nguồn chuyển hướng khỏi HTTPS")
                return _read_stream(response, max_bytes)
        except (OSError, urllib.error.URLError) as exc:
            raise UpdateSourceError(f"Không thể đọc nguồn cập nhật: {exc}") from exc
    path = _local_file(source, relative_path)
    try:
        if path.stat().st_size > max_bytes:
            raise UpdateSourceError("Tệp nguồn vượt quá giới hạn kích thước")
        return path.read_bytes()
    except OSError as exc:
        raise UpdateSourceError(f"Không thể đọc nguồn cập nhật: {exc}") from exc


def download_blob(
    source: str,
    digest: str,
    destination: str | Path,
    *,
    expected_size: int,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> int:
    """Download one digest to a resumable .part file, verify it, and return newly fetched bytes."""
    if not _HEX_RE.fullmatch(str(digest)):
        raise UpdateSourceError("Tên blob SHA-256 không hợp lệ")
    if isinstance(expected_size, bool) or not isinstance(expected_size, int) or not 0 <= expected_size <= MAX_FILE_BYTES:
        raise UpdateSourceError("Kích thước blob không hợp lệ")
    target = Path(destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_file():
        size, actual = _hash_path(target)
        if size == expected_size and actual == digest:
            return 0
        target.unlink()
    partial = target.with_name(target.name + ".part")
    try:
        offset = partial.stat().st_size
    except OSError:
        offset = 0
    if offset > expected_size:
        partial.unlink(missing_ok=True)
        offset = 0
    fetched = 0
    if source.lower().startswith("https://"):
        url = _https_url(source, f"files/{digest}")
        headers = {"User-Agent": "VNOffice-Updater/1"}
        if offset:
            headers["Range"] = f"bytes={offset}-"
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if not response.geturl().lower().startswith("https://"):
                    raise UpdateSourceError("Nguồn chuyển hướng khỏi HTTPS")
                status = getattr(response, "status", 200)
                append = bool(offset and status == 206)
                if append and not str(response.headers.get("Content-Range", "")).startswith(f"bytes {offset}-"):
                    raise UpdateSourceError("Nguồn trả về Content-Range không khớp")
                if offset and status != 206:
                    offset = 0
                mode = "ab" if append else "wb"
                with partial.open(mode) as stream:
                    while True:
                        chunk = response.read(min(1024 * 1024, expected_size - offset - fetched + 1))
                        if not chunk:
                            break
                        fetched += len(chunk)
                        if offset + fetched > expected_size:
                            raise UpdateSourceError("Blob nguồn lớn hơn kích thước trong manifest")
                        stream.write(chunk)
        except (OSError, urllib.error.URLError) as exc:
            raise UpdateSourceError(f"Không thể tải blob {digest}: {exc}") from exc
    else:
        source_path = _local_file(source, f"files/{digest}")
        try:
            with source_path.open("rb") as input_stream:
                input_stream.seek(offset)
                mode = "ab" if offset else "wb"
                with partial.open(mode) as output_stream:
                    while True:
                        chunk = input_stream.read(1024 * 1024)
                        if not chunk:
                            break
                        fetched += len(chunk)
                        if offset + fetched > expected_size:
                            raise UpdateSourceError("Blob nguồn lớn hơn kích thước trong manifest")
                        output_stream.write(chunk)
        except OSError as exc:
            raise UpdateSourceError(f"Không thể tải blob {digest}: {exc}") from exc
    total_size, actual = _hash_path(partial)
    if total_size != expected_size:
        raise UpdateSourceError(f"Blob tải chưa đủ: {total_size}/{expected_size} byte")
    if actual != digest:
        partial.unlink(missing_ok=True)
        raise UpdateSourceError("SHA-256 blob không khớp")
    partial.replace(target)
    return fetched


def _hash_path(path: Path) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            digest.update(chunk)
    return size, digest.hexdigest()
