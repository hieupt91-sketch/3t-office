param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$appResults = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir 't11_group3_app.json') | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
try {
  foreach ($item in $appResults | Where-Object { $_.file }) {
    $d = $word.Documents.Open($item.file, $false, $true)
    try {
      $section = $d.Sections.Item(1)
      $page = $section.PageSetup
      $shapes = @(); foreach ($s in $d.Shapes) { $shapes += [ordered]@{Text=[string]$s.TextFrame.TextRange.Text; Type=[int]$s.Type} }
      $headerShapes = @(); foreach ($h in $section.Headers) { foreach ($s in $h.Shapes) { $headerShapes += [string]$s.TextFrame.TextRange.Text } }
      $paras = @(); foreach ($p in $d.Paragraphs) { if ($paras.Count -ge 5) { break }; $paras += [ordered]@{Text=(($p.Range.Text -replace '[\r\a]',' ').Trim()); Font=[string]$p.Range.Font.Name; FirstIndent=[math]::Round([double]$p.Format.FirstLineIndent,2)} }
      $paragraph = $d.Paragraphs.Item(2).Format
      $row = [ordered]@{
        Operation = $item.name
        Pages = [int]$d.ComputeStatistics(2)
        PageWidthPt = [math]::Round([double]$page.PageWidth, 2)
        PageHeightPt = [math]::Round([double]$page.PageHeight, 2)
        FirstLineIndentPt = [math]::Round([double]$paragraph.FirstLineIndent, 2)
        ThemeFont = [string]$d.Styles.Item(-1).Font.Name
        LineNumbersActive = [bool]$section.LineNumbering.Active
        LineNumbersRestartMode = [int]$section.LineNumbering.RestartMode
        ShapeTexts = @($shapes | ForEach-Object { $_.Text.Trim() } | Where-Object { $_ })
        HeaderShapeTexts = $headerShapes
        Paragraphs = $paras
        BackgroundColor = [int]$d.Background.Fill.ForeColor.RGB
        PageBorderStyle = [int]$section.Borders.Item(1).LineStyle
        PageBorderWidth = [int]$section.Borders.Item(1).LineWidth
        PageBorderColor = [int]$section.Borders.Item(1).Color
      }
      $rows += $row
      Write-Output ("{0}: {1}" -f $item.name, ($row | ConvertTo-Json -Compress -Depth 6))
    } finally { $d.Close(0) }
  }
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group3_compare.json'), ($rows | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
} finally {
  if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
