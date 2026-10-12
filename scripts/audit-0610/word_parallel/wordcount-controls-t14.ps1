param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
[void][System.IO.Directory]::CreateDirectory($Dir)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
function New-Control([string]$name, [string]$text) {
  $doc = $word.Documents.Add()
  try {
    $doc.Content.Text = $text
    $path = Join-Path $Dir ($name + '.docx')
    $doc.SaveAs2($path, 16)
    $script:rows += [pscustomobject]@{
      name = $name
      text = [string]$doc.Content.Text
      words = [int]$doc.ComputeStatistics(0)
      charactersNoSpaces = [int]$doc.ComputeStatistics(3)
      charactersWithSpaces = [int]$doc.ComputeStatistics(5)
    }
  } finally { $doc.Close(0) }
}
try {
  New-Control 'hyphen' 'alpha-beta alpha–beta alpha—beta'
  New-Control 'attached-punctuation' 'alpha,beta alpha.beta alpha...beta (alpha) [beta] '
  New-Control 'numbers' '1,234 1.234 12:34 12/34 12-34 1,234.56'
  New-Control 'symbols' 'A&B C+D E/F G@H #I $J 50% K™'
  New-Control 'email-url' 'first.last@example.com https://example.com/path?q=1 www.example.org'
  New-Control 'abbreviations' 'Dr. Smith met Mr. Jones at 3 p.m. U.S.A. e.g. word'
  New-Control 'tab' "alpha`tbeta"
  New-Control 'nbsp' ("alpha" + [char]0x00A0 + "beta")
  New-Control 'soft-linebreak' "alpha`vbeta"
  New-Control 'paragraph-break' "alpha`rbeta"
  New-Control 'mixed' ("alpha-beta, 1,234.56 & A+B; https://example.com`tbeta" + [char]0x00A0 + 'end')
  $json = ConvertTo-Json -InputObject $rows -Depth 4
  [System.IO.File]::WriteAllText((Join-Path $Dir 'wordcount-controls-t14.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
  $rows | Select-Object name,words,charactersNoSpaces,charactersWithSpaces | Format-Table -AutoSize | Out-String | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
