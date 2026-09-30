"""Windows Office/WPS PDF export through an isolated PowerShell COM worker."""

from __future__ import annotations

import csv
import functools
import json
import os
import shutil
import signal
import subprocess
import tempfile
import threading
from pathlib import Path
from typing import Callable


OFFICE_EXPORT_TIMEOUT_SECONDS = 300
_OFFICE_JOB_LOCK = threading.Lock()
_OFFICE_BY_APP = {
    "writer": (("Word.Application", "Microsoft Office"), ("Kwps.Application", "WPS")),
    "sheet": (("Excel.Application", "Microsoft Office"), ("Ket.Application", "WPS")),
    "slides": (("PowerPoint.Application", "Microsoft Office"), ("Kwpp.Application", "WPS")),
}
_OFFICE_PROCESS_NAMES = {"WINWORD", "EXCEL", "POWERPNT", "WPS", "ET", "WPP"}


# Written as ASCII to a private per-job directory so packaged builds need no
# separate script-data rule and every Office job runs in its own STA process.
_POWERSHELL_WORKER = r'''param(
  [Parameter(Mandatory = $true)][string]$AppKind,
  [Parameter(Mandatory = $true)][string]$ProgId,
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [Parameter(Mandatory = $true)][string]$ProcessInfoPath
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding

function Invoke-ComWithRetry([string]$Operation, [scriptblock]$Action) {
  $script:CurrentOperation = $Operation
  $delays = @(500, 1000, 2000, 4000)
  for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = [int]$_.Exception.HResult
      $message = [string]$_.Exception.Message
      $busy = ($hr -eq -2147418111) -or ($hr -eq -2147417846) -or
        ($message -match '(?i)RPC_E_CALL_REJECTED|rejected by callee|server busy|application is busy')
      if (-not $busy -or $attempt -ge 4) { throw }
      Start-Sleep -Milliseconds $delays[$attempt]
    }
  }
}

function Get-ApplicationProcessId($Application) {
  try {
    if (-not ('Vnoffice.WindowOwner' -as [type])) {
      $code = '[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);'
      Add-Type -Namespace Vnoffice -Name WindowOwner -MemberDefinition $code
    }
    $handleValue = Invoke-ComWithRetry 'Application.Hwnd' { [long]$Application.Hwnd }
    $handle = [IntPtr]$handleValue
    [uint32]$processId = 0
    [void][Vnoffice.WindowOwner]::GetWindowThreadProcessId($handle, [ref]$processId)
    return [int]$processId
  } catch {
    return 0
  }
}

function Get-AppProcessName([string]$id) {
  switch ($id) {
    'Word.Application' { return 'WINWORD' }
    'Excel.Application' { return 'EXCEL' }
    'PowerPoint.Application' { return 'POWERPNT' }
    'Kwps.Application' { return 'wps' }
    'Ket.Application' { return 'et' }
    'Kwpp.Application' { return 'wpp' }
    default { return '' }
  }
}

function Save-ProcessInfo([int]$ProcessId, [bool]$Owned) {
  $record = [ordered]@{ pid = $ProcessId; owned = $Owned }
  [System.IO.File]::WriteAllText($ProcessInfoPath, ($record | ConvertTo-Json -Compress), [System.Text.Encoding]::ASCII)
}

$priorPids = @((Get-Process -Name @('WINWORD', 'EXCEL', 'POWERPNT', 'wps', 'et', 'wpp') -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id))
$application = $null
$document = $null
$workbook = $null
$presentation = $null
$ownsOfficeProcess = $false
$processId = 0
$script:CurrentOperation = 'Office initialization'

try {
  if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) { throw 'Saved native document was not found.' }
  $application = Invoke-ComWithRetry 'Application activation' { New-Object -ComObject $ProgId }
  $processId = Get-ApplicationProcessId $application
  if ($processId -le 0) {
    $processName = Get-AppProcessName $ProgId
    for ($attempt = 0; $attempt -lt 10 -and $processId -le 0; $attempt++) {
      $newProcesses = @(
        Get-Process -Name $processName -ErrorAction SilentlyContinue |
          Where-Object { $priorPids -notcontains [int]$_.Id }
      )
      if ($newProcesses.Count -eq 1) { $processId = [int]$newProcesses[0].Id; break }
      Start-Sleep -Milliseconds 100
    }
  }
  if ($processId -le 0) { throw 'Could not identify the Office process for this job.' }
  $ownsOfficeProcess = -not ($priorPids -contains $processId)
  Save-ProcessInfo $processId $ownsOfficeProcess
  if (-not $ownsOfficeProcess) { throw 'Office returned a process that existed before this job.' }

  Invoke-ComWithRetry 'Application.Visible' { $application.Visible = $false } | Out-Null
  Invoke-ComWithRetry 'Application.DisplayAlerts' { $application.DisplayAlerts = 0 } | Out-Null

  switch ($AppKind) {
    'writer' {
      $document = Invoke-ComWithRetry 'Word.Documents.Open' { $application.Documents.Open($InputPath, $false, $true, $false) }
      Invoke-ComWithRetry 'Word.ExportAsFixedFormat' { $document.ExportAsFixedFormat($OutputPath, 17) }
    }
    'sheet' {
      $workbook = Invoke-ComWithRetry 'Excel.Workbooks.Open' { $application.Workbooks.Open($InputPath, 0, $true) }
      Invoke-ComWithRetry 'Excel.ExportAsFixedFormat' { $workbook.ExportAsFixedFormat(0, $OutputPath) }
    }
    'slides' {
      $presentation = Invoke-ComWithRetry 'PowerPoint.Presentations.Open' { $application.Presentations.Open($InputPath, -1, 0, 0) }
      Invoke-ComWithRetry 'PowerPoint.SaveAs' { $presentation.SaveAs($OutputPath, 32) }
    }
    default { throw 'Unsupported application kind.' }
  }

  if (-not (Test-Path -LiteralPath $OutputPath -PathType Leaf)) { throw 'Office did not create a PDF.' }
  if ((Get-Item -LiteralPath $OutputPath).Length -le 0) { throw 'Office created an empty PDF.' }
  [Console]::Out.WriteLine('OK')
  exit 0
}
catch {
  [Console]::Error.WriteLine(('{0}: {1}' -f $script:CurrentOperation, [string]$_.Exception.Message))
  exit 1
}
finally {
  $quitFailed = $false
  if ($ownsOfficeProcess) {
    if ($document) { try { Invoke-ComWithRetry 'Word.Close' { $document.Close($false) } | Out-Null } catch { } }
    if ($workbook) { try { Invoke-ComWithRetry 'Excel.Close' { $workbook.Close($false) } | Out-Null } catch { } }
    if ($presentation) { try { Invoke-ComWithRetry 'PowerPoint.Close' { $presentation.Close() } | Out-Null } catch { } }
    if ($application) { try { Invoke-ComWithRetry 'Application.Quit' { $application.Quit() } | Out-Null } catch { $quitFailed = $true } }
  }
  foreach ($comObject in @($document, $workbook, $presentation, $application)) {
    if ($null -ne $comObject -and [System.Runtime.InteropServices.Marshal]::IsComObject($comObject)) {
      try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) } catch { }
    }
  }
  if ($ownsOfficeProcess -and $quitFailed -and $processId -gt 0) {
    try { Stop-Process -Id $processId -Force -ErrorAction Stop } catch { }
  }
}
'''


