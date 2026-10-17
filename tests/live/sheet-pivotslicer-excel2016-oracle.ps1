param(
  [string]$WorkbookPath = "$env:TEMP\vno-sheet-pivotslicer-oracle.xlsx",
  [string]$ReportPath = "$env:TEMP\vno-sheet-pivotslicer-oracle.json"
)

$ErrorActionPreference = 'Stop'

if (-not ('VnoPivotSlicerOraclePid' -as [type])) {
  Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VnoPivotSlicerOraclePid {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
}

function Invoke-ExcelRetry([scriptblock]$Operation, [string]$Label) {
  $last = $null
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    try { return (& $Operation) } catch {
      $last = $_
      if ($_.Exception.Message -notmatch 'rejected by callee|busy|RPC|0x800AC472') { throw }
      if ($attempt -lt 40) { Start-Sleep -Milliseconds 500 }
    }
  }
  throw "$Label failed after 40 attempts: $($last.Exception.Message)"
}

function Set-CellValue($Sheet, [int]$Row, [int]$Column, [object]$Value) {
  $last = $null
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    $cell = $null
    try {
      $cells = $Sheet.Cells
      if ($null -ne $cells) { $cell = $cells.Item($Row, $Column) }
      if ($null -eq $cell) { throw 'busy: cell object unavailable' }
      if ($Value -is [DateTime]) { $cell.Value2 = $Value.ToOADate() }
      elseif ($Value -is [string]) { $cell.Value2 = [string]$Value }
      else { $cell.Value2 = [double]$Value }
      try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($cell) } catch {}
      return
    } catch {
      $last = $_
      if ($attempt -eq 40 -or $_.Exception.Message -notmatch 'rejected by callee|busy|RPC|0x800AC472|null-valued') { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  throw "Set cell R${Row}C${Column} failed: $($last.Exception.Message)"
}

function Set-SlicerSelection($Cache, [string[]]$Names) {
  $count = [int](Invoke-ExcelRetry { $Cache.SlicerItems.Count } 'Read slicer item count')
  for ($index = 1; $index -le $count; $index++) {
    $item = $null
    for ($attempt = 1; $attempt -le 40 -and $null -eq $item; $attempt++) {
      try { $item = $Cache.SlicerItems.Item($index) } catch {
        if ($_.Exception.Message -notmatch 'rejected by callee|busy|RPC|0x800AC472' -or $attempt -eq 40) { throw }
        Start-Sleep -Milliseconds 500
      }
    }
    $name = [string](Invoke-ExcelRetry { $item.Name } "Read slicer item $index name")
    Invoke-ExcelRetry { $item.Selected = ($Names -contains $name) } "Select slicer item $name" | Out-Null
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($item) } catch {}
  }
}

function Read-SlicerItems($Cache) {
  $items = @()
  $count = [int](Invoke-ExcelRetry { $Cache.SlicerItems.Count } 'Read slicer item count')
  for ($index = 1; $index -le $count; $index++) {
    $item = $null
    for ($attempt = 1; $attempt -le 40 -and $null -eq $item; $attempt++) {
      try { $item = $Cache.SlicerItems.Item($index) } catch {
        if ($_.Exception.Message -notmatch 'rejected by callee|busy|RPC|0x800AC472' -or $attempt -eq 40) { throw }
        Start-Sleep -Milliseconds 500
      }
    }
    $items += [ordered]@{
      name = [string](Invoke-ExcelRetry { $item.Name } "Read item $index name")
      caption = [string](Invoke-ExcelRetry { $item.Caption } "Read item $index caption")
      selected = [bool](Invoke-ExcelRetry { $item.Selected } "Read item $index selection")
      hasData = [bool](Invoke-ExcelRetry { $item.HasData } "Read item $index data state")
    }
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($item) } catch {}
  }
  return $items
}

function Read-PivotBody($Sheet, [int]$StartRow) {
  $rows = @()
  for ($row = $StartRow; $row -lt ($StartRow + 12); $row++) {
    $label = Invoke-ExcelRetry { $Sheet.Cells.Item($row, 1).Value2 } "Read pivot label $row"
    $value = Invoke-ExcelRetry { $Sheet.Cells.Item($row, 2).Value2 } "Read pivot value $row"
    if ($null -ne $label -or $null -ne $value) { $rows += @([string]$label, $value) }
  }
  return $rows
}

