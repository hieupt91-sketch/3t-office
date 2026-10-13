param([string]$Dir = $env:VNO_CDP_LOCALAPPDATA)
$ErrorActionPreference = 'Stop'
if (-not $Dir) { throw 'Set VNO_CDP_LOCALAPPDATA or pass -Dir.' }
$before = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | ForEach-Object { [int]$_.ProcessId })
$pp = $null; $ownPid = 0
$names = @('italic','underline','strike','clearFormat','colorDefault','colorHighlight','alignLeft','alignRight','alignJustify','bullet','numbered','indentDec','indentInc','lineSpacing')
$results = @()
try {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try { $pp = New-Object -ComObject PowerPoint.Application; break }
    catch { if ($attempt -eq 30) { throw }; Start-Sleep -Milliseconds 300 }
  }
  $new = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | Where-Object { [int]$_.ProcessId -notin $before } | ForEach-Object { [int]$_.ProcessId })
  if ($new.Count -ne 1) { throw "Expected one new PowerPoint PID, found $($new -join ',')." }
  $ownPid = [int]$new[0]
  "PowerPoint COM PID: $ownPid"
  foreach ($name in $names) {
    $file = Join-Path $Dir "fix-l7-$name.pptx"
    if (-not (Test-Path -LiteralPath $file)) { throw "Missing app output: $file" }
    $pres = $pp.Presentations.Open($file, $true, $false, $false)
    try {
      $slide = $pres.Slides.Item(1)
      $textBox = $null
      for ($i = 1; $i -le $slide.Shapes.Count; $i++) {
        $candidate = $slide.Shapes.Item($i)
        if ($candidate.TextFrame.HasText -and $candidate.TextFrame.TextRange.Text -like '*FIX-L4 audit sample text*') { $textBox = $candidate; break }
      }
      if (-not $textBox) { throw "Text fixture missing in $name" }
      $range = $textBox.TextFrame.TextRange
      $firstRun = $range.Runs(1)
      $read = {
        param($label, $action)
        try { [pscustomobject]@{ property=$label; value=& $action; status='READ' } }
        catch { [pscustomobject]@{ property=$label; value=$_.Exception.Message; status='UNREADABLE' } }
      }
      $props = @(
        (& $read 'Text' { $range.Text }),
        (& $read 'Font.Name' { $range.Font.Name }),
        (& $read 'Font.Size' { $range.Font.Size }),
        (& $read 'Font.Bold' { $range.Font.Bold }),
        (& $read 'Font.Italic' { $range.Font.Italic }),
        (& $read 'Font.Underline' { $range.Font.Underline }),
        (& $read 'Font.StrikeThrough' { $range.Font.StrikeThrough }),
        (& $read 'TextRange2.Font.Strike' { $textBox.TextFrame2.TextRange.Font.Strike }),
        (& $read 'TextRange2.Font.Highlight' { $textBox.TextFrame2.TextRange.Font.Highlight }),
        (& $read 'Font.Color.RGB' { $firstRun.Font.Color.RGB }),
        (& $read 'TextRange2.Font.Fill.ForeColor.RGB' { $textBox.TextFrame2.TextRange.Font.Fill.ForeColor.RGB }),
        (& $read 'TextRange2.Font.Fill.BackColor.RGB' { $textBox.TextFrame2.TextRange.Font.Fill.BackColor.RGB }),
        (& $read 'Paragraph.Alignment' { $range.ParagraphFormat.Alignment }),
        (& $read 'Paragraph.Bullet.Visible' { $range.ParagraphFormat.Bullet.Visible }),
        (& $read 'Paragraph.Bullet.Type' { $range.ParagraphFormat.Bullet.Type }),
        (& $read 'Paragraph.SpaceWithin' { $range.ParagraphFormat.SpaceWithin }),
        (& $read 'Paragraph.LineRuleWithin' { $range.ParagraphFormat.LineRuleWithin }),
        (& $read 'Paragraph.LeftIndent' { $textBox.TextFrame2.TextRange.ParagraphFormat.LeftIndent }),
        (& $read 'Paragraph.FirstLineIndent' { $textBox.TextFrame2.TextRange.ParagraphFormat.FirstLineIndent }),
        (& $read 'Paragraph.IndentLevel' { $textBox.TextFrame2.TextRange.ParagraphFormat.IndentLevel })
      )
      $results += [pscustomobject]@{ operation=$name; file=$file; properties=$props }
      $props | Where-Object { $_.property -in @('Font.Italic','Font.Underline','Font.StrikeThrough','TextRange2.Font.Strike','TextRange2.Font.Highlight','Font.Color.RGB','TextRange2.Font.Fill.ForeColor.RGB','TextRange2.Font.Fill.BackColor.RGB','Paragraph.Alignment','Paragraph.Bullet.Visible','Paragraph.Bullet.Type','Paragraph.SpaceWithin','Paragraph.LeftIndent','Paragraph.FirstLineIndent','Paragraph.IndentLevel') } | ForEach-Object { "${name} | $($_.property)=$($_.value) [$($_.status)]" }
    } finally { $pres.Close() }
  }
  $jsonPath = Join-Path $Dir 'fix-l7-text-readback.json'
  $json = ConvertTo-Json -InputObject $results -Depth 6
  [IO.File]::WriteAllText($jsonPath, $json, [Text.UTF8Encoding]::new($false))
  "PowerPoint readback: $jsonPath"
} finally {
  if ($pp) { try { $pp.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($pp) }
  if ($ownPid) {
    $proc = Get-Process -Id $ownPid -ErrorAction SilentlyContinue
    if ($proc) { $proc | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownPid -Force -ErrorAction SilentlyContinue }
  }
}
