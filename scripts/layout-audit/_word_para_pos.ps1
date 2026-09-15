param([string]$File, [string]$Out, [int]$From = 1, [int]$To = 60)
# Word 2016 ground truth: paragraph index, page, vertical position of the first line relative to the page (pt),
# space before/after (pt), line spacing rule/value, in-table flag and first 40 chars.
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($File, $false, $true, $false)
  $doc.Repaginate()
  $lines = @()
  $i = 0
  foreach ($p in $doc.Paragraphs) {
    $i++
    if ($i -lt $From) { continue }
    if ($i -gt $To) { break }
    $r = $p.Range
    $page = $r.Information(3)
    $y = [math]::Round($r.Information(6), 1)   # wdVerticalPositionRelativeToPage
    $inTbl = $r.Information(12)               # wdWithInTable
    $txt = ($r.Text -replace "[`r`n`a`t]+", " ").Trim()
    if ($txt.Length -gt 40) { $txt = $txt.Substring(0, 40) }
    $lines += ("{0,4} p{1,3} y={2,7} sb={3,6} sa={4,6} ls={5}/{6} tbl={7} {8}" -f $i, $page, $y, $p.SpaceBefore, $p.SpaceAfter, $p.LineSpacingRule, [math]::Round($p.LineSpacing,1), $inTbl, $txt)
  }
  [System.IO.File]::WriteAllLines($Out, $lines, (New-Object System.Text.UTF8Encoding($false)))
  "OK " + $lines.Count + " lines"
  $doc.Close(0)
} catch { "FAIL " + $_.Exception.Message } finally { $word.Quit() }
