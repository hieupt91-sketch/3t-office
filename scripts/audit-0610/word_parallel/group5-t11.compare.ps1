param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group5_app.json') | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $d = $word.Documents.Open($app.mergedFile, $false, $true)
  try {
    $text = (($d.Content.Text -replace '[\r\a]',' ') -replace '\s+', ' ').Trim()
    $plain = $text.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
    $secondName = (($app.secondPreview.text -split "`n")[0] -replace 'Thông thường.*$','')
    $report = [ordered]@{
      Pages = [int]$d.ComputeStatistics(2)
      Paragraphs = [int]$d.Paragraphs.Count
      ContainsFirstRecord = $plain.Contains('Lan Ha Noi')
      ContainsSecondRecord = $text.Contains($secondName)
      ContainsThenResult = $plain.Contains('Uu tien')
      ContainsElseResult = $plain.Contains('Thong thuong')
      UnresolvedFields = $plain.Contains('Name') -or $plain.Contains('VIP')
      WordText = $text
      UIRecordCount = $app.merged.records
      PreviewNames = @($app.firstPreview.text, $app.secondPreview.text)
      PrevIndexAfterNext = $app.previousIndex
      EnvelopePages = $app.envelopeCount
      LabelCells = $app.labelCount
    }
    $mailings = $word.Documents.Open($app.mailingsFile, $false, $true)
    try {
      $mailingsText = (($mailings.Content.Text -replace '[\r\a]',' ') -replace '\s+', ' ').Trim()
      $record1 = (($app.imported.records[0] -replace '\|',' ').Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '')
      $record2 = (($app.imported.records[1] -replace '\|',' ').Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '')
      $mailingsPlain = $mailingsText.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
      $report.EnvelopeRecordsInWord = $mailingsPlain.Contains($record1) -and $mailingsPlain.Contains($record2)
      $report.LabelRecordsInWord = $mailings.Tables.Count -gt 0 -and $mailingsPlain.Contains($record1) -and $mailingsPlain.Contains($record2)
      $report.MailingsText = $mailingsText
      $report.LabelTablesInWord = [int]$mailings.Tables.Count
      $report.MailingsPagesInWord = [int]$mailings.ComputeStatistics(2)
    } finally { $mailings.Close(0) }
    $report | ConvertTo-Json -Depth 6 | Write-Output
    [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group5_compare.json'), ($report | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
    if (-not $report.ContainsFirstRecord -or -not $report.ContainsSecondRecord -or -not $report.ContainsThenResult -or -not $report.ContainsElseResult -or $report.UnresolvedFields -or -not $report.EnvelopeRecordsInWord -or -not $report.LabelRecordsInWord) { throw 'Word COM merged output check failed.' }
  } finally { $d.Close(0) }
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
