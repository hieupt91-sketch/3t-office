param(
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [Parameter(Mandatory = $true)][string]$SavedPath
)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoE4bDisplayWindowPid {
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

$sourceResolved = (Resolve-Path -LiteralPath $SourcePath).Path
$savedResolved = (Resolve-Path -LiteralPath $SavedPath).Path
$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$sourceBook = $null
$savedBook = $null
$sourceSheet = $null
$savedSheet = $null
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
  [void][VnoE4bDisplayWindowPid]::GetWindowThreadProcessId($handle, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) { throw "Excel did not start a private process." }
  if ($excel.Visible) { Invoke-ExcelRetry { $excel.Visible = $false } "Hide Excel" | Out-Null }
  Invoke-ExcelRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  # Do not pass workbook/worksheet/range COM objects through a helper because
  # Windows PowerShell may enumerate or coerce Office automation collections.
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $sourceBook = $excel.Workbooks.Open($sourceResolved, 0, $true); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $sourceBook) { throw "Open source workbook returned no object." }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    $count = [int](Invoke-ExcelRetry { [int]$sourceBook.Worksheets.Count } "Read source worksheet count")
    if ($count -gt 0) { break }
    if ($attempt -ge 20) { throw "Source workbook returned no worksheets." }
    Start-Sleep -Milliseconds 500
  }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $savedBook = $excel.Workbooks.Open($savedResolved, 0, $true); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $savedBook) { throw "Open saved workbook returned no object." }
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    $count = [int](Invoke-ExcelRetry { [int]$savedBook.Worksheets.Count } "Read saved worksheet count")
    if ($count -gt 0) { break }
    if ($attempt -ge 20) { throw "Saved workbook returned no worksheets." }
    Start-Sleep -Milliseconds 500
  }
  $sourceSheet = $sourceBook.Worksheets.Item(1)
  $savedSheet = $savedBook.Worksheets.Item(1)

  $version = [string](Invoke-ExcelRetry { [string]$excel.Version } "Read Excel version")
  $sourceReadOnly = [bool](Invoke-ExcelRetry { [bool]$sourceBook.ReadOnly } "Read source mode")
  $savedReadOnly = [bool](Invoke-ExcelRetry { [bool]$savedBook.ReadOnly } "Read saved mode")
  if ($version -ne "16.0") { throw "Expected Excel 2016 (16.0), got $version." }
  if (-not $sourceReadOnly -or -not $savedReadOnly) { throw "Both workbooks must be ReadOnly=true." }

  $sourceUsed = $sourceSheet.UsedRange
  $savedUsed = $savedSheet.UsedRange
  $rows = [Math]::Max([int]$sourceUsed.Rows.Count, [int]$savedUsed.Rows.Count)
  $columns = [Math]::Max([int]$sourceUsed.Columns.Count, [int]$savedUsed.Columns.Count)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sourceUsed)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($savedUsed)

  $rawFormatDifferences = 0
  $numericCellsCompared = 0
  $displayFormatDifferences = 0
  $textDifferences = 0
  $examples = @()
  for ($row = 1; $row -le $rows; $row++) {
    for ($column = 1; $column -le $columns; $column++) {
      $sourceCell = $null
      $savedCell = $null
      $sourceDisplay = $null
      $savedDisplay = $null
      try {
        $sourceCell = $sourceSheet.Cells.Item($row, $column)
        $savedCell = $savedSheet.Cells.Item($row, $column)
        $sourceFormat = [string]$sourceCell.NumberFormat
        $savedFormat = [string]$savedCell.NumberFormat
        if ($sourceFormat -ne $savedFormat) { $rawFormatDifferences++ }
        $sourceValue = $sourceCell.Value2
        $savedValue = $savedCell.Value2
        if (-not ($sourceValue -is [double]) -or -not ($savedValue -is [double])) { continue }
        $numericCellsCompared++
        $sourceDisplay = $sourceCell.DisplayFormat
        $savedDisplay = $savedCell.DisplayFormat
        $sourceDisplayFormat = [string]$sourceDisplay.NumberFormat
        $savedDisplayFormat = [string]$savedDisplay.NumberFormat
        $sourceText = [string]$sourceCell.Text
        $savedText = [string]$savedCell.Text
        $displayDifferent = $sourceDisplayFormat -ne $savedDisplayFormat
        $textDifferent = $sourceText -ne $savedText
        if ($displayDifferent) { $displayFormatDifferences++ }
        if ($textDifferent) { $textDifferences++ }
        if (($displayDifferent -or $textDifferent) -and $examples.Count -lt 8) {
          $address = [string]$sourceCell.Address($false, $false)
          $examples += [ordered]@{
            address = $address
            sourceFormat = $sourceFormat
            savedFormat = $savedFormat
            sourceDisplayFormat = $sourceDisplayFormat
            savedDisplayFormat = $savedDisplayFormat
            sourceText = $sourceText
            savedText = $savedText
          }
        }
      } finally {
        if ($sourceDisplay) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sourceDisplay) }
        if ($savedDisplay) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($savedDisplay) }
        if ($sourceCell) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sourceCell) }
        if ($savedCell) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($savedCell) }
      }
    }
  }

  $result = [ordered]@{
    ownedPid = $ownedPid
    version = $version
    sourceReadOnly = $sourceReadOnly
    savedReadOnly = $savedReadOnly
    rows = $rows
    columns = $columns
    rawFormatDifferences = $rawFormatDifferences
    numericCellsCompared = $numericCellsCompared
    displayFormatDifferences = $displayFormatDifferences
    textDifferences = $textDifferences
    examples = $examples
  }
  $result | ConvertTo-Json -Depth 5 -Compress
  if ($numericCellsCompared -lt 1) { throw "No numeric cells were compared." }
  if ($rawFormatDifferences -ne 0) { throw "Saved number-format codes differ from source." }
  if ($displayFormatDifferences -ne 0 -or $textDifferences -ne 0) { throw "Saved numeric display differs from source." }
} catch {
  $failed = $true
  Write-Error $_
} finally {
  foreach ($object in @($sourceSheet, $savedSheet)) {
    if ($object) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($object) }
  }
  foreach ($book in @($savedBook, $sourceBook)) {
    if ($book) {
      try { Invoke-ExcelRetry { $book.Close($false) } "Close read-only workbook" | Out-Null }
      catch { Write-Warning $_.Exception.Message; $failed = $true }
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($book)
    }
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
