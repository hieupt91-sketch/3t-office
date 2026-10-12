param([Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoE4bWindowPid {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$workbook = $null
$owned = $false
$ownedPid = 0
try {
  $excel = New-Object -ComObject Excel.Application
  $handle = [IntPtr][int]$excel.Hwnd
  $pidValue = [uint32]0
  [void][VnoE4bWindowPid]::GetWindowThreadProcessId($handle, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) { throw "Spreadsheet reader did not start a private process." }
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open((Resolve-Path -LiteralPath $FilePath).Path, 0, $true)
  $sheet = $workbook.Worksheets.Item(1)
  $window = $excel.ActiveWindow
  $chartObject = $sheet.ChartObjects().Item(1)
  $chart = $chartObject.Chart
  $categoryAxis = $chart.Axes(1)
  $valueAxis = $chart.Axes(2)
  $result = [ordered]@{
    ownedPid = $ownedPid
    readOnly = [bool]$workbook.ReadOnly
    splitRow = [int]$window.SplitRow
    splitColumn = [int]$window.SplitColumn
    freezePanes = [bool]$window.FreezePanes
    categoryAxisTitle = [string]$categoryAxis.AxisTitle.Text
    valueAxisTitle = [string]$valueAxis.AxisTitle.Text
  }
  $result | ConvertTo-Json -Compress
  if (-not $result.readOnly -or $result.freezePanes -or $result.splitRow -ne 4 -or $result.splitColumn -ne 3) { throw "Split/read-only mismatch." }
  if ($result.categoryAxisTitle -ne "Tháng báo cáo" -or $result.valueAxisTitle -ne "Doanh thu thuần") { throw "Axis title mismatch." }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($categoryAxis)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($valueAxis)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($chart)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($chartObject)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($window)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
} finally {
  if ($workbook) {
    try { $workbook.Close($false) } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
  }
  if ($excel) {
    if ($owned) { try { $excel.Quit() } catch {} }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
