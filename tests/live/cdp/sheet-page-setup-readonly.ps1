param([Parameter(Mandatory=$true)][string]$File)
$x = $null
$wb = $null
$ws = $null
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
  $ps = $ws.PageSetup
  $quality = $null
  try { $quality = @([System.__ComObject].InvokeMember("PrintQuality", [Reflection.BindingFlags]::GetProperty, $null, $ps, @(1)), [System.__ComObject].InvokeMember("PrintQuality", [Reflection.BindingFlags]::GetProperty, $null, $ps, @(2))) } catch {}
  $result = [ordered]@{
    Orientation = $ps.Orientation
    Zoom = $ps.Zoom
    FitToPagesWide = $ps.FitToPagesWide
    FitToPagesTall = $ps.FitToPagesTall
    PaperSize = $ps.PaperSize
    PrintQuality = $quality
    FirstPageNumber = $ps.FirstPageNumber
    TopMargin = $ps.TopMargin
    BottomMargin = $ps.BottomMargin
    LeftMargin = $ps.LeftMargin
    RightMargin = $ps.RightMargin
    HeaderMargin = $ps.HeaderMargin
    FooterMargin = $ps.FooterMargin
    CenterHorizontally = $ps.CenterHorizontally
    CenterVertically = $ps.CenterVertically
    LeftHeader = $ps.LeftHeader
    CenterHeader = $ps.CenterHeader
    RightHeader = $ps.RightHeader
    LeftFooter = $ps.LeftFooter
    CenterFooter = $ps.CenterFooter
    RightFooter = $ps.RightFooter
    OddAndEvenPagesHeaderFooter = $ps.OddAndEvenPagesHeaderFooter
    DifferentFirstPageHeaderFooter = $ps.DifferentFirstPageHeaderFooter
    ScaleWithDocHeaderFooter = $ps.ScaleWithDocHeaderFooter
    AlignMarginsHeaderFooter = $ps.AlignMarginsHeaderFooter
    PrintArea = $ps.PrintArea
    PrintTitleRows = $ps.PrintTitleRows
    PrintTitleColumns = $ps.PrintTitleColumns
    PrintGridlines = $ps.PrintGridlines
    BlackAndWhite = $ps.BlackAndWhite
    Draft = $ps.Draft
    PrintHeadings = $ps.PrintHeadings
    PrintComments = $ps.PrintComments
    PrintErrors = $ps.PrintErrors
    Order = $ps.Order
  }
  $result | ConvertTo-Json -Depth 5 -Compress
} finally {
  if ($wb -ne $null) { try { $wb.Close($false) | Out-Null } catch {} }
  if ($x -ne $null) { try { $x.Quit() } catch {} }
  if ($ws -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null }
  if ($wb -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }
  if ($x -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
