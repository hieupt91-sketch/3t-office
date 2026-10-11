param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group6_app.json') | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $d = $word.Documents.Open($app.docx, $false, $true)
  try {
    $wordStats = [ordered]@{
      Words = [int]$d.ComputeStatistics(0)
      Pages = [int]$d.ComputeStatistics(2)
      Paragraphs = [int]$d.ComputeStatistics(4)
      Lines = [int]$d.ComputeStatistics(1)
      Characters = [int]$d.ComputeStatistics(3)
      CharactersWithSpaces = [int]$d.ComputeStatistics(5)
    }
    $appStats = $app.count
    $report = [ordered]@{ App=$appStats; Word=$wordStats; DeltaCharactersWithSpaces=($appStats.charactersWithSpaces-$wordStats.CharactersWithSpaces); DeltaCharacters=($appStats.charactersNoSpaces-$wordStats.Characters); Text=(($d.Content.Text -replace '[\r\a]',' ').Trim()) }
    $report | ConvertTo-Json -Depth 6 | Write-Output
    [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group6_compare.json'), ($report | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
  } finally { $d.Close(0) }
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
