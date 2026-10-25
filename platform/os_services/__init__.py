"""OS services package (docs/PLAN-OS-SERVICES.md).

This repo has no top-level `platform/__init__.py` and `platform` shadows the standard library module, so the
package must NOT be imported as `from platform.os_services import ...`. Load it under a private name instead:

    spec = importlib.util.spec_from_file_location(
        "_vno_os_services", ROOT / "platform" / "os_services" / "__init__.py",
        submodule_search_locations=[str(ROOT / "platform" / "os_services")])

P1 only publishes the contract (base.py) and the backend selector. Backends (windows.py now, a portable
fallback and macos.py later) are added by the following steps; until a backend exists, get_services() reports
not_supported instead of silently choosing another OS.
"""

from __future__ import annotations

import importlib
import sys

from .base import (  # noqa: F401  (re-exported contract)
    CHILD_PURPOSES,
    SERVICE_FIELDS,
    CleanupReport,
    ClipboardPayload,
    LaunchSpec,
    OfficeEngineInfo,
    OfficeExportRequest,
    OSServices,
    RegistrationReport,
    ServiceError,
    ServiceResult,
)

# sys.platform prefix -> backend module name inside this package. Only registered backends can be selected.
_BACKENDS: dict[str, str] = {}


def register_backend(platform_prefix: str, module_name: str) -> None:
    """Called by a step that adds a backend (e.g. 'win32' -> 'windows'). Idempotent."""
    _BACKENDS[platform_prefix] = module_name


def backend_name_for(platform: str | None = None) -> str | None:
    value = platform if platform is not None else sys.platform
    for prefix, module_name in _BACKENDS.items():
        if value.startswith(prefix):
            return module_name
    return None


def get_services(platform: str | None = None, *, strict: bool = False) -> OSServices:
    """Build the services of the matching backend. Raises NotImplementedError when none is registered.

    strict=True also requires every service to be present (the final state of the migration).
    """
    module_name = backend_name_for(platform)
    if module_name is None:
        raise NotImplementedError(
            f"Chưa có bộ dịch vụ hệ điều hành cho nền tảng '{platform or sys.platform}'."
        )
    module = importlib.import_module(f"{__name__}.{module_name}")
    services = module.build_services()
    if strict:
        missing = [name for name in SERVICE_FIELDS if getattr(services, name, None) is None]
        if missing:
            raise RuntimeError("Backend thiếu dịch vụ: " + ", ".join(missing))
    return services


# Built-in backends. macOS has its own (FIX-MAC-1 C-5: native error dialog, reveal in the file manager; same data
# dirs as the portable backend it replaces). Linux keeps the portable one.
register_backend("win32", "windows")
register_backend("darwin", "macos")
register_backend("linux", "portable")
