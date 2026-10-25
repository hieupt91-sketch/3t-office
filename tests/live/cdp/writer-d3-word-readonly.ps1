param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$doc = $null
try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($Path, $false, $true)
  $paragraph = $doc.Paragraphs.Item(1)
  [pscustomobject]@{
    font = [string]$paragraph.Range.Font.Name
    fontSize = [double]$paragraph.Range.Font.Size
    lineSpacingRule = [int]$paragraph.Format.LineSpacingRule
    lineSpacing = [double]$paragraph.Format.LineSpacing
    pages = [int]$doc.ComputeStatistics(2)
  } | ConvertTo-Json -Compress
} finally {
  if ($doc) { $doc.Close(0) }
  $word.Quit()
}
