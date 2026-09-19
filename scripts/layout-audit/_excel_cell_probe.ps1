# Doc mau chu / nen / vien cua mot o bang Excel COM (gia tri Excel THAT SU ve).
# Usage: powershell -File _excel_cell_probe.ps1 -File x.xlsx -Sheet 1 -Cells A1,B2
param([string]$File, [int]$Sheet = 1, [string[]]$Cells = @("A1"))
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open((Resolve-Path $File).Path, 0, $true)
  $ws = $wb.Worksheets.Item($Sheet)
  foreach ($c in $Cells) {
    $r = $ws.Range($c)
    $bgr = [int]$r.Font.Color; $fbgr = [int]$r.Interior.Color
    $hex = { param($v) "#{0:X2}{1:X2}{2:X2}" -f ($v -band 0xFF), (($v -shr 8) -band 0xFF), (($v -shr 16) -band 0xFF) }
    "{0} font={1} colorIndex={2} fill={3} pattern={4} borderBottom={5}" -f $c, (& $hex $bgr), $r.Font.ColorIndex, (& $hex $fbgr), $r.Interior.Pattern, (& $hex ([int]$r.Borders.Item(9).Color))
  }
  $wb.Close($false)
} finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
