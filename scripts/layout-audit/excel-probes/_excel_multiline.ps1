param([string]$Font = "Times New Roman", [double[]]$Sizes = @(10, 18), [int]$MaxLines = 12, [string]$NormalFont = "", [double]$NormalSize = 0, [switch]$OnlyPlain)
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  if ($NormalFont) { $wb.Styles.Item("Normal").Font.Name = $NormalFont }
  if ($NormalSize -gt 0) { $wb.Styles.Item("Normal").Font.Size = $NormalSize }
  "Normal " + $wb.Styles.Item("Normal").Font.Name + " " + $wb.Styles.Item("Normal").Font.Size + " StandardHeight " + $ws.StandardHeight
  $ws.Columns.Item(2).ColumnWidth = 60
  foreach ($sz in $Sizes) {
    foreach ($bold in $false, $true) {
      $line = ""
      for ($n = 1; $n -le $MaxLines; $n++) {
        $c = $ws.Cells.Item($n, 2); $c.Clear() | Out-Null
        $c.WrapText = $true; $c.Font.Name = $Font; $c.Font.Size = $sz; $c.Font.Bold = $bold
        $c.Value2 = (("Xg" + [string][char]10) * ($n - 1)) + "Xg"
        $ws.Rows.Item($n).AutoFit() | Out-Null
        $line += "{0:0.00} " -f ($ws.Rows.Item($n).RowHeight / 0.75)
      }
      "$Font $sz b=$bold : $line"
    }
    if ($OnlyPlain) { continue }
    # mixed: first line bold, rest regular
    $line = ""
    for ($n = 1; $n -le $MaxLines; $n++) {
      $c = $ws.Cells.Item($n, 2); $c.Clear() | Out-Null
      $c.WrapText = $true; $c.Font.Name = $Font; $c.Font.Size = $sz; $c.Font.Bold = $false
      $c.Value2 = (("Xg" + [string][char]10) * ($n - 1)) + "Xg"
      $c.Characters(1, 2).Font.Bold = $true
      $ws.Rows.Item($n).AutoFit() | Out-Null
      $line += "{0:0.00} " -f ($ws.Rows.Item($n).RowHeight / 0.75)
    }
    "$Font $sz line1bold : $line"
    # mixed: all lines regular except last bold
    $line = ""
    for ($n = 1; $n -le $MaxLines; $n++) {
      $c = $ws.Cells.Item($n, 2); $c.Clear() | Out-Null
      $c.WrapText = $true; $c.Font.Name = $Font; $c.Font.Size = $sz; $c.Font.Bold = $false
      $t = (("Xg" + [string][char]10) * ($n - 1)) + "Xg"; $c.Value2 = $t
      $c.Characters($t.Length - 1, 2).Font.Bold = $true
      $ws.Rows.Item($n).AutoFit() | Out-Null
      $line += "{0:0.00} " -f ($ws.Rows.Item($n).RowHeight / 0.75)
    }
    "$Font $sz lastbold : $line"
    # mixed sizes: line 1 at size+4, rest at size
    $line = ""
    for ($n = 1; $n -le $MaxLines; $n++) {
      $c = $ws.Cells.Item($n, 2); $c.Clear() | Out-Null
      $c.WrapText = $true; $c.Font.Name = $Font; $c.Font.Size = $sz; $c.Font.Bold = $false
      $c.Value2 = (("Xg" + [string][char]10) * ($n - 1)) + "Xg"
      $c.Characters(1, 2).Font.Size = $sz + 4
      $ws.Rows.Item($n).AutoFit() | Out-Null
      $line += "{0:0.00} " -f ($ws.Rows.Item($n).RowHeight / 0.75)
    }
    "$Font $sz line1big(+4) : $line"
  }
} finally { $wb.Close($false); $excel.Quit() }
