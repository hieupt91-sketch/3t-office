param(
  [string]$WorkbookPath = "$env:TEMP\vno-sheet-slicer-oracle.xlsx",
  [string]$ReportPath = "$env:TEMP\vno-sheet-slicer-oracle.json"
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VnoSlicerExcelPid {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

function Invoke-ExcelRetry([scriptblock]$Operation, [string]$Label) {
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    try {
      $result = & $Operation
      Write-Output -NoEnumerate $result
      return
    } catch {
      if ($_.Exception.Message -notmatch 'rejected by callee|0x800AC472') { throw }
      if ($attempt -eq 40) { throw "$Label failed after $attempt attempts: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
}

function Set-Cell($Sheet, [int]$Row, [int]$Column, [object]$Value) {
  Invoke-ExcelRetry {
    if ($Value -is [string]) { $Sheet.Cells.Item($Row, $Column).Value2 = [string]$Value }
    else { $Sheet.Cells.Item($Row, $Column).Value2 = [double]$Value }
  } "Set cell R${Row}C${Column}" | Out-Null
}

function Get-VisibleRows($Sheet) {
  $rows = @()
  for ($row = 2; $row -le 6; $row++) {
    $hidden = [bool](Invoke-ExcelRetry { $Sheet.Rows.Item($row).Hidden } "Read row $row visibility")
    if (-not $hidden) {
      $rows += [ordered]@{
        region = [string](Invoke-ExcelRetry { $Sheet.Cells.Item($row, 1).Value2 } "Read region $row")
        product = [string](Invoke-ExcelRetry { $Sheet.Cells.Item($row, 2).Value2 } "Read product $row")
        amount = [double](Invoke-ExcelRetry { $Sheet.Cells.Item($row, 3).Value2 } "Read amount $row")
      }
    }
  }
  return $rows
}

function Select-SlicerItems($Cache, [string[]]$Names) {
  $count = [int](Invoke-ExcelRetry { $Cache.SlicerItems.Count } 'Read slicer item count')
  for ($index = 1; $index -le $count; $index++) {
    $item = Invoke-ExcelRetry { $Cache.SlicerItems.Item($index) } "Read slicer item $index"
    $name = [string](Invoke-ExcelRetry { $item.Name } "Read slicer item $index name")
    $selected = $Names -contains $name
    Invoke-ExcelRetry { $item.Selected = $selected } "Select slicer item $name" | Out-Null
  }
}

function Read-SlicerItems($Cache) {
  $items = @()
  $count = [int](Invoke-ExcelRetry { $Cache.SlicerItems.Count } 'Read slicer item count')
  for ($index = 1; $index -le $count; $index++) {
    $item = Invoke-ExcelRetry { $Cache.SlicerItems.Item($index) } "Read slicer item $index"
    $items += [ordered]@{
      name = [string](Invoke-ExcelRetry { $item.Name } "Read item $index name")
      caption = [string](Invoke-ExcelRetry { $item.Caption } "Read item $index caption")
      selected = [bool](Invoke-ExcelRetry { $item.Selected } "Read item $index selected")
      hasData = [bool](Invoke-ExcelRetry { $item.HasData } "Read item $index has data")
    }
  }
  return $items
}

$excel = $null
$workbook = $null
$ownedPid = 0
try {
  $excel = Invoke-ExcelRetry { New-Object -ComObject Excel.Application } 'Create Excel'
  $handle = [IntPtr](Invoke-ExcelRetry { [int]$excel.Hwnd } 'Read Excel window')
  $pidValue = [uint32]0
  [void][VnoSlicerExcelPid]::GetWindowThreadProcessId($handle, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  Invoke-ExcelRetry { $excel.Visible = $true } 'Show Excel' | Out-Null
  Invoke-ExcelRetry { $excel.DisplayAlerts = $false } 'Disable alerts' | Out-Null
  $version = [string](Invoke-ExcelRetry { $excel.Version } 'Read version')
  Start-Sleep -Milliseconds 750
  $workbook = $excel.Workbooks.Add()
  $sheet = $workbook.Worksheets.Item(1)
  Invoke-ExcelRetry { $sheet.Name = 'Data' } 'Rename worksheet' | Out-Null

  $values = @(
    @('Region', 'Product', 'Amount'),
    @('North', 'Pen', 10),
    @('South', 'Pen', 20),
    @('North', 'Paper', 30),
    @('South', 'Paper', 40),
    @('East', 'Pen', 50)
  )
  for ($row = 0; $row -lt $values.Count; $row++) {
    for ($column = 0; $column -lt $values[$row].Count; $column++) {
      Set-Cell $sheet ($row + 1) ($column + 1) $values[$row][$column]
    }
  }

  $source = $sheet.Range('A1:C6')
  $table = $sheet.ListObjects.Add(1, $source, $null, 1)
  Invoke-ExcelRetry { $table.Name = 'SalesTable' } 'Name table' | Out-Null
  $regionCache = $workbook.SlicerCaches.Add2($table, 'Region')
  $regionSlicer = $regionCache.Slicers.Add($sheet, [Type]::Missing, 'RegionSlicer', 'Region', 20, 260, 180, 160)
  $productCache = $workbook.SlicerCaches.Add2($table, 'Product')
  $productSlicer = $productCache.Slicers.Add($sheet, [Type]::Missing, 'ProductSlicer', 'Product', 220, 260, 180, 160)
  Invoke-ExcelRetry { $regionSlicer.NumberOfColumns = 2 } 'Set column count' | Out-Null

  $report = [ordered]@{
    excelVersion = $version
    properties = [ordered]@{
      name = [string](Invoke-ExcelRetry { $regionSlicer.Name } 'Read name')
      caption = [string](Invoke-ExcelRetry { $regionSlicer.Caption } 'Read caption')
      left = [double](Invoke-ExcelRetry { $regionSlicer.Left } 'Read left')
      top = [double](Invoke-ExcelRetry { $regionSlicer.Top } 'Read top')
      width = [double](Invoke-ExcelRetry { $regionSlicer.Width } 'Read width')
      height = [double](Invoke-ExcelRetry { $regionSlicer.Height } 'Read height')
      numberOfColumns = [int](Invoke-ExcelRetry { $regionSlicer.NumberOfColumns } 'Read column count')
    }
    initialItems = Read-SlicerItems $regionCache
    behavior = [ordered]@{}
  }

  Select-SlicerItems $regionCache @('North')
  $report.behavior.single = Get-VisibleRows $sheet
  Select-SlicerItems $regionCache @('North', 'East')
  $report.behavior.multi = Get-VisibleRows $sheet
  Invoke-ExcelRetry { $regionCache.ClearManualFilter() } 'Clear Region filter' | Out-Null
  $report.behavior.clear = Get-VisibleRows $sheet
  Select-SlicerItems $regionCache @('South')
  Select-SlicerItems $productCache @('Paper')
  $report.behavior.twoSlicers = Get-VisibleRows $sheet
  Invoke-ExcelRetry { $regionCache.ClearManualFilter() } 'Clear Region filter' | Out-Null
  Invoke-ExcelRetry { $productCache.ClearManualFilter() } 'Clear Product filter' | Out-Null
  $tableRange = $table.Range
  Invoke-ExcelRetry { $tableRange.AutoFilter(3, 40, 1) } 'Apply AutoFilter' | Out-Null
  Select-SlicerItems $regionCache @('South')
  $report.behavior.autoFilterAndSlicer = Get-VisibleRows $sheet
  $report.itemsAfterIntersection = Read-SlicerItems $regionCache

  $resolvedWorkbook = [IO.Path]::GetFullPath($WorkbookPath)
  $resolvedReport = [IO.Path]::GetFullPath($ReportPath)
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($resolvedWorkbook)) | Out-Null
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($resolvedReport)) | Out-Null
  Invoke-ExcelRetry { $workbook.SaveAs($resolvedWorkbook, 51) } 'Save workbook' | Out-Null
  $report.savedWorkbook = $resolvedWorkbook
  $json = $report | ConvertTo-Json -Depth 12
  [IO.File]::WriteAllText($resolvedReport, $json, [Text.UTF8Encoding]::new($false))
  $json
} finally {
  if ($workbook) { try { Invoke-ExcelRetry { $workbook.Close($false) } 'Close workbook' | Out-Null } catch {} }
  if ($excel) { try { Invoke-ExcelRetry { $excel.Quit() } 'Quit Excel' | Out-Null } catch {} }
  foreach ($comObject in @($productSlicer, $productCache, $regionSlicer, $regionCache, $table, $source, $sheet, $workbook, $excel)) {
    if ($comObject) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) } catch {} }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    $ownedProcess = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($ownedProcess -and $ownedProcess.ProcessName -eq 'EXCEL') { Stop-Process -Id $ownedPid -Force }
  }
}