$excel = $null
$workbook = $null
$dataSheet = $null
$pivotSheet = $null
$pivotCache = $null
$pivotOne = $null
$pivotTwo = $null
$regionCache = $null
$productCache = $null
$timelineCache = $null
$regionSlicer = $null
$productSlicer = $null
$timeline = $null
$ownedPid = 0

try {
  for ($attempt = 1; $attempt -le 30 -and $null -eq $excel; $attempt++) {
    try { $excel = New-Object -ComObject Excel.Application } catch { if ($attempt -eq 30) { throw }; Start-Sleep -Milliseconds 700 }
  }
  $pidValue = [uint32]0
  $handle = [IntPtr][int](Invoke-ExcelRetry { $excel.Hwnd } 'Read application window')
  [void][VnoPivotSlicerOraclePid]::GetWindowThreadProcessId($handle, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  Invoke-ExcelRetry { $excel.Visible = $false } 'Keep application hidden' | Out-Null
  Invoke-ExcelRetry { $excel.DisplayAlerts = $false } 'Disable alerts' | Out-Null
  Invoke-ExcelRetry { $excel.EnableEvents = $false; $excel.ScreenUpdating = $false; $excel.AskToUpdateLinks = $false } 'Configure automation' | Out-Null
  $version = [string](Invoke-ExcelRetry { $excel.Version } 'Read version')

  for ($attempt = 1; $attempt -le 40 -and $null -eq $workbook; $attempt++) {
    $candidate = $null
    try {
      $workbooks = $excel.Workbooks
      if ($null -ne $workbooks) { $candidate = $workbooks.Add() }
      if ($null -ne $candidate) {
        for ($readyAttempt = 1; $readyAttempt -le 10; $readyAttempt++) {
          $sheetCount = 0
          try { $sheetCount = [int]$candidate.Sheets.Count } catch {}
          if ($sheetCount -gt 0) { $workbook = $candidate; break }
          Start-Sleep -Milliseconds 300
        }
      }
    } catch { if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500 }
    if ($null -eq $workbook) {
      if ($null -ne $candidate) { try { $candidate.Close($false) } catch {}; try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($candidate) } catch {} }
      Start-Sleep -Milliseconds 500
    }
  }
  if ($null -eq $workbook) { throw 'Workbooks.Add returned no workbook after 40 attempts' }
  for ($attempt = 1; $attempt -le 40 -and $null -eq $dataSheet; $attempt++) {
    try {
      $worksheets = $workbook.Worksheets
      if ($null -ne $worksheets) { $dataSheet = $worksheets.Item(1) }
    } catch { if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500 }
    if ($null -eq $dataSheet) { Start-Sleep -Milliseconds 500 }
  }
  if ($null -eq $dataSheet) { throw 'Could not read the first worksheet' }
  Invoke-ExcelRetry { $dataSheet.Name = 'Data' } 'Name data sheet' | Out-Null
  $pivotSheet = $workbook.Worksheets.Add()
  Invoke-ExcelRetry { $pivotSheet.Name = 'Pivot' } 'Name pivot sheet' | Out-Null

  $values = @(
    @('Date', 'Region', 'Product', 'Amount'),
    @([DateTime]'2024-01-05', 'North', 'Pen', 10),
    @([DateTime]'2024-01-20', 'South', 'Pen', 20),
    @([DateTime]'2024-02-10', 'North', 'Paper', 30),
    @([DateTime]'2024-03-15', 'South', 'Paper', 40),
    @([DateTime]'2024-04-01', 'East', 'Pen', 50),
    @([DateTime]'2024-05-12', 'North', 'Paper', 60),
    @([DateTime]'2024-07-07', 'South', 'Pen', 70),
    @([DateTime]'2025-01-09', 'East', 'Paper', 80)
  )
  for ($row = 0; $row -lt $values.Count; $row++) {
    for ($column = 0; $column -lt $values[$row].Count; $column++) {
      Set-CellValue $dataSheet ($row + 1) ($column + 1) $values[$row][$column]
    }
  }
  Invoke-ExcelRetry { $dataSheet.Columns.Item(1).NumberFormat = 'yyyy-mm-dd' } 'Format source dates' | Out-Null

  for ($attempt = 1; $attempt -le 40 -and $null -eq $pivotCache; $attempt++) {
    try { $pivotCache = $workbook.PivotCaches().Create(1, "'Data'!R1C1:R9C4", 6) } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 1; $attempt -le 40 -and $null -eq $pivotOne; $attempt++) {
    try { $pivotOne = $pivotCache.CreatePivotTable("'Pivot'!R3C1", 'PivotSalesOne') } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  Start-Sleep -Milliseconds 750
  Invoke-ExcelRetry { $pivotOne.PivotFields('Region').Orientation = 1 } 'Add row field to first pivot' | Out-Null
  Invoke-ExcelRetry { $pivotOne.AddDataField($pivotOne.PivotFields('Amount'), 'Sum Amount', -4157) | Out-Null } 'Add data field to first pivot' | Out-Null
  Start-Sleep -Milliseconds 750

  for ($attempt = 1; $attempt -le 40 -and $null -eq $pivotTwo; $attempt++) {
    try { $pivotTwo = $pivotCache.CreatePivotTable("'Pivot'!R3C6", 'PivotSalesTwo') } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  Start-Sleep -Milliseconds 750
  Invoke-ExcelRetry { $pivotTwo.PivotFields('Product').Orientation = 1 } 'Add row field to second pivot' | Out-Null
  Invoke-ExcelRetry { $pivotTwo.AddDataField($pivotTwo.PivotFields('Amount'), 'Sum Amount', -4157) | Out-Null } 'Add data field to second pivot' | Out-Null
  Start-Sleep -Milliseconds 750

  for ($attempt = 1; $attempt -le 40 -and $null -eq $regionCache; $attempt++) {
    try { $regionCache = $workbook.SlicerCaches.Add2($pivotOne, 'Region', 'Slicer_Region') } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 1; $attempt -le 40 -and $null -eq $regionSlicer; $attempt++) {
    try { $regionSlicer = $regionCache.Slicers.Add($pivotSheet, [Type]::Missing, 'RegionSlicer', 'Region', 20, 250, 180, 160) } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  Invoke-ExcelRetry { $regionSlicer.Caption = 'Region Caption'; $regionSlicer.NumberOfColumns = 2 } 'Configure Region slicer' | Out-Null

  for ($attempt = 1; $attempt -le 40 -and $null -eq $productCache; $attempt++) {
    try { $productCache = $workbook.SlicerCaches.Add2($pivotOne, 'Product', 'Slicer_Product') } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 1; $attempt -le 40 -and $null -eq $productSlicer; $attempt++) {
    try { $productSlicer = $productCache.Slicers.Add($pivotSheet, [Type]::Missing, 'ProductSlicer', 'Product', 200, 250, 180, 160) } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }

  $reportConnection = [ordered]@{ before = [int](Invoke-ExcelRetry { $regionCache.PivotTables.Count } 'Read initial report connections'); added = $false; after = 0 }
  Invoke-ExcelRetry { $regionCache.PivotTables.AddPivotTable($pivotTwo) } 'Connect second pivot' | Out-Null
  $reportConnection.added = $true
  $reportConnection.after = [int](Invoke-ExcelRetry { $regionCache.PivotTables.Count } 'Read report connections after add')

  for ($attempt = 1; $attempt -le 40 -and $null -eq $timelineCache; $attempt++) {
    try { $timelineCache = $workbook.SlicerCaches.Add2($pivotOne, 'Date', 'Timeline_Date', 2) } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }
  for ($attempt = 1; $attempt -le 40 -and $null -eq $timeline; $attempt++) {
    try { $timeline = $timelineCache.Timelines.Add($pivotSheet, 'DateTimeline', 'Date', 390, 250, 360, 120) } catch {
      if ($attempt -eq 40) { throw }; Start-Sleep -Milliseconds 500
    }
  }

  $timelineLevels = @()
  for ($level = 0; $level -le 3; $level++) {
    Invoke-ExcelRetry { $timelineCache.TimelineState.SetFilterDateRange([DateTime]'2024-02-01', [DateTime]'2024-05-31') } "Set timeline range level $level" | Out-Null
    Invoke-ExcelRetry { $timeline.TimelineViewState.Level = $level } "Set timeline level $level" | Out-Null
    $timelineLevels += [ordered]@{
      requestedLevel = $level
      actualLevel = [int](Invoke-ExcelRetry { $timeline.TimelineViewState.Level } "Read timeline level $level")
      filterType = [int](Invoke-ExcelRetry { $timelineCache.TimelineState.FilterType } "Read filter type $level")
      startDate = ([DateTime](Invoke-ExcelRetry { $timelineCache.TimelineState.StartDate } "Read start date $level")).ToString('yyyy-MM-dd')
      endDate = ([DateTime](Invoke-ExcelRetry { $timelineCache.TimelineState.EndDate } "Read end date $level")).ToString('yyyy-MM-dd')
      firstPivot = Read-PivotBody $pivotSheet 3
    }
  }

  Invoke-ExcelRetry { $timelineCache.ClearManualFilter() } 'Clear timeline filter' | Out-Null
  Set-SlicerSelection $regionCache @('North', 'East')
  $regionOnly = Read-PivotBody $pivotSheet 3
  Set-SlicerSelection $productCache @('Paper')
  $intersection = Read-PivotBody $pivotSheet 3
  $secondPivotIntersection = @()
  for ($row = 3; $row -lt 15; $row++) {
    $label = Invoke-ExcelRetry { $pivotSheet.Cells.Item($row, 6).Value2 } "Read second pivot label $row"
    $value = Invoke-ExcelRetry { $pivotSheet.Cells.Item($row, 7).Value2 } "Read second pivot value $row"
    if ($null -ne $label -or $null -ne $value) { $secondPivotIntersection += @([string]$label, $value) }
  }
  Invoke-ExcelRetry { $regionCache.ClearManualFilter(); $productCache.ClearManualFilter() } 'Clear slicer filters' | Out-Null

  $resolvedWorkbook = [IO.Path]::GetFullPath($WorkbookPath)
  $resolvedReport = [IO.Path]::GetFullPath($ReportPath)
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedWorkbook)) | Out-Null
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedReport)) | Out-Null
  Invoke-ExcelRetry { $workbook.SaveAs($resolvedWorkbook, 51) } 'Save oracle workbook' | Out-Null

  $report = [ordered]@{
    excelVersion = $version
    slicer = [ordered]@{
      name = [string](Invoke-ExcelRetry { $regionSlicer.Name } 'Read slicer name')
      caption = [string](Invoke-ExcelRetry { $regionSlicer.Caption } 'Read slicer caption')
      left = [double](Invoke-ExcelRetry { $regionSlicer.Left } 'Read slicer left')
      top = [double](Invoke-ExcelRetry { $regionSlicer.Top } 'Read slicer top')
      width = [double](Invoke-ExcelRetry { $regionSlicer.Width } 'Read slicer width')
      height = [double](Invoke-ExcelRetry { $regionSlicer.Height } 'Read slicer height')
      numberOfColumns = [int](Invoke-ExcelRetry { $regionSlicer.NumberOfColumns } 'Read slicer columns')
      items = Read-SlicerItems $regionCache
    }
    reportConnection = $reportConnection
    behavior = [ordered]@{
      regionOnly = $regionOnly
      regionAndProduct = $intersection
      secondPivot = $secondPivotIntersection
    }
    timeline = [ordered]@{
      name = [string](Invoke-ExcelRetry { $timeline.Name } 'Read timeline name')
      caption = [string](Invoke-ExcelRetry { $timeline.Caption } 'Read timeline caption')
      left = [double](Invoke-ExcelRetry { $timeline.Left } 'Read timeline left')
      top = [double](Invoke-ExcelRetry { $timeline.Top } 'Read timeline top')
      width = [double](Invoke-ExcelRetry { $timeline.Width } 'Read timeline width')
      height = [double](Invoke-ExcelRetry { $timeline.Height } 'Read timeline height')
      levels = $timelineLevels
    }
    savedWorkbook = $resolvedWorkbook
  }
  $json = $report | ConvertTo-Json -Depth 15
  [IO.File]::WriteAllText($resolvedReport, $json, [Text.UTF8Encoding]::new($false))
  $json
} finally {
  if ($workbook) { try { Invoke-ExcelRetry { $workbook.Close($false) } 'Close workbook' | Out-Null } catch {} }
  if ($excel) { try { Invoke-ExcelRetry { $excel.Quit() } 'Quit application' | Out-Null } catch {} }
  foreach ($comObject in @($timeline, $timelineCache, $productSlicer, $productCache, $regionSlicer, $regionCache, $pivotTwo, $pivotOne, $pivotCache, $pivotSheet, $dataSheet, $workbook, $excel)) {
    if ($comObject) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) } catch {} }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    $ownedProcess = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($ownedProcess -and $ownedProcess.ProcessName -eq 'EXCEL') { Stop-Process -Id $ownedPid -Force }
  }
}
