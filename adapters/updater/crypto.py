"""Minimal RSA PKCS#1 v1.5 SHA-256 helpers using only the Python standard library."""

from __future__ import annotations

import base64
import hashlib
import hmac
import math
import os
import secrets
from pathlib import Path

SHA256_DIGEST_INFO = bytes.fromhex("3031300d060960864801650304020105000420")
PUBLIC_EXPONENT = 65537


def verify_sha256_pkcs1v15(data: bytes, signature: bytes, modulus: int, exponent: int) -> bool:
    """Verify one detached RSA signature; reject malformed encodings without parsing ambiguity."""
    try:
        if not isinstance(data, bytes) or not isinstance(signature, bytes):
            return False
        if not isinstance(modulus, int) or not isinstance(exponent, int) or modulus <= 0 or exponent < 3:
            return False
        size = (modulus.bit_length() + 7) // 8
        padding_size = size - len(SHA256_DIGEST_INFO) - hashlib.sha256().digest_size - 3
        if size < 64 or len(signature) != size or padding_size < 8:
            return False
        signature_int = int.from_bytes(signature, "big")
        if signature_int >= modulus:
            return False
        encoded = pow(signature_int, exponent, modulus).to_bytes(size, "big")
        digest_info = SHA256_DIGEST_INFO + hashlib.sha256(data).digest()
        expected = b"\x00\x01" + (b"\xff" * padding_size) + b"\x00" + digest_info
        return hmac.compare_digest(encoded, expected)
    except (OverflowError, TypeError, ValueError):
        return False


def sign_sha256_pkcs1v15(data: bytes, modulus: int, private_exponent: int) -> bytes:
    size = (modulus.bit_length() + 7) // 8
    padding_size = size - len(SHA256_DIGEST_INFO) - hashlib.sha256().digest_size - 3
    if not isinstance(data, bytes) or padding_size < 8:
        raise ValueError("RSA key is too small for SHA-256 PKCS#1 v1.5 signing")
    digest_info = SHA256_DIGEST_INFO + hashlib.sha256(data).digest()
    encoded = b"\x00\x01" + (b"\xff" * padding_size) + b"\x00" + digest_info
    return pow(int.from_bytes(encoded, "big"), private_exponent, modulus).to_bytes(size, "big")


def _is_probable_prime(candidate: int, rounds: int = 64) -> bool:
    if candidate < 2:
        return False
    small_primes = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47)
    for prime in small_primes:
        if candidate == prime:
            return True
        if candidate % prime == 0:
            return False
    odd_part = candidate - 1
    powers_of_two = 0
    while odd_part % 2 == 0:
        powers_of_two += 1
        odd_part //= 2
    for _ in range(rounds):
        base = secrets.randbelow(candidate - 3) + 2
        value = pow(base, odd_part, candidate)
        if value in (1, candidate - 1):
            continue
        for _ in range(powers_of_two - 1):
            value = pow(value, 2, candidate)
            if value == candidate - 1:
                break
        else:
            return False
    return True


def _generate_prime(bits: int, exponent: int = PUBLIC_EXPONENT) -> int:
    while True:
        candidate = secrets.randbits(bits) | (1 << (bits - 1)) | 1
        if math.gcd(candidate - 1, exponent) == 1 and _is_probable_prime(candidate):
            return candidate


def generate_rsa_key(bits: int = 3072) -> dict[str, int]:
    if bits != 3072:
        raise ValueError("VN Office release keys must be exactly 3072 bits")
    half = bits // 2
    while True:
        p = _generate_prime(half)
        q = _generate_prime(half)
        if p == q:
            continue
        modulus = p * q
        if modulus.bit_length() != bits:
            continue
        phi = (p - 1) * (q - 1)
        if math.gcd(PUBLIC_EXPONENT, phi) != 1:
            continue
        private_exponent = pow(PUBLIC_EXPONENT, -1, phi)
        return {
            "n": modulus,
            "e": PUBLIC_EXPONENT,
            "d": private_exponent,
            "p": p,
            "q": q,
            "dp": private_exponent % (p - 1),
            "dq": private_exponent % (q - 1),
            "qi": pow(q, -1, p),
        }


