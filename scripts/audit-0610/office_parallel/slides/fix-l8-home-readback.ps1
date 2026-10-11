param(
  [string]$Baseline = 'E:\VN OFice\file test\sample-3.pptx',
  [string]$AppFile = (Join-Path $env:VNO_CDP_LOCALAPPDATA 'fix-l8-home.pptx'),
  [string]$Output = 'docs/tickets-0710/evidence/fix-l8/home/powerpoint-readback.json'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Baseline)) { throw "Missing baseline: $Baseline" }
if (-not (Test-Path -LiteralPath $AppFile)) { throw "Missing app output: $AppFile" }
$outputPath = [IO.Path]::GetFullPath($Output)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outputPath)) | Out-Null
$existing = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | ForEach-Object { [int]$_.ProcessId })
$app = $null; $baselinePresentation = $null; $appPresentation = $null; $ownedPid = 0
function Read-Value([scriptblock]$Read) {
  try { return (& $Read) } catch { return $null }
}
function Read-Presentation($presentation) {
  $slide = $presentation.Slides.Item(1)
  $title = $slide.Shapes.Item(1)
  $text = $title.TextFrame2.TextRange
  $paragraph = $title.TextFrame.TextRange.ParagraphFormat
  [pscustomobject]@{
    slides = $presentation.Slides.Count
    shapes = $slide.Shapes.Count
    layout = $slide.Layout
    titleText = $title.TextFrame.TextRange.Text
    alignment = $paragraph.Alignment
    leftIndent = (Read-Value { $paragraph.LeftIndent })
    indentLevel = (Read-Value { $paragraph.IndentLevel })
    lineSpacingRule = (Read-Value { $paragraph.LineRuleWithin })
    lineSpacing = (Read-Value { $paragraph.SpaceWithin })
    textColorRgb = (Read-Value { $text.Font.Fill.ForeColor.RGB })
    highlightRgb = (Read-Value { $text.Font.Highlight.RGB })
    finalShapeText = (Read-Value { $slide.Shapes.Item($slide.Shapes.Count).TextFrame.TextRange.Text })
  }
}
try {
  $app = New-Object -ComObject PowerPoint.Application
  $new = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  if ($new.Count -ne 1) { throw "Expected exactly one new PowerPoint PID, found $($new -join ',')." }
  $ownedPid = [int]$new[0]
  "PowerPoint COM PID: $ownedPid"
  $app.DisplayAlerts = 1
  $baselinePresentation = $app.Presentations.Open($Baseline, $true, $false, $false)
  $baselineRead = Read-Presentation $baselinePresentation
  $baselinePresentation.Close(); $baselinePresentation = $null
  $appPresentation = $app.Presentations.Open($AppFile, $true, $false, $false)
  $appRead = Read-Presentation $appPresentation
  $report = [pscustomobject]@{ baseline = $Baseline; appFile = $AppFile; baselineReadback = $baselineRead; appReadback = $appRead }
  $json = $report | ConvertTo-Json -Depth 6
  [IO.File]::WriteAllText($outputPath, $json + "`n", [Text.UTF8Encoding]::new($false))
  $json
  "PowerPoint readback: $outputPath"
} finally {
  if ($appPresentation) { try { $appPresentation.Close() } catch {} }
  if ($baselinePresentation) { try { $baselinePresentation.Close() } catch {} }
  if ($app) { try { $app.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) }
  if ($ownedPid) {
    $process = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($process) { $process | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownedPid -Force }
  }
}
