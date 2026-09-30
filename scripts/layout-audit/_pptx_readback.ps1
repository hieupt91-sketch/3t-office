param([string]$ListFile, [string]$Out)
# PowerPoint 2016 COM oracle for VN Slides audits (G8).
# Reads every .pptx/.ppt path listed (one per line, UTF-8) in $ListFile, opens it read-only
# without a window and writes a JSON array to $Out: slide count, slide size, and per slide
# layout, shapes (type/text/geometry/rotation/z-order/font/bullets/alignment), notes text,
# transition and background. Only the POWERPNT process started here is quit/killed.
$ErrorActionPreference = "Stop"
$files = [System.IO.File]::ReadAllLines($ListFile, [System.Text.Encoding]::UTF8) | Where-Object { $_.Trim() }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$pp = New-Object -ComObject PowerPoint.Application
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | ForEach-Object { $_.Id })
try { $pp.DisplayAlerts = 1 } catch {}

function ColorHex($rgb) {
  $r = $rgb -band 0xFF; $g = ($rgb -shr 8) -band 0xFF; $b = ($rgb -shr 16) -band 0xFF
  return ("#{0:X2}{1:X2}{2:X2}" -f $r, $g, $b)
}

function ShapeInfo($s) {
  $o = [ordered]@{
    name = $s.Name; type = [int]$s.Type; autoShapeType = $null
    left = [math]::Round($s.Left, 1); top = [math]::Round($s.Top, 1)
    width = [math]::Round($s.Width, 1); height = [math]::Round($s.Height, 1)
    rotation = [math]::Round($s.Rotation, 1); z = [int]$s.ZOrderPosition
    placeholder = $null; text = $null; font = $null; size = $null; color = $null; bold = $null
    italic = $null; underline = $null; align = $null; bullet = $null; paragraphs = $null; table = $null; fill = $null
  }
  try { if ($s.Type -eq 1) { $o.autoShapeType = [int]$s.AutoShapeType } } catch {}
  try { if ($s.Type -eq 14) { $o.placeholder = [int]$s.PlaceholderFormat.Type } } catch {}
  try { if ($s.Fill.Visible -and $s.Fill.Type -eq 1) { $o.fill = ColorHex $s.Fill.ForeColor.RGB } } catch {}
  try {
    if ($s.HasTable) {
      $t = $s.Table; $cells = @()
      for ($r = 1; $r -le $t.Rows.Count; $r++) { for ($c = 1; $c -le $t.Columns.Count; $c++) { $cells += $t.Cell($r, $c).Shape.TextFrame.TextRange.Text } }
      $o.table = [ordered]@{ rows = $t.Rows.Count; cols = $t.Columns.Count; cells = $cells }
    }
  } catch {}
  try {
    if ($s.HasTextFrame -and $s.TextFrame.HasText) {
      $tr = $s.TextFrame.TextRange
      $o.text = $tr.Text
      $f = $tr.Runs(1).Font
      $o.font = $f.Name; $o.size = $f.Size; $o.color = ColorHex $f.Color.RGB
      $o.bold = [int]$f.Bold; $o.italic = [int]$f.Italic; $o.underline = [int]$f.Underline
      $paras = @()
      for ($i = 1; $i -le $tr.Paragraphs().Count; $i++) {
        $p = $tr.Paragraphs($i)
        $pf = $p.ParagraphFormat
        $bt = 0; try { if ($pf.Bullet.Visible) { $bt = [int]$pf.Bullet.Type } } catch {}
        $paras += [ordered]@{ text = ($p.Text -replace "`r", ""); align = [int]$pf.Alignment; bullet = $bt }
      }
      $o.paragraphs = $paras
      $o.align = $paras[0].align; $o.bullet = $paras[0].bullet
    }
  } catch {}
  return $o
}

$results = @()
foreach ($f in $files) {
  $res = [ordered]@{ file = $f; ok = $false; error = $null }
  try {
    # Open(FileName, ReadOnly, Untitled, WithWindow)
    $pres = $pp.Presentations.Open($f, -1, 0, 0)
    $res.slideWidth = [math]::Round($pres.PageSetup.SlideWidth, 1)
    $res.slideHeight = [math]::Round($pres.PageSetup.SlideHeight, 1)
    $res.slideCount = $pres.Slides.Count
    $slides = @()
    foreach ($sl in $pres.Slides) {
      $si = [ordered]@{ index = $sl.SlideIndex; layout = [int]$sl.Layout; shapes = @(); notes = ""; transition = 0; bg = $null; followMasterBg = $null }
      foreach ($s in $sl.Shapes) { $si.shapes += (ShapeInfo $s) }
      try { $si.transition = [int]$sl.SlideShowTransition.EntryEffect } catch {}
      try { $si.followMasterBg = [int]$sl.FollowMasterBackground; $si.bg = ColorHex $sl.Background.Fill.ForeColor.RGB } catch {}
      try {
        foreach ($ns in $sl.NotesPage.Shapes) {
          if ($ns.Type -eq 14 -and $ns.PlaceholderFormat.Type -eq 2 -and $ns.HasTextFrame) { $si.notes = ($ns.TextFrame.TextRange.Text -replace "`r", "`n") }
        }
      } catch {}
      $slides += $si
    }
    $res.slides = $slides
    $pres.Close()
    $res.ok = $true
  } catch { $res.error = ($_.Exception.Message -replace "`r|`n", " ") }
  $results += $res
}
try { $pp.Quit() } catch {}
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null
Start-Sleep -Milliseconds 800
foreach ($id in $mine) { Get-Process -Id $id -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue }
$json = ConvertTo-Json -InputObject @($results) -Depth 8
[System.IO.File]::WriteAllText($Out, $json, (New-Object System.Text.UTF8Encoding($false)))
"DONE " + $results.Count
