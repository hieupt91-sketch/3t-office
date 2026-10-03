param([string[]]$Files)
$ErrorActionPreference = "Stop"

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$owned = $false
$ownedPid = 0
$failed = $false
try {
  # Keep the Application COM object in this scope too. Returning Office COM
  # automation objects through a PowerShell function can enumerate/coerce them.
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      $excel = New-Object -ComObject Excel.Application
      break
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Create Excel: {0}" -f $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $excel) { throw "Create Excel returned no application object." }
  $handle = [IntPtr](Invoke-ComWithRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoExcelAuditWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null
  foreach ($file in $Files) {
    $workbook = $null
    $name = Split-Path $file -Leaf
    try {
      # Do not return a Workbook COM object through Invoke-ComWithRetry:
      # PowerShell enumerates that automation object at the function boundary
      # and can turn it into $null. Open in this scope and retry only transient
      # RPC_E_CALL_REJECTED responses.
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $workbook = $excel.Workbooks.Open($file, 0, $true)
          break
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Open {0}: {1}" -f $name, $_.Exception.Message)
          }
          Start-Sleep -Milliseconds 500
        }
      }
      if (-not $workbook) { throw "Open $name returned no workbook object." }
      $count = 0
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $count = [int]$workbook.Worksheets.Count
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Read {0} sheet count: {1}" -f $name, $_.Exception.Message)
          }
        }
        if ($count -gt 0) { break }
        if ($attempt -ge 20) { throw "Read $name sheet count returned $count." }
        Start-Sleep -Milliseconds 500
      }
      "$name OK sheets=$count"
    } catch {
      $failed = $true
      "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
    } finally {
      if ($workbook) {
        try { Invoke-ComWithRetry { $workbook.Close($false) } "Close $name" | Out-Null }
        catch {
          $failed = $true
          "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
        }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
      }
    }
  }
} catch {
  $failed = $true
  "BLOCKED " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($excel) {
    if ($owned) {
      try { Invoke-ComWithRetry { $excel.Quit() } "Quit Excel" | Out-Null }
      catch { "WARN Excel quit failed for owned PID $ownedPid; no other process was stopped." }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($owned -and $ownedPid -gt 0) {
    $leftover = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($leftover) {
      Stop-Process -Id $ownedPid -Force
      "CLEANUP stopped owned Excel PID $ownedPid after COM quit did not exit."
    }
  }
}
if ($failed) { exit 1 }
