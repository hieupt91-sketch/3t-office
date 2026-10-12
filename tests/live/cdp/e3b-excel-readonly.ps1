param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$Cell = "F8"
)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoE3bExcelWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

function Invoke-ExcelRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

$resolvedFile = (Resolve-Path -LiteralPath $File).Path
$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$workbook = $null
$worksheet = $null
$cellRange = $null
$owned = $false
$ownedPid = 0
$failed = $false
try {
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $excel = New-Object -ComObject Excel.Application; break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $excel) { throw "Create Excel returned no application object." }

  $handle = [IntPtr](Invoke-ExcelRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoE3bExcelWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) { throw "Excel did not start a private process; existing instances were left untouched." }

  if ($excel.Visible) { Invoke-ExcelRetry { $excel.Visible = $false } "Hide Excel" | Out-Null }
  Invoke-ExcelRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $workbook = $excel.Workbooks.Open($resolvedFile, 0, $true); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $workbook) { throw "Open read-only workbook returned no workbook object." }

  $sheetCount = 0
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $sheetCount = [int]$workbook.Worksheets.Count }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
    }
    if ($sheetCount -gt 0) { break }
    if ($attempt -ge 20) { throw "Workbook returned no worksheets after retries." }
    Start-Sleep -Milliseconds 500
  }

  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $worksheet = $workbook.Worksheets.Item(1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $cellRange = $worksheet.Range($Cell); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }

  $version = [string](Invoke-ExcelRetry { [string]$excel.Version } "Read Excel version")
  $build = [string](Invoke-ExcelRetry { [string]$excel.Build } "Read Excel build")
  $readOnly = [bool](Invoke-ExcelRetry { [bool]$workbook.ReadOnly } "Read workbook mode")
  $value2 = Invoke-ExcelRetry { $cellRange.Value2 } "Read $Cell Value2"
  $numberFormat = [string](Invoke-ExcelRetry { [string]$cellRange.NumberFormat } "Read $Cell NumberFormat")
  $text = [string](Invoke-ExcelRetry { [string]$cellRange.Text } "Read $Cell Text")
  $valueType = if ($null -eq $value2) { "null" } else { $value2.GetType().FullName }

  if ($version -ne "16.0") { throw "Expected Excel 2016 (16.0), got $version." }
  if (-not $readOnly) { throw "Workbook was not opened ReadOnly=true." }
  if (-not ($value2 -is [double]) -or [double]$value2 -le 0 -or [double]$value2 -ge 1) {
    throw "$Cell Value2 must be a numeric time serial in (0,1), got $value2 ($valueType)."
  }
  if ($numberFormat -notmatch "[hH].*[mM]") { throw "$Cell NumberFormat is not a time format: $numberFormat" }

  [pscustomobject]@{
    Version = $version
    Build = $build
    ReadOnly = $readOnly
    Address = $Cell
    Value2 = [double]$value2
    Value2Type = $valueType
    NumberFormat = $numberFormat
    Text = $text
  } | ConvertTo-Json -Compress
} catch {
  $failed = $true
  Write-Error $_
} finally {
  if ($cellRange) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($cellRange) }
  if ($worksheet) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet) }
  if ($workbook) {
    try { Invoke-ExcelRetry { $workbook.Close($false) } "Close read-only workbook" | Out-Null }
    catch { Write-Warning $_.Exception.Message; $failed = $true }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
  }
  if ($excel) {
    if ($owned) {
      try { Invoke-ExcelRetry { $excel.Quit() } "Quit audit-owned Excel" | Out-Null }
      catch { Write-Warning $_.Exception.Message; $failed = $true }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($owned -and (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $ownedPid -Force
    Wait-Process -Id $ownedPid -ErrorAction SilentlyContinue
  }
}
if ($failed) { exit 1 }
