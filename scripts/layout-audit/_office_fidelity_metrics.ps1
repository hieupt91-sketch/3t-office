param(
  [Parameter(Mandatory = $true)][ValidateSet('pptx', 'doc', 'xls', 'ppt')][string]$Format,
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Saved,
  [string]$OfficeConverted = '',
  [string]$Marker = ''
)

# Hidden, sequential Microsoft Office COM measurements. This script never looks
# up, terminates, or attaches to an Office process by PID.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding

function Invoke-ComWithRetry([string]$Operation, [scriptblock]$Action) {
  $delays = @(250, 500, 1000, 2000, 4000)
  for ($attempt = 0; $attempt -le $delays.Count; $attempt++) {
    try { return ,(& $Action) }
    catch {
      $hr = [int]$_.Exception.HResult
      $busy = ($hr -eq -2147418111) -or ($hr -eq -2147417846) -or
        ([string]$_.Exception.Message -match '(?i)RPC_E_CALL_REJECTED|rejected by callee|server busy|application is busy')
      if (-not $busy -or $attempt -ge $delays.Count) { throw "${Operation}: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds $delays[$attempt]
    }
  }
}

function Read-WordMetrics([string]$Path) {
  $doc = Invoke-ComWithRetry "Open Word document" { $script:app.Documents.Open($Path, $false, $true, $false) }
  try {
    Invoke-ComWithRetry 'Repaginate Word document' { $doc.Repaginate() } | Out-Null
    return [ordered]@{
      Pages = Invoke-ComWithRetry 'Read Word pages' { [int]$doc.ComputeStatistics(2, $false) }
      Words = Invoke-ComWithRetry 'Read Word words' { [int]$doc.ComputeStatistics(0, $false) }
      Paragraphs = Invoke-ComWithRetry 'Read Word paragraphs' { [int]$doc.Paragraphs.Count }
      Tables = Invoke-ComWithRetry 'Read Word tables' { [int]$doc.Tables.Count }
      InlinePictures = Invoke-ComWithRetry 'Read Word inline pictures' { [int]$doc.InlineShapes.Count }
      FloatingShapes = Invoke-ComWithRetry 'Read Word shapes' { [int]$doc.Shapes.Count }
      Sections = Invoke-ComWithRetry 'Read Word sections' { [int]$doc.Sections.Count }
    }
  } finally {
    try { Invoke-ComWithRetry 'Close Word document' { $doc.Close(0) } | Out-Null } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc)
  }
}

function Read-ExcelMetrics([string]$Path) {
  $book = Invoke-ComWithRetry "Open Excel workbook" { $script:app.Workbooks.Open($Path, 0, $false) }
  try {
    $sheetCount = Invoke-ComWithRetry 'Read worksheet count' { [int]$book.Worksheets.Count }
    $usedRows = 0; $usedColumns = 0; $nonEmptyCells = 0; $formulaCells = 0; $charts = 0; $pictures = 0
    for ($sheetIndex = 1; $sheetIndex -le $sheetCount; $sheetIndex++) {
      $usedRows += Invoke-ComWithRetry 'Count used rows' { [int]$book.Worksheets.Item($sheetIndex).UsedRange.Rows.Count }
      $usedColumns += Invoke-ComWithRetry 'Count used columns' { [int]$book.Worksheets.Item($sheetIndex).UsedRange.Columns.Count }
      $nonEmptyCells += Invoke-ComWithRetry 'Count non-empty cells' { [int]$script:app.WorksheetFunction.CountA($book.Worksheets.Item($sheetIndex).UsedRange) }
      try {
        $formulaCells += Invoke-ComWithRetry 'Count formula cells' { [int]$book.Worksheets.Item($sheetIndex).UsedRange.SpecialCells(-4123).Count }
      } catch {
        if ([string]$_.Exception.Message -notmatch '(?i)no cells were found') { throw }
      }
      $charts += Invoke-ComWithRetry 'Count chart objects' { [int]$book.Worksheets.Item($sheetIndex).ChartObjects().Count }
      $shapeCount = Invoke-ComWithRetry 'Count worksheet shapes' { [int]$book.Worksheets.Item($sheetIndex).Shapes.Count }
      for ($shapeIndex = 1; $shapeIndex -le $shapeCount; $shapeIndex++) {
        $shapeType = Invoke-ComWithRetry 'Read worksheet shape type' { [int]$book.Worksheets.Item($sheetIndex).Shapes.Item($shapeIndex).Type }
        if ($shapeType -eq 11 -or $shapeType -eq 13) { $pictures++ }
      }
    }
    return [ordered]@{
      Sheets = $sheetCount
      UsedRows = $usedRows
      UsedColumns = $usedColumns
      NonEmptyCells = $nonEmptyCells
      FormulaCells = $formulaCells
      Charts = $charts
      Pictures = $pictures
    }
  } finally {
    try { Invoke-ComWithRetry 'Close Excel workbook' { $book.Close($false) } | Out-Null } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($book)
  }
}

