param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = "Stop"
$excel = $null
$book = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $book = $excel.Workbooks.Open($Path, 0, $true)
  $sheet = $book.Worksheets.Item(1)
  $borderIds = @(7, 8, 9, 10, 11, 12, 5, 6)
  $borders = @{}
  foreach ($id in $borderIds) {
    $border = $sheet.Range("E1:H4").Borders.Item($id)
    $borders["$id"] = @{ LineStyle = $border.LineStyle; Weight = $border.Weight; Color = $border.Color }
  }
  $gradientStops = @()
  try {
    $stops = $sheet.Range("I2").Interior.Gradient.ColorStops
    for ($i = 1; $i -le $stops.Count; $i++) { $gradientStops += @{ Position = $stops.Item($i).Position; Color = $stops.Item($i).Color } }
  } catch {}
  $result = @{
    ReadOnly = $book.ReadOnly
    Number = $sheet.Range("A1").NumberFormat
    Currency = $sheet.Range("A2").NumberFormat
    Accounting = $sheet.Range("A3").NumberFormat
    Date = $sheet.Range("A4").NumberFormat
    Time = $sheet.Range("A5").NumberFormat
    Percentage = $sheet.Range("A6").NumberFormat
    Fraction = $sheet.Range("A7").NumberFormat
    Scientific = $sheet.Range("A8").NumberFormat
    Text = $sheet.Range("A9").NumberFormat
    Special = $sheet.Range("A10").NumberFormat
    Custom = $sheet.Range("A11").NumberFormat
    Alignment = @{
      Horizontal = $sheet.Range("B1").HorizontalAlignment
      Vertical = $sheet.Range("B1").VerticalAlignment
      Indent = $sheet.Range("B1").IndentLevel
      Wrap = $sheet.Range("B1").WrapText
      Shrink = $sheet.Range("B1").ShrinkToFit
      ReadingOrder = $sheet.Range("B1").ReadingOrder
      Orientation = $sheet.Range("B1").Orientation
      VerticalText = $sheet.Range("B2").Orientation
      Merged = $sheet.Range("B3:C3").MergeCells
    }
    Font = @{
      Name = $sheet.Range("D1").Font.Name
      Size = $sheet.Range("D1").Font.Size
      Bold = $sheet.Range("D1").Font.Bold
      Italic = $sheet.Range("D1").Font.Italic
      Underline = $sheet.Range("D1").Font.Underline
      Color = $sheet.Range("D1").Font.Color
      Strike = $sheet.Range("D1").Font.Strikethrough
      Superscript = $sheet.Range("D1").Font.Superscript
      NormalName = $sheet.Range("D2").Font.Name
    }
    Borders = $borders
    Fill = @{
      Color = $sheet.Range("I1").Interior.Color
      Pattern = $sheet.Range("I1").Interior.Pattern
      PatternColor = $sheet.Range("I1").Interior.PatternColor
      GradientStops = $gradientStops
    }
    Protection = @{
      Locked = $sheet.Range("J1").Locked
      Hidden = $sheet.Range("J1").FormulaHidden
    }
  }
  $result | ConvertTo-Json -Depth 8 -Compress
} finally {
  if ($book -ne $null) { $book.Close($false) | Out-Null }
  if ($excel -ne $null) { $excel.Quit() }
  if ($sheet -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($sheet) | Out-Null }
  if ($book -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($book) | Out-Null }
  if ($excel -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