def _der_length(length: int) -> bytes:
    if length < 0x80:
        return bytes((length,))
    encoded = length.to_bytes((length.bit_length() + 7) // 8, "big")
    return bytes((0x80 | len(encoded),)) + encoded


def _der_integer(value: int) -> bytes:
    if value < 0:
        raise ValueError("PKCS#1 RSA integers must be non-negative")
    raw = value.to_bytes(max(1, (value.bit_length() + 7) // 8), "big")
    if raw[0] & 0x80:
        raw = b"\x00" + raw
    return b"\x02" + _der_length(len(raw)) + raw


def private_key_to_pem(key: dict[str, int]) -> bytes:
    fields = [0, key["n"], key["e"], key["d"], key["p"], key["q"], key["dp"], key["dq"], key["qi"]]
    body = b"".join(_der_integer(value) for value in fields)
    der = b"\x30" + _der_length(len(body)) + body
    encoded = base64.encodebytes(der).replace(b"\n", b"")
    lines = b"\n".join(encoded[index:index + 64] for index in range(0, len(encoded), 64))
    return b"-----BEGIN RSA PRIVATE KEY-----\n" + lines + b"\n-----END RSA PRIVATE KEY-----\n"


def _read_der_length(data: bytes, offset: int) -> tuple[int, int]:
    if offset >= len(data):
        raise ValueError("Truncated DER length")
    first = data[offset]
    offset += 1
    if first < 0x80:
        return first, offset
    count = first & 0x7F
    if count == 0 or count > 4 or offset + count > len(data):
        raise ValueError("Invalid DER length")
    if data[offset] == 0:
        raise ValueError("Non-minimal DER length")
    length = int.from_bytes(data[offset:offset + count], "big")
    if length < 0x80:
        raise ValueError("Non-minimal DER length")
    return length, offset + count


def private_key_from_pem(pem: bytes | str) -> dict[str, int]:
    raw_pem = pem.encode("ascii") if isinstance(pem, str) else pem
    begin, end = b"-----BEGIN RSA PRIVATE KEY-----", b"-----END RSA PRIVATE KEY-----"
    if begin not in raw_pem or end not in raw_pem:
        raise ValueError("Expected a PKCS#1 RSA private key PEM")
    encoded = raw_pem.split(begin, 1)[1].split(end, 1)[0]
    der = base64.b64decode(b"".join(encoded.split()), validate=True)
    if not der or der[0] != 0x30:
        raise ValueError("Invalid PKCS#1 RSA key sequence")
    sequence_length, offset = _read_der_length(der, 1)
    if offset + sequence_length != len(der):
        raise ValueError("Invalid PKCS#1 RSA sequence length")
    values = []
    sequence_end = len(der)
    while offset < sequence_end:
        if der[offset] != 0x02:
            raise ValueError("Invalid PKCS#1 RSA integer")
        length, value_offset = _read_der_length(der, offset + 1)
        next_offset = value_offset + length
        if length == 0 or next_offset > sequence_end:
            raise ValueError("Truncated PKCS#1 RSA integer")
        raw = der[value_offset:next_offset]
        if raw[0] & 0x80 or (len(raw) > 1 and raw[0] == 0 and not raw[1] & 0x80):
            raise ValueError("Non-canonical PKCS#1 RSA integer")
        values.append(int.from_bytes(raw, "big"))
        offset = next_offset
    if len(values) != 9 or values[0] != 0:
        raise ValueError("Unsupported PKCS#1 RSA private key")
    names = ("n", "e", "d", "p", "q", "dp", "dq", "qi")
    return dict(zip(names, values[1:]))


def write_private_key(path: str | Path, key: dict[str, int], *, overwrite: bool = False) -> Path:
    target = Path(path).expanduser()
    target.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | (os.O_TRUNC if overwrite else os.O_EXCL)
    descriptor = os.open(target, flags, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(private_key_to_pem(key))
            stream.flush()
            os.fsync(stream.fileno())
    except Exception:
        try:
            target.unlink()
        except OSError:
            pass
        raise
    try:
        target.chmod(0o600)
    except OSError:
        pass
    return target