function Read-PowerPointMetrics([string]$Path) {
  $presentation = Invoke-ComWithRetry "Open PowerPoint presentation" { $script:app.Presentations.Open($Path, $false, $false, $false) }
  try {
    $slideCount = Invoke-ComWithRetry 'Read slide count' { [int]$presentation.Slides.Count }
    $shapeCount = 0; $pictures = 0; $textRuns = 0; $notes = 0; $noteRuns = 0; $markerPresent = ($Marker.Length -eq 0)
    for ($slideIndex = 1; $slideIndex -le $slideCount; $slideIndex++) {
      $count = Invoke-ComWithRetry 'Count slide shapes' { [int]$presentation.Slides.Item($slideIndex).Shapes.Count }
      $shapeCount += $count
      for ($shapeIndex = 1; $shapeIndex -le $count; $shapeIndex++) {
        $shapeType = Invoke-ComWithRetry 'Read slide shape type' { [int]$presentation.Slides.Item($slideIndex).Shapes.Item($shapeIndex).Type }
        if ($shapeType -eq 11 -or $shapeType -eq 13) { $pictures++ }
        $hasFrame = Invoke-ComWithRetry 'Read slide text frame state' { [int]$presentation.Slides.Item($slideIndex).Shapes.Item($shapeIndex).HasTextFrame }
        if ($hasFrame -eq -1) {
          $hasText = Invoke-ComWithRetry 'Read slide text state' { [int]$presentation.Slides.Item($slideIndex).Shapes.Item($shapeIndex).TextFrame.HasText }
          if ($hasText -eq -1) {
            $textRuns += Invoke-ComWithRetry 'Count slide text runs' { [int]$presentation.Slides.Item($slideIndex).Shapes.Item($shapeIndex).TextFrame.TextRange.Runs().Count }
            if ($Marker.Length -gt 0) {
              $shapeText = Invoke-ComWithRetry 'Read slide text for marker check' { [string]$presentation.Slides.Item($slideIndex).Shapes.Item($shapeIndex).TextFrame.TextRange.Text }
              if ($shapeText.Contains($Marker)) { $markerPresent = $true }
            }
          }
        }
      }

      $noteShapeCount = Invoke-ComWithRetry 'Count notes shapes' { [int]$presentation.Slides.Item($slideIndex).NotesPage.Shapes.Count }
      $hasNotes = $false
      for ($noteIndex = 1; $noteIndex -le $noteShapeCount; $noteIndex++) {
        $noteType = Invoke-ComWithRetry 'Read notes shape type' { [int]$presentation.Slides.Item($slideIndex).NotesPage.Shapes.Item($noteIndex).Type }
        if ($noteType -eq 14) {
          $placeholderType = Invoke-ComWithRetry 'Read notes placeholder type' { [int]$presentation.Slides.Item($slideIndex).NotesPage.Shapes.Item($noteIndex).PlaceholderFormat.Type }
          if ($placeholderType -eq 2) {
            $noteHasText = Invoke-ComWithRetry 'Read notes text state' { [int]$presentation.Slides.Item($slideIndex).NotesPage.Shapes.Item($noteIndex).TextFrame.HasText }
            if ($noteHasText -eq -1) {
              $noteText = Invoke-ComWithRetry 'Read notes text' { [string]$presentation.Slides.Item($slideIndex).NotesPage.Shapes.Item($noteIndex).TextFrame.TextRange.Text }
              if (-not [string]::IsNullOrWhiteSpace($noteText)) {
                $hasNotes = $true
                $noteRuns += Invoke-ComWithRetry 'Count notes text runs' { [int]$presentation.Slides.Item($slideIndex).NotesPage.Shapes.Item($noteIndex).TextFrame.TextRange.Runs().Count }
              }
            }
          }
        }
      }
      if ($hasNotes) { $notes++ }
    }
    return [ordered]@{
      Slides = $slideCount
      Shapes = $shapeCount
      Pictures = $pictures
      TextRuns = $textRuns
      NotesSlides = $notes
      NotesTextRuns = $noteRuns
      MarkerPresent = $markerPresent
      SlideWidth = Invoke-ComWithRetry 'Read slide width' { [double]$presentation.PageSetup.SlideWidth }
      SlideHeight = Invoke-ComWithRetry 'Read slide height' { [double]$presentation.PageSetup.SlideHeight }
    }
  } finally {
    try { Invoke-ComWithRetry 'Close PowerPoint presentation' { $presentation.Close() } | Out-Null } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  }
}

