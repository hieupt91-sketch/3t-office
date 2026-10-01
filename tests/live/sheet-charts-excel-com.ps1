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
public static class VnoExcelAuditWindowCharts {
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
  [void][VnoExcelAuditWindowCharts]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  $wb = Invoke-ComWithRetry { $excel.Workbooks.Open($FilePath, 0, $true) } "Open workbook"
  $sheet = $wb.Worksheets.Item(1)

  $chartObjs = $sheet.ChartObjects()
  $count = [int]$chartObjs.Count
  $charts = @()
  for ($i = 1; $i -le $count; $i++) {
    $co = $chartObjs.Item($i)
    $ch = $co.Chart
    $type = [int]$ch.ChartType
    $seriesCount = [int]$ch.SeriesCollection().Count
    $series = @()
    for ($s = 1; $s -le $seriesCount; $s++) {
      $ser = $ch.SeriesCollection($s)
      $series += [ordered]@{
        formula = $ser.Formula
      }
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ser)
    }
    $charts += [ordered]@{
      index = $i
      type = $type
      seriesCount = $seriesCount
      series = $series
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ch)
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($co)
  }

  $res = [ordered]@{
    ownedPid = $ownedPid
    visible = $excel.Visible
    chartCount = $count
    charts = $charts
  }
  $res | ConvertTo-Json -Depth 5 -Compress

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
