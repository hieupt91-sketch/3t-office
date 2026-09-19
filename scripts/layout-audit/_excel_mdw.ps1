# Do chieu rong cot mac dinh (StandardWidth, px) va max digit width (MDW) cua Excel 2016 theo font Normal.
# Usage: powershell -File _excel_mdw.ps1 ["Calibri:11" "Arial:10" ...]
param([string[]]$Fonts = @("Calibri:11", "Calibri:12", "Arial:10", "Arial:11", "Times New Roman:12", "Times New Roman:13", "Times New Roman:14", "Tahoma:10", "Verdana:10"))
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  foreach ($spec in $Fonts) {
    $parts = $spec.Split(":"); $name = $parts[0]; $size = [double]$parts[1]
    $wb = $excel.Workbooks.Add()
    $style = $wb.Styles.Item("Normal")
    $style.Font.Name = $name; $style.Font.Size = $size
    $ws = $wb.Worksheets.Item(1)
    $ws.Columns.Item(1).ColumnWidth = 8.43
    $ptDefault = $ws.Columns.Item(2).Width   # cot chua dinh chieu rong = StandardWidth
    $pt843 = $ws.Columns.Item(1).Width
    $ws.Columns.Item(3).ColumnWidth = 10
    $pt10 = $ws.Columns.Item(3).Width
    $pxDefault = $ptDefault * 96 / 72; $px843 = $pt843 * 96 / 72; $px10 = $pt10 * 96 / 72
    # px = trunc(((256*chars + trunc(128/MDW))/256)*MDW) ; voi 10 chars va 8.43 chars giai MDW = (px10 - px843)/(10 - 8.43)
    $mdw = [Math]::Round(($px10 - $px843) / (10 - 8.43), 2)
    "{0} {1}: StandardWidth={2} chars, default px={3:0.##}, 8.43 chars px={4:0.##}, 10 chars px={5:0.##}, MDW~{6}" -f $name, $size, $ws.StandardWidth, $pxDefault, $px843, $px10, $mdw
    $wb.Close($false)
  }
} finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
