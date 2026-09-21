# Bang chieu cao hang tu dong (AutoFit) cua Excel 2016 theo font/co chu, don vi px @96dpi (= pt/0.75).
# Moi font/co: [h1, h2, h3, h5, h1Bold, h2Bold, h3Bold, h5Bold, h1Italic.., h1BoldItalic..] (16 so) = cao hang AutoFit khi o boc chu co 1/2/3/5 dong
#   (S31g: nghieng doi metric -> TNR 14 dam nghieng 26px thay vi 25, lan19 hang 17)
#   (h1 co san toi thieu = cao font Normal cua workbook, o day Calibri 11 = 20px; n dong > 5: h5 + (n-5)*(h5-h3)/2)
# Usage: powershell -File _excel_font_row_heights.ps1 -Out row_heights.json [-Fonts "Calibri,Arial"] [-Sizes "8,9,10,11"]
param([string]$Out, [string]$Fonts = "Calibri,Arial,Times New Roman,Tahoma,Verdana,Cambria,Segoe UI,Courier New,Georgia,Calibri Light,Arial Narrow,Book Antiqua,Century Gothic,Garamond,Palatino Linotype,Trebuchet MS,Comic Sans MS,Consolas,Roboto,Open Sans,VNI-Times,.VnTime,.VnArial",
      [string]$Sizes = "6,7,8,8.5,9,9.5,10,10.5,11,11.5,12,12.5,13,13.5,14,14.5,15,16,17,18,19,20,22,24,26,28,30,32,36,40,44,48,54,60,72")
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
$table = [ordered]@{}
function Measure-Font($ws, $cell, $font, $size, $bold, $italic = $false) {
  $cell.Font.Name = $font; $cell.Font.Size = $size; $cell.Font.Bold = $bold; $cell.Font.Italic = $italic; $cell.WrapText = $true
  $out = @()
  foreach ($n in 1, 2, 3, 5) {
    $cell.Value2 = (@(1..$n) | ForEach-Object { "Xgjy" }) -join "`n"
    $ws.Rows.Item(1).AutoFit() | Out-Null
    $out += [Math]::Round($ws.Rows.Item(1).Height / 0.75, 2)
  }
  return $out
}
try {
  foreach ($font in ($Fonts -split ",")) {
    $font = $font.Trim(); $row = [ordered]@{}
    # Moi font mot workbook moi de loi COM cua font nay khong lam hong font sau
    $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
    $ws.Columns.Item(1).ColumnWidth = 60
    $cell = $ws.Cells.Item(1, 1)
    foreach ($s in ($Sizes -split ",")) {
      $size = [double]$s.Trim()
      try {
        $r = Measure-Font $ws $cell $font $size $false
        $b = Measure-Font $ws $cell $font $size $true
        $i = Measure-Font $ws $cell $font $size $false $true
        $bi = Measure-Font $ws $cell $font $size $true $true
        $row["$size"] = @($r[0], $r[1], $r[2], $r[3], $b[0], $b[1], $b[2], $b[3], $i[0], $i[1], $i[2], $i[3], $bi[0], $bi[1], $bi[2], $bi[3])
      } catch { $row["$size"] = $null }
    }
    $wb.Close($false)
    $table[$font] = $row
    $ok = @($row.Values | Where-Object { $null -ne $_ }).Count
    "{0}: {1} sizes ok; 11pt={2}" -f $font, $ok, (($row["11"] | ForEach-Object { $_ }) -join ",")
  }
  $json = $table | ConvertTo-Json -Depth 4 -Compress
  [IO.File]::WriteAllText($Out, $json, (New-Object Text.UTF8Encoding $false))
  "OK -> $Out"
} finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
