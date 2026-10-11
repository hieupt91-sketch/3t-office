# pad (desc Normal - desc font) co phu thuoc can doc (top/center/bottom)? Normal Calibri 11
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1); $ws.Columns.Item(2).ColumnWidth = 40
  $nl = [string][char]10
  $cases = @(
    @{ n = "Cal10 2 lines bottom"; f = "Calibri"; s = 10; v = -4107; t = "Xg" + $nl + "Xg" },
    @{ n = "Cal10 2 lines center"; f = "Calibri"; s = 10; v = -4108; t = "Xg" + $nl + "Xg" },
    @{ n = "Cal10 2 lines top"; f = "Calibri"; s = 10; v = -4160; t = "Xg" + $nl + "Xg" },
    @{ n = "Arial12 1 line bottom"; f = "Arial"; s = 12; v = -4107; t = "Xg" },
    @{ n = "Arial12 1 line center"; f = "Arial"; s = 12; v = -4108; t = "Xg" },
    @{ n = "Arial12 1 line top"; f = "Arial"; s = 12; v = -4160; t = "Xg" },
    @{ n = "Tah9b 3 lines bottom"; f = "Tahoma"; s = 9; v = -4107; t = "Xg" + $nl + "Xg" + $nl + "Xg"; b = $true },
    @{ n = "Tah9b 3 lines center"; f = "Tahoma"; s = 9; v = -4108; t = "Xg" + $nl + "Xg" + $nl + "Xg"; b = $true },
    @{ n = "Tah9b 3 lines top"; f = "Tahoma"; s = 9; v = -4160; t = "Xg" + $nl + "Xg" + $nl + "Xg"; b = $true },
    @{ n = "TNR10 2 lines center"; f = "Times New Roman"; s = 10; v = -4108; t = "Xg" + $nl + "Xg" },
    @{ n = "TNR10 2 lines top"; f = "Times New Roman"; s = 10; v = -4160; t = "Xg" + $nl + "Xg" }
  )
  $r = 1
  foreach ($k in $cases) {
    $c = $ws.Cells.Item($r, 2); $c.Font.Name = $k.f; $c.Font.Size = $k.s; if ($k.b) { $c.Font.Bold = $true }
    $c.WrapText = $true; $c.VerticalAlignment = $k.v; $c.Value2 = $k.t
    $ws.Rows.Item($r).AutoFit() | Out-Null
    "{0,-24} {1,6:0.00}px" -f $k.n, ($ws.Rows.Item($r).RowHeight / 0.75)
    $r++
  }
} finally { $wb.Close($false); $excel.Quit() }
