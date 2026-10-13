param([string]$Dir = $env:VNO_CDP_LOCALAPPDATA)
$ErrorActionPreference = 'Stop'
if (-not $Dir) { throw 'Set VNO_CDP_LOCALAPPDATA or pass -Dir.' }
$file = Join-Path $Dir 'saved.pptx'
if (-not (Test-Path -LiteralPath $file)) { throw "Missing CDP output: $file" }
$before = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | ForEach-Object { [int]$_.ProcessId })
$pp = $null; $pres = $null; $ownPid = 0
try {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try { $pp = New-Object -ComObject PowerPoint.Application; break }
    catch { if ($attempt -eq 30) { throw }; Start-Sleep -Milliseconds 300 }
  }
  $new = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | Where-Object { [int]$_.ProcessId -notin $before } | ForEach-Object { [int]$_.ProcessId })
  if ($new.Count -ne 1) { throw "Expected one new PowerPoint PID, found $($new -join ',')." }
  $ownPid = [int]$new[0]
  "PowerPoint COM PID: $ownPid"
  $pres = $pp.Presentations.Open($file, $true, $false, $false)
  $slides = @()
  for ($slideIndex = 1; $slideIndex -le $pres.Slides.Count; $slideIndex++) {
    $slide = $pres.Slides.Item($slideIndex)
    $shapes = @()
    for ($shapeIndex = 1; $shapeIndex -le $slide.Shapes.Count; $shapeIndex++) {
      $shape = $slide.Shapes.Item($shapeIndex)
      $text = ''
      try { if ($shape.TextFrame.HasText) { $text = [string]$shape.TextFrame.TextRange.Text } } catch {}
      $shapes += [pscustomobject]@{ name=$shape.Name; type=[int]$shape.Type; text=$text }
    }
    $slides += [pscustomobject]@{
      index=$slideIndex; shapeCount=$slide.Shapes.Count; shapes=$shapes
      transition=[int]$slide.SlideShowTransition.EntryEffect
      transitionDuration=[double]$slide.SlideShowTransition.Duration
    }
  }
  $textFound = @($slides | ForEach-Object { $_.shapes } | Where-Object { $_.text -like '*Hop kiem thu Claude*' }).Count -gt 0
  $result = [pscustomobject]@{
    file=$file; slideCount=$pres.Slides.Count; slides=$slides
    insertedTextFound=$textFound
    duplicateAndInsertPass=($pres.Slides.Count -eq 11 -and $textFound -and $slides[1].shapeCount -ge 7 -and $slides[1].transition -ne 0)
  }
  $jsonPath = Join-Path $Dir 'fix-l7-roundtrip-readback.json'
  [IO.File]::WriteAllText($jsonPath, (ConvertTo-Json -InputObject $result -Depth 8), [Text.UTF8Encoding]::new($false))
  "SlideCount=$($result.slideCount) InsertedText=$($result.insertedTextFound) Transition2=$($slides[1].transition)/$($slides[1].transitionDuration)"
  "PowerPoint readback: $jsonPath"
  if (-not $result.duplicateAndInsertPass) { throw 'PowerPoint COM did not confirm slide duplicate, added content, and transition.' }
} finally {
  if ($pres) { try { $pres.Close() } catch {} }
  if ($pp) { try { $pp.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($pp) }
  if ($ownPid) {
    $proc = Get-Process -Id $ownPid -ErrorAction SilentlyContinue
    if ($proc) { $proc | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownPid -Force -ErrorAction SilentlyContinue }
  }
}
