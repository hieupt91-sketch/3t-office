param([Parameter(Mandatory=$true)][string]$File)
$x = $null
$wb = $null
$ws = $null
function BorderInfo([string]$Address, [int]$Index) {
  $border = $ws.Range($Address).Borders.Item($Index)
  return @{ LineStyle = $border.LineStyle; Weight = $border.Weight; Color = $border.Color }
}
function FontInfo([string]$Address) {
  $font = $ws.Range($Address).Font
  return @{
    Name = $font.Name; Size = $font.Size; Bold = $font.Bold; Italic = $font.Italic
    Underline = $font.Underline; Color = $font.Color; Strikethrough = $font.Strikethrough
    Superscript = $font.Superscript; Subscript = $font.Subscript
  }
}
function FillInfo([string]$Address) {
  $interior = $ws.Range($Address).Interior
  return @{ Color = $interior.Color; Pattern = $interior.Pattern; PatternColor = $interior.PatternColor }
}
try {
  for ($attempt = 0; $attempt -lt 20 -and -not $x; $attempt++) {
    try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $x) { throw "Excel.Application unavailable" }
  try { $x.DisplayAlerts = $false } catch {}
  for ($attempt = 0; $attempt -lt 25 -and -not $wb; $attempt++) {
    try { $wb = $x.Workbooks.Open($File, 0, $true) } catch { Start-Sleep -Milliseconds 700 }
  }
  if (-not $wb) { throw "Workbooks.Open returned null" }
  $ws = $wb.Worksheets.Item(1)

  $gradientStops = @()
  $gradientDegree = $null
  try {
    $gradient = $ws.Range("K5").Interior.Gradient
    $gradientDegree = $gradient.Degree
    $stops = $gradient.ColorStops
    for ($i = 1; $i -le $stops.Count; $i++) {
      $gradientStops += @{ Position = $stops.Item($i).Position; Color = $stops.Item($i).Color }
    }
  } catch {}

  $result = @{
    ReadOnly = $wb.ReadOnly
    Number = @{
      NumberDecimals = $ws.Range("A1").NumberFormat
      NumberThousands = $ws.Range("A2").NumberFormat
      NumberNegative = $ws.Range("A3").NumberFormat
      CurrencyDecimals = $ws.Range("A4").NumberFormat
      CurrencySymbol = $ws.Range("A5").NumberFormat
      CurrencyNegative = $ws.Range("A6").NumberFormat
      AccountingDecimals = $ws.Range("A7").NumberFormat
      AccountingSymbol = $ws.Range("A8").NumberFormat
      DateType = $ws.Range("A9").NumberFormat
      DateLocale = $ws.Range("A10").NumberFormat
      TimeType = $ws.Range("A11").NumberFormat
      TimeLocale = $ws.Range("A12").NumberFormat
      Percentage = $ws.Range("A13").NumberFormat
      Fraction = $ws.Range("A14").NumberFormat
      Scientific = $ws.Range("A15").NumberFormat
      Text = $ws.Range("A16").NumberFormat
      SpecialType = $ws.Range("A17").NumberFormat
      SpecialLocale = $ws.Range("A18").NumberFormat
      CustomInput = $ws.Range("A19").NumberFormat
      CustomList = $ws.Range("A20").NumberFormat
      CustomDelete = $ws.Range("A21").NumberFormat
      Sample = $ws.Range("A22").NumberFormat
      General = $ws.Range("A23").NumberFormat
    }
    Alignment = @{
      Horizontal = $ws.Range("B1").HorizontalAlignment
      Indent = $ws.Range("B2").IndentLevel
      Vertical = $ws.Range("B3").VerticalAlignment
      Wrap = $ws.Range("B4").WrapText
      Shrink = $ws.Range("B5").ShrinkToFit
      Merged = $ws.Range("B6:C6").MergeCells
      ReadingOrder = $ws.Range("B7").ReadingOrder
      Orientation = $ws.Range("B8").Orientation
      VerticalText = $ws.Range("B9").Orientation
      PreviewOrientation = $ws.Range("B10").Orientation
    }
    Font = @{
      Family = FontInfo "D1"
      Style = FontInfo "D2"
      Size = FontInfo "D3"
      Underline = @{
        None = $ws.Range("D4").Font.Underline
        Single = $ws.Range("D5").Font.Underline
        Double = $ws.Range("D6").Font.Underline
        SingleAccounting = $ws.Range("D7").Font.Underline
        DoubleAccounting = $ws.Range("D8").Font.Underline
      }
      Color = FontInfo "D9"
      Normal = FontInfo "D10"
      Strike = FontInfo "D11"
      Super = FontInfo "D12"
      Sub = FontInfo "D13"
      Preview = FontInfo "D14"
    }
    Border = @{
      LineStyle = BorderInfo "E1" 9
      LineColor = BorderInfo "E2" 9
      None = @{
        Left = BorderInfo "E10" 7; Right = BorderInfo "E10" 10
        Top = BorderInfo "E10" 8; Bottom = BorderInfo "E10" 9
      }
      Outline = @{
        Left = BorderInfo "F1:G2" 7; Right = BorderInfo "F1:G2" 10
        Top = BorderInfo "F1:G2" 8; Bottom = BorderInfo "F1:G2" 9
      }
      Inside = @{ Horizontal = BorderInfo "F4:G5" 12; Vertical = BorderInfo "F4:G5" 11 }
      Left = BorderInfo "H1" 7
      Right = BorderInfo "H2" 10
      Top = BorderInfo "H3" 8
      Bottom = BorderInfo "H4" 9
      InsideHorizontal = BorderInfo "H5:H6" 12
      InsideVertical = BorderInfo "H8:I8" 11
      DiagonalUp = BorderInfo "J1" 6
      DiagonalDown = BorderInfo "J2" 5
      Preview = BorderInfo "J3" 9
    }
    Fill = @{
      Background = FillInfo "K1"
      None = FillInfo "K2"
      PatternColor = FillInfo "K3"
      PatternStyle = FillInfo "K4"
      Gradient = @{ Degree = $gradientDegree; Stops = $gradientStops }
      ClearGradient = FillInfo "K6"
      Preview = FillInfo "K7"
    }
    Protection = @{
      Unlocked = @{ Locked = $ws.Range("L1").Locked; FormulaHidden = $ws.Range("L1").FormulaHidden }
      Hidden = @{ Locked = $ws.Range("L2").Locked; FormulaHidden = $ws.Range("L2").FormulaHidden }
    }
    Tabs = @{
      Number = $ws.Range("M1").NumberFormat
      Alignment = @{ Horizontal = $ws.Range("M2").HorizontalAlignment }
      Font = FontInfo "M3"
      Border = @{ Bottom = BorderInfo "M4" 9 }
      Fill = FillInfo "M5"
      Protection = @{ Locked = $ws.Range("M6").Locked }
    }
    General = @{
      Cancel = FontInfo "M7"
      Close = FillInfo "M8"
      Ok = FontInfo "M9"
    }
    NormalFont = FontInfo "M3"
  }
  $result | ConvertTo-Json -Depth 10 -Compress
} finally {
  if ($wb -ne $null) { try { $wb.Close($false) | Out-Null } catch {} }
  if ($x -ne $null) { try { $x.Quit() } catch {} }
  if ($ws -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null }
  if ($wb -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }
  if ($x -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
