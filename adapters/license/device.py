"""Machine identity for license binding.  The server never sees the raw machine data, only a SHA-256."""

from __future__ import annotations

import hashlib
import platform
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


def machine_id() -> str:
    """Stable per-installation OS identifier (Windows MachineGuid; other systems fall back to the MAC address)."""
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
