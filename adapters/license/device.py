"""Machine identity for license binding.  The server never sees the raw machine data, only a SHA-256."""

from __future__ import annotations

import hashlib
import platform
import re
import subprocess
import sys
import uuid

from .keys import CROCKFORD_ALPHABET

_DEVICE_WEIGHTS = (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31)


def _device_checksum(body: str) -> str:
    """Weighted sum over every character of the 24-character body (odd weights catch single typos)."""
    total = 0
    for index, char in enumerate(body):
        total += CROCKFORD_ALPHABET.index(char) * _DEVICE_WEIGHTS[index % len(_DEVICE_WEIGHTS)]
    return CROCKFORD_ALPHABET[total % 32]


def is_valid_device_code(code: str) -> bool:
    cleaned = str(code or "").upper().replace("-", "").replace(" ", "")
    if len(cleaned) != 28 or not cleaned.startswith("3TD"):
        return False
    body = cleaned[3:]
    return all(char in CROCKFORD_ALPHABET for char in body) and body[24:] == _device_checksum(body[:24]) if len(body) == 25 else False


_IOREG_UUID_RE = re.compile(r'"IOPlatformUUID"\s*=\s*"([0-9A-Fa-f-]{8,64})"')


def parse_ioreg_platform_uuid(output: str) -> str | None:
    """`ioreg -rd1 -c IOPlatformExpertDevice` prints `"IOPlatformUUID" = "XXXXXXXX-...."` (macOS hardware UUID)."""
    match = _IOREG_UUID_RE.search(str(output or ""))
    return match.group(1).upper() if match else None


def _macos_platform_uuid() -> str | None:
    try:
        completed = subprocess.run(
            ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
            capture_output=True, text=True, timeout=5, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return parse_ioreg_platform_uuid(completed.stdout) if completed.returncode == 0 else None


def _linux_machine_id() -> str | None:
    for path in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            with open(path, "r", encoding="ascii") as handle:
                value = handle.read().strip()
        except OSError:
            continue
        if re.fullmatch(r"[0-9a-fA-F]{16,64}", value):
            return value.lower()
    return None


def machine_id() -> str:
    """Stable per-installation OS identifier.

    Windows: MachineGuid. macOS: IOPlatformUUID. Linux: /etc/machine-id. Anything else (or when those are not
    readable) falls back to the MAC address, exactly as before.
    """
    if sys.platform == "darwin":
        value = _macos_platform_uuid()
        if value:
            return "mac-uuid-" + value
    elif sys.platform.startswith("linux"):
        value = _linux_machine_id()
        if value:
            return "linux-" + value
    if sys.platform == "win32":
        try:
            import winreg

            access = winreg.KEY_READ | getattr(winreg, "KEY_WOW64_64KEY", 0)
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, access) as handle:
                value, _ = winreg.QueryValueEx(handle, "MachineGuid")
            if value:
                return str(value)
        except OSError:
            pass
    return "mac-" + format(uuid.getnode(), "012x")


def device_name() -> str:
    return (platform.node() or "May-chua-dat-ten")[:128]


def device_fingerprint(machine: str | None = None, name: str | None = None) -> str:
    """SHA-256 hex of (machine id + computer name); 64 characters, accepted by the server's fingerprint format."""
    raw = f"{machine if machine is not None else machine_id()}|{name if name is not None else device_name()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def device_code(fingerprint: str) -> str:
    """Short typable code shown on a machine without Internet: 3TD-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (last char = checksum).

    The administrator types it on the admin page; the server binds the token to SHA-256(code).
    """
    digest = hashlib.sha256(("3t-device|" + fingerprint).encode("utf-8")).digest()
    number = int.from_bytes(digest[:15], "big")  # 120 bits -> 24 base32 characters
    chars = []
    for _ in range(24):
        chars.append(CROCKFORD_ALPHABET[number & 31])
        number >>= 5
    body = "".join(reversed(chars))
    full = body + _device_checksum(body)
    return "3TD-" + "-".join(full[index:index + 5] for index in range(0, 25, 5))


def offline_fingerprint(code: str) -> str:
    """What the server stores as the token's `fp` for an offline activation: SHA-256 of the code string."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()
