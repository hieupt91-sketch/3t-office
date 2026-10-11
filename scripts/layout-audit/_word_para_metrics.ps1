param([string]$File, [string]$Out)
# Word 2016 ground truth for EVERY body paragraph: index, page, y(pt) of first line, height(pt) (next paragraph's y - y
# when same page, else line count * line height), line count, spacing before/after, line rule/value, font name/size of
# the first run, in-table flag, first 40 chars. JSON lines.
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($File, $false, $true, $false)
  $doc.Repaginate()
  $rows = New-Object System.Collections.Generic.List[object]
  $i = 0
  foreach ($p in $doc.Paragraphs) {
    $i++
    $r = $p.Range
    $page = $r.Information(3)
    $y = [math]::Round($r.Information(6), 2)
    $lines = $r.ComputeStatistics(1)   # wdStatisticLines
    $txt = ($r.Text -replace "[`r`n`a`t]+", " ").Trim()
    if ($txt.Length -gt 40) { $txt = $txt.Substring(0, 40) }
    $rows.Add([pscustomobject]@{ i = $i; page = $page; y = $y; lines = $lines; sb = [math]::Round($p.SpaceBefore, 2); sa = [math]::Round($p.SpaceAfter, 2);
      lsRule = $p.LineSpacingRule; ls = [math]::Round($p.LineSpacing, 2); font = $r.Font.Name; fontOther = $r.Font.NameOther; fontAscii = $r.Font.NameAscii; size = $r.Font.Size;
      tbl = [bool]$r.Information(12); align = $p.Alignment; style = $p.Style.NameLocal; nsb = [bool]$p.NoSpaceBetweenParagraphsOfSameStyle; text = $txt; zone = "body" })
  }
  try {
    $sec1 = $doc.Sections(1)
    if ($sec1 -and $sec1.Headers(1).Exists) {
      foreach ($p in $sec1.Headers(1).Range.Paragraphs) {
        $i++
        $r = $p.Range
        $page = $r.Information(3)
        $y = [math]::Round($r.Information(6), 2)
        $lines = $r.ComputeStatistics(1)
        $txt = ($r.Text -replace "[`r`n`a`t]+", " ").Trim()
        if ($txt.Length -gt 40) { $txt = $txt.Substring(0, 40) }
        $rows.Add([pscustomobject]@{ i = $i; page = $page; y = $y; lines = $lines; sb = [math]::Round($p.SpaceBefore, 2); sa = [math]::Round($p.SpaceAfter, 2);
          lsRule = $p.LineSpacingRule; ls = [math]::Round($p.LineSpacing, 2); font = $r.Font.Name; fontOther = $r.Font.NameOther; fontAscii = $r.Font.NameAscii; size = $r.Font.Size;
          tbl = [bool]$r.Information(12); align = $p.Alignment; style = $p.Style.NameLocal; nsb = [bool]$p.NoSpaceBetweenParagraphsOfSameStyle; text = $txt; zone = "header" })
      }
    }
    if ($sec1 -and $sec1.Footers(1).Exists) {
      foreach ($p in $sec1.Footers(1).Range.Paragraphs) {
        $i++
        $r = $p.Range
        $page = $r.Information(3)
        $y = [math]::Round($r.Information(6), 2)
        $lines = $r.ComputeStatistics(1)
        $txt = ($r.Text -replace "[`r`n`a`t]+", " ").Trim()
        if ($txt.Length -gt 40) { $txt = $txt.Substring(0, 40) }
        $rows.Add([pscustomobject]@{ i = $i; page = $page; y = $y; lines = $lines; sb = [math]::Round($p.SpaceBefore, 2); sa = [math]::Round($p.SpaceAfter, 2);
          lsRule = $p.LineSpacingRule; ls = [math]::Round($p.LineSpacing, 2); font = $r.Font.Name; fontOther = $r.Font.NameOther; fontAscii = $r.Font.NameAscii; size = $r.Font.Size;
          tbl = [bool]$r.Information(12); align = $p.Alignment; style = $p.Style.NameLocal; nsb = [bool]$p.NoSpaceBetweenParagraphsOfSameStyle; text = $txt; zone = "footer" })
      }
    }
  } catch {}
  $pages = $doc.ComputeStatistics(2)
  $sb = New-Object System.Text.StringBuilder
  foreach ($row in $rows) { [void]$sb.AppendLine(($row | ConvertTo-Json -Compress)) }
  [System.IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  "OK paragraphs=" + $rows.Count
  $doc.Close(0)
} catch { "FAIL " + $_.Exception.Message } finally { $word.Quit() }
