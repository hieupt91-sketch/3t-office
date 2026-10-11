# Vien day/dup co lam hang cao them? Normal Calibri 11; o Calibri 10 can giua 2 dong (34px)
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1); $ws.Columns.Item(2).ColumnWidth = 40
  $nl = [string][char]10
  $cases = @(
    @{ n = "no border"; edge = 0; w = 0 },
    @{ n = "bottom thin"; edge = 9; w = 2 },
    @{ n = "bottom medium"; edge = 9; w = -4138 },
    @{ n = "bottom thick"; edge = 9; w = 4 },
    @{ n = "bottom double"; edge = 9; w = -4119 },
    @{ n = "top thick"; edge = 8; w = 4 },
    @{ n = "top double"; edge = 8; w = -4119 },
    @{ n = "top medium"; edge = 8; w = -4138 },
    @{ n = "left thick"; edge = 7; w = 4 },
    @{ n = "bottom thick 1 line"; edge = 9; w = 4; t = "Xg" },
    @{ n = "bottom thick bottom-aligned"; edge = 9; w = 4; v = -4107 },
    @{ n = "bottom thick empty cell"; edge = 9; w = 4; t = "" },
    @{ n = "top+bottom thick"; edge = 89; w = 4 }
  )
  $r = 1
  foreach ($k in $cases) {
    $c = $ws.Cells.Item($r, 2); $c.Font.Name = "Calibri"; $c.Font.Size = 10; $c.WrapText = $true
    $c.VerticalAlignment = $(if ($k.ContainsKey("v")) { $k.v } else { -4108 })
    $t = $(if ($k.ContainsKey("t")) { $k.t } else { "Xg" + $nl + "Xg" })
    if ($t -ne "") { $c.Value2 = $t }
    if ($k.edge -eq 89) { $c.Borders.Item(8).Weight = $k.w; $c.Borders.Item(8).LineStyle = 1; $c.Borders.Item(9).Weight = $k.w; $c.Borders.Item(9).LineStyle = 1 }
    elseif ($k.edge -gt 0) { $b = $c.Borders.Item($k.edge); if ($k.w -eq -4119) { $b.LineStyle = -4119 } else { $b.LineStyle = 1; $b.Weight = $k.w } }
    $ws.Rows.Item($r).AutoFit() | Out-Null
    "{0,-28} {1,6:0.00}px" -f $k.n, ($ws.Rows.Item($r).RowHeight / 0.75)
    $r++
  }
} finally { $wb.Close($false); $excel.Quit() }
