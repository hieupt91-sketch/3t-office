param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$doc = $null
try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($Path, $false, $true)
  [pscustomobject]@{
    wordsBody = [int]$doc.ComputeStatistics(0, $false)
    wordsWithNotes = [int]$doc.ComputeStatistics(0, $true)
    pages = [int]$doc.ComputeStatistics(2)
  } | ConvertTo-Json -Compress
} finally {
  if ($doc) { $doc.Close(0) }
  $word.Quit()
}
