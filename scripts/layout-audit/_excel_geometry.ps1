# Do hinh hoc render cua Excel 2016: chieu rong cot (px @96dpi), chieu cao hang (px), vung dung, vung gop, hang/cot co dinh,
# va cho o chu co boc chu: so dong Excel can (AutoFit tren ban sao trong workbook tam, khong luu tep goc).
# Usage: powershell -File _excel_geometry.ps1 -File x.xlsx -Out x.geom.json [-MaxSheets 4] [-MaxRows 400] [-MaxCols 40] [-Lines]
param([string]$File, [string]$Out, [int]$MaxSheets = 4, [int]$MaxRows = 400, [int]$MaxCols = 40, [switch]$Lines, [switch]$TextWidth, [int]$MaxTextCells = 150)
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
function ColName([int]$i) { $s = ""; while ($i -gt 0) { $m = ($i - 1) % 26; $s = [char](65 + $m) + $s; $i = [int](($i - $m - 1) / 26) }; return $s }
$tmp = $null
try {
  $wb = $excel.Workbooks.Open((Resolve-Path $File).Path, 0, $true)
  $sheets = @()
  $n = [Math]::Min($MaxSheets, $wb.Worksheets.Count)
  for ($si = 1; $si -le $n; $si++) {
    $ws = $wb.Worksheets.Item($si)
    # Do o zoom 100% (hang tu dong duoc Excel tinh lai theo zoom; tep luu zoom 80/85% cho so khac VN Sheet 100%)
    $savedZoom = $null
    try { $ws.Activate() | Out-Null; $savedZoom = $excel.ActiveWindow.Zoom; if ($savedZoom -ne 100) { $excel.ActiveWindow.Zoom = 100 } } catch {}
    $ur = $ws.UsedRange
    $rows = [Math]::Min($MaxRows, $ur.Row + $ur.Rows.Count - 1)
    $cols = [Math]::Min($MaxCols, $ur.Column + $ur.Columns.Count - 1)
    $colPx = @(); for ($c = 1; $c -le $cols; $c++) { $col = $ws.Columns.Item($c); $colPx += [Math]::Round($col.Width / 0.75, 2) }
    $rowPx = @(); for ($r = 1; $r -le $rows; $r++) { $row = $ws.Rows.Item($r); $rowPx += [Math]::Round($row.Height / 0.75, 2) }
    $merges = @()
    $cells = @()
    $textCount = 0
    for ($r = 1; $r -le $rows; $r++) {
      for ($c = 1; $c -le $cols; $c++) {
        $cell = $ws.Cells.Item($r, $c)
        $txt = [string]$cell.Text
        if ($cell.MergeCells -and $cell.MergeArea.Cells.Item(1,1).Address($false,$false) -eq $cell.Address($false,$false)) {
          $ma = $cell.MergeArea
          $merges += @{ ref = $ma.Address($false,$false); rows = $ma.Rows.Count; cols = $ma.Columns.Count }
        }
        if ($txt -eq "") { continue }
        # Font.Bold/Italic/Size/Name tra ve DBNull khi o co richText tron (nhieu run); lay theo ky tu dau
        $fnt = $cell.Font
        $b = $fnt.Bold; $it = $fnt.Italic; $sz = $fnt.Size; $fn = $fnt.Name
        if ($b -is [DBNull] -or $it -is [DBNull] -or $sz -is [DBNull] -or $fn -is [DBNull]) { $fnt = $cell.Characters(1, 1).Font; $b = $fnt.Bold; $it = $fnt.Italic; $sz = $fnt.Size; $fn = $fnt.Name }
        $info = @{ coord = (ColName $c) + $r; text = $txt; wrap = [bool]$cell.WrapText; font = [string]$fn; size = [double]$sz; bold = [bool]$b; italic = [bool]$it; hAlign = [int]$cell.HorizontalAlignment; vAlign = [int]$cell.VerticalAlignment; indent = [int]$cell.IndentLevel; mixed = ($cell.Font.Bold -is [DBNull]) }
        if ($Lines -and $cell.WrapText) {
          # Ban sao trong workbook tam: cung font/chieu rong -> AutoFit -> so dong = cao / cao 1 dong
          if ($null -eq $tmp) { $tmp = $excel.Workbooks.Add() }
          $tws = $tmp.Worksheets.Item(1)
          if ($cell.MergeCells) { $w = $cell.MergeArea.Width } else { $w = $cell.Width }
          $tws.Columns.Item(1).ColumnWidth = 1
          # dat ColumnWidth theo don vi ky tu cua workbook tam: lap de dat Width (pt) gan bang
          $cw = 1.0; for ($k = 0; $k -lt 40; $k++) { $tws.Columns.Item(1).ColumnWidth = $cw; $d = $tws.Columns.Item(1).Width - $w; if ([Math]::Abs($d) -lt 0.4) { break }; $cw = [Math]::Max(0.1, $cw - $d / 7.0) }
          $t = $tws.Cells.Item(1,1); $t.Font.Name = $info.font; $t.Font.Size = $info.size; $t.Font.Bold = $info.bold; $t.Font.Italic = $info.italic; $t.WrapText = $true; $t.IndentLevel = $info.indent
          $t.NumberFormat = "@"
          $t.Value2 = "X"; $tws.Rows.Item(1).AutoFit() | Out-Null; $h1 = $tws.Rows.Item(1).Height
          $t.Value2 = [string]$txt; $tws.Rows.Item(1).AutoFit() | Out-Null; $hn = $tws.Rows.Item(1).Height
          $info.lines = [Math]::Round($hn / $h1, 1); $info.widthPt = [Math]::Round($tws.Columns.Item(1).Width, 2)
        }
        if ($TextWidth -and -not $cell.WrapText -and -not $cell.MergeCells -and $textCount -lt $MaxTextCells -and $txt.Length -lt 120 -and $txt.Trim().Length -gt 0) {
          # Be rong chu theo Excel: AutoFit cot tren ban sao cung font (px = Width/0.75); tru le ~7px de ra be rong chu thuan
          if ($null -eq $tmp) { $tmp = $excel.Workbooks.Add() }
          $tws = $tmp.Worksheets.Item(1)
          $t = $tws.Cells.Item(1, 3); $t.NumberFormat = "@"; $t.WrapText = $false
          $t.Font.Name = $info.font; $t.Font.Size = $info.size; $t.Font.Bold = $info.bold; $t.Font.Italic = $info.italic
          $t.Value2 = [string]$txt
          $tws.Columns.Item(3).AutoFit() | Out-Null
          $info.autoFitPx = [Math]::Round($tws.Columns.Item(3).Width / 0.75, 2)
          $textCount++
        }
        $cells += $info
      }
    }
    $freeze = @{ rows = 0; cols = 0 }
    try { $ws.Activate() | Out-Null; $win = $excel.ActiveWindow; if ($win.FreezePanes) { $freeze = @{ rows = $win.SplitRow; cols = $win.SplitColumn } } } catch {}
    $sheets += @{ index = $si; name = $ws.Name; rows = $rows; cols = $cols; colPx = $colPx; rowPx = $rowPx; merges = $merges; cells = $cells; freeze = $freeze; zoom = $excel.ActiveWindow.Zoom; savedZoom = $savedZoom; standardHeightPx = [Math]::Round($ws.StandardHeight / 0.75, 2); standardWidthChars = $ws.StandardWidth }
  }
  $json = @{ file = (Split-Path $File -Leaf); sheets = $sheets } | ConvertTo-Json -Depth 6 -Compress
  [IO.File]::WriteAllText($Out, $json, (New-Object Text.UTF8Encoding $false))
  "OK sheets=$n -> $Out"
} finally {
  if ($null -ne $tmp) { $tmp.Close($false) }
  $wb.Close($false)
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
