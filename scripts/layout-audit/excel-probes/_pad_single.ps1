# pad (desc Normal - desc font) co ap cho o 1 dong khong boc chu / o rong khong? Normal Calibri 11.
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  $cases = @(
    @{ n = "Arial 12 content nowrap"; f = "Arial"; s = 12; t = "Xg"; w = $false },
    @{ n = "Arial 12 content wrap"; f = "Arial"; s = 12; t = "Xg"; w = $true },
    @{ n = "Arial 12 empty nowrap"; f = "Arial"; s = 12; t = ""; w = $false },
    @{ n = "Arial 12 empty wrap"; f = "Arial"; s = 12; t = ""; w = $true },
    @{ n = "TNR 10 content nowrap"; f = "Times New Roman"; s = 10; t = "Xg"; w = $false },
    @{ n = "TNR 10 content wrap"; f = "Times New Roman"; s = 10; t = "Xg"; w = $true },
    @{ n = "TNR 10 empty"; f = "Times New Roman"; s = 10; t = ""; w = $false },
    @{ n = "TNR 14 content nowrap"; f = "Times New Roman"; s = 14; t = "Xg"; w = $false },
    @{ n = "TNR 14 empty"; f = "Times New Roman"; s = 14; t = ""; w = $false },
    @{ n = "Arial 14 content nowrap (desc4)"; f = "Arial"; s = 14; t = "Xg"; w = $false },
    @{ n = "Arial 11 content nowrap"; f = "Arial"; s = 11; t = "Xg"; w = $false },
    @{ n = "Arial 11 content wrap"; f = "Arial"; s = 11; t = "Xg"; w = $true },
    @{ n = "Arial 11 number nowrap"; f = "Arial"; s = 11; t = 123; w = $false },
    @{ n = "Calibri 6 content nowrap"; f = "Calibri"; s = 6; t = "Xg"; w = $false },
    @{ n = "Calibri 6 content wrap"; f = "Calibri"; s = 6; t = "Xg"; w = $true },
    @{ n = "Arial 20 content nowrap"; f = "Arial"; s = 20; t = "Xg"; w = $false },
    @{ n = "Arial 20 content wrap"; f = "Arial"; s = 20; t = "Xg"; w = $true },
    @{ n = "Arial 20 empty"; f = "Arial"; s = 20; t = ""; w = $false }
  )
  $r = 1
  foreach ($k in $cases) {
    $c = $ws.Cells.Item($r, 2); $c.Font.Name = $k.f; $c.Font.Size = $k.s; $c.WrapText = $k.w
    if ($k.t -ne "") { $c.Value2 = $k.t }
    $ws.Rows.Item($r).AutoFit() | Out-Null
    "{0,-36} {1,6:0.00}px" -f $k.n, ($ws.Rows.Item($r).RowHeight / 0.75)
    $r++
  }
} finally { $wb.Close($false); $excel.Quit() }
