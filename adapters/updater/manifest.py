"""Release manifest schema, version comparison, and package path policy."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path, PurePosixPath

MAX_MANIFEST_BYTES = 32 * 1024 * 1024
MAX_RELEASE_NOTES_CHARS = 64 * 1024
MAX_FILE_COUNT = 200_000
MAX_PACKAGE_BYTES = 4 * 1024 * 1024 * 1024
MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024
_VERSION_RE = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$")
_CHANNEL_RE = re.compile(r"^[a-z][a-z0-9-]{0,31}$")
_HASH_RE = re.compile(r"^[0-9a-f]{64}$")
_WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}
MANAGED_ROOTS = {"app", "python", "icons", "THIRD-PARTY-NOTICES"}
MANAGED_ROOT_FILES = {"VERSION.txt", "BUILD-INFO.txt", "install-pilot.ps1", "CAI-DAT.txt"}
PRESERVED_RELATIVE_PATHS = {"app/vnoffice-config.json"}


class ManifestError(ValueError):
    pass


def version_key(value: str) -> tuple[tuple[int, int, int], tuple[int, tuple[tuple[int, object], ...]]]:
    match = _VERSION_RE.fullmatch(str(value))
    if not match:
        raise ManifestError(f"Phiên bản không hợp lệ: {value}")
    core = tuple(int(match.group(index)) for index in (1, 2, 3))
    prerelease = match.group(4)
    if prerelease is None:
        return core, (1, ())
    parts = []
    for part in prerelease.split("."):
        if part.isdigit():
            parts.append((0, int(part)))
        else:
            parts.append((1, part.lower()))
    return core, (0, tuple(parts))


def compare_versions(left: str, right: str) -> int:
    a, b = version_key(left), version_key(right)
    return (a > b) - (a < b)


def _safe_relative_path(raw: object) -> str:
    if not isinstance(raw, str) or not raw or len(raw) > 1024 or "\x00" in raw:
        raise ManifestError("Đường dẫn tệp trong manifest không hợp lệ")
    if "\\" in raw or raw.startswith("/") or ":" in raw:
        raise ManifestError(f"Đường dẫn tệp không an toàn: {raw!r}")
    path = PurePosixPath(raw)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        raise ManifestError(f"Đường dẫn tệp không an toàn: {raw!r}")
    for part in path.parts:
        if part.endswith((".", " ")) or any(ord(char) < 32 for char in part):
            raise ManifestError(f"Tên tệp Windows không an toàn: {raw!r}")
        stem = part.split(".", 1)[0].upper()
        if stem in _WINDOWS_RESERVED:
            raise ManifestError(f"Tên tệp Windows dành riêng: {raw!r}")
    return path.as_posix()


def validate_package_path(raw: object) -> str:
    relative = _safe_relative_path(raw)
    top = relative.split("/", 1)[0]
    if top not in MANAGED_ROOTS and relative not in MANAGED_ROOT_FILES:
        raise ManifestError(f"Tệp nằm ngoài phạm vi gói VN Office: {relative}")
    if relative in PRESERVED_RELATIVE_PATHS:
        raise ManifestError(f"Không được cập nhật cấu hình riêng của người dùng: {relative}")
    return relative


def validate_manifest(data: object, *, expected_channel: str | None = None) -> dict[str, object]:
    if not isinstance(data, dict):
        raise ManifestError("Manifest phải là một đối tượng JSON")
    version = data.get("version")
    minimum = data.get("min_version")
    channel = data.get("channel")
    notes = data.get("release_notes")
    created = data.get("created_at")
    for candidate in (version, minimum):
        if not isinstance(candidate, str):
            raise ManifestError("Manifest thiếu version hoặc min_version")
        version_key(candidate)
    if not isinstance(channel, str) or not _CHANNEL_RE.fullmatch(channel):
        raise ManifestError("Tên kênh phát hành không hợp lệ")
    if expected_channel is not None and channel != expected_channel:
        raise ManifestError("Kênh trong manifest không khớp cấu hình")
    if not isinstance(notes, str) or not notes.strip() or len(notes) > MAX_RELEASE_NOTES_CHARS:
        raise ManifestError("Manifest cần ghi chú phát hành tiếng Việt, giới hạn 64 KiB")
    if not isinstance(created, str) or len(created) > 64:
        raise ManifestError("Manifest thiếu thời gian tạo")
    try:
        parsed_created = datetime.fromisoformat(created.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ManifestError("Thời gian tạo manifest không hợp lệ") from exc
    if parsed_created.tzinfo is None:
        raise ManifestError("Thời gian tạo manifest phải có múi giờ")
    files = data.get("files")
    if not isinstance(files, list) or not files or len(files) > MAX_FILE_COUNT:
        raise ManifestError("Manifest cần có danh sách tệp hợp lệ")
    safe_files = []
    seen = set()
    total_size = 0
    for entry in files:
        if not isinstance(entry, dict):
            raise ManifestError("Mục tệp trong manifest không hợp lệ")
        path = validate_package_path(entry.get("path"))
        key = path.casefold()
        if key in seen:
            raise ManifestError(f"Đường dẫn lặp trong manifest: {path}")
        seen.add(key)
        size = entry.get("size")
        digest = entry.get("sha256")
        if isinstance(size, bool) or not isinstance(size, int) or size < 0 or size > MAX_FILE_BYTES:
            raise ManifestError(f"Kích thước tệp không hợp lệ: {path}")
        if not isinstance(digest, str) or not _HASH_RE.fullmatch(digest):
            raise ManifestError(f"SHA-256 không hợp lệ: {path}")
        total_size += size
        if total_size > MAX_PACKAGE_BYTES:
            raise ManifestError("Kích thước gói vượt quá giới hạn an toàn 4 GiB")
        safe_files.append({"path": path, "size": size, "sha256": digest})
    if "VERSION.txt" not in {item["path"] for item in safe_files}:
        raise ManifestError("Manifest phải có VERSION.txt")
    if compare_versions(minimum, version) > 0:
        raise ManifestError("min_version không thể mới hơn phiên bản phát hành")
    return {
        "version": version,
        "min_version": minimum,
        "channel": channel,
        "release_notes": notes,
        "created_at": created,
        "files": safe_files,
    }


def parse_manifest(raw: bytes, *, expected_channel: str | None = None) -> dict[str, object]:
    if not isinstance(raw, bytes) or len(raw) > MAX_MANIFEST_BYTES:
        raise ManifestError("Manifest thiếu hoặc vượt quá giới hạn 32 MiB")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ManifestError("Manifest không phải JSON UTF-8 hợp lệ") from exc
    return validate_manifest(data, expected_channel=expected_channel)


def sha256_file(path: str | Path, *, chunk_size: int = 1024 * 1024) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    with Path(path).open("rb") as stream:
        while True:
            chunk = stream.read(chunk_size)
            if not chunk:
                break
            size += len(chunk)
            digest.update(chunk)
    return size, digest.hexdigest()
