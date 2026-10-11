param([string]$Dir = $env:VNO_CDP_LOCALAPPDATA, [string]$AppFile = '')
$ErrorActionPreference = 'Stop'
if (-not $Dir) { throw 'Set VNO_CDP_LOCALAPPDATA or pass -Dir.' }
$appFile = if ($AppFile) { $AppFile } else { Join-Path $Dir 'app-result.pptx' }
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
  if (-not $text) { $text = $slide.Shapes | Where-Object { $_.TextFrame.HasText } | Select-Object -First 1 }
  $read = {
    param($Label, $Action)
    try { [pscustomobject]@{ property=$Label; value=& $Action; status='READ' } }
    catch { [pscustomobject]@{ property=$Label; value=$_.Exception.Message; status='UNREADABLE' } }
  }
  $rows = @(
    (& $read 'Slide.Count' { $pres.Slides.Count }),
    (& $read 'Shape.Count' { $slide.Shapes.Count }),
    (& $read 'Slide.Layout' { $slide.Layout }),
    (& $read 'Slide.Design.Name' { $slide.Design.Name }),
    (& $read 'Slide.Master.Name' { $slide.Master.Name }),
    (& $read 'Slide.Master.Theme' { $slide.Master.Theme.Name }),
    (& $read 'Slide.Hidden' { $slide.SlideShowTransition.Hidden }),
    (& $read 'Slide.Transition' { $slide.SlideShowTransition.EntryEffect }),
    (& $read 'Slide.TransitionDuration' { $slide.SlideShowTransition.Duration }),
    (& $read 'Slide.Notes' { $slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text })
  )
  if ($text) {
    $rows += (& $read 'Text' { $text.TextFrame.TextRange.Text })
    $rows += (& $read 'Font.Name' { $text.TextFrame.TextRange.Font.Name })
    $rows += (& $read 'Font.Size' { $text.TextFrame.TextRange.Font.Size })
    $rows += (& $read 'Font.Bold' { $text.TextFrame.TextRange.Font.Bold })
    $rows += (& $read 'Font.Italic' { $text.TextFrame.TextRange.Font.Italic })
    $rows += (& $read 'Font.Underline' { $text.TextFrame.TextRange.Font.Underline })
    $rows += (& $read 'Paragraph.Alignment' { $text.TextFrame.TextRange.ParagraphFormat.Alignment })
    $rows += (& $read 'Text.HasText' { $text.TextFrame.HasText })
  }
  for ($shapeIndex = 1; $shapeIndex -le $slide.Shapes.Count; $shapeIndex++) {
    $item = $slide.Shapes.Item($shapeIndex)
    $rows += (& $read "Shape$shapeIndex.Name" { $item.Name })
    $rows += (& $read "Shape$shapeIndex.Type" { $item.Type })
    $rows += (& $read "Shape$shapeIndex.Width" { $item.Width })
    $rows += (& $read "Shape$shapeIndex.Height" { $item.Height })
    $rows += (& $read "Shape$shapeIndex.Rotation" { $item.Rotation })
    if ($item.Type -eq 3) { $rows += (& $read "Shape$shapeIndex.ChartType" { $item.Chart.ChartType }) }
    if ($item.Type -eq 19) { $rows += (& $read "Shape$shapeIndex.Table" { "$($item.Table.Rows.Count)x$($item.Table.Columns.Count)" }) }
  }
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
  $sequence = $slide.TimeLine.MainSequence
  $rows += (& $read 'Slide.Animation.EffectCount' { $sequence.Count })
  for ($effectIndex = 1; $effectIndex -le $sequence.Count; $effectIndex++) {
    $effect = $sequence.Item($effectIndex)
    $rows += (& $read "Slide.Animation.Effect$effectIndex.Shape" { $effect.Shape.Name })
    $rows += (& $read "Slide.Animation.Effect$effectIndex.Duration" { $effect.Timing.Duration })
    $rows += (& $read "Slide.Animation.Effect$effectIndex.Type" { $effect.EffectType })
    $rows += (& $read "Slide.Animation.Effect$effectIndex.Trigger" { $effect.Timing.TriggerType })
    $rows += (& $read "Slide.Animation.Effect$effectIndex.TriggerDelay" { $effect.Timing.TriggerDelayTime })
  }
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
