$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  $cases = @(
    @{ n = "TNR14 b"; f = "Times New Roman"; s = 14; b = $true; i = $false; u = $false },
    @{ n = "TNR14 b i"; f = "Times New Roman"; s = 14; b = $true; i = $true; u = $false },
    @{ n = "TNR14 b u"; f = "Times New Roman"; s = 14; b = $true; i = $false; u = $true },
    @{ n = "TNR14 b i u"; f = "Times New Roman"; s = 14; b = $true; i = $true; u = $true },
    @{ n = "TNR14 u"; f = "Times New Roman"; s = 14; b = $false; i = $false; u = $true },
    @{ n = "TNR10 u"; f = "Times New Roman"; s = 10; b = $false; i = $false; u = $true },
    @{ n = "TNR12 u"; f = "Times New Roman"; s = 12; b = $false; i = $false; u = $true },
    @{ n = "TNR12"; f = "Times New Roman"; s = 12; b = $false; i = $false; u = $false },
    @{ n = "Arial12 u"; f = "Arial"; s = 12; b = $false; i = $false; u = $true },
    @{ n = "Cal11 u"; f = "Calibri"; s = 11; b = $false; i = $false; u = $true },
    @{ n = "Cal11 i"; f = "Calibri"; s = 11; b = $false; i = $true; u = $false },
    @{ n = "TNR18 u"; f = "Times New Roman"; s = 18; b = $false; i = $false; u = $true },
    @{ n = "TNR18"; f = "Times New Roman"; s = 18; b = $false; i = $false; u = $false },
    @{ n = "TNR10 u 3 lines"; f = "Times New Roman"; s = 10; b = $false; i = $false; u = $true; t = ("Xg" + [string][char]10 + "Xg" + [string][char]10 + "Xg") },
    @{ n = "TNR10 3 lines"; f = "Times New Roman"; s = 10; b = $false; i = $false; u = $false; t = ("Xg" + [string][char]10 + "Xg" + [string][char]10 + "Xg") }
  )
  $r = 1
  foreach ($k in $cases) {
    $c = $ws.Cells.Item($r, 2); $c.Font.Name = $k.f; $c.Font.Size = $k.s; $c.Font.Bold = $k.b; $c.Font.Italic = $k.i
    if ($k.u) { $c.Font.Underline = 2 }
    if ($k.ContainsKey("t")) { $c.WrapText = $true; $c.Value2 = $k.t } else { $c.Value2 = "Xg" }
    $ws.Rows.Item($r).AutoFit() | Out-Null
    "{0,-18} {1,6:0.00}px" -f $k.n, ($ws.Rows.Item($r).RowHeight / 0.75)
    $r++
  }
} finally { $wb.Close($false); $excel.Quit() }
