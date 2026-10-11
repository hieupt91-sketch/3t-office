"""One-time migrations that let a patch update (no Setup run) bring an older install up to date.

Patch updates never touch ``app/vnoffice-config.json`` and cannot write the registry, so an install made by an
older Setup would keep a LAN-only update source, no error-report endpoint and the shared "Python" entry in
"Open with". These helpers apply the same result the new Setup produces, per user, idempotently:

* ``migrate_client_config``  - add the Internet update source and report endpoint when the config lacks them.
* ``ensure_shell_registration`` - register Doc / Sheet / Slide for "Open with" and retarget the Start Menu and
  Desktop shortcuts to the per-app launchers.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Callable

DEFAULT_INTERNET_UPDATE_SOURCE = "https://office.3tcomputer.com/updates"
DEFAULT_REPORT_ENDPOINT = "https://office.3tcomputer.com"

LAUNCHERS = {
    "writer": ("Doc.exe", "Doc", (".docx", ".doc", ".odt", ".rtf", ".txt"), "VNOffice.Writer.Document"),
    "sheet": ("Sheet.exe", "Sheet", (".xlsx", ".xls", ".ods", ".csv"), "VNOffice.Sheet.Workbook"),
    "slides": ("Slide.exe", "Slide", (".pptx", ".ppt", ".odp"), "VNOffice.Slides.Presentation"),
}


def migrate_client_config(config_path: Path) -> bool:
    """Add ``update.sources`` (LAN first, Internet fallback) and ``errorReporting.endpoint`` when missing.

    Returns True when the file was rewritten. A missing or unreadable file is left alone (source runs, dev trees).
    """
    try:
        config = json.loads(Path(config_path).read_text(encoding="utf-8-sig"))
    except (OSError, ValueError, TypeError):
        return False
    if not isinstance(config, dict):
        return False
    changed = False

    update = config.get("update")
    if not isinstance(update, dict):
        update = {}
        config["update"] = update
    sources = update.get("sources")
    if not isinstance(sources, list) or not any(isinstance(item, str) and item.strip() for item in sources):
        first = update.get("source")
        migrated = [first.strip()] if isinstance(first, str) and first.strip() else []
        migrated.append(DEFAULT_INTERNET_UPDATE_SOURCE)
        update["sources"] = migrated
        changed = True

    reporting = config.get("errorReporting")
    if not isinstance(reporting, dict):
        reporting = {}
        config["errorReporting"] = reporting
    endpoint = reporting.get("endpoint")
    if not isinstance(endpoint, str) or not endpoint.strip():
        reporting["endpoint"] = DEFAULT_REPORT_ENDPOINT
        reporting.setdefault("enabled", True)
        # Obsolete static token from the first pilot builds; the client now requests short-lived tokens.
        reporting.pop("token", None)
        changed = True

    if changed:
        target = Path(config_path)
        temporary = target.with_name(target.name + ".tmp")
        temporary.write_text(json.dumps(config, ensure_ascii=False, indent=4), encoding="utf-8")
        os.replace(temporary, target)
    return changed


def ensure_shell_registration(install_root: Path, winreg_module=None) -> list[str]:
    """Register the launchers for "Open with" in HKCU and clean the legacy shared Python entry.

    Returns the list of launcher names that were registered (empty when nothing applies).
    """
    install_root = Path(install_root)
    if winreg_module is None:
        if os.name != "nt":
            return []
        import winreg as winreg_module  # type: ignore[no-redef]
    hkcu = winreg_module.HKEY_CURRENT_USER
    registered: list[str] = []

    def set_value(key_path: str, name: str, value: str) -> None:
        with winreg_module.CreateKeyEx(hkcu, key_path, 0, winreg_module.KEY_SET_VALUE) as key:
            winreg_module.SetValueEx(key, name, 0, winreg_module.REG_SZ, value)

    for kind, (exe, friendly, extensions, progid) in LAUNCHERS.items():
        launcher = install_root / "app" / "launchers" / exe
        if not launcher.is_file():
            continue
        base = f"Software\\Classes\\Applications\\{exe}"
        set_value(base, "FriendlyAppName", friendly)
        set_value(base + "\\DefaultIcon", "", f"{launcher},0")
        set_value(base + "\\shell\\open", "FriendlyAppName", friendly)
        set_value(base + "\\shell\\open\\command", "", f'"{launcher}" "%1"')
        for extension in extensions:
            set_value(base + "\\SupportedTypes", extension, "")
            set_value(f"Software\\Classes\\{extension}\\OpenWithList\\{exe}", "", "")
            _delete_value(winreg_module, hkcu, f"Software\\Classes\\{extension}\\OpenWithProgids", progid)
        # A file type registered by an older Setup keeps working: point its command at the launcher.
        command_key = f"Software\\Classes\\{progid}\\shell\\open\\command"
        if _read_default(winreg_module, hkcu, command_key):
            set_value(f"Software\\Classes\\{progid}", "", friendly)
            set_value(f"Software\\Classes\\{progid}", "FriendlyTypeName", friendly)
            set_value(f"Software\\Classes\\{progid}\\shell\\open", "FriendlyAppName", friendly)
            set_value(command_key, "", f'"{launcher}" "%1"')
        registered.append(exe)
    return registered


def _read_default(winreg_module, hive, key_path: str) -> str:
    try:
        with winreg_module.OpenKey(hive, key_path) as key:
            return str(winreg_module.QueryValueEx(key, "")[0] or "")
    except OSError:
        return ""


def _delete_value(winreg_module, hive, key_path: str, name: str) -> None:
    try:
        with winreg_module.OpenKey(hive, key_path, 0, winreg_module.KEY_SET_VALUE) as key:
            winreg_module.DeleteValue(key, name)
    except OSError:
        pass


_RETARGET_SHORTCUTS_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
$root = $env:VNO_INSTALL_ROOT
$map = @{ 'Doc' = 'Doc.exe'; 'Sheet' = 'Sheet.exe'; 'Slide' = 'Slide.exe' }
$shell = New-Object -ComObject WScript.Shell
$folders = @(
    (Join-Path ([Environment]::GetFolderPath('Programs')) '3T Office'),
    [Environment]::GetFolderPath('Desktop')
)
foreach ($folder in $folders) {
    foreach ($name in $map.Keys) {
        $path = Join-Path $folder ($name + '.lnk')
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
        $launcher = Join-Path $root ("app\launchers\" + $map[$name])
        if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { continue }
        $link = $shell.CreateShortcut($path)
        # Only shortcuts that point into this install and still use the interpreter are retargeted.
        if ($link.TargetPath -like (Join-Path $root 'python\pythonw.exe')) {
            $link.TargetPath = $launcher
            $link.Arguments = ''
            $link.IconLocation = "$launcher,0"
            $link.Save()
        }
    }
}
"""


