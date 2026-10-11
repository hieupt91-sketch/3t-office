param([string]$JobPath)
$job = Get-Content $JobPath -Raw -Encoding UTF8 | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  $col = $ws.Columns.Item(2)
  $colPx = [double]$job.colPx; $pt = [double]$job.pt; $font = [string]$job.font
  "colPx=$colPx"; try { $ws.Columns.Item(2).ColumnWidth = [double](($colPx - 5) / 7) } catch { "ERR: $($_.Exception.Message) HR=$($_.Exception.HResult) v=$([double](($colPx - 5) / 7))"; throw }
  $actual = $ws.Columns.Item(2).Width / 0.75
  $c = $ws.Cells.Item(1, 2); $c.WrapText = $true; $c.Font.Name = $font; $c.Font.Size = $pt; $c.NumberFormat = "@"
  $c.Value2 = "Xg"; $ws.Rows.Item(1).AutoFit() | Out-Null; $h1 = $ws.Rows.Item(1).RowHeight
  $out = @{}
  foreach ($p in $job.texts.PSObject.Properties) {
    $c.Value2 = $p.Value
    $ws.Rows.Item(1).AutoFit() | Out-Null
    $h = $ws.Rows.Item(1).RowHeight
    if ($h -gt $h1 + 0.1) { $out[$p.Name] = 2 } else { $out[$p.Name] = 1 }
  }
  @{ actual = $actual; lines = $out } | ConvertTo-Json -Compress
} finally { $wb.Close($false); $excel.Quit() }
