param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open((Resolve-Path -LiteralPath $Path).Path, $false, $true)
  $paragraphs = @()
  $count = 0
  for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
    $p = $doc.Paragraphs.Item($i)
    $listFormat = $p.Range.ListFormat
    if ([int]$listFormat.ListType -ne 0) {
      $count++
      $paragraphs += [pscustomobject]@{
        text = $p.Range.Text.Trim()
        listString = [string]$listFormat.ListString
        level = [int]$listFormat.ListLevelNumber
        listParagraphCount = [int]$listFormat.List.ListParagraphs.Count
      }
    }
  }
  [pscustomobject]@{ listParagraphCount = $count; paragraphs = $paragraphs } | ConvertTo-Json -Depth 5 -Compress
} finally {
  if ($doc) { $saveChanges = 0; $doc.Close([ref]$saveChanges) | Out-Null }
  if ($word) { $word.Quit() }
}
