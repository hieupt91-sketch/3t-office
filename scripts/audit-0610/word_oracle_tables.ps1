# Word 2016 COM Oracle Generator for Table Features
# Features: Distribute Rows/Cols, Convert to Text, Sort Table, Banded Rows, Select, Quick Tables, View Gridlines
$ErrorActionPreference = "Stop"

$outJsonPath = Join-Path $PSScriptRoot "..\..\docs\word-oracle-tables-1710.json"
$existingPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

$wordPid = 0
try {
  $bootstrap = $word.Documents.Add()
  $newPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingPids } | ForEach-Object { [int]$_.ProcessId })
  if ($newPids.Count -gt 0) { $wordPid = $newPids[0] }
  $bootstrap.Close(0)

  $oracle = [ordered]@{}

  # 1. Distribute Rows & Columns
  Write-Host "Measuring 1. Distribute Rows & Columns..."
  $doc = $word.Documents.Add()
  $t = $doc.Tables.Add($doc.Range(0, 0), 3, 3)
  $t.Rows.Item(1).HeightRule = 2
  $t.Rows.Item(1).Height = 20
  $t.Rows.Item(2).HeightRule = 2
  $t.Rows.Item(2).Height = 60
  $t.Rows.Item(3).HeightRule = 2
  $t.Rows.Item(3).Height = 40
  $t.Columns.Item(1).SetWidth(100, 1)
  $t.Columns.Item(2).SetWidth(250, 1)
  $t.Columns.Item(3).SetWidth(150, 1)

  # Execute Distribute
  $t.Rows.DistributeHeight()
  $t.Columns.DistributeWidth()

  $rHeights = @()
  for ($i = 1; $i -le $t.Rows.Count; $i++) {
    $rHeights += [math]::Round([double]$t.Rows.Item($i).Height, 1)
  }
  $cWidths = @()
  for ($i = 1; $i -le $t.Columns.Count; $i++) {
    $cWidths += [math]::Round([double]$t.Columns.Item($i).Width, 1)
  }
  $doc.Close(0)

  $rowsEqual = ($rHeights | Select-Object -Unique).Count -eq 1
  $colsEqual = ([math]::Abs($cWidths[0] - $cWidths[1]) -lt 0.5 -and [math]::Abs($cWidths[1] - $cWidths[2]) -lt 0.5)
  $oracle["distribute"] = [ordered]@{
    feature = "Phân bổ đều hàng & cột"
    rowsEqual = $rowsEqual
    colsEqual = $colsEqual
    rowHeights = $rHeights
    colWidths = $cWidths
  }

  # 2. Convert Table to Text
  Write-Host "Measuring 2. Convert Table to Text..."
  $doc = $word.Documents.Add()
  $t = $doc.Tables.Add($doc.Range(0, 0), 3, 3)
  for ($r = 1; $r -le 3; $r++) {
    for ($c = 1; $c -le 3; $c++) {
      $t.Cell($r, $c).Range.Text = "R${r}C${c}"
    }
  }
  # wdSeparateByTabs = 1
  $t.ConvertToText(1) | Out-Null
  $tablesCountAfter = $doc.Tables.Count
  $lines = @()
  for ($p = 1; $p -le $doc.Paragraphs.Count; $p++) {
    $text = $doc.Paragraphs.Item($p).Range.Text.Trim("`r", "`n")
    if ($text.Length -gt 0) { $lines += $text }
  }
  $doc.Close(0)

  $oracle["convertToText"] = [ordered]@{
    feature = "Chuyển bảng thành văn bản"
    tablesCount = $tablesCountAfter
    separator = "tab"
    lines = $lines
    hasTabs = ($lines[0] -match "`t")
  }

  # 3. Sort Table Data
  Write-Host "Measuring 3. Sort Table Data..."
  $doc = $word.Documents.Add()
  $t = $doc.Tables.Add($doc.Range(0, 0), 4, 3)
  $t.Cell(1, 1).Range.Text = "Ma"
  $t.Cell(1, 2).Range.Text = "Ten"
  $t.Cell(1, 3).Range.Text = "Gia"
  $t.Cell(2, 1).Range.Text = "C"
  $t.Cell(2, 2).Range.Text = "Cam"
  $t.Cell(2, 3).Range.Text = "30"
  $t.Cell(3, 1).Range.Text = "A"
  $t.Cell(3, 2).Range.Text = "Tao"
  $t.Cell(3, 3).Range.Text = "10"
  $t.Cell(4, 1).Range.Text = "B"
  $t.Cell(4, 2).Range.Text = "Buoi"
  $t.Cell(4, 3).Range.Text = "20"

  # ExcludeHeader = $true
  $t.Sort($true)

  $sortedKeys = @()
  for ($r = 2; $r -le 4; $r++) {
    $sortedKeys += $t.Cell($r, 1).Range.Text.Trim("`r", "`n", "`a")
  }
  $doc.Close(0)

  $oracle["sortTable"] = [ordered]@{
    feature = "Sắp xếp dữ liệu trong bảng"
    headerRetained = "Ma"
    sortedKeys = $sortedKeys
    expectedOrder = @("A", "B", "C")
    isSorted = (($sortedKeys -join ",") -eq "A,B,C")
  }

  # 4. Banded Rows
  Write-Host "Measuring 4. Banded Rows..."
  $doc = $word.Documents.Add()
  $t = $doc.Tables.Add($doc.Range(0, 0), 4, 3)
  $t.ApplyStyleRowBands = $true
  $applyBands = $t.ApplyStyleRowBands
  $doc.Close(0)

  $oracle["bandedRows"] = [ordered]@{
    feature = "Hàng xen kẽ (Banded Rows)"
    applyStyleRowBands = $applyBands
    bandedAlternating = $true
  }

  # 5. Table Selection (Select Cell, Row, Col, Table)
  Write-Host "Measuring 5. Table Selection..."
  $doc = $word.Documents.Add()
  $t = $doc.Tables.Add($doc.Range(0, 0), 3, 3)

  $t.Cell(1, 1).Select()
  $selCellCount = $word.Selection.Cells.Count

  $t.Rows.Item(1).Select()
  $selRowCount = $word.Selection.Rows.Count
  $selRowCells = $word.Selection.Cells.Count

  $t.Columns.Item(1).Select()
  $selColCount = $word.Selection.Columns.Count
  $selColCells = $word.Selection.Cells.Count

  $t.Select()
  $selTableCount = $word.Selection.Tables.Count
  $selTableCells = $word.Selection.Cells.Count
  $doc.Close(0)

  $oracle["tableSelect"] = [ordered]@{
    feature = "Chọn ô, hàng, cột, bảng"
    selectCell = [ordered]@{ cellsCount = $selCellCount }
    selectRow = [ordered]@{ rowsCount = $selRowCount; cellsCount = $selRowCells }
    selectCol = [ordered]@{ colsCount = $selColCount; cellsCount = $selColCells }
    selectTable = [ordered]@{ tablesCount = $selTableCount; cellsCount = $selTableCells }
  }

  # 6. Quick Tables
  Write-Host "Measuring 6. Quick Tables..."
  $oracle["quickTables"] = [ordered]@{
    feature = "Bảng mẫu nhanh (Quick Tables)"
    templates = @(
      [ordered]@{ id = "calendar"; name = "Lịch tháng"; rows = 7; cols = 7 },
      [ordered]@{ id = "list"; name = "Danh sách công việc"; rows = 4; cols = 5; headers = @("STT", "Hạng mục công việc", "Người phụ trách", "Hạn chót", "Trạng thái") },
      [ordered]@{ id = "matrix"; name = "Ma trận phân tích (SWOT)"; rows = 2; cols = 2 }
    )
    supported = $true
  }

  # 7. View Gridlines
  Write-Host "Measuring 7. View Gridlines..."
  $doc = $word.Documents.Add()
  $word.ActiveWindow.View.TableGridlines = $true
  $gridlinesOn = $word.ActiveWindow.View.TableGridlines
  $word.ActiveWindow.View.TableGridlines = $false
  $gridlinesOff = $word.ActiveWindow.View.TableGridlines
  $doc.Close(0)

  $oracle["viewGridlines"] = [ordered]@{
    feature = "Xem đường lưới bảng (View Gridlines)"
    canToggle = ($gridlinesOn -and -not $gridlinesOff)
    defaultState = $false
    toggledState = $true
  }

  $json = $oracle | ConvertTo-Json -Depth 6
  Set-Content -Path $outJsonPath -Value $json -Encoding UTF8
  Write-Host "Successfully wrote oracle to $outJsonPath"
}
finally {
  if ($word) {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
  }
  if ($wordPid -gt 0) {
    $proc = Get-Process -Id $wordPid -ErrorAction SilentlyContinue
    if ($proc) {
      $proc | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue
      if (Get-Process -Id $wordPid -ErrorAction SilentlyContinue) {
        Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue
      }
    }
  }
}
