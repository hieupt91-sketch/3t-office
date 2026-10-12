param([Parameter(Mandatory=$true)][string]$Dir,[Parameter(Mandatory=$true)][string]$InputDir)
$ErrorActionPreference = 'Stop'
[void][System.IO.Directory]::CreateDirectory($Dir)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
try {
  foreach ($name in @('d02.docx','d07.docx','d13.docx','d20.docx')) {
    Write-Output ('Opening ' + $name)
    $doc = $word.Documents.Open((Join-Path $InputDir $name), $false, $true)
    try {
      $storyParagraphs = $doc.Content.Paragraphs
      $paragraphCount = [int]$storyParagraphs.Count
      Write-Output ('Comparing ' + $paragraphCount + ' paragraphs in ' + $name)
      for ($index = 1; $index -le $paragraphCount; $index++) {
        $paragraph = $storyParagraphs.Item($index)
        $raw = [string]$paragraph.Range.Text
        $text = $raw -replace '[\r\a]', ''
        $trimmed = $text.Trim()
        $whitespaceTokens = if ($trimmed) { ([regex]::Split($trimmed, '\s+') | Where-Object { $_.Length -gt 0 }).Count } else { 0 }
        $wordTokens = [int]$paragraph.Range.ComputeStatistics(0)
        if ($wordTokens -ne $whitespaceTokens) {
          $rows += [pscustomobject]@{
            file = $name
            paragraph = $index
            wordTokens = $wordTokens
            whitespaceTokens = $whitespaceTokens
            text = $text
            listLabel = [string]$paragraph.Range.ListFormat.ListString
            start = [int]$paragraph.Range.Start
            end = [int]$paragraph.Range.End
          }
        }
      }
    } finally { $doc.Close(0) }
  }
  $json = ConvertTo-Json -InputObject $rows -Depth 5
  [System.IO.File]::WriteAllText((Join-Path $Dir 'paragraph-word-mismatches-t15.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
  $rows | Format-Table file,paragraph,wordTokens,whitespaceTokens,listLabel,text -Wrap | Out-String | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
