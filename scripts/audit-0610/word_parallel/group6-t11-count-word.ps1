param([Parameter(Mandatory=$true)][string]$Dir,[Parameter(Mandatory=$true)][string]$InputDir)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
try {
  foreach ($name in @('d01.docx','d02.docx','d06.docx','d07.docx','d13.docx','d20.docx','d24.docx')) {
    $doc = $word.Documents.Open((Join-Path $InputDir $name), $false, $true)
    try {
      $contentText = [string]$doc.Content.Text
      $rows += [pscustomobject]@{
        name = $name
        words = [int]$doc.ComputeStatistics(0)
        pages = [int]$doc.ComputeStatistics(2)
        paragraphs = [int]$doc.ComputeStatistics(4)
        lines = [int]$doc.ComputeStatistics(1)
        charactersNoSpaces = [int]$doc.ComputeStatistics(3)
        charactersWithSpaces = [int]$doc.ComputeStatistics(5)
        contentTextLength = $contentText.Length
        contentWhitespace = [regex]::Matches($contentText, '\s').Count
        contentNonWhitespace = [regex]::Replace($contentText, '\s', '').Length
      }
    } finally { $doc.Close(0) }
  }
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group6_count_word.json'), ($rows | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
  $rows | Format-Table -AutoSize | Out-String | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
