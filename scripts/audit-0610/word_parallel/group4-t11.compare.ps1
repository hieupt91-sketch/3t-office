param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$data = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group4_app.json') | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($data.output, $false, $true)
  try {
    $text = (($doc.Content.Text -replace '[\r\a]',' ').Trim())
    $plain = $text.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
    $citations = @($data.state.citations)
    $checks = [ordered]@{
      Style = $data.state.style
      SourceCount = $data.state.sources.Count
      AppCitations = $citations
      WordContainsCitation = $plain.Contains('(Nguyen)')
      WordContainsWorksCited = $text.Contains('Works Cited')
      WordContainsSourceTitle = $plain.Contains('Nghien cuu T11')
      WordContainsPublisher = $plain.Contains('Nha xuat ban Mau')
      WordContainsYear = $text.Contains('2024')
      WordText = $text
      Pages = [int]$doc.ComputeStatistics(2)
    }
    $checks | ConvertTo-Json -Depth 6 | Write-Output
    [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group4_compare.json'), ($checks | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
    if (-not $checks.WordContainsCitation -or -not $checks.WordContainsWorksCited -or -not $checks.WordContainsSourceTitle -or -not $checks.WordContainsPublisher -or -not $checks.WordContainsYear) { throw 'Word COM content check failed.' }
  } finally { $doc.Close(0) }
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
