param([Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoE4bWindowPid {
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

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$workbook = $null
$sheet = $null
$window = $null
$chartObjects = $null
$chartObject = $null
$chart = $null
$categoryAxis = $null
$valueAxis = $null
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
  $pidValue = [uint32]0
  [void][VnoE4bWindowPid]::GetWindowThreadProcessId($handle, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) { throw "Spreadsheet reader did not start a private process." }
  if ($excel.Visible) { Invoke-ExcelRetry { $excel.Visible = $false } "Hide Excel" | Out-Null }
  Invoke-ExcelRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null
  $resolvedPath = (Resolve-Path -LiteralPath $FilePath).Path
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $workbook = $excel.Workbooks.Open($resolvedPath, 0, $true); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $workbook) { throw "Open read-only workbook returned no workbook object." }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    $sheetCount = [int](Invoke-ExcelRetry { [int]$workbook.Worksheets.Count } "Read worksheet count")
    if ($sheetCount -gt 0) { break }
    if ($attempt -ge 20) { throw "Workbook returned no worksheets after retries." }
    Start-Sleep -Milliseconds 500
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $sheet = $workbook.Worksheets.Item(1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read first worksheet: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $window = $workbook.Windows.Item(1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read workbook window: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    if (-not $chartObjects) {
      try { $chartObjects = $sheet.ChartObjects() }
      catch {
        if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read chart collection: $($_.Exception.Message)" }
      }
    }
    $chartCount = [int](Invoke-ExcelRetry { [int]$chartObjects.Count } "Read chart count")
    if ($chartCount -gt 0) { break }
    if ($attempt -ge 20) { throw "Workbook contains no chart object after retries." }
    Start-Sleep -Milliseconds 500
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $chartObject = $chartObjects.Item(1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read first chart object: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $chart = $chartObject.Chart; break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read first chart: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not (Invoke-ExcelRetry { [bool]$chart.HasAxis(1, 1) } "Read category-axis presence")) { throw "Chart has no category axis." }
  if (-not (Invoke-ExcelRetry { [bool]$chart.HasAxis(2, 1) } "Read value-axis presence")) { throw "Chart has no value axis." }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $categoryAxis = $chart.Axes(1, 1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read category axis: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $valueAxis = $chart.Axes(2, 1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw "Read value axis: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not (Invoke-ExcelRetry { [bool]$categoryAxis.HasTitle } "Read category-axis title state")) { throw "Category axis has no title." }
  if (-not (Invoke-ExcelRetry { [bool]$valueAxis.HasTitle } "Read value-axis title state")) { throw "Value axis has no title." }
  $result = [ordered]@{
    ownedPid = $ownedPid
    version = [string](Invoke-ExcelRetry { [string]$excel.Version } "Read Excel version")
    readOnly = [bool](Invoke-ExcelRetry { [bool]$workbook.ReadOnly } "Read workbook mode")
    splitRow = [int](Invoke-ExcelRetry { [int]$window.SplitRow } "Read split row")
    splitColumn = [int](Invoke-ExcelRetry { [int]$window.SplitColumn } "Read split column")
    freezePanes = [bool](Invoke-ExcelRetry { [bool]$window.FreezePanes } "Read freeze state")
    categoryAxisTitle = [string](Invoke-ExcelRetry { [string]$categoryAxis.AxisTitle.Text } "Read category-axis title")
    valueAxisTitle = [string](Invoke-ExcelRetry { [string]$valueAxis.AxisTitle.Text } "Read value-axis title")
  }
  $result | ConvertTo-Json -Compress
  if ($result.version -ne "16.0") { throw "Expected Excel 2016 (16.0), got $($result.version)." }
  if (-not $result.readOnly -or $result.freezePanes -or $result.splitRow -ne 4 -or $result.splitColumn -ne 3) { throw "Split/read-only mismatch." }
  # Keep the script ASCII-only so Windows PowerShell 5.1 does not decode
  # UTF-8 literals using the legacy system code page.
  $expectedCategoryTitle = "Th$([char]0x00E1)ng b$([char]0x00E1)o c$([char]0x00E1)o"
  $expectedValueTitle = "Doanh thu thu$([char]0x1EA7)n"
  if ($result.categoryAxisTitle -ne $expectedCategoryTitle -or $result.valueAxisTitle -ne $expectedValueTitle) { throw "Axis title mismatch." }
} catch {
  $failed = $true
  Write-Error $_
} finally {
  foreach ($object in @($categoryAxis, $valueAxis, $chart, $chartObject, $chartObjects, $window, $sheet)) {
    if ($object) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($object) }
  }
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
    Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue
    Wait-Process -Id $ownedPid -ErrorAction SilentlyContinue
  }
}
if ($failed) { exit 1 }