def _registry_has_com_class(prog_id: str, registry=None) -> bool:
    """Read ProgID -> CLSID -> COM server registration without launching Office."""
    if registry is None:
        try:
            import winreg as registry  # type: ignore[no-redef]
        except ImportError:
            return False
    root = registry.HKEY_CLASSES_ROOT
    read = registry.KEY_READ
    views = [0]
    for view_name in ("KEY_WOW64_64KEY", "KEY_WOW64_32KEY"):
        view = getattr(registry, view_name, 0)
        if view and view not in views:
            views.append(view)
    for view in views:
        access = read | view
        try:
            with registry.OpenKey(root, f"{prog_id}\\CLSID", 0, access) as key:
                clsid = str(registry.QueryValueEx(key, "")[0]).strip()
            if not clsid:
                continue
            with registry.OpenKey(root, f"CLSID\\{clsid}", 0, access):
                pass
            for server_key in (f"CLSID\\{clsid}\\LocalServer32", f"CLSID\\{clsid}\\InprocServer32"):
                try:
                    with registry.OpenKey(root, server_key, 0, access) as key:
                        server = str(registry.QueryValueEx(key, "")[0]).strip()
                    if server:
                        return True
                except OSError:
                    continue
        except OSError:
            continue
    return False


@functools.lru_cache(maxsize=1)
def _cached_office_engines() -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    if os.name != "nt":
        return result
    for app_kind, candidates in _OFFICE_BY_APP.items():
        for prog_id, engine in candidates:
            if _registry_has_com_class(prog_id):
                result[app_kind] = {"engine": engine, "progId": prog_id}
                break
    return result


def get_office_engine_info(app_kind: str) -> dict[str, object]:
    """Return the cached Office/WPS availability for one document app."""
    candidate = _cached_office_engines().get(str(app_kind or "").lower())
    if candidate:
        return {"status": "ok", "available": True, **candidate}
    return {"status": "ok", "available": False, "engine": "LibreOffice", "progId": ""}


