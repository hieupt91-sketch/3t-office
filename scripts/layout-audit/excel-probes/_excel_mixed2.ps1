$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
function RowPx($ws, $r) { return ($ws.Rows.Item($r).RowHeight / 0.75) }
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  $ws.Columns.Item(2).ColumnWidth = 60
  $nl = [string][char]10
  $cases = @(
    @{ name = "TNR18 line1 bold incl newline (1,3)"; font = "Times New Roman"; size = 18; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 1; n = 3; bold = $true }) },
    @{ name = "TNR18 line1 bold excl newline (1,2)"; font = "Times New Roman"; size = 18; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 1; n = 2; bold = $true }) },
    @{ name = "TNR18 only newline bold (3,1)"; font = "Times New Roman"; size = 18; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 3; n = 1; bold = $true }) },
    @{ name = "TNR18 all bold except newline"; font = "Times New Roman"; size = 18; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 1; n = 2; bold = $true }, @{ s = 4; n = 2; bold = $true }) },
    @{ name = "TNR18 bold base, line2 regular (4,2)"; font = "Times New Roman"; size = 18; bold = $true; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 4; n = 2; bold = $false }) },
    @{ name = "TNR18 bold base, line2 regular incl newline (3,3)"; font = "Times New Roman"; size = 18; bold = $true; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 3; n = 3; bold = $false }) },
    @{ name = "TNR14 base, line1 TNR10 (1,3)"; font = "Times New Roman"; size = 14; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 1; n = 3; size = 10 }) },
    @{ name = "TNR14 base, line2 TNR10 (4,2)"; font = "Times New Roman"; size = 14; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 4; n = 2; size = 10 }) },
    @{ name = "TNR10 base, line2 TNR14 (4,2)"; font = "Times New Roman"; size = 10; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 4; n = 2; size = 14 }) },
    @{ name = "TNR10 base, 1 char TNR14 in line1 (1,1)"; font = "Times New Roman"; size = 10; text = "Xg" + $nl + "Xg"; runs = @(@{ s = 1; n = 1; size = 14 }) },
    @{ name = "TNR10 base 3 lines, line2 TNR14"; font = "Times New Roman"; size = 10; text = "Xg" + $nl + "Xg" + $nl + "Xg"; runs = @(@{ s = 4; n = 2; size = 14 }) },
    @{ name = "TNR10 wrap 2 lines no newline (long)"; font = "Times New Roman"; size = 10; text = ("Xg " * 60); runs = @() },
    @{ name = "TNR10 wrap, first word TNR14"; font = "Times New Roman"; size = 10; text = ("Xg " * 60); runs = @(@{ s = 1; n = 2; size = 14 }) },
    @{ name = "TNR10 wrap, last word TNR14"; font = "Times New Roman"; size = 10; text = ("Xg " * 60); runs = @(@{ s = 178; n = 2; size = 14 }) },
    @{ name = "TNR10 trailing newline"; font = "Times New Roman"; size = 10; text = "Xg" + $nl; runs = @() },
    @{ name = "TNR10 two trailing newlines"; font = "Times New Roman"; size = 10; text = "Xg" + $nl + $nl; runs = @() },
    @{ name = "TNR10 only newline"; font = "Times New Roman"; size = 10; text = $nl; runs = @() },
    @{ name = "TNR18 empty line in middle"; font = "Times New Roman"; size = 18; text = "Xg" + $nl + $nl + "Xg"; runs = @() },
    @{ name = "TNR18 empty line in middle, line1 bold incl nl"; font = "Times New Roman"; size = 18; text = "Xg" + $nl + $nl + "Xg"; runs = @(@{ s = 1; n = 3; bold = $true }) },
    @{ name = "TNR18 bold base, middle empty line regular (4,1)"; font = "Times New Roman"; size = 18; bold = $true; text = "Xg" + $nl + $nl + "Xg"; runs = @(@{ s = 4; n = 1; bold = $false }) }
  )
  $r = 1
  foreach ($k in $cases) {
    $c = $ws.Cells.Item($r, 2); $c.Clear() | Out-Null
    $c.WrapText = $true; $c.Font.Name = $k.font; $c.Font.Size = $k.size; $c.Font.Bold = [bool]$k.bold
    $c.Value2 = $k.text
    foreach ($run in $k.runs) {
      $ch = $c.Characters($run.s, $run.n)
      if ($run.ContainsKey("bold")) { $ch.Font.Bold = $run.bold }
      if ($run.ContainsKey("size")) { $ch.Font.Size = $run.size }
    }
    $ws.Rows.Item($r).AutoFit() | Out-Null
    "{0,-55} {1:0.00}" -f $k.name, (RowPx $ws $r)
    $r++
  }
} finally { $wb.Close($false); $excel.Quit() }
