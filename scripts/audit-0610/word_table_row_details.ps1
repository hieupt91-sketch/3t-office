# Word COM: thông số thật của hàng/ô và vị trí ký tự, không suy chiều cao chỉ từ hai hàng liên tiếp.
param(
  [Parameter(Mandatory = $true)][string]$File,
  [Parameter(Mandatory = $true)][string]$Out,
  [Parameter(Mandatory = $true)][string[]]$Targets
)

$ErrorActionPreference = "Stop"
$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$word = New-Object -ComObject Word.Application
Start-Sleep 3
$wordPid = (Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | Select-Object -First 1).Id
try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open((Resolve-Path -LiteralPath $File).Path, $false, $true, $false)
  try { $word.ActiveWindow.View.Type = 3 } catch {}
  $doc.Repaginate() | Out-Null
  $wanted = @{}
  foreach ($target in $Targets) {
    if ($target -notmatch '^(\d+):(\d+)$') { throw "Invalid target '$target'; expected TABLE:ROW" }
    $wanted["$([int]$Matches[1]):$([int]$Matches[2])"] = $true
  }
  $result = @()
  $ti = 0
  foreach ($table in $doc.Tables) {
    $ti++
    if ($table.NestingLevel -gt 1) { continue }
    for ($ri = 1; $ri -le $table.Rows.Count; $ri++) {
      $key = "$ti`:$ri"
      if (-not $wanted.ContainsKey($key)) { continue }
      $row = $table.Rows.Item($ri)
      $cells = @()
      foreach ($cell in $row.Cells) {
        $range = $cell.Range.Duplicate
        $first = $range.Duplicate
        $first.SetRange($range.Start, $range.Start)
        $last = $range.Duplicate
        $lastAt = [Math]::Max($range.Start, $range.End - 2)
        $last.SetRange($lastAt, $lastAt)
        $paras = @()
        $pi = 0
        foreach ($para in $cell.Range.Paragraphs) {
          $pi++
          $pr = $para.Range.Duplicate
          $pr.SetRange($pr.Start, $pr.Start)
          $text = $para.Range.Text -replace "[\r\a]", ""
          $paras += [ordered]@{
            index = $pi
            text = $text
            page = [int]$pr.Information(3)
            y = [math]::Round([double]$pr.Information(6), 2)
            lineSpacing = [math]::Round([double]$para.Format.LineSpacing, 2)
            lineSpacingRule = [int]$para.Format.LineSpacingRule
            spaceBefore = [math]::Round([double]$para.Format.SpaceBefore, 2)
            spaceAfter = [math]::Round([double]$para.Format.SpaceAfter, 2)
            fontSize = [double]$para.Range.Font.Size
            fontName = [string]$para.Range.Font.Name
          }
        }
        $cells += [ordered]@{
          index = [int]$cell.ColumnIndex
          width = [math]::Round([double]$cell.Width, 2)
          height = [math]::Round([double]$cell.Height, 2)
          verticalAlignment = [int]$cell.VerticalAlignment
          topPadding = [math]::Round([double]$cell.TopPadding, 2)
          rightPadding = [math]::Round([double]$cell.RightPadding, 2)
          bottomPadding = [math]::Round([double]$cell.BottomPadding, 2)
          leftPadding = [math]::Round([double]$cell.LeftPadding, 2)
          firstPage = [int]$first.Information(3)
          firstY = [math]::Round([double]$first.Information(6), 2)
          lastPage = [int]$last.Information(3)
          lastY = [math]::Round([double]$last.Information(6), 2)
          paragraphs = $paras
        }
      }
      $rowRange = $row.Range.Duplicate
      $rowStart = $rowRange.Duplicate
      $rowStart.SetRange($rowRange.Start, $rowRange.Start)
      $result += [ordered]@{
        table = $ti
        row = $ri
        height = [math]::Round([double]$row.Height, 2)
        heightRule = [int]$row.HeightRule
        allowBreakAcrossPages = [bool]$row.AllowBreakAcrossPages
        startPage = [int]$rowStart.Information(3)
        startY = [math]::Round([double]$rowStart.Information(6), 2)
        cells = $cells
      }
    }
  }
  $result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Out -Encoding utf8
  "OK targets=$($result.Count) out=$Out"
  $doc.Saved = $true
  $doc.Close(0)
} finally {
  try { $word.Quit() } catch {}
  Start-Sleep 1
  if ($wordPid) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue }
}
