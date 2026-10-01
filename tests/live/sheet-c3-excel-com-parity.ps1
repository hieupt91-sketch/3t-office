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
public static class VnoExcelAuditWindowC3 {
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
  [void][VnoExcelAuditWindowC3]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  $wb = Invoke-ComWithRetry { $excel.Workbooks.Add() } "Add Workbook"
  $sheet = $wb.Worksheets.Item(1)

  # Populate A1:B3
  $sheet.Range("A1").Value2 = "Name"
  $sheet.Range("B1").Value2 = "Value"
  $sheet.Range("A2").Value2 = "Alpha"
  $sheet.Range("B2").Value2 = 10
  $sheet.Range("A3").Value2 = "Beta"
  $sheet.Range("B3").Value2 = 20

  $b2Addr = $sheet.Range("B2").Address()
  $rangeAddr = $sheet.Range("A1:B3").Address()
  $rowAddr = $sheet.Range("2:2").Address()
  $colAddr = $sheet.Range("B:B").Address()
  $currentRegion = $sheet.Range("A1").CurrentRegion.Address()
  $shiftRight = $sheet.Range("A2:B2").Address()
  $ctrlDown = $sheet.Range("A2").End(-4121).Address() # xlDown = -4121

  $res = [ordered]@{
    ownedPid = $ownedPid
    visible = $excel.Visible
    b2Addr = $b2Addr
    rangeAddr = $rangeAddr
    rowAddr = $rowAddr
    colAddr = $colAddr
    currentRegion = $currentRegion
    shiftRight = $shiftRight
    ctrlDown = $ctrlDown
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
