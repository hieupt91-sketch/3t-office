param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
$progressPath = Join-Path $Dir 't11_group1_word_progress.log'
function Log($message) { [System.IO.File]::AppendAllText($progressPath, "$message`r`n") }
function Get-Properties($document, [int]$paragraphIndex = 2) {
  $p = $document.Paragraphs.Item([math]::Min($paragraphIndex, $document.Paragraphs.Count))
  $range = $p.Range
  $p3 = $document.Paragraphs.Item([math]::Min(3, $document.Paragraphs.Count))
  $paragraphs = @()
  for ($i=1; $i -le $document.Paragraphs.Count; $i++) { $paragraphs += ([string]$document.Paragraphs.Item($i).Range.Text).Trim() }
  return [ordered]@{
    Text = [string]$range.Text
    FontName = [string]$range.Font.Name
    FontSize = [double]$range.Font.Size
    Paragraph3FontName = [string]$p3.Range.Font.Name
    Paragraph3FontSize = [double]$p3.Range.Font.Size
    LeftIndent = [math]::Round([double]$p.Format.LeftIndent, 2)
    Shading = [int]$p.Format.Shading.BackgroundPatternColor
    BottomBorder = [int]$p.Format.Borders.Item(3).LineStyle
    Paragraphs = $paragraphs
    DocumentText = [string]$document.Content.Text
    ShowAll = [int]$document.ActiveWindow.View.ShowAll
  }
}
try {
  $ops = @('grow','shrink','clear-format','indent-decrease','paragraph-shading','paragraph-sort','paragraph-borders','format-painter','formatting-marks','copy','paste','paste-special-source','paste-special-text','cut')
  if ($env:OPS) { $ops = @($ops | Where-Object { $_ -in @($env:OPS -split ',') }) }
  foreach ($op in $ops) {
    Log "${op}: before add"
    $d = $word.Documents.Add()
    Log "${op}: after add"
    $d.Content.Text = "Mot doan dau tien.`rAlpha beta gamma delta.`rDoan cuoi cung."
    $p = $d.Paragraphs.Item(2)
    $p.Range.Font.Name = 'Times New Roman'
    $p.Range.Font.Size = 12
    $showAllBefore = [bool]$word.ActiveWindow.View.ShowAll
    Write-Output "Word COM: $op started"
    Log "${op}: before operation"
    switch ($op) {
      'grow' { $p.Range.Font.Grow() }
      'shrink' { $p.Range.Font.Shrink() }
      'clear-format' { $p.Range.Font.Reset() }
      'indent-decrease' { $p.Indent(); $p.Outdent() }
      'paragraph-shading' { $p.Format.Shading.BackgroundPatternColor = 13431551 }
      'paragraph-borders' { $p.Format.Borders.Enable = 1 }
      'format-painter' { $p2=$p.Range; $p3=$d.Paragraphs.Item(3).Range; $p2.Select(); $word.Selection.CopyFormat(); $p3.Select(); $word.Selection.PasteFormat() }
      'formatting-marks' { $word.ActiveWindow.View.ShowAll = $true }
      'paragraph-sort' {
        $sortRange = $d.Range(0, $d.Content.End - 1)
        $sortRange.Sort()
      }
      'copy' { $copyRange = $p.Range; $copyRange.MoveEnd(1, -1) | Out-Null; $copyRange.Copy() }
      'paste' {
        $copyRange = $p.Range; $copyRange.MoveEnd(1, -1) | Out-Null; $copyRange.Copy()
        $target = $d.Paragraphs.Item(3).Range
        $target.End = $target.End - 1
        $target.Collapse(0)
        $target.Paste()
      }
      'paste-special-source' {
        $copyRange = $p.Range; $copyRange.MoveEnd(1, -1) | Out-Null; $copyRange.Copy()
        $target = $d.Paragraphs.Item(3).Range; $target.End = $target.End - 1; $target.Collapse(0); $target.Paste()
      }
      'paste-special-text' {
        $copyRange = $p.Range; $copyRange.MoveEnd(1, -1) | Out-Null; $copyRange.Copy()
        $target = $d.Paragraphs.Item(3).Range; $target.End = $target.End - 1; $target.Collapse(0); $target.PasteSpecial($false,$false,$false,$false,2)
      }
      'cut' { $p.Range.Cut() }
    }
    Log "${op}: after operation"
    $path = Join-Path $Dir "word_t11_$op.docx"
    $wordState = Get-Properties $d
    if ($op -eq 'format-painter') { $wordState = Get-Properties $d 3 }
    $rows += [pscustomobject]@{ Operation=$op; Word=$wordState }
    Log "${op}: after properties"
    if ($op -eq 'formatting-marks') { $word.ActiveWindow.View.ShowAll = $showAllBefore }
  }
  $json = $rows | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group1_word.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
  $rows | ForEach-Object { '{0}: {1}' -f $_.Operation, ($_.Word | ConvertTo-Json -Compress -Depth 5) }
} finally {
  if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
