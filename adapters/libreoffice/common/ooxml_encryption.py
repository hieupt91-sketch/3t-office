"""LibreOffice adapter entry point for Office OOXML password encryption.

The implementation lives in Shared Platform security so all three applications
reuse the same ECMA-376 Agile Encryption code.
"""
import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "_vno_platform_office_encryption"
_MODULE_PATH = Path(__file__).resolve().parents[3] / "platform" / "security" / "office_encryption.py"
_MODULE = sys.modules.get(_MODULE_NAME)
if _MODULE is None:
    _SPEC = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    if _SPEC is None or _SPEC.loader is None:
        raise ImportError("Shared Office encryption service is unavailable.")
    _MODULE = importlib.util.module_from_spec(_SPEC)
    sys.modules[_MODULE_NAME] = _MODULE
    _SPEC.loader.exec_module(_MODULE)

OfficeEncryptionError = _MODULE.OfficeEncryptionError
WrongPasswordError = _MODULE.WrongPasswordError
CFB_SIGNATURE = _MODULE.CFB_SIGNATURE
decrypt_package = _MODULE.decrypt_package
encrypt_package = _MODULE.encrypt_package
is_encrypted_package = _MODULE.is_encrypted_package

__all__ = [
    "OfficeEncryptionError",
    "WrongPasswordError",
    "CFB_SIGNATURE",
    "decrypt_package",
    "encrypt_package",
    "is_encrypted_package",
]
