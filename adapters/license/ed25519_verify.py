"""Ed25519 signature verification (RFC 8032) using only the Python standard library.

Verification only (no signing).  The license token is public data signed by the server, so
constant-time behaviour is not required.  Mirrors adapters/updater/crypto.py, which also avoids
third-party crypto packages so the offline desktop build has no extra dependency.
"""

from __future__ import annotations

import hashlib

_P = 2 ** 255 - 19
_Q = 2 ** 252 + 27742317777372353535851937790883648493
_D = -121665 * pow(121666, _P - 2, _P) % _P
_SQRT_M1 = pow(2, (_P - 1) // 4, _P)


def _recover_x(y: int, sign: int) -> int | None:
    if y >= _P:
        return None
    x2 = (y * y - 1) * pow(_D * y * y + 1, _P - 2, _P) % _P
    if x2 == 0:
        return None if sign else 0
    x = pow(x2, (_P + 3) // 8, _P)
    if (x * x - x2) % _P != 0:
        x = x * _SQRT_M1 % _P
    if (x * x - x2) % _P != 0:
        return None
    if (x & 1) != sign:
        x = _P - x
    return x


def _add(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    e1 = (a[1] - a[0]) * (b[1] - b[0]) % _P
    e2 = (a[1] + a[0]) * (b[1] + b[0]) % _P
    e3 = 2 * a[3] * b[3] * _D % _P
    e4 = 2 * a[2] * b[2] % _P
    e, f, g, h = e2 - e1, e4 - e3, e4 + e3, e2 + e1
    return (e * f % _P, g * h % _P, f * g % _P, e * h % _P)


def _mul(scalar: int, point: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    result = (0, 1, 1, 0)
    while scalar > 0:
        if scalar & 1:
            result = _add(result, point)
        point = _add(point, point)
        scalar >>= 1
    return result


def _equal(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> bool:
    return (a[0] * b[2] - b[0] * a[2]) % _P == 0 and (a[1] * b[2] - b[1] * a[2]) % _P == 0


def _decompress(data: bytes) -> tuple[int, int, int, int] | None:
    if len(data) != 32:
        return None
    y = int.from_bytes(data, "little")
    sign = y >> 255
    y &= (1 << 255) - 1
    x = _recover_x(y, sign)
    if x is None:
        return None
    return (x, y, 1, x * y % _P)


_BASE_Y = 4 * pow(5, _P - 2, _P) % _P
_BASE_X = _recover_x(_BASE_Y, 0)
_BASE = (_BASE_X, _BASE_Y, 1, _BASE_X * _BASE_Y % _P)


def verify(public_key: bytes, message: bytes, signature: bytes) -> bool:
    """Return True only for a valid signature; never raises on malformed input."""
    try:
        if not isinstance(public_key, bytes) or not isinstance(message, bytes) or not isinstance(signature, bytes):
            return False
        if len(public_key) != 32 or len(signature) != 64:
            return False
        a_point = _decompress(public_key)
        r_point = _decompress(signature[:32])
        if a_point is None or r_point is None:
            return False
        s = int.from_bytes(signature[32:], "little")
        if s >= _Q:
            return False
        h = int.from_bytes(hashlib.sha512(signature[:32] + public_key + message).digest(), "little") % _Q
        return _equal(_mul(s, _BASE), _add(r_point, _mul(h, a_point)))
    except (OverflowError, TypeError, ValueError):
        return False
