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
public static class VnoExcelAuditWindowC4 {
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
  [void][VnoExcelAuditWindowC4]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  $wb = Invoke-ComWithRetry { $excel.Workbooks.Add() } "Add Workbook"
  $sheet = $wb.Worksheets.Item(1)

  # 1. Numeric fill: 1, 2 -> AutoFill to A5
  $sheet.Range("A1").Value2 = 1
  $sheet.Range("A2").Value2 = 2
  $srcNum = $sheet.Range("A1:A2")
  $dstNum = $sheet.Range("A1:A5")
  $srcNum.AutoFill($dstNum, 0) | Out-Null # 0 = xlFillDefault
  $numVals = @()
  foreach ($r in 1..5) { $numVals += $sheet.Range("A$r").Value2 }

  # 2. Date fill: 30/01/2026, 31/01/2026 -> AutoFill to B5
  $sheet.Range("B1").Value2 = [DateTime]::ParseExact("30/01/2026", "dd/MM/yyyy", $null)
  $sheet.Range("B2").Value2 = [DateTime]::ParseExact("31/01/2026", "dd/MM/yyyy", $null)
  $sheet.Range("B1:B2").NumberFormat = "dd/mm/yyyy"
  $srcDate = $sheet.Range("B1:B2")
  $dstDate = $sheet.Range("B1:B5")
  $srcDate.AutoFill($dstDate, 0) | Out-Null
  $dateVals = @()
  foreach ($r in 1..5) { $dateVals += $sheet.Range("B$r").Text }

  # 3. Ctrl+D / FillDown: E1="Sample" -> FillDown to E5
  $sheet.Range("E1").Value2 = "Sample"
  $sheet.Range("E1:E5").FillDown() | Out-Null
  $fillDownVals = @()
  foreach ($r in 1..5) { $fillDownVals += $sheet.Range("E$r").Value2 }

  # 4. Formulas fill: C1 = A1 * 2 -> AutoFill to C5
  $sheet.Range("C1").Formula = "=A1*2"
  $sheet.Range("C1").AutoFill($sheet.Range("C1:C5"), 0) | Out-Null
  $formulaVals = @()
  foreach ($r in 1..5) { $formulaVals += $sheet.Range("C$r").Formula }

  $res = [ordered]@{
    ownedPid = $ownedPid
    visible = $excel.Visible
    numericFill = $numVals
    dateFill = $dateVals
    fillDown = $fillDownVals
    formulaFill = $formulaVals
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