def retarget_shortcuts(install_root: Path, run: Callable[..., object] = subprocess.run) -> bool:
    """Point the Doc / Sheet / Slide shortcuts that still use pythonw.exe at the launchers."""
    if os.name != "nt":
        return False
    env = dict(os.environ, VNO_INSTALL_ROOT=str(install_root))
    try:
        result = run(
            ["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden",
             "-ExecutionPolicy", "Bypass", "-Command", _RETARGET_SHORTCUTS_SCRIPT],
            env=env, capture_output=True, timeout=60,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return getattr(result, "returncode", 1) == 0


def migrate_installed_config(install_root: Path) -> bool:
    """Cheap and idempotent: call before the update/report settings are read. Never raises."""
    try:
        return migrate_client_config(Path(install_root) / "app" / "vnoffice-config.json")
    except OSError:
        return False


def run_shell_migrations_once(install_root: Path, data_dir: Path, version: str) -> bool:
    """Registry + shortcut migration, once per app version (call from a background thread). Never raises."""
    marker = Path(data_dir) / f"shell-registration-{version}.done"
    if marker.is_file():
        return False
    try:
        registered = ensure_shell_registration(install_root)
        if registered:
            retarget_shortcuts(install_root)
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text("ok\n", encoding="ascii")
        return bool(registered)
    except Exception:
        # Retried on the next launch.
        return False
