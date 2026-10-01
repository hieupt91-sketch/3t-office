param([string]$FilePath)
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
public static class VnoExcelAuditWindowPageBreaks {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$owned = $false
$ownedPid = 0
$failed = $false

try {
  $excel = Invoke-ComWithRetry { New-Object -ComObject Excel.Application } "Create Excel"
  $handle = [IntPtr](Invoke-ComWithRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoExcelAuditWindowPageBreaks]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  $wb = Invoke-ComWithRetry { $excel.Workbooks.Open($FilePath, 0, $true) } "Open workbook"
  $sheet = $wb.Worksheets.Item(1)

  $hManualList = @($sheet.HPageBreaks | Where-Object { $_.Type -eq -4135 })
  $vManualList = @($sheet.VPageBreaks | Where-Object { $_.Type -eq -4135 })
  $hManual = $hManualList.Count
  $vManual = $vManualList.Count
  $hLoc = if ($hManual -gt 0) { [string]($hManualList[0].Location.Address(0,0)) } else { "" }
  $vLoc = if ($vManual -gt 0) { [string]($vManualList[0].Location.Address(0,0)) } else { "" }

  $res = [ordered]@{
    ownedPid = $ownedPid
    visible = $excel.Visible
    hManual = $hManual
    vManual = $vManual
    hCount = [int]$sheet.HPageBreaks.Count
    vCount = [int]$sheet.VPageBreaks.Count
    hLoc = $hLoc
    vLoc = $vLoc
  }
  $res | ConvertTo-Json -Compress

  Invoke-ComWithRetry { $wb.Close($false) } "Close wb" | Out-Null
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
} catch {
  $failed = $true
  "BLOCKED " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($excel) {
    if ($owned) {
      try { Invoke-ComWithRetry { $excel.Quit() } "Quit Excel" | Out-Null } catch {}
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

if ($failed) { exit 1 }
