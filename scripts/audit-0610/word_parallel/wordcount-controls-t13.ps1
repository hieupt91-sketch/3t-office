param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
[void][System.IO.Directory]::CreateDirectory($Dir)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
Write-Output 'Starting Word COM controls.'
$wdCollapseEnd = 0
$wdLineBreak = 6
$wdFieldPage = 33
function New-Control($name, $build) {
  $doc = $word.Documents.Add()
  try {
    Write-Output ("Building control: " + $name)
    & $build $doc
    $doc.Fields.Update() | Out-Null
    foreach ($shape in $doc.Shapes) { if ($shape.TextFrame.HasText) { $shape.TextFrame.TextRange.Fields.Update() | Out-Null } }
    $path = Join-Path $Dir ($name + '.docx')
    $doc.SaveAs2($path, 16)
    Write-Output ("Saved control: " + $name)
    $script:rows += [pscustomobject]@{
      name = $name
      words = [int]$doc.ComputeStatistics(0)
      pages = [int]$doc.ComputeStatistics(2)
      paragraphs = [int]$doc.ComputeStatistics(4)
      lines = [int]$doc.ComputeStatistics(1)
      charactersNoSpaces = [int]$doc.ComputeStatistics(3)
      charactersWithSpaces = [int]$doc.ComputeStatistics(5)
      contentText = [string]$doc.Content.Text
      contentTextLength = ([string]$doc.Content.Text).Length
      textFrameCount = [int]$doc.Shapes.Count
    }
  } finally { $doc.Close(0) }
}
try {
  Write-Output 'Created Word.Application.'
  New-Control 'plain' { param($d) $d.Content.Text = 'Alpha beta' }
  New-Control 'repeated-spaces' { param($d) $d.Content.Text = 'Alpha    beta' }
  New-Control 'whitespace-only-run' { param($d) $d.Content.Text = "Alpha`r   `rBeta" }
  New-Control 'numbered-list' { param($d) $d.Content.Text = "Alpha`rBeta`r"; $d.Paragraphs(1).Range.ListFormat.ApplyNumberDefault(); $d.Paragraphs(2).Range.ListFormat.ApplyNumberDefault() }
  New-Control 'table' { param($d) $r = $d.Range(0,0); $t = $d.Tables.Add($r,2,2); $t.Cell(1,1).Range.Text='Alpha'; $t.Cell(1,2).Range.Text='Beta'; $t.Cell(2,1).Range.Text='Gamma'; $t.Cell(2,2).Range.Text='Delta' }
  New-Control 'textbox' { param($d) $d.Content.Text='Body text'; $s=$d.Shapes.AddTextbox(1,0,0,160,36,$d.Paragraphs(1).Range); $s.TextFrame.TextRange.Text='Frame words' }
  New-Control 'manual-linebreak' { param($d) $r=$d.Content; $r.Text='Alpha'; $r.Collapse($wdCollapseEnd); $r.InsertBreak($wdLineBreak); $r.InsertAfter('Beta') }
  New-Control 'tab' { param($d) $d.Content.Text="Alpha`tBeta" }
  New-Control 'page-field' { param($d) $r=$d.Content; $r.Text='Page '; $r.Collapse($wdCollapseEnd); $d.Fields.Add($r,$wdFieldPage) | Out-Null; $r.InsertAfter(' end') }
  New-Control 'special-chars' { param($d) $d.Content.Text=([string][char]0x00A9)+' '+[char]0x20AB+' '+[char]0x2211+' '+[char]0x2192+' '+[char]0x00E9+' '+[char]0x6F22+[char]0x5B57 }
  $empty = $word.Documents.Add()
  try {
    $emptyPath = Join-Path $Dir 'empty.docx'; $empty.SaveAs2($emptyPath,16)
    $rows += [pscustomobject]@{name='empty';words=[int]$empty.ComputeStatistics(0);pages=[int]$empty.ComputeStatistics(2);paragraphs=[int]$empty.ComputeStatistics(4);lines=[int]$empty.ComputeStatistics(1);charactersNoSpaces=[int]$empty.ComputeStatistics(3);charactersWithSpaces=[int]$empty.ComputeStatistics(5);contentText=[string]$empty.Content.Text;contentTextLength=([string]$empty.Content.Text).Length;textFrameCount=0}
  } finally { $empty.Close(0) }
  $json = ConvertTo-Json -InputObject $rows -Depth 5
  [System.IO.File]::WriteAllText((Join-Path $Dir 'wordcount-controls-t13.json'),$json,(New-Object System.Text.UTF8Encoding($false)))
  $rows | Select-Object name,words,charactersNoSpaces,charactersWithSpaces,paragraphs,textFrameCount | Format-Table -AutoSize | Out-String | Write-Output
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
