param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
[void][System.IO.Directory]::CreateDirectory($Dir)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
$wdCollapseEnd = 0
$wdLineBreak = 6
$wdFieldPage = 33
function New-Control([string]$name, [scriptblock]$build) {
  Write-Output ('Opening control: ' + $name + ' @ ' + (Get-Date -Format o))
  $doc = $word.Documents.Add()
  Write-Output ('Created document: ' + $name + ' @ ' + (Get-Date -Format o))
  try {
    & $build $doc
    Write-Output ('Built content: ' + $name)
    $doc.Fields.Update() | Out-Null
    $path = Join-Path $Dir ($name + '.docx')
    Write-Output ('Saving control: ' + $name + ' @ ' + (Get-Date -Format o))
    $doc.SaveAs2($path, 16)
    Write-Output ('Saved control: ' + $name)
    $rows += [pscustomobject]@{
      name = $name
      text = [string]$doc.Content.Text
      words = [int]$doc.ComputeStatistics(0)
      charactersNoSpaces = [int]$doc.ComputeStatistics(3)
      charactersWithSpaces = [int]$doc.ComputeStatistics(5)
      paragraphs = [int]$doc.ComputeStatistics(4)
      pages = [int]$doc.ComputeStatistics(2)
      path = $path
    }
  } finally { $doc.Close(0) }
}
try {
  Write-Output ('Word COM initialized @ ' + (Get-Date -Format o))
  New-Control 'hyphen' { param($d) $d.Content.Text = 'a-b' }
  New-Control 'en-dash' { param($d) $d.Content.Text = 'a–b' }
  New-Control 'em-dash' { param($d) $d.Content.Text = 'a—b' }
  New-Control 'decimal-comma' { param($d) $d.Content.Text = '1.234,5' }
  New-Control 'email' { param($d) $d.Content.Text = 'first.last@example.com' }
  New-Control 'url' { param($d) $d.Content.Text = 'https://example.com/path?q=1' }
  New-Control 'ordinal-line-start' { param($d) $d.Content.Text = "1. Muc mot`r2. Muc hai" }
  New-Control 'symbols' { param($d) $d.Content.Text = ([string][char]0x00A9) + ' ' + [char]0x20AB + ' 50%' }
  New-Control 'parentheses' { param($d) $d.Content.Text = '(alpha) [beta] {gamma}' }
  New-Control 'quotes' { param($d) $d.Content.Text = "'alpha' `"beta`" l'esprit" }
  New-Control 'abbreviation' { param($d) $d.Content.Text = 'TP.HCM' }
  New-Control 'tab' { param($d) $d.Content.Text = "alpha`tbeta" }
  New-Control 'nbsp' { param($d) $d.Content.Text = ('alpha' + [char]0x00A0 + 'beta') }
  New-Control 'line-break' { param($d) $r=$d.Content; $r.Text='alpha'; $r.Collapse($wdCollapseEnd); $r.InsertBreak($wdLineBreak); $r.InsertAfter('beta') }
  New-Control 'page-number-field' { param($d) $r=$d.Content; $r.Text='Trang '; $r.Collapse($wdCollapseEnd); $d.Fields.Add($r,$wdFieldPage) | Out-Null; $r.InsertAfter(' cuoi') }
  $json = ConvertTo-Json -InputObject $rows -Depth 5
  [System.IO.File]::WriteAllText((Join-Path $Dir 'wordcount-controls-t15.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
  $rows | Select-Object name,words,charactersNoSpaces,charactersWithSpaces,paragraphs,pages | Format-Table -AutoSize | Out-String | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