function Save-OfficeConverted([string]$Path) {
  switch ($Format) {
    'doc' {
      $doc = Invoke-ComWithRetry 'Open legacy DOC for Office conversion' { $script:app.Documents.Open($Path, $false, $false, $false) }
      try { Invoke-ComWithRetry 'Save Office DOCX conversion' { $doc.SaveAs2($OfficeConverted, 16) } | Out-Null }
      finally { try { Invoke-ComWithRetry 'Close legacy DOC after conversion' { $doc.Close(0) } | Out-Null } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    }
    'xls' {
      $book = Invoke-ComWithRetry 'Open legacy XLS for Office conversion' { $script:app.Workbooks.Open($Path, 0, $false) }
      try { Invoke-ComWithRetry 'Save Office XLSX conversion' { $book.SaveAs($OfficeConverted, 51) } | Out-Null }
      finally { try { Invoke-ComWithRetry 'Close legacy XLS after conversion' { $book.Close($false) } | Out-Null } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($book) }
    }
    'ppt' {
      $presentation = Invoke-ComWithRetry 'Open legacy PPT for Office conversion' { $script:app.Presentations.Open($Path, $false, $false, $false) }
      try { Invoke-ComWithRetry 'Save Office PPTX conversion' { $presentation.SaveAs($OfficeConverted, 24) } | Out-Null }
      finally { try { Invoke-ComWithRetry 'Close legacy PPT after conversion' { $presentation.Close() } | Out-Null } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    }
  }
}

function New-OfficeApp {
  switch ($Format) {
    { $_ -in 'doc', 'docx' } { return Invoke-ComWithRetry 'Create Word' { New-Object -ComObject Word.Application } }
    { $_ -in 'xls', 'xlsx' } { return Invoke-ComWithRetry 'Create Excel' { New-Object -ComObject Excel.Application } }
    { $_ -in 'ppt', 'pptx' } { return Invoke-ComWithRetry 'Create PowerPoint' { New-Object -ComObject PowerPoint.Application } }
  }
}

$script:app = $null
try {
  $script:app = New-OfficeApp
  if ($Format -notin @('ppt', 'pptx')) {
    Invoke-ComWithRetry 'Hide Office application' { $script:app.Visible = $false }
  }
  # PowerPoint rejects Application.Visible = False. Every presentation is opened
  # with WithWindow=False, which keeps its presentation window hidden.
  if ($Format -in @('doc', 'xls')) { Invoke-ComWithRetry 'Disable Office alerts' { $script:app.DisplayAlerts = 0 } }
  if ($Format -eq 'xls') { Invoke-ComWithRetry 'Disable Excel link prompts' { $script:app.AskToUpdateLinks = $false } }
  if ($Format -in @('ppt', 'pptx')) { Invoke-ComWithRetry 'Disable PowerPoint alerts' { $script:app.DisplayAlerts = 1 } }
  if ($Format -in @('doc', 'xls', 'ppt')) { $originalMetrics = switch ($Format) { 'doc' { Read-WordMetrics $Source }; 'xls' { Read-ExcelMetrics $Source }; 'ppt' { Read-PowerPointMetrics $Source } } }
  else { $originalMetrics = Read-PowerPointMetrics $Source }

  $officeMetrics = $null
  if ($OfficeConverted) {
    Save-OfficeConverted $Source
    $officeMetrics = switch ($Format) { 'doc' { Read-WordMetrics $OfficeConverted }; 'xls' { Read-ExcelMetrics $OfficeConverted }; 'ppt' { Read-PowerPointMetrics $OfficeConverted } }
  }
  $savedMetrics = if ($Format -in @('doc', 'docx')) { Read-WordMetrics $Saved } elseif ($Format -in @('xls', 'xlsx')) { Read-ExcelMetrics $Saved } else { Read-PowerPointMetrics $Saved }
  [ordered]@{ Format = $Format; Original = $originalMetrics; OfficeConverted = $officeMetrics; ThreeT = $savedMetrics } | ConvertTo-Json -Depth 8 -Compress
} catch {
  Write-Error ($_.Exception.Message -replace "`r|`n", " ")
  exit 1
} finally {
  if ($script:app) {
    try { Invoke-ComWithRetry 'Quit Office application' { $script:app.Quit() } | Out-Null } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($script:app)
  }
}
