param([Parameter(Mandatory=$true)][string]$File)
$x = $null
$wb = $null
try {
  for ($a = 0; $a -lt 20 -and -not $x; $a++) { try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 500 } }
  try { $x.DisplayAlerts = $false } catch {}
  for ($a = 0; $a -lt 25 -and -not $wb; $a++) { try { $wb = $x.Workbooks.Open($File, 0, $true) } catch { Start-Sleep -Milliseconds 700 } }
  if (-not $wb) { throw "Workbooks.Open returned null" }
  $ws = $wb.Worksheets.Item(1)
  $borderIds = @(7, 8, 9, 10, 11, 12, 5, 6)
  $borders = @{}
  foreach ($id in $borderIds) {
    $border = $ws.Range("E1:H4").Borders.Item($id)
    $borders["$id"] = @{ LineStyle = $border.LineStyle; Weight = $border.Weight; Color = $border.Color }
  }
  $gradientStops = @()
  try {
    $stops = $ws.Range("I2").Interior.Gradient.ColorStops
    for ($i = 1; $i -le $stops.Count; $i++) { $gradientStops += @{ Position = $stops.Item($i).Position; Color = $stops.Item($i).Color } }
  } catch {}
  $result = @{
    ReadOnly = $wb.ReadOnly
    Number = $ws.Range("A1").NumberFormat
    Currency = $ws.Range("A2").NumberFormat
    Accounting = $ws.Range("A3").NumberFormat
    Date = $ws.Range("A4").NumberFormat
    Time = $ws.Range("A5").NumberFormat
    Percentage = $ws.Range("A6").NumberFormat
    Fraction = $ws.Range("A7").NumberFormat
    Scientific = $ws.Range("A8").NumberFormat
    Text = $ws.Range("A9").NumberFormat
    Special = $ws.Range("A10").NumberFormat
    Custom = $ws.Range("A11").NumberFormat
    Alignment = @{
      Horizontal = $ws.Range("B1").HorizontalAlignment
      Vertical = $ws.Range("B1").VerticalAlignment
      Indent = $ws.Range("B1").IndentLevel
      Wrap = $ws.Range("B1").WrapText
      Shrink = $ws.Range("B1").ShrinkToFit
      ReadingOrder = $ws.Range("B1").ReadingOrder
      Orientation = $ws.Range("B1").Orientation
      VerticalText = $ws.Range("B2").Orientation
      Merged = $ws.Range("B3:C3").MergeCells
    }
    Font = @{
      Name = $ws.Range("D1").Font.Name
      Size = $ws.Range("D1").Font.Size
      Bold = $ws.Range("D1").Font.Bold
      Italic = $ws.Range("D1").Font.Italic
      Underline = $ws.Range("D1").Font.Underline
      Color = $ws.Range("D1").Font.Color
      Strike = $ws.Range("D1").Font.Strikethrough
      Superscript = $ws.Range("D1").Font.Superscript
      NormalName = $ws.Range("D2").Font.Name
    }
    Borders = $borders
    Fill = @{
      Color = $ws.Range("I1").Interior.Color
      Pattern = $ws.Range("I1").Interior.Pattern
      PatternColor = $ws.Range("I1").Interior.PatternColor
      GradientStops = $gradientStops
    }
    Protection = @{
      Locked = $ws.Range("J1").Locked
      Hidden = $ws.Range("J1").FormulaHidden
    }
  }
  $result | ConvertTo-Json -Depth 8 -Compress
} finally {
  if ($wb -ne $null) { try { $wb.Close($false) | Out-Null } catch {} }
  if ($x -ne $null) { try { $x.Quit() } catch {} }
  if ($ws -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null }
  if ($wb -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }
  if ($x -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
