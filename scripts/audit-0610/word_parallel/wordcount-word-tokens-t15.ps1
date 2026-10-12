param([Parameter(Mandatory=$true)][string]$Dir,[Parameter(Mandatory=$true)][string]$InputDir)
$ErrorActionPreference = 'Stop'
[void][System.IO.Directory]::CreateDirectory($Dir)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
try {
  foreach ($name in @('d02.docx','d07.docx','d13.docx','d20.docx')) {
    Write-Output ('Reading Word token ranges: ' + $name)
    $doc = $word.Documents.Open((Join-Path $InputDir $name), $false, $true)
    try {
      $tokens = @()
      $collection = $doc.Content.Words
      for ($index = 1; $index -le $collection.Count; $index++) {
        $range = $collection.Item($index)
        $value = [string]$range.Text
        if ($value -match '\S') {
          $tokens += [pscustomobject]@{
            index = $index
            text = $value
            hasLetterOrNumber = [bool]($value -match '[\p{L}\p{N}]')
            start = [int]$range.Start
            end = [int]$range.End
          }
        }
      }
      $rows += [pscustomobject]@{
        name = $name
        statisticsWords = [int]$doc.ComputeStatistics(0)
        wordsCollectionCount = [int]$collection.Count
        nonWhitespaceRangeCount = $tokens.Count
        letterOrNumberRangeCount = @($tokens | Where-Object hasLetterOrNumber).Count
        tokens = $tokens
      }
    } finally { $doc.Close(0) }
  }
  [System.IO.File]::WriteAllText((Join-Path $Dir 'word-com-tokens-t15.json'), (ConvertTo-Json -InputObject $rows -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
  $rows | Select-Object name,statisticsWords,wordsCollectionCount,nonWhitespaceRangeCount,letterOrNumberRangeCount | Format-Table -AutoSize | Out-String | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
