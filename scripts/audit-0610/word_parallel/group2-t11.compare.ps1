param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$appResults = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group2_app.json') | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
function Read-AppDocument($path) {
  $d = $word.Documents.Open($path, $false, $true)
  try {
    $tableRows = 0; $tableColumns = 0
    if ($d.Tables.Count) { $tableRows = $d.Tables.Item(1).Rows.Count; $tableColumns = $d.Tables.Item(1).Columns.Count }
    $bookmarkNames = @(); foreach ($b in $d.Bookmarks) { $bookmarkNames += $b.Name }
    $dropPosition = 0; $dropLines = 0
    try { $dropPosition = [int]$d.Paragraphs.Item(1).DropCap.Position; $dropLines = [int]$d.Paragraphs.Item(1).DropCap.LinesToDrop } catch {}
    $mathText = @(); foreach ($m in $d.OMaths) { $mathText += (($m.Range.Text -replace '[\r\a]','').Trim()) }
    $hyperlinks = @(); foreach ($h in $d.Hyperlinks) { $hyperlinks += [ordered]@{ Text=(($h.Range.Text -replace '[\r\a]','').Trim()); Address=[string]$h.Address } }
    $dates = @(); foreach ($p in $d.Paragraphs) { if ($p.Range.Text -match '\d{4}-\d{2}-\d{2}') { $dates += (($p.Range.Text -replace '[\r\a]','').Trim()) } }
    return [ordered]@{
      Pages = [int]$d.ComputeStatistics(2)
      Tables = [int]$d.Tables.Count
      TableRows = $tableRows
      TableColumns = $tableColumns
      Hyperlinks = $hyperlinks
      Bookmarks = $bookmarkNames
      DropCapPosition = $dropPosition
      DropCapLines = $dropLines
      Dates = $dates
      OMaths = [int]$d.OMaths.Count
      MathText = $mathText
      InlineShapes = [int]$d.InlineShapes.Count
      Shapes = [int]$d.Shapes.Count
      Text = (($d.Content.Text -replace '[\r\a]',' ').Trim())
    }
  } finally { $d.Close(0) }
}
try {
  foreach ($item in $appResults) {
    $state = Read-AppDocument $item.file
    $rows += [pscustomobject]@{ Operation=$item.name; AppWord=$state }
    Write-Output ("{0}: {1}" -f $item.name, ($state | ConvertTo-Json -Compress -Depth 6))
  }
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group2_compare.json'), ($rows | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
} finally {
  if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
