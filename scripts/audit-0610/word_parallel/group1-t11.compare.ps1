param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$wordResults = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group1_word.json') | ConvertFrom-Json
$appResults = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group1_app.json') | ConvertFrom-Json
$appRows = @()
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
function Read-State($document, [int]$paragraphIndex = 2) {
  $p = $document.Paragraphs.Item([math]::Min($paragraphIndex, $document.Paragraphs.Count))
  $paragraphs = @()
  for ($i=1; $i -le $document.Paragraphs.Count; $i++) { $paragraphs += ([string]$document.Paragraphs.Item($i).Range.Text).Trim() }
  return [ordered]@{
    Text = ([string]$p.Range.Text).Trim()
    FontName = [string]$p.Range.Font.Name
    FontSize = [double]$p.Range.Font.Size
    Paragraph3FontName = [string]$document.Paragraphs.Item([math]::Min(3, $document.Paragraphs.Count)).Range.Font.Name
    Paragraph3FontSize = [double]$document.Paragraphs.Item([math]::Min(3, $document.Paragraphs.Count)).Range.Font.Size
    LeftIndent = [math]::Round([double]$p.Format.LeftIndent, 2)
    Shading = [int]$p.Format.Shading.BackgroundPatternColor
    BottomBorder = [int]$p.Format.Borders.Item(3).LineStyle
    Paragraphs = $paragraphs
  }
}
try {
  foreach ($expected in $wordResults) {
    $appAudit = $appResults | Where-Object name -eq $expected.Operation | Select-Object -First 1
    if ($expected.Operation -eq 'formatting-marks') {
      $showingMarks = [int]($appAudit.state.marks -gt 0)
      $isShowingInWord = [int]$expected.Word.ShowAll
      $result = if ($showingMarks -eq $isShowingInWord) { 'MATCH' } else { 'DIFF' }
      $diffs = if ($result -eq 'MATCH') { @() } else { @("Formatting marks Word=$isShowingInWord | App=$showingMarks") }
      $appRows += [pscustomobject]@{ Operation=$expected.Operation; Result=$result; Differences=$diffs; Word=$expected.Word; App=@{marks=$appAudit.state.marks} }
      Write-Output ("{0} {1}: {2}" -f $result, $expected.Operation, ($diffs -join '; '))
      continue
    }
    $path = Join-Path $Dir "t11_$($expected.Operation).docx"
    if (!(Test-Path $path)) { $appRows += [pscustomobject]@{ Operation=$expected.Operation; Result='NOT RUN'; Differences=@("App DOCX missing: $path") }; continue }
    $document = $word.Documents.Open($path, $false, $true)
    $paragraphIndex = if ($expected.Operation -eq 'format-painter') { 3 } else { 2 }
    $app = Read-State $document $paragraphIndex
    $baseline = $expected.Word
    $diffs = @()
    foreach ($key in @('Text','FontName','FontSize','Paragraph3FontName','Paragraph3FontSize','LeftIndent','Shading','BottomBorder')) {
      $wordValue = if ($key -eq 'Text') { ([string]$baseline.$key).TrimEnd([char]13,[char]10) } else { $baseline.$key }
      $appValue = if ($key -eq 'Text') { ([string]$app[$key]).TrimEnd([char]13,[char]10) } else { $app[$key] }
      if ("$wordValue" -ne "$appValue") { $diffs += "$key Word=$wordValue | App=$appValue" }
    }
    if ((@($baseline.Paragraphs) -join '|') -ne (@($app.Paragraphs) -join '|')) { $diffs += "Paragraphs Word=$(@($baseline.Paragraphs) -join ' / ') | App=$(@($app.Paragraphs) -join ' / ')" }
    $appRows += [pscustomobject]@{ Operation=$expected.Operation; Result=$(if($diffs.Count){'DIFF'}else{'MATCH'}); Differences=$diffs; Word=$baseline; App=$app }
    Write-Output ("{0} {1}: {2}" -f $appRows[-1].Result, $expected.Operation, ($diffs -join '; '))
  }
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group1_compare.json'), ($appRows | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
} finally {
  if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
