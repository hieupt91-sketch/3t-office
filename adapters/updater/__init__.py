"""Signed, offline-tolerant automatic update support for 3T Office."""

from .crypto import generate_rsa_key, sign_sha256_pkcs1v15, verify_sha256_pkcs1v15
from .manifest import ManifestError, compare_versions, parse_manifest, validate_manifest
from .updater import UpdaterManager, UpdateRefused, is_update_allowed

__all__ = [
    "ManifestError", "UpdaterManager", "UpdateRefused", "compare_versions",
    "generate_rsa_key", "is_update_allowed", "parse_manifest", "sign_sha256_pkcs1v15",
    "validate_manifest", "verify_sha256_pkcs1v15",
]
