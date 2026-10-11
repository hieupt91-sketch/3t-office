param([string]$Dir = $env:VNO_CDP_LOCALAPPDATA)
$ErrorActionPreference = 'Stop'
if (-not $Dir) { throw 'Set VNO_CDP_LOCALAPPDATA or pass -Dir.' }
$appFile = Join-Path $Dir 'app-result.pptx'
$jsonFile = Join-Path $Dir 'powerpoint-result.json'
if (-not (Test-Path $appFile)) { throw "Missing $appFile. app-ops must save the app result before PowerPoint comparison." }
$existing = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | ForEach-Object { [int]$_.ProcessId })
$pp = $null; $pres = $null; $ownPid = 0
try {
  $pp = New-Object -ComObject PowerPoint.Application
  $new = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  if ($new.Count -ne 1) { throw "Expected one new PowerPoint PID, found $($new -join ',')." }
  $ownPid = [int]$new[0]
  "PowerPoint COM PID: $ownPid"
  try { $pp.DisplayAlerts = 1 } catch {}
  $pres = $pp.Presentations.Open($appFile, $true, $false, $false)
  $slide = $pres.Slides.Item(1)
  $text = $null; $shape = $null
  for ($index = 1; $index -le $slide.Shapes.Count; $index++) {
    $candidate = $slide.Shapes.Item($index)
    if ($candidate.TextFrame.HasText -and $candidate.TextFrame.TextRange.Text -like '*FIX-L4 font audit*') { $text = $candidate }
    elseif (-not $shape -and -not $candidate.TextFrame.HasText) { $shape = $candidate }
  }
  if (-not $text) { throw 'PowerPoint could not find the FIX-L4 font audit textbox.' }
  $read = {
    param($Label, $Action)
    try { [pscustomobject]@{ property=$Label; value=& $Action; status='READ' } }
    catch { [pscustomobject]@{ property=$Label; value=$_.Exception.Message; status='UNREADABLE' } }
  }
  $rows = @(
    (& $read 'Slide.Count' { $pres.Slides.Count }),
    (& $read 'Text' { $text.TextFrame.TextRange.Text }),
    (& $read 'Font.Name' { $text.TextFrame.TextRange.Font.Name }),
    (& $read 'Font.Size' { $text.TextFrame.TextRange.Font.Size }),
    (& $read 'Font.Bold' { $text.TextFrame.TextRange.Font.Bold }),
    (& $read 'Font.Italic' { $text.TextFrame.TextRange.Font.Italic }),
    (& $read 'Font.Underline' { $text.TextFrame.TextRange.Font.Underline }),
    (& $read 'Paragraph.Alignment' { $text.TextFrame.TextRange.ParagraphFormat.Alignment }),
    (& $read 'Text.HasText' { $text.TextFrame.HasText }),
    (& $read 'Shape.Count' { $slide.Shapes.Count })
  )
  if ($shape) {
    $rows += (& $read 'Shape.Left' { $shape.Left })
    $rows += (& $read 'Shape.Top' { $shape.Top })
    $rows += (& $read 'Shape.Width' { $shape.Width })
    $rows += (& $read 'Shape.Height' { $shape.Height })
    $rows += (& $read 'Shape.Rotation' { $shape.Rotation })
    $rows += (& $read 'Shape.Fill.RGB' { $shape.Fill.ForeColor.RGB })
    $rows += (& $read 'Shape.Line.RGB' { $shape.Line.ForeColor.RGB })
    $rows += (& $read 'Shape.ZOrderPosition' { $shape.ZOrderPosition })
  }
  $rows += (& $read 'Slide.Hidden' { $slide.SlideShowTransition.Hidden })
  $rows += (& $read 'Slide.Transition' { $slide.SlideShowTransition.EntryEffect })
  $rows += (& $read 'Slide.TransitionDuration' { $slide.SlideShowTransition.Duration })
  $rows += (& $read 'Slide.Notes' { $slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text })
  $report = [pscustomobject]@{ source=$appFile; slideCount=$pres.Slides.Count; shapeCount=$slide.Shapes.Count; rows=$rows }
  $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $jsonFile -Encoding UTF8
  $rows | Format-Table -AutoSize -Wrap | Out-String -Width 220
  "PowerPoint readback: $jsonFile"
} finally {
  if ($pres) { try { $pres.Close() } catch {} }
  if ($pp) { try { $pp.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($pp) }
  if ($ownPid) {
    $proc = Get-Process -Id $ownPid -ErrorAction SilentlyContinue
    if ($proc) { $proc | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownPid -Force -ErrorAction SilentlyContinue }
  }
}
