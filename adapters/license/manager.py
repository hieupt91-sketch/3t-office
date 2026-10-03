"""License state for this machine: activation, offline activation, trial and status.

Design rules (docs/SPEC-LICENSE-KEYS.md):
* offline first - a stored, correctly signed token keeps working without Internet;
* a token lapses softly: after `check_by` there is a grace period, then only a reminder;
* nothing here blocks the application - it reports a state and the caller decides what to do.
"""

from __future__ import annotations

import json
import math
import os
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

from . import device as device_mod
from .keys import key_hint, normalize_key
from .tokens import fingerprint_matches, verify_token

DEFAULT_API_BASE = "https://office.3tcomputer.com/api/v1/license"
TRIAL_DAYS = 30
DAY = 86400

HttpPost = Callable[[str, dict[str, Any], float], tuple[int, dict[str, Any]]]


class LicenseError(Exception):
    """A user-presentable failure; `code` is machine readable, the message is Vietnamese."""

    def __init__(self, code: str, message: str, extra: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.extra = extra or {}


_NETWORK_MESSAGE = "Không kết nối được máy chủ bản quyền. Hãy kiểm tra Internet hoặc dùng kích hoạt ngoại tuyến."


def default_http_post(url: str, payload: dict[str, Any], timeout: float) -> tuple[int, dict[str, Any]]:
    """POST JSON with the standard library; returns (status, parsed body).  Network failures raise LicenseError."""
    if not url.lower().startswith("https://") and not url.lower().startswith("http://127.0.0.1"):
        raise LicenseError("insecure_url", "Địa chỉ máy chủ bản quyền không an toàn.")
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "3T-Office-License/1"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - https enforced above
            return response.status, _parse_body(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, _parse_body(exc.read())
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise LicenseError("network", _NETWORK_MESSAGE) from exc


def _parse_body(raw: bytes) -> dict[str, Any]:
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


class LicenseManager:
    def __init__(
        self,
        data_dir: str | os.PathLike[str],
        app_version: str,
        *,
        api_base: str = DEFAULT_API_BASE,
        platform_name: str = "windows",
        http_post: HttpPost | None = None,
        now: Callable[[], float] | None = None,
        fingerprint: str | None = None,
        public_keys: tuple[str, ...] | None = None,
    ):
        self.path = Path(data_dir) / "license.json"
        self.app_version = app_version
        self.api_base = api_base.rstrip("/")
        self.platform_name = platform_name
        self._http_post = http_post or default_http_post
        self._now = now or time.time
        self._fingerprint = fingerprint or device_mod.device_fingerprint()
        self._device_code = device_mod.device_code(self._fingerprint)
        self._public_keys = public_keys

    # ---- storage ---------------------------------------------------------------------------------
    def _read(self) -> dict[str, Any]:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def _write(self, data: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        handle, temp_name = tempfile.mkstemp(prefix="license-", suffix=".tmp", dir=str(self.path.parent))
        try:
            with os.fdopen(handle, "w", encoding="utf-8") as temp:
                json.dump(data, temp, ensure_ascii=False, indent=1)
            os.replace(temp_name, self.path)
        except BaseException:
            try:
                os.unlink(temp_name)
            except OSError:
                pass
            raise

    # ---- identity --------------------------------------------------------------------------------
    @property
    def device_code(self) -> str:
        return self._device_code

    def _accepted_fingerprints(self) -> tuple[str, ...]:
        return (self._fingerprint, device_mod.offline_fingerprint(self._device_code))

    def _claims(self, token: object) -> dict[str, Any] | None:
        claims = verify_token(token) if self._public_keys is None else verify_token(token, self._public_keys)
        if claims is None or not fingerprint_matches(claims, self._accepted_fingerprints()):
            return None
        return claims

    # ---- status ----------------------------------------------------------------------------------
    def status(self) -> dict[str, Any]:
        """Describe the current license; also starts the 30-day trial the first time it is asked."""
        data = self._read()
        now = self._now()
        token = data.get("token")
        if token:
            claims = self._claims(token)
            if claims is not None:
                check_by = float(claims.get("check_by") or 0)
                grace = float(claims.get("grace_days") or 30) * DAY
                if now <= check_by:
                    state = "active"
                elif now <= check_by + grace:
                    state = "active_grace"
                else:
                    state = "check_required"
                return {
                    "state": state,
                    "licensed": True,
                    "edition": claims.get("edition") or "perpetual",
                    "key_hint": claims.get("key_hint") or "",
                    "check_by": int(check_by),
                    "days_until_check": int((check_by - now) // DAY),
                    "device_code": self._device_code,
                    "message": {
                        "active": "Đã kích hoạt bản quyền vĩnh viễn.",
                        "active_grace": "Đã kích hoạt. Hãy kết nối Internet để làm mới bản quyền.",
                        "check_required": "Đã kích hoạt, nhưng cần kết nối Internet để xác nhận lại bản quyền.",
                    }[state],
                }
            data.pop("token", None)
            data["last_issue"] = "token_rejected"
            self._write(data)
        started = data.get("trial_started")
        if not isinstance(started, (int, float)):
            started = now
            data["trial_started"] = started
            self._write(data)
        elapsed_days = max(0.0, (now - float(started)) / DAY)
        trial_active = elapsed_days < TRIAL_DAYS
        days_left = max(0, math.ceil(TRIAL_DAYS - elapsed_days)) if trial_active else 0
        return {
            "state": "trial" if trial_active else "trial_expired",
            "licensed": False,
            "trial_days_left": days_left,
            "device_code": self._device_code,
            "message": (
                f"Đang dùng thử, còn {days_left} ngày." if trial_active
                else "Đã hết thời gian dùng thử. Hãy nhập mã kích hoạt để tiếp tục dùng đầy đủ."
            ),
        }

    # ---- online ----------------------------------------------------------------------------------
    def _post(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        status, body = self._http_post(f"{self.api_base}/{endpoint}", payload, 15.0)
        if status == 200:
            return body
        code = str(body.get("error") or f"http_{status}")
        message = str(body.get("message") or "Máy chủ bản quyền từ chối yêu cầu.")
        extra = {k: v for k, v in body.items() if k not in {"error", "message"}}
        raise LicenseError(code, message, extra)

    def activate(self, key: str, email: str | None = None) -> dict[str, Any]:
        canonical = normalize_key(key)
        if canonical is None:
            raise LicenseError("invalid_key", "Mã kích hoạt chưa đúng. Hãy kiểm tra lại từng ký tự (dạng 3TO-XXXXX-XXXXX-XXXXX-XXXXX).")
        payload: dict[str, Any] = {
            "product": "3t-office",
            "key": canonical,
            "device_fingerprint": self._fingerprint,
            "device_name": device_mod.device_name(),
            "app_version": self.app_version,
            "platform": self.platform_name,
        }
        if email:
            payload["email"] = email
        body = self._post("activate", payload)
        token = body.get("token")
        if self._claims(token) is None:
            raise LicenseError("bad_token", "Máy chủ trả về bản quyền không hợp lệ. Vui lòng thử lại hoặc liên hệ hỗ trợ.")
        data = self._read()
        data["token"] = token
        data["key_hint"] = key_hint(canonical)
        data.pop("last_issue", None)
        self._write(data)
        result = self.status()
        result["seats"] = body.get("license") or {}
        return result

    def refresh(self) -> dict[str, Any]:
        """Ask the server to renew the token (call in the background; failures leave the stored token intact)."""
        data = self._read()
        token = data.get("token")
        if not token or self._claims(token) is None:
            return self.status()
        try:
            body = self._post("validate", {"token": token})
        except LicenseError as exc:
            if exc.code in {"revoked", "device_removed", "invalid_token"}:
                data.pop("token", None)
                data["last_issue"] = exc.code
                self._write(data)
            return {**self.status(), "refresh_error": exc.code}
        new_token = body.get("token")
        if self._claims(new_token) is not None:
            data["token"] = new_token
            self._write(data)
        return self.status()

    def deactivate(self) -> dict[str, Any]:
        """Free this machine's seat on the server, then forget the token.  The token is kept if the server is unreachable."""
        data = self._read()
        token = data.get("token")
        if token:
            self._post("deactivate", {"token": token})
            data.pop("token", None)
            self._write(data)
        return self.status()

    # ---- offline ---------------------------------------------------------------------------------
    def apply_activation_code(self, code: str) -> dict[str, Any]:
        """Accept the activation code (a signed token) produced by the administrator for this device code."""
        token = "".join(str(code or "").split())
        claims = self._claims(token)
        if claims is None:
            raise LicenseError("bad_activation_code", "Mã kích hoạt ngoại tuyến không đúng hoặc không dành cho máy này.")
        data = self._read()
        data["token"] = token
        data.pop("last_issue", None)
        self._write(data)
        return self.status()