def get_office_engine_catalog() -> dict[str, dict[str, str]]:
    return {kind: dict(info) for kind, info in _cached_office_engines().items()}


def _powershell_path() -> str | None:
    detected = shutil.which("powershell.exe") or shutil.which("powershell")
    if detected:
        return detected
    windows_root = os.environ.get("SystemRoot") or os.environ.get("WINDIR")
    if windows_root:
        candidate = Path(windows_root) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
        if candidate.is_file():
            return str(candidate)
    return None


def _terminate_owned_process(process_info_path: Path) -> None:
    """Stop only the Office PID this job positively marked as newly started."""
    try:
        record = json.loads(process_info_path.read_text(encoding="ascii"))
        process_id = int(record.get("pid", 0))
        if record.get("owned") and process_id > 0:
            os.kill(process_id, signal.SIGTERM)
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return


def export_pdf_with_office(
    native_source_path: str,
    app_kind: str,
    output_dir: str,
    *,
    engine_info: dict[str, object] | None = None,
    runner: Callable = subprocess.Popen,
    powershell_path: str | None = None,
    timeout_seconds: int = OFFICE_EXPORT_TIMEOUT_SECONDS,
) -> str:
    """Export one Save-pipeline native document in a fresh PowerShell STA job."""
    if os.name != "nt":
        raise RuntimeError("Office/WPS COM automation is available only on Windows.")
    if app_kind not in _OFFICE_BY_APP:
        raise ValueError(f"Unsupported Office application kind: {app_kind}")
    info = engine_info or get_office_engine_info(app_kind)
    if not info.get("available") or not info.get("progId"):
        raise RuntimeError("No Office/WPS COM registration is available for this app.")
    powershell = powershell_path or _powershell_path()
    if not powershell:
        raise RuntimeError("Windows PowerShell 5.1 is unavailable.")
    source = Path(native_source_path).resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Saved native source was not found: {source}")
    output_root = Path(output_dir).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    output_path = output_root / f"{source.stem}.pdf"
    output_path.unlink(missing_ok=True)

    with _OFFICE_JOB_LOCK, tempfile.TemporaryDirectory(prefix="vnoffice_office_job_") as worker_dir:
        worker_root = Path(worker_dir)
        script_path = worker_root / "office-pdf-export.ps1"
        process_info_path = worker_root / "office-process.json"
        script_path.write_bytes(_POWERSHELL_WORKER.encode("ascii"))
        command = [
            powershell, "-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass",
            "-File", str(script_path),
            "-AppKind", app_kind,
            "-ProgId", str(info["progId"]),
            "-InputPath", str(source),
            "-OutputPath", str(output_path),
            "-ProcessInfoPath", str(process_info_path),
        ]
        try:
            process = runner(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            try:
                stdout, stderr = process.communicate(timeout=max(1, int(timeout_seconds)))
            except subprocess.TimeoutExpired as exc:
                process.kill()
                process.communicate()
                _terminate_owned_process(process_info_path)
                raise TimeoutError(f"Office/WPS exceeded the {timeout_seconds}-second export limit.") from exc
        except TimeoutError:
            raise
        except (OSError, subprocess.SubprocessError) as exc:
            raise RuntimeError(f"Could not run the isolated Office/WPS process: {exc}") from exc

        if process.returncode != 0:
            detail = (stderr or stdout or "").strip()
            raise RuntimeError(detail or f"Office/WPS exited with code {process.returncode}.")
        if not output_path.is_file() or output_path.stat().st_size <= 0:
            raise RuntimeError("Office/WPS did not create a non-empty PDF.")
    return str(output_path)


def convert_pdf_with_office_fallback(
    native_source_path: str,
    app_kind: str,
    output_dir: str,
    convert_libreoffice: Callable[[str, str, str], str],
    *,
    use_office: bool = True,
    office_info: dict[str, object] | None = None,
    office_exporter: Callable[..., str] = export_pdf_with_office,
) -> tuple[str, str]:
    """Prefer registered Office/WPS, then silently use the existing LO renderer."""
    info = office_info or get_office_engine_info(app_kind)
    if use_office and info.get("available"):
        try:
            pdf_path = office_exporter(native_source_path, app_kind, output_dir, engine_info=info)
            if Path(pdf_path).is_file() and Path(pdf_path).stat().st_size > 0:
                return pdf_path, str(info.get("engine") or "Microsoft Office")
        except Exception:
            try:
                (Path(output_dir) / f"{Path(native_source_path).stem}.pdf").unlink(missing_ok=True)
            except OSError:
                pass
    return convert_libreoffice(native_source_path, app_kind, output_dir), "LibreOffice"
