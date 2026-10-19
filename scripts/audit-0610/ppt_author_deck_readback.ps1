param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = "Stop"
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  $o = [ordered]@{ slides = $p.Slides.Count }
  $s = @()
  foreach ($sl in $p.Slides) {
    $r = [ordered]@{ index = $sl.SlideIndex; transition = $sl.SlideShowTransition.EntryEffect; duration = $sl.SlideShowTransition.Duration; shapes = @() }
    foreach ($sh in $sl.Shapes) {
      $e = [ordered]@{ name = $sh.Name; type = $sh.Type; left = [Math]::Round($sh.Left); top = [Math]::Round($sh.Top); w = [Math]::Round($sh.Width); h = [Math]::Round($sh.Height) }
      if ($sh.Type -eq 1) { $e.autoShape = $sh.AutoShapeType }
      if ($sh.HasTextFrame) { $tr = $sh.TextFrame.TextRange; $e.text = $tr.Text.Replace([string][char]13, " / "); $e.paras = @(); foreach ($pp in $tr.Paragraphs()) { $e.paras += ("bullet={0} size={1} bold={2}" -f $pp.ParagraphFormat.Bullet.Visible, $pp.Font.Size, $pp.Font.Bold) } }
      $r.shapes += $e
    }
    $r.notes = ($sl.NotesPage.Shapes | ? { $_.Type -eq 14 -and $_.PlaceholderFormat.Type -eq 2 } | % { $_.TextFrame.TextRange.Text }) -join ""
    $s += $r
  }
  $o.deck = $s
  $p.Close()
  $o | ConvertTo-Json -Depth 6
} finally { $app.Quit(); Get-Process POWERPNT -ErrorAction SilentlyContinue | ? { $before -notcontains $_.Id } | % { Stop-Process -Id $_.Id -Force } }