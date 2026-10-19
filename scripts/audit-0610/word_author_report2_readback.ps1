param([string]$Path = "E:\VNOffice-profiles\ui-shots\author-report2.docx")
$ErrorActionPreference = "Stop"
$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id)
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false; $w.DisplayAlerts = 0
  $d = $w.Documents.Open($Path, $false, $true)
  $o = [ordered]@{ pages = $d.ComputeStatistics(2); footnotes = $d.Footnotes.Count; comments = $d.Comments.Count; revisions = $d.Revisions.Count; tocs = $d.TablesOfContents.Count; fields = $d.Fields.Count; bookmarks = $d.Bookmarks.Count }
  if ($d.Footnotes.Count -gt 0) { $o.footnote1 = $d.Footnotes(1).Range.Text.Trim() }
  if ($d.Comments.Count -gt 0) { $c = $d.Comments(1); $o.comment1 = $c.Range.Text.Trim(); $o.commentScope = $c.Scope.Text.Trim(); $o.commentAuthor = $c.Author }
  $o.revs = @(); foreach ($r in $d.Revisions) { $o.revs += ("type={0} text={1}" -f $r.Type, $r.Range.Text.Trim()) }
  if ($d.TablesOfContents.Count -gt 0) { $o.tocText = $d.TablesOfContents(1).Range.Text.Replace([string][char]13, " / ").Trim() }
  $h = @(); $i = 0; foreach ($p in $d.Paragraphs) { $i++; if ($i -gt 14) { break }; $t = $p.Range.Text.Trim(); $h += ("{0}|{1}|{2}" -f $i, $p.Style.NameLocal, $t.Substring(0, [Math]::Min(40, $t.Length))) }; $o.paras = $h
  $d.Close(0)
  $o | ConvertTo-Json -Depth 4
} finally { $w.Quit(); Get-Process WINWORD -ErrorAction SilentlyContinue | ? { $before -notcontains $_.Id } | % { Stop-Process -Id $_.Id -Force } }