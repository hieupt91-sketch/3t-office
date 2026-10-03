"""License key format: 3TO-XXXXX-XXXXX-XXXXX-XXXXX (Crockford base32, last character is a checksum).

Must stay byte-compatible with server/3t-api/license.py (normalize_and_validate_key); the test
suite checks both against each other.  Validation here needs no network so typos are caught
while the user is still typing.
"""

from __future__ import annotations

import re

CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
_CHAR_TO_VALUE = {char: index for index, char in enumerate(CROCKFORD_ALPHABET)}
_WEIGHTS = (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 3, 5, 7)
_CLEAN_BODY = re.compile(r"^[0-9A-HJKMNP-TV-Z]{20}$")


def compute_checksum(first_19: str) -> str:
    if len(first_19) != 19:
        raise ValueError("A key body needs exactly 19 characters before the checksum.")
    total = 0
    for index, char in enumerate(first_19):
        value = _CHAR_TO_VALUE.get(char)
        if value is None:
            raise ValueError("Invalid character in license key.")
        total += value * _WEIGHTS[index]
    return CROCKFORD_ALPHABET[total % 32]


def normalize_key(key: object) -> str | None:
    """Return the canonical key (3TO-XXXXX-XXXXX-XXXXX-XXXXX) or None when it is malformed or mistyped."""
    if not isinstance(key, str):
        return None
    cleaned = key.strip().upper().replace("-", "").replace(" ", "")
    if not cleaned.startswith("3TO"):
        return None
    body = "".join("0" if char == "O" else "1" if char in ("I", "L") else char for char in cleaned[3:])
    if not _CLEAN_BODY.fullmatch(body):
        return None
    if body[19] != compute_checksum(body[:19]):
        return None
    return f"3TO-{body[0:5]}-{body[5:10]}-{body[10:15]}-{body[15:20]}"


def format_while_typing(raw: str) -> str:
    """Re-group what the user has typed so far as 3TO-XXXXX-... (no validation; used by the input box)."""
    cleaned = "".join(ch for ch in str(raw or "").upper() if ch.isalnum())
    if cleaned.startswith("3TO"):
        cleaned = cleaned[3:]
    cleaned = cleaned[:20]
    groups = [cleaned[index:index + 5] for index in range(0, len(cleaned), 5)]
    return "-".join(["3TO", *groups]) if groups else "3TO-"


def key_hint(canonical_key: str) -> str:
    return canonical_key[-4:]
