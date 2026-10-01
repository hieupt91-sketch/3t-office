"""Local settings and Windows login registration for the optional Quick Start service."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
RUN_VALUE = "3T Office Quick Start"
APP_KEY = r"Software\3T Office"
APP_VALUE = "QuickStartEnabled"


def settings_path(app_data_dir: str | Path) -> Path:
    return Path(app_data_dir) / "quick-start-settings.json"


def _read_file_enabled(path: Path) -> bool:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return False
    return isinstance(value, dict) and value.get("enabled") is True


def _registry_enabled() -> bool:
    if os.name != "nt":
        return False
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_READ) as key:
            value, _kind = winreg.QueryValueEx(key, RUN_VALUE)
        return isinstance(value, str) and "--quick-start" in value
    except (OSError, ImportError):
        return False


def is_enabled(app_data_dir: str | Path) -> bool:
    return _registry_enabled() or _read_file_enabled(settings_path(app_data_dir))


def set_enabled(
    enabled: bool,
    app_data_dir: str | Path,
    *,
    install_root: str | Path | None = None,
    pythonw: str | Path | None = None,
    main_script: str | Path | None = None,
) -> dict[str, object]:
    value = {"enabled": bool(enabled)}
    path = settings_path(app_data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".quick-start-", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, separators=(",", ":"))
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.unlink(temporary)
        except OSError:
            pass
        raise

    registered = False
    if os.name == "nt" and install_root and pythonw and main_script:
        import winreg

        with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                command = f'"{Path(pythonw)}" -s -E "{Path(main_script)}" --quick-start'
                winreg.SetValueEx(key, RUN_VALUE, 0, winreg.REG_SZ, command)
                registered = True
            else:
                try:
                    winreg.DeleteValue(key, RUN_VALUE)
                except FileNotFoundError:
                    pass
        with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, APP_KEY, 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, APP_VALUE, 0, winreg.REG_DWORD, 1 if enabled else 0)

    return {"enabled": bool(enabled), "registeredAtLogin": registered}
