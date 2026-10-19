param([string]$Path = "E:\VNOffice-profiles\ui-shots\author-report.docx")
$ErrorActionPreference = "Stop"
$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id)
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false; $w.DisplayAlerts = 0
  $d = $w.Documents.Open($Path, $false, $true)
  $out = [ordered]@{ pages = $d.ComputeStatistics(2); words = $d.ComputeStatistics(0); paragraphs = $d.Paragraphs.Count; tables = $d.Tables.Count }
  $paras = @()
  $i = 0
  foreach ($p in $d.Paragraphs) { $i++; if ($i -gt 40) { break }; $t = $p.Range.Text.Trim(); $paras += ("{0}|style={1}|align={2}|bold={3}|list={4}|size={5}|{6}" -f $i, $p.Style.NameLocal, $p.Alignment, $p.Range.Font.Bold, $p.Range.ListFormat.ListType, $p.Range.Font.Size, $t.Substring(0, [Math]::Min(45, $t.Length))) }
  $out.paras = $paras
  if ($d.Tables.Count -gt 0) { $tb = $d.Tables(1); $out.table = ("rows={0} cols={1} headerBold={2} r1={3}" -f $tb.Rows.Count, $tb.Columns.Count, $tb.Cell(1,1).Range.Font.Bold, (($tb.Rows(1).Cells | % { $_.Range.Text.Trim([char]13,[char]7) }) -join "|")); $out.table2 = (($tb.Rows(2).Cells | % { $_.Range.Text.Trim([char]13,[char]7) }) -join "|") }
  $sec = $d.Sections(1)
  $out.header = $sec.Headers(1).Range.Text.Trim()
  $out.footer = $sec.Footers(1).Range.Text.Trim()
  $out.footerFields = $sec.Footers(1).Range.Fields.Count
  $out.pageBreaks = ([regex]::Matches($d.Content.Text, [string][char]12)).Count
  $d.Close(0)
  $out | ConvertTo-Json -Depth 4
} finally { $w.Quit(); Get-Process WINWORD -ErrorAction SilentlyContinue | ? { $before -notcontains $_.Id } | % { Stop-Process -Id $_.Id -Force } }