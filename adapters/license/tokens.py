"""License token verification (Ed25519, payload.signature in base64url) against the embedded public keys."""

from __future__ import annotations

import base64
import hashlib
import json
from typing import Any, Iterable

from .ed25519_verify import verify

# Public Ed25519 keys (base64, 32 bytes).  Key rotation = append a new key; never remove one that
# still signs tokens in the field.  The private key is NOT in this repository.
# Source of truth for the list: docs/LICENSE-PUBLIC-KEYS.txt.
PUBLIC_KEYS_B64: tuple[str, ...] = (
    "3VQzs693VXrCbWXvmuR6YoDailm3zV26O4gdLYhK0jI=",
)


def b64url_decode(value: str) -> bytes:
    value = str(value)
    value += "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value.encode("ascii"))


def verify_token(token: object, public_keys_b64: Iterable[str] = PUBLIC_KEYS_B64) -> dict[str, Any] | None:
    """Return the signed claims, or None when the token is malformed, forged or signed by an unknown key."""
    if not isinstance(token, str) or token.count(".") != 1:
        return None
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        payload_bytes = b64url_decode(payload_b64)
        signature = b64url_decode(signature_b64)
    except (ValueError, UnicodeEncodeError):
        return None
    for key_b64 in public_keys_b64:
        try:
            public_key = base64.b64decode(str(key_b64).strip(), validate=True)
        except ValueError:
            continue
        if verify(public_key, payload_bytes, signature):
            try:
                claims = json.loads(payload_bytes.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return None
            if not isinstance(claims, dict) or claims.get("v") != 1 or not claims.get("lid") or not claims.get("fp"):
                return None
            return claims
    return None


def fingerprint_matches(claims: dict[str, Any], fingerprints: Iterable[str]) -> bool:
    """The token is bound to a device: accept it only for one of this machine's identifiers."""
    return str(claims.get("fp") or "") in set(fingerprints)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
