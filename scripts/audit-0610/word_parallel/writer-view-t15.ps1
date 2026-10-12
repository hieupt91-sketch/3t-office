param([Parameter(Mandatory=$true)][string]$Dir,[Parameter(Mandatory=$true)][string]$WordArtDocx)
$ErrorActionPreference = 'Stop'
[void][System.IO.Directory]::CreateDirectory($Dir)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$result = [ordered]@{ zoom = @{}; print = @{}; wordArt = @{} }
try {
  $doc = $word.Documents.Add()
  try {
    $doc.PageSetup.PaperSize = 9 # wdPaperA4
    $doc.Content.Text = 'VN Office Word count and print comparison.'
    $window = $word.ActiveWindow
    $view = $window.View
    $result.zoom.default = [ordered]@{ pageFit = [int]$view.Zoom.PageFit; percentage = [int]$view.Zoom.Percentage }
    $view.Zoom.PageFit = 3 # wdPageFitTextFit, Word's page-width fit
    $result.zoom.pageWidth = [ordered]@{ pageFit = [int]$view.Zoom.PageFit; percentage = [int]$view.Zoom.Percentage; pageWidthPoints = [double]$doc.PageSetup.PageWidth; viewportWidthPoints = [double]$window.UsableWidth }
    $view.Zoom.PageFit = 0 # wdPageFitNone
    $view.Zoom.Percentage = 100
    $result.zoom.reset = [ordered]@{ pageFit = [int]$view.Zoom.PageFit; percentage = [int]$view.Zoom.Percentage }

    $result.print.pages = [int]$doc.ComputeStatistics(2)
    $result.print.pageSetup = [ordered]@{ paperSize = [int]$doc.PageSetup.PaperSize; widthPoints = [double]$doc.PageSetup.PageWidth; heightPoints = [double]$doc.PageSetup.PageHeight; widthInches = [double]($doc.PageSetup.PageWidth / 72); heightInches = [double]($doc.PageSetup.PageHeight / 72) }
    $pdfPath = Join-Path $Dir 'writer-print-t15.pdf'
    $doc.ExportAsFixedFormat($pdfPath, 17)
    $result.print.pdfPath = $pdfPath
    $result.print.pdfLength = [int64](Get-Item -LiteralPath $pdfPath).Length
    $doc.PrintPreview()
    $result.print.preview = [ordered]@{ viewType = [int]$word.ActiveWindow.View.Type; pages = [int]$doc.ComputeStatistics(2); pageFit = [int]$word.ActiveWindow.View.Zoom.PageFit; percentage = [int]$word.ActiveWindow.View.Zoom.Percentage }
    $word.ActiveWindow.View.Close()
  } finally { $doc.Close(0) }

  $art = $word.Documents.Open($WordArtDocx, $false, $true)
  try {
    $result.wordArt.path = $WordArtDocx
    $result.wordArt.shapeCount = [int]$art.Shapes.Count
    $result.wordArt.shapes = @()
    foreach ($shape in $art.Shapes) {
      $entry = [ordered]@{ type = [int]$shape.Type; name = [string]$shape.Name; hasTextFrame = [bool]$shape.TextFrame.HasText }
      try { $entry.textEffectText = [string]$shape.TextEffect.Text } catch { $entry.textEffectError = $_.Exception.Message }
      try { $entry.textFrameText = [string]$shape.TextFrame.TextRange.Text } catch { $entry.textFrameError = $_.Exception.Message }
      $result.wordArt.shapes += $entry
    }
  } finally { $art.Close(0) }

  $json = ConvertTo-Json -InputObject $result -Depth 7
  [System.IO.File]::WriteAllText((Join-Path $Dir 'writer-view-t15.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
  $json | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
